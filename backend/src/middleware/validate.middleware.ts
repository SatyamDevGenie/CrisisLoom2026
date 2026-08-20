import type { NextFunction, Request, Response } from "express";
import { ZodSchema } from "zod";
import { ApiError } from "../utils/ApiError";

export const validate =
  (schema: ZodSchema) =>
  (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse({
      body: req.body,
      query: req.query,
      params: req.params,
    });

    if (!result.success) {
      throw new ApiError(400, "Validation failed", result.error.flatten());
    }

    const data = result.data as {
      body?: Record<string, unknown>;
      query?: Record<string, unknown>;
      params?: Record<string, unknown>;
    };

    if (data.body) req.body = data.body;
    if (data.params) req.params = data.params as Request["params"];
    if (data.query) {
      Object.assign(req.query, data.query);
    }

    next();
  };
