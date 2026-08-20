import Assignment from "../models/assignment.model";
import ResourceRequest from "../models/resourceRequest.model";
import Volunteer from "../models/volunteer.model";
import Donor from "../models/donor.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import { SOCKET_EVENTS } from "../utils/constants";
import { emitEvent } from "../sockets";
import { logActivity } from "./activityLog.service";
import { enqueueNotification } from "../queues";
import User from "../models/user.model";

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
    const assignment = await getOwnedAssignment(userId, id);
    assignment.status = "accepted";
    assignment.acceptedAt = new Date();
    await assignment.save();

    await ResourceRequest.findByIdAndUpdate(assignment.request, {
      status: "in_progress",
    });
    await Volunteer.findOneAndUpdate({ userId }, { availability: "busy" });

    emitEvent(SOCKET_EVENTS.ASSIGNMENT_UPDATED, assignment, "dashboard");
    await logActivity({
      actor: userId,
      action: "assignment.accepted",
      entityType: "Assignment",
      entityId: id,
    });
    return assignment;
  },

  async reject(userId: string, id: string) {
    const assignment = await getOwnedAssignment(userId, id);
    assignment.status = "rejected";
    await assignment.save();
    emitEvent(SOCKET_EVENTS.ASSIGNMENT_UPDATED, assignment, "dashboard");
    return assignment;
  },

  async complete(userId: string, id: string) {
    const assignment = await getOwnedAssignment(userId, id);
    assignment.status = "completed";
    assignment.completedAt = new Date();
    await assignment.save();

    await Volunteer.findOneAndUpdate(
      { userId },
      { $inc: { completedMissions: 1 }, availability: "available" }
    );
    await Donor.findOneAndUpdate({ userId }, { $inc: { totalDonations: 1 } });

    emitEvent(SOCKET_EVENTS.ASSIGNMENT_UPDATED, assignment, "dashboard");
    await logActivity({
      actor: userId,
      action: "assignment.completed",
      entityType: "Assignment",
      entityId: id,
    });
    return assignment;
  },
};

async function getOwnedAssignment(userId: string, id: string) {
  const assignment = await Assignment.findById(id);
  if (!assignment) throw new ApiError(404, "Assignment not found");

  const volunteer = await Volunteer.findOne({ userId });
  const donor = await Donor.findOne({ userId });
  const owns =
    (volunteer && String(assignment.assignee) === volunteer.id) ||
    (donor && String(assignment.assignee) === donor.id);

  if (!owns) throw new ApiError(403, "You cannot update this assignment");
  return assignment;
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
