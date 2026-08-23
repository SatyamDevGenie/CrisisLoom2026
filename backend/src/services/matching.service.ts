import ResourceRequest from "../models/resourceRequest.model";
import Shelter from "../models/shelter.model";
import Volunteer from "../models/volunteer.model";
import Assignment from "../models/assignment.model";
import User from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { nearQuery } from "../utils/geo";
import { env } from "../config/env";
import {
  enqueueDispatchEscalation,
  enqueueEmail,
  enqueueNotification,
  enqueueSms,
} from "../queues";
import { emitEvent } from "../sockets";
import { ESCALATION_RADII_METERS, SOCKET_EVENTS } from "../utils/constants";
import { logger } from "../config/logger";
import { scoreZoneAid } from "./fairness.service";

async function notifyVolunteer(
  volunteer: {
    id?: string;
    _id?: { toString(): string };
    userId: unknown;
  },
  request: {
    id?: string;
    _id?: { toString(): string };
    quantity: number;
    unit: string;
    resourceType: string;
  },
  shelter: { id?: string; _id?: { toString(): string }; shelterName: string },
  actorId: string,
  notes: string
) {
  const volunteerId = volunteer.id || String(volunteer._id);
  const requestId = request.id || String(request._id);
  const shelterId = shelter.id || String(shelter._id);
  await Assignment.findOneAndUpdate(
    { request: requestId, assignee: volunteerId },
    {
      request: requestId,
      assigneeType: "volunteer",
      assignee: volunteerId,
      assignedBy: actorId,
      status: "notified",
      notes,
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const user = volunteer.userId as {
    id?: string;
    email?: string;
    phone?: string;
  };

  if (user?.id) {
    await enqueueNotification({
      userId: user.id,
      title: "Critical need nearby",
      message: `${shelter.shelterName} needs ${request.quantity} ${request.unit} of ${request.resourceType}.`,
      channel: "in_app",
      metadata: { requestId, shelterId },
    });
  }
  if (user?.email) {
    await enqueueEmail({
      to: user.email,
      subject: "Critical disaster relief request nearby",
      html: `<p>${shelter.shelterName} urgently needs <b>${request.quantity} ${request.unit}</b> of ${request.resourceType}.</p>`,
    });
  }
  if (user?.phone) {
    await enqueueSms({
      to: user.phone,
      body: `CRITICAL: ${shelter.shelterName} needs ${request.quantity} ${request.resourceType}. Open the app to accept.`,
    });
  }
}

export const matchingService = {
  async dispatchCriticalRequest(
    requestId: string,
    actorId: string,
    options: { radiusMeters?: number; step?: number } = {}
  ) {
    const request = await ResourceRequest.findById(requestId);
    if (!request) throw new ApiError(404, "Request not found");
    if (["fulfilled", "cancelled", "in_progress"].includes(request.status)) {
      return { request, notified: 0, skipped: true };
    }

    const alreadyClaimed = await Assignment.exists({
      request: request.id,
      status: { $in: ["accepted", "in_progress", "completed"] },
    });
    if (alreadyClaimed) {
      return { request, notified: 0, skipped: true };
    }

    const shelter = await Shelter.findById(request.shelter);
    if (!shelter) throw new ApiError(404, "Shelter not found");

    const [lng, lat] = shelter.location.coordinates;
    const step = options.step ?? request.escalationStep ?? 0;
    const radius =
      options.radiusMeters ??
      ESCALATION_RADII_METERS[Math.min(step, ESCALATION_RADII_METERS.length - 1)];

    const fairness = await scoreZoneAid(
      lng,
      lat,
      request.resourceType,
      request.id
    );

    request.dispatchRadiusMeters = radius;
    request.escalationStep = step;
    request.fairnessStatus = fairness.status;
    request.zoneAidCount = fairness.zoneAidCount;
    await request.save();

    const alreadyAssigned = await Assignment.find({ request: request.id }).select(
      "assignee"
    );
    const exclude = alreadyAssigned.map((item) => item.assignee);

    const baseFilter = {
      availability: "available" as const,
      location: nearQuery(lng, lat, radius),
      _id: { $nin: exclude },
    };

    let volunteers = await Volunteer.find({
      ...baseFilter,
      skills: request.resourceType,
    })
      .populate("userId", "name email phone")
      .limit(fairness.notifyLimit);

    if (volunteers.length === 0) {
      volunteers = await Volunteer.find(baseFilter)
        .populate("userId", "name email phone")
        .limit(fairness.notifyLimit);
    }

    const notes = `Auto-dispatched at ${radius / 1000}km (${fairness.status} zone)`;
    for (const volunteer of volunteers) {
      await notifyVolunteer(volunteer, request, shelter, actorId, notes);
    }

    if (volunteers.length && request.status === "open") {
      request.status = "matched";
      await request.save();
    }

    emitEvent(
      SOCKET_EVENTS.REQUEST_CRITICAL,
      {
        request,
        notified: volunteers.length,
        shelter,
        radiusMeters: radius,
        fairness,
      },
      "dashboard"
    );

    if (step === 0) {
      const admins = await User.find({
        role: { $in: ["admin", "ngo_manager"] },
        isActive: true,
      }).select("email");
      for (const admin of admins) {
        await enqueueEmail({
          to: admin.email,
          subject: "Critical need activated",
          html: `<p>Critical request at ${shelter.shelterName}. ${volunteers.length} volunteers notified within 5km. Zone fairness: <b>${fairness.status}</b> (${fairness.zoneAidCount} nearby ${request.resourceType} requests). Radius will expand if nobody accepts.</p>`,
        });
      }

      await enqueueDispatchEscalation(
        { requestId: request.id, actorId, nextStep: 1 },
        env.ESCALATION_DELAY_MS
      );
    }

    logger.info("Critical request dispatched", {
      requestId,
      notified: volunteers.length,
      radiusMeters: radius,
      fairness: fairness.status,
      zoneAidCount: fairness.zoneAidCount,
    });

    return {
      request,
      notified: volunteers.length,
      assignments: volunteers.length,
      radiusMeters: radius,
      fairness,
    };
  },

  async escalate(requestId: string, actorId: string, nextStep: number) {
    const request = await ResourceRequest.findById(requestId);
    if (!request) return { skipped: true, reason: "missing" };

    const claimed = await Assignment.exists({
      request: request.id,
      status: { $in: ["accepted", "in_progress", "completed"] },
    });
    if (
      claimed ||
      ["fulfilled", "cancelled", "in_progress"].includes(request.status)
    ) {
      return { skipped: true, reason: "already_claimed" };
    }

    const shelter = await Shelter.findById(request.shelter);

    if (nextStep >= ESCALATION_RADII_METERS.length) {
      request.escalationExhausted = true;
      request.escalationStep = 3;
      await request.save();

      const admins = await User.find({
        role: { $in: ["admin", "ngo_manager"] },
        isActive: true,
      }).select("email");

      for (const admin of admins) {
        await enqueueEmail({
          to: admin.email,
          subject: "Critical request still unclaimed after 30km",
          html: `<p>No volunteer accepted the critical request at <b>${shelter?.shelterName ?? "a shelter"}</b> after expanding to 30km. Manual dispatch is required.</p>`,
        });
      }

      emitEvent(
        SOCKET_EVENTS.REQUEST_ESCALATED,
        { request, exhausted: true },
        "dashboard"
      );
      logger.info("Dispatch escalation exhausted", { requestId });
      return { exhausted: true };
    }

    const radius = ESCALATION_RADII_METERS[nextStep];
    const result = await this.dispatchCriticalRequest(requestId, actorId, {
      radiusMeters: radius,
      step: nextStep,
    });

    await enqueueDispatchEscalation(
      { requestId, actorId, nextStep: nextStep + 1 },
      env.ESCALATION_DELAY_MS
    );

    emitEvent(
      SOCKET_EVENTS.REQUEST_ESCALATED,
      {
        request: result.request,
        radiusMeters: radius,
        step: nextStep,
        notified: result.notified,
      },
      "dashboard"
    );

    logger.info("Dispatch radius escalated", {
      requestId,
      step: nextStep,
      radiusMeters: radius,
    });

    return result;
  },
};
