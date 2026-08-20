import twilio from "twilio";
import { env } from "../config/env";
import { logger } from "../config/logger";

const client =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN
    ? twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN)
    : null;

export async function sendSms(to: string, body: string) {
  if (!client || !env.TWILIO_PHONE_NUMBER) {
    logger.info("SMS skipped (Twilio not configured)", { to, body });
    return { delivered: false, mocked: true };
  }

  await client.messages.create({
    from: env.TWILIO_PHONE_NUMBER,
    to,
    body,
  });

  logger.info("SMS sent", { to });
  return { delivered: true, mocked: false };
}
