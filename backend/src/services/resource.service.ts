import Resource from "../models/resource.model";
import Shelter from "../models/shelter.model";
import { ApiError } from "../utils/ApiError";
import { logActivity } from "./activityLog.service";
import { enqueueEmail, enqueueNotification } from "../queues";
import User from "../models/user.model";
import { SOCKET_EVENTS } from "../utils/constants";
import { emitEvent } from "../sockets";

export const resourceService = {
  async upsert(
    userId: string,
    shelterId: string,
    input: {
      resourceType: string;
      quantity: number;
      unit: string;
      minThreshold?: number;
    }
  ) {
    const shelter = await Shelter.findById(shelterId);
    if (!shelter) throw new ApiError(404, "Shelter not found");

    const resource = await Resource.findOneAndUpdate(
      { shelter: shelterId, resourceType: input.resourceType },
      {
        shelter: shelterId,
        resourceType: input.resourceType,
        quantity: input.quantity,
        unit: input.unit,
        minThreshold: input.minThreshold ?? 10,
        lastUpdatedBy: userId,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    if (resource.quantity <= resource.minThreshold) {
      const admins = await User.find({
        role: { $in: ["admin", "ngo_manager"] },
        isActive: true,
      }).select("email");

      for (const admin of admins) {
        await enqueueNotification({
          userId: admin.id,
          title: "Low stock alert",
          message: `${resource.resourceType} at ${shelter.shelterName} is below threshold (${resource.quantity} ${resource.unit}).`,
          channel: "email",
          metadata: { email: admin.email, shelterId, resourceId: resource.id },
        });
        await enqueueEmail({
          to: admin.email,
          subject: "Critical resource shortage",
          html: `<p>${resource.resourceType} at <b>${shelter.shelterName}</b> is low: ${resource.quantity} ${resource.unit}.</p>`,
        });
      }

      emitEvent(SOCKET_EVENTS.SHELTER_UPDATED, { shelter, resource }, "dashboard");
    }

    await logActivity({
      actor: userId,
      action: "resource.upserted",
      entityType: "Resource",
      entityId: resource.id,
    });
    return resource;
  },

  async listByShelter(shelterId: string) {
    return Resource.find({ shelter: shelterId }).sort({ resourceType: 1 });
  },

  async update(
    userId: string,
    id: string,
    input: { quantity?: number; unit?: string; minThreshold?: number }
  ) {
    const resource = await Resource.findByIdAndUpdate(
      id,
      { ...input, lastUpdatedBy: userId },
      { new: true, runValidators: true }
    );
    if (!resource) throw new ApiError(404, "Resource not found");
    return resource;
  },

  async lowStock() {
    return Resource.find({
      $expr: { $lte: ["$quantity", "$minThreshold"] },
    }).populate("shelter", "shelterName city status");
  },
};
