import crypto from "crypto";
import type { NextFunction, Request, Response } from "express";
import morgan from "morgan";
import { logger } from "../config/logger";

export function requestId(req: Request, res: Response, next: NextFunction) {
  req.requestId = crypto.randomUUID();
  res.setHeader("X-Request-Id", req.requestId);
  next();
}

export const httpLogger = morgan("combined", {
  stream: {
    write(message: string) {
      logger.http(message.trim());
    },
  },
});
