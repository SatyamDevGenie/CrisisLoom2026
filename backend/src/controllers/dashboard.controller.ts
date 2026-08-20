import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { dashboardService } from "../services/dashboard.service";

export const getStats = asyncHandler(async (_req: Request, res: Response) => {
  const stats = await dashboardService.stats();
  res.json(new ApiResponse(200, "Dashboard stats fetched", stats));
});

export const getActivity = asyncHandler(async (req: Request, res: Response) => {
  const items = await dashboardService.activity(Number(req.query.limit) || 50);
  res.json(new ApiResponse(200, "Activity fetched", items));
});
