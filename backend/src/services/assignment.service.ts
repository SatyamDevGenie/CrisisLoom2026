import Assignment from "../models/assignment.model";
import ResourceRequest from "../models/resourceRequest.model";
import Volunteer from "../models/volunteer.model";
import Donor from "../models/donor.model";
import Shelter from "../models/shelter.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import { SOCKET_EVENTS } from "../utils/constants";
import { emitEvent } from "../sockets";
import { logActivity } from "./activityLog.service";
import { enqueueNotification } from "../queues";
import User from "../models/user.model";
import { distanceMeters, toGeoPoint } from "../utils/geo";
import { env } from "../config/env";
import type { UserRole } from "../types";

export const assignmentService = {
  async create(
    actorId: string,
    input: {
      request: string;
      assigneeType: "volunteer" | "donor" | "ngo";
      assignee: string;
      notes?: string;
    }
  ) {
    const request = await ResourceRequest.findById(input.request);
    if (!request) throw new ApiError(404, "Request not found");

    const existingClaim = await Assignment.exists({
      request: input.request,
      status: { $in: ["accepted", "in_progress"] },
    });
    if (existingClaim) {
      throw new ApiError(409, "This request is already claimed");
    }

    const assignment = await Assignment.create({
      request: input.request,
      assigneeType: input.assigneeType,
      assignee: input.assignee,
      assignedBy: actorId,
      notes: input.notes,
    });

    request.status = request.status === "open" ? "matched" : request.status;
    await request.save();

    const user = await resolveAssigneeUser(input.assigneeType, input.assignee);
    if (user) {
      await enqueueNotification({
        userId: user.id,
        title: "New assignment",
        message: "You have been assigned a disaster relief task.",
        channel: "in_app",
        metadata: { assignmentId: assignment.id, requestId: request.id },
      });
    }

    emitEvent(SOCKET_EVENTS.ASSIGNMENT_UPDATED, assignment, "dashboard");
    await logActivity({
      actor: actorId,
      action: "assignment.created",
      entityType: "Assignment",
      entityId: assignment.id,
    });
    return assignment;
  },

  async list(query: {
    page?: number;
    limit?: number;
    status?: string;
    request?: string;
    userId?: string;
    role?: string;
  }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.request) filter.request = query.request;

    if (query.role === "volunteer") {
      const volunteer = await Volunteer.findOne({ userId: query.userId });
      if (volunteer) filter.assignee = volunteer.id;
    }

    const [items, total] = await Promise.all([
      Assignment.find(filter)
        .populate("request")
        .populate("assignedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Assignment.countDocuments(filter),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  },

  async accept(userId: string, id: string) {
    const { volunteer, donor } = await loadProfiles(userId);
    const assigneeId = volunteer?.id || donor?.id;
    if (!assigneeId) {
      throw new ApiError(403, "You cannot update this assignment");
    }

    const claimed = await Assignment.findOneAndUpdate(
      { _id: id, assignee: assigneeId, status: "notified" },
      { $set: { status: "accepted", acceptedAt: new Date() } },
      { new: true }
    );

    if (!claimed) {
      const current = await Assignment.findById(id);
      if (!current) throw new ApiError(404, "Assignment not found");
      if (String(current.assignee) !== String(assigneeId)) {
        throw new ApiError(403, "You cannot update this assignment");
      }
      if (current.status === "accepted" || current.status === "in_progress") {
        return current;
      }
      throw new ApiError(409, "This assignment is no longer available to accept");
    }

    const requestClaimed = await ResourceRequest.findOneAndUpdate(
      {
        _id: claimed.request,
        status: { $in: ["open", "matched"] },
      },
      { $set: { status: "in_progress" } },
      { new: true }
    );

    if (!requestClaimed) {
      await Assignment.findByIdAndUpdate(claimed.id, {
        status: "cancelled",
        notes: "Request already claimed by another responder",
      });
      throw new ApiError(409, "Another volunteer already claimed this request");
    }

    await Assignment.updateMany(
      {
        request: claimed.request,
        _id: { $ne: claimed._id },
        status: "notified",
      },
      { $set: { status: "cancelled", notes: "Request claimed by another responder" } }
    );

    if (volunteer) {
      await Volunteer.findByIdAndUpdate(volunteer.id, { availability: "busy" });
    }

    emitEvent(SOCKET_EVENTS.ASSIGNMENT_UPDATED, claimed, "dashboard");
    await logActivity({
      actor: userId,
      action: "assignment.accepted",
      entityType: "Assignment",
      entityId: id,
    });
    return claimed;
  },

  async reject(userId: string, id: string) {
    const { volunteer, donor } = await loadProfiles(userId);
    const assigneeId = volunteer?.id || donor?.id;
    if (!assigneeId) throw new ApiError(403, "You cannot update this assignment");

    const assignment = await Assignment.findOneAndUpdate(
      { _id: id, assignee: assigneeId, status: "notified" },
      { $set: { status: "rejected" } },
      { new: true }
    );
    if (!assignment) {
      throw new ApiError(409, "This assignment can no longer be rejected");
    }

    emitEvent(SOCKET_EVENTS.ASSIGNMENT_UPDATED, assignment, "dashboard");
    return assignment;
  },

  async complete(
    userId: string,
    id: string,
    coords: { lng?: number; lat?: number },
    role: UserRole
  ) {
    const { volunteer, donor } = await loadProfiles(userId);
    const assignment = await Assignment.findById(id);
    if (!assignment) throw new ApiError(404, "Assignment not found");

    const isStaff = role === "admin" || role === "ngo_manager";
    const owns =
      (volunteer && String(assignment.assignee) === volunteer.id) ||
      (donor && String(assignment.assignee) === donor.id);

    if (!owns && !isStaff) {
      throw new ApiError(403, "You cannot update this assignment");
    }

    if (!["accepted", "in_progress"].includes(assignment.status)) {
      throw new ApiError(409, "Only an accepted assignment can be completed");
    }

    if (!isStaff) {
      await assertArrivalGeofence(assignment.request.toString(), volunteer, donor, coords);
    }

    const completed = await Assignment.findOneAndUpdate(
      { _id: id, status: { $in: ["accepted", "in_progress"] } },
      { $set: { status: "completed", completedAt: new Date() } },
      { new: true }
    );
    if (!completed) {
      throw new ApiError(409, "Assignment was already completed or cancelled");
    }

    if (volunteer) {
      if (coords.lng !== undefined && coords.lat !== undefined) {
        volunteer.location = toGeoPoint(coords.lng, coords.lat);
        await volunteer.save();
      }
      volunteer.completedMissions += 1;
      volunteer.availability = "available";
      await volunteer.save();
    }
    if (donor) {
      await Donor.findByIdAndUpdate(donor.id, { $inc: { totalDonations: 1 } });
    }

    emitEvent(SOCKET_EVENTS.ASSIGNMENT_UPDATED, completed, "dashboard");
    await logActivity({
      actor: userId,
      action: "assignment.completed",
      entityType: "Assignment",
      entityId: id,
    });
    return completed;
  },
};

async function assertArrivalGeofence(
  requestId: string,
  volunteer: InstanceType<typeof Volunteer> | null,
  donor: InstanceType<typeof Donor> | null,
  coords: { lng?: number; lat?: number }
) {
  const request = await ResourceRequest.findById(requestId);
  if (!request) throw new ApiError(404, "Request not found");
  const shelter = await Shelter.findById(request.shelter);
  if (!shelter) throw new ApiError(404, "Shelter not found");

  let point: [number, number] | null = null;
  if (coords.lng !== undefined && coords.lat !== undefined) {
    point = [coords.lng, coords.lat];
  } else if (volunteer) {
    point = volunteer.location.coordinates;
  } else if (donor) {
    point = donor.location.coordinates;
  }

  if (!point) {
    throw new ApiError(400, "Current location (lng, lat) is required to complete this assignment");
  }

  const meters = distanceMeters(point, shelter.location.coordinates);
  if (meters > env.GEOFENCE_METERS) {
    throw new ApiError(
      403,
      `You must be within ${env.GEOFENCE_METERS}m of the shelter to complete this assignment. Current distance: ${Math.round(meters)}m.`
    );
  }

  if (volunteer && coords.lng !== undefined && coords.lat !== undefined) {
    volunteer.location = toGeoPoint(coords.lng, coords.lat);
    await volunteer.save();
  }
}

async function loadProfiles(userId: string) {
  const [volunteer, donor] = await Promise.all([
    Volunteer.findOne({ userId }),
    Donor.findOne({ userId }),
  ]);
  return { volunteer, donor };
}

async function resolveAssigneeUser(
  type: "volunteer" | "donor" | "ngo",
  assigneeId: string
) {
  if (type === "volunteer") {
    const volunteer = await Volunteer.findById(assigneeId);
    return volunteer ? User.findById(volunteer.userId) : null;
  }
  if (type === "donor") {
    const donor = await Donor.findById(assigneeId);
    return donor ? User.findById(donor.userId) : null;
  }
  return User.findById(assigneeId);
}
