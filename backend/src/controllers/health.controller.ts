import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { healthService } from "../services/health.service";

export const live = asyncHandler(async (_req: Request, res: Response) => {
  const data = await healthService.live();
  res.json(new ApiResponse(200, "API is healthy", data));
});

export const ready = asyncHandler(async (_req: Request, res: Response) => {
  const data = await healthService.ready();
  const code = data.status === "ready" ? 200 : 503;
  res.status(code).json(new ApiResponse(code, "Readiness check", data));
});
