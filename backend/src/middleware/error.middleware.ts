import type { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { ZodError } from "zod";
import { logger } from "../config/logger";
import { env } from "../config/env";
import { ApiError } from "../utils/ApiError";
import { ApiResponse } from "../utils/ApiResponse";

export function notFound(_req: Request, _res: Response, next: NextFunction) {
  next(new ApiError(404, "Route not found"));
}

export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  let statusCode = 500;
  let message = "Internal server error";
  let errors: unknown;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    errors = err.errors;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation failed";
    errors = err.flatten();
  } else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Database validation failed";
    errors = Object.values(err.errors).map((item) => item.message);
  } else if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid identifier";
  } else if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    (err as { code?: number }).code === 11000
  ) {
    statusCode = 409;
    message = "Duplicate value";
    errors = (err as { keyValue?: unknown }).keyValue;
  } else if (err instanceof Error) {
    message = env.NODE_ENV === "production" ? message : err.message;
  }

  logger.error(message, {
    requestId: req.requestId,
    path: req.originalUrl,
    method: req.method,
    statusCode,
    stack: err instanceof Error ? err.stack : undefined,
  });

  res
    .status(statusCode)
    .json(new ApiResponse(statusCode, message, errors ?? null));
}
