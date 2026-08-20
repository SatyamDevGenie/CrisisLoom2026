import winston from "winston";
import { env } from "./env";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

const consoleFormat = printf(({ level, message, timestamp: ts, stack, ...meta }) => {
  const extra = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${ts} [${level}] ${stack || message}${extra}`;
});

export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  defaultMeta: { service: "crisisloom-api" },
  format: combine(timestamp(), errors({ stack: true })),
  transports: [
    new winston.transports.Console({
      format: combine(
        colorize(),
        timestamp(),
        errors({ stack: true }),
        consoleFormat
      ),
    }),
    new winston.transports.File({
      filename: "logs/error.log",
      level: "error",
      format: combine(timestamp(), json()),
    }),
    new winston.transports.File({
      filename: "logs/combined.log",
      format: combine(timestamp(), json()),
    }),
  ],
});
