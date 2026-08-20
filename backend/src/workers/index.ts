import { Worker } from "bullmq";
import { redis } from "../config/redis";
import { QUEUE_NAMES } from "../utils/constants";
import { logger } from "../config/logger";
import { sendEmail } from "../services/email.service";
import { sendSms } from "../services/sms.service";
import Notification from "../models/notification.model";
import { emitEvent } from "../sockets";
import { SOCKET_EVENTS } from "../utils/constants";

export function startWorkers() {
  const emailWorker = new Worker(
    QUEUE_NAMES.email,
    async (job) => {
      await sendEmail(job.data);
    },
    { connection: redis }
  );

  const smsWorker = new Worker(
    QUEUE_NAMES.sms,
    async (job) => {
      await sendSms(job.data.to, job.data.body);
    },
    { connection: redis }
  );

  const notificationWorker = new Worker(
    QUEUE_NAMES.notification,
    async (job) => {
      const { userId, title, message, channel, metadata } = job.data;
      const notification = await Notification.create({
        user: userId,
        title,
        message,
        channel,
        status: "sent",
        metadata,
      });

      emitEvent(SOCKET_EVENTS.NOTIFICATION_NEW, notification, `user:${userId}`);

      if (channel === "email" && metadata?.email) {
        await sendEmail({
          to: String(metadata.email),
          subject: title,
          html: `<p>${message}</p>`,
          text: message,
        });
      }

      if (channel === "sms" && metadata?.phone) {
        await sendSms(String(metadata.phone), `${title}: ${message}`);
      }
    },
    { connection: redis }
  );

  for (const worker of [emailWorker, smsWorker, notificationWorker]) {
    worker.on("completed", (job) =>
      logger.info("Queue job completed", { queue: worker.name, jobId: job?.id })
    );
    worker.on("failed", (job, error) =>
      logger.error("Queue job failed", {
        queue: worker.name,
        jobId: job?.id,
        error: error.message,
      })
    );
  }

  logger.info("BullMQ workers started");
  return { emailWorker, smsWorker, notificationWorker };
}
