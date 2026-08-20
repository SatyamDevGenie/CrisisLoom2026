import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { disasterService } from "../services/disaster.service";

export const createDisaster = asyncHandler(async (req: Request, res: Response) => {
  const disaster = await disasterService.create(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, "Disaster created", disaster));
});

export const listDisasters = asyncHandler(async (req: Request, res: Response) => {
  const data = await disasterService.list(req.query as never);
  res.json(new ApiResponse(200, "Disasters fetched", data));
});

export const activeDisasters = asyncHandler(async (_req: Request, res: Response) => {
  const items = await disasterService.active();
  res.json(new ApiResponse(200, "Active disasters fetched", items));
});

export const getDisaster = asyncHandler(async (req: Request, res: Response) => {
  const disaster = await disasterService.getById(req.params.id);
  res.json(new ApiResponse(200, "Disaster fetched", disaster));
});

export const updateDisaster = asyncHandler(async (req: Request, res: Response) => {
  const disaster = await disasterService.update(req.user!.id, req.params.id, req.body);
  res.json(new ApiResponse(200, "Disaster updated", disaster));
});

export const nearbyAssets = asyncHandler(async (req: Request, res: Response) => {
  const data = await disasterService.nearbyAssets(req.params.id);
  res.json(new ApiResponse(200, "Nearby assets fetched", data));
});
