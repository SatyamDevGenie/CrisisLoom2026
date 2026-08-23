import mongoose, { type ClientSession } from "mongoose";
import ResourceRequest from "../models/resourceRequest.model";
import OutboxEvent from "../models/outbox.model";
import { enqueueOutboxFlush } from "../queues";
import { logger } from "../config/logger";
import { OUTBOX_EVENTS } from "../utils/constants";

function isReplicaSetRequired(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("replica set") ||
    message.includes("Transaction numbers are only allowed")
  );
}

async function insertRequestAndOutbox(
  userId: string,
  input: Record<string, unknown>,
  session?: ClientSession
) {
  const options = session ? { session } : {};
  const [request] = await ResourceRequest.create(
    [{ ...input, requestedBy: userId }],
    Object.keys(options).length ? options : undefined
  );

  const events: Array<{
    eventType: string;
    aggregateType: string;
    aggregateId: string;
    payload: Record<string, unknown>;
    status: "pending";
  }> = [
    {
      eventType: OUTBOX_EVENTS.REQUEST_CREATED,
      aggregateType: "ResourceRequest",
      aggregateId: request.id,
      payload: {
        requestId: request.id,
        shelterId: String(request.shelter),
        priority: request.priority,
        actorId: userId,
      },
      status: "pending",
    },
  ];

  if (request.priority === "critical") {
    events.push({
      eventType: OUTBOX_EVENTS.REQUEST_CRITICAL,
      aggregateType: "ResourceRequest",
      aggregateId: request.id,
      payload: {
        requestId: request.id,
        actorId: userId,
      },
      status: "pending",
    });
  }

  await OutboxEvent.create(events, Object.keys(options).length ? options : undefined);
  return request;
}

export async function createRequestWithOutbox(
  userId: string,
  input: Record<string, unknown>
) {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const request = await insertRequestAndOutbox(userId, input, session);
    await session.commitTransaction();
    await enqueueOutboxFlush().catch((error) =>
      logger.warn("Outbox flush enqueue failed; worker will retry", {
        error: error instanceof Error ? error.message : error,
      })
    );
    return request;
  } catch (error) {
    await session.abortTransaction().catch(() => undefined);
    if (isReplicaSetRequired(error)) {
      const request = await insertRequestAndOutbox(userId, input);
      await enqueueOutboxFlush().catch(() => undefined);
      return request;
    }
    throw error;
  } finally {
    session.endSession();
  }
}
