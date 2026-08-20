import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { volunteerService } from "../services/volunteer.service";

export const createVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const volunteer = await volunteerService.upsertProfile(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, "Volunteer profile saved", volunteer));
});

export const listVolunteers = asyncHandler(async (req: Request, res: Response) => {
  const data = await volunteerService.list(req.query as never);
  res.json(new ApiResponse(200, "Volunteers fetched", data));
});

export const nearbyVolunteers = asyncHandler(async (req: Request, res: Response) => {
  const { lng, lat, radius, skill } = req.query as {
    lng: string;
    lat: string;
    radius?: string;
    skill?: string;
  };
  const items = await volunteerService.nearby(
    Number(lng),
    Number(lat),
    Number(radius) || undefined,
    skill as never
  );
  res.json(new ApiResponse(200, "Nearby volunteers fetched", items));
});

export const myVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const volunteer = await volunteerService.me(req.user!.id);
  res.json(new ApiResponse(200, "Volunteer profile fetched", volunteer));
});

export const getVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const volunteer = await volunteerService.getById(req.params.id);
  res.json(new ApiResponse(200, "Volunteer fetched", volunteer));
});

export const updateMyVolunteer = asyncHandler(async (req: Request, res: Response) => {
  const volunteer = await volunteerService.updateMe(req.user!.id, req.body);
  res.json(new ApiResponse(200, "Volunteer profile updated", volunteer));
});

export const updateVolunteerLocation = asyncHandler(async (req: Request, res: Response) => {
  const volunteer = await volunteerService.updateLocation(
    req.user!.id,
    req.body.lng,
    req.body.lat
  );
  res.json(new ApiResponse(200, "Location updated", volunteer));
});

export const updateAvailability = asyncHandler(async (req: Request, res: Response) => {
  const volunteer = await volunteerService.updateAvailability(
    req.user!.id,
    req.body.availability
  );
  res.json(new ApiResponse(200, "Availability updated", volunteer));
});
