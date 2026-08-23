import OutboxEvent from "../models/outbox.model";
import { emitEvent } from "../sockets";
import { CACHE_KEYS, OUTBOX_EVENTS, SOCKET_EVENTS } from "../utils/constants";
import { cacheService } from "./cache.service";
import { matchingService } from "./matching.service";
import { logger } from "../config/logger";

export async function flushOutbox(limit = 50) {
  const events = await OutboxEvent.find({ status: "pending" })
    .sort({ createdAt: 1 })
    .limit(limit);

  for (const event of events) {
    try {
      event.attempts += 1;
      const payload = event.payload;

      if (event.eventType === OUTBOX_EVENTS.REQUEST_CREATED) {
        emitEvent(SOCKET_EVENTS.REQUEST_CREATED, payload, "dashboard");
        if (payload.shelterId) {
          emitEvent(
            SOCKET_EVENTS.REQUEST_CREATED,
            payload,
            `shelter:${payload.shelterId}`
          );
        }
        await cacheService.del(CACHE_KEYS.dashboardStats);
      }

      if (event.eventType === OUTBOX_EVENTS.REQUEST_CRITICAL) {
        emitEvent(SOCKET_EVENTS.REQUEST_CRITICAL, payload, "dashboard");
        await matchingService.dispatchCriticalRequest(
          String(payload.requestId),
          String(payload.actorId)
        );
      }

      event.status = "published";
      event.publishedAt = new Date();
      event.lastError = undefined;
      await event.save();
    } catch (error) {
      event.lastError = error instanceof Error ? error.message : "Outbox publish failed";
      if (event.attempts >= 8) {
        event.status = "failed";
      }
      await event.save();
      logger.error("Outbox event failed", {
        eventId: event.id,
        eventType: event.eventType,
        error: event.lastError,
      });
    }
  }

  return events.length;
}
