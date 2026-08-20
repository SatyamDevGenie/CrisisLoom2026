import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { donorService } from "../services/donor.service";

export const createDonor = asyncHandler(async (req: Request, res: Response) => {
  const donor = await donorService.upsertProfile(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, "Donor profile saved", donor));
});

export const listDonors = asyncHandler(async (req: Request, res: Response) => {
  const data = await donorService.list(req.query as never);
  res.json(new ApiResponse(200, "Donors fetched", data));
});

export const nearbyDonors = asyncHandler(async (req: Request, res: Response) => {
  const { lng, lat, radius } = req.query as { lng: string; lat: string; radius?: string };
  const items = await donorService.nearby(Number(lng), Number(lat), Number(radius) || undefined);
  res.json(new ApiResponse(200, "Nearby donors fetched", items));
});

export const myDonor = asyncHandler(async (req: Request, res: Response) => {
  const donor = await donorService.me(req.user!.id);
  res.json(new ApiResponse(200, "Donor profile fetched", donor));
});

export const getDonor = asyncHandler(async (req: Request, res: Response) => {
  const donor = await donorService.getById(req.params.id);
  res.json(new ApiResponse(200, "Donor fetched", donor));
});

export const updateMyDonor = asyncHandler(async (req: Request, res: Response) => {
  const donor = await donorService.updateMe(req.user!.id, req.body);
  res.json(new ApiResponse(200, "Donor profile updated", donor));
});
