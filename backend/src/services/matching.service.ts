import ResourceRequest from "../models/resourceRequest.model";
import Shelter from "../models/shelter.model";
import Volunteer from "../models/volunteer.model";
import Assignment from "../models/assignment.model";
import User from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { nearQuery } from "../utils/geo";
import { env } from "../config/env";
import { enqueueEmail, enqueueNotification, enqueueSms } from "../queues";
import { emitEvent } from "../sockets";
import { SOCKET_EVENTS } from "../utils/constants";
import { logger } from "../config/logger";

export const matchingService = {
  async dispatchCriticalRequest(requestId: string, actorId: string) {
    const request = await ResourceRequest.findById(requestId);
    if (!request) throw new ApiError(404, "Request not found");

    const shelter = await Shelter.findById(request.shelter);
    if (!shelter) throw new ApiError(404, "Shelter not found");

    const [lng, lat] = shelter.location.coordinates;
    const radius = env.DEFAULT_MATCH_RADIUS_METERS;

    const volunteers = await Volunteer.find({
      availability: "available",
      skills: request.resourceType,
      location: nearQuery(lng, lat, radius),
    })
      .populate("userId", "name email phone")
      .limit(25);

    const fallback =
      volunteers.length > 0
        ? volunteers
        : await Volunteer.find({
            availability: "available",
            location: nearQuery(lng, lat, radius),
          })
            .populate("userId", "name email phone")
            .limit(25);

    const created = [];
    for (const volunteer of fallback) {
      const assignment = await Assignment.findOneAndUpdate(
        { request: request.id, assignee: volunteer.id },
        {
          request: request.id,
          assigneeType: "volunteer",
          assignee: volunteer.id,
          assignedBy: actorId,
          status: "notified",
          notes: "Auto-dispatched for critical need",
        },
        { new: true, upsert: true, setDefaultsOnInsert: true }
      );
      created.push(assignment);

      const user = volunteer.userId as unknown as {
        id: string;
        email?: string;
        phone?: string;
        name?: string;
      };

      if (user?.id) {
        await enqueueNotification({
          userId: user.id,
          title: "Critical need nearby",
          message: `${shelter.shelterName} needs ${request.quantity} ${request.unit} of ${request.resourceType}.`,
          channel: "in_app",
          metadata: { requestId: request.id, shelterId: shelter.id },
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

    const admins = await User.find({
      role: { $in: ["admin", "ngo_manager"] },
      isActive: true,
    }).select("email");

    for (const admin of admins) {
      await enqueueEmail({
        to: admin.email,
        subject: "Critical need activated",
        html: `<p>Critical request created at ${shelter.shelterName}. ${created.length} nearby volunteers notified.</p>`,
      });
    }

    if (created.length && request.status === "open") {
      request.status = "matched";
      await request.save();
    }

    emitEvent(
      SOCKET_EVENTS.REQUEST_CRITICAL,
      { request, notified: created.length, shelter },
      "dashboard"
    );

    logger.info("Critical request dispatched", {
      requestId,
      notified: created.length,
    });

    return { request, notified: created.length, assignments: created };
  },
};
