import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { resourceService } from "../services/resource.service";

export const upsertResource = asyncHandler(async (req: Request, res: Response) => {
  const resource = await resourceService.upsert(
    req.user!.id,
    req.params.shelterId,
    req.body
  );
  res.status(201).json(new ApiResponse(201, "Resource saved", resource));
});

export const listShelterResources = asyncHandler(async (req: Request, res: Response) => {
  const items = await resourceService.listByShelter(req.params.shelterId);
  res.json(new ApiResponse(200, "Resources fetched", items));
});

export const updateResource = asyncHandler(async (req: Request, res: Response) => {
  const resource = await resourceService.update(req.user!.id, req.params.id, req.body);
  res.json(new ApiResponse(200, "Resource updated", resource));
});

export const lowStock = asyncHandler(async (_req: Request, res: Response) => {
  const items = await resourceService.lowStock();
  res.json(new ApiResponse(200, "Low stock resources fetched", items));
});
