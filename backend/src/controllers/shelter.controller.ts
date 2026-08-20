import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { shelterService } from "../services/shelter.service";

export const createShelter = asyncHandler(async (req: Request, res: Response) => {
  const shelter = await shelterService.create(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, "Shelter created", shelter));
});

export const listShelters = asyncHandler(async (req: Request, res: Response) => {
  const data = await shelterService.list(req.query as never);
  res.json(new ApiResponse(200, "Shelters fetched", data));
});

export const nearbyShelters = asyncHandler(async (req: Request, res: Response) => {
  const { lng, lat, radius } = req.query as { lng: string; lat: string; radius?: string };
  const items = await shelterService.nearby(Number(lng), Number(lat), Number(radius) || undefined);
  res.json(new ApiResponse(200, "Nearby shelters fetched", items));
});

export const getShelter = asyncHandler(async (req: Request, res: Response) => {
  const shelter = await shelterService.getById(req.params.id);
  res.json(new ApiResponse(200, "Shelter fetched", shelter));
});

export const updateShelter = asyncHandler(async (req: Request, res: Response) => {
  const shelter = await shelterService.update(req.user!.id, req.params.id, req.body);
  res.json(new ApiResponse(200, "Shelter updated", shelter));
});

export const updateOccupancy = asyncHandler(async (req: Request, res: Response) => {
  const shelter = await shelterService.updateOccupancy(
    req.user!.id,
    req.params.id,
    req.body.occupied,
    req.body.status
  );
  res.json(new ApiResponse(200, "Occupancy updated", shelter));
});

export const deleteShelter = asyncHandler(async (req: Request, res: Response) => {
  await shelterService.remove(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "Shelter deleted", null));
});
