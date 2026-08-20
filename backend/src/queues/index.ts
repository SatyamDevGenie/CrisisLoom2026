import { Queue } from "bullmq";
import { redis } from "../config/redis";
import { QUEUE_NAMES } from "../utils/constants";

const connection = redis;

export const emailQueue = new Queue(QUEUE_NAMES.email, { connection });
export const smsQueue = new Queue(QUEUE_NAMES.sms, { connection });
export const notificationQueue = new Queue(QUEUE_NAMES.notification, {
  connection,
});

export async function enqueueEmail(data: {
  to: string;
  subject: string;
  html: string;
  text?: string;
}) {
  return emailQueue.add("send-email", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

export async function enqueueSms(data: { to: string; body: string }) {
  return smsQueue.add("send-sms", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 2000 },
    removeOnComplete: 100,
    removeOnFail: 50,
  });
}

export async function enqueueNotification(data: {
  userId: string;
  title: string;
  message: string;
  channel: "email" | "sms" | "in_app";
  metadata?: Record<string, unknown>;
}) {
  return notificationQueue.add("send-notification", data, {
    attempts: 3,
    backoff: { type: "exponential", delay: 1500 },
    removeOnComplete: 200,
    removeOnFail: 50,
  });
}
