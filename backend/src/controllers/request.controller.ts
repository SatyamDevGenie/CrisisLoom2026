import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { requestService } from "../services/request.service";

export const createRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await requestService.create(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, "Resource request created", request));
});

export const listRequests = asyncHandler(async (req: Request, res: Response) => {
  const data = await requestService.list(req.query as never);
  res.json(new ApiResponse(200, "Requests fetched", data));
});

export const getRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await requestService.getById(req.params.id);
  res.json(new ApiResponse(200, "Request fetched", request));
});

export const updateRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await requestService.update(req.user!.id, req.params.id, req.body);
  res.json(new ApiResponse(200, "Request updated", request));
});

export const cancelRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await requestService.cancel(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "Request cancelled", request));
});

export const fulfillRequest = asyncHandler(async (req: Request, res: Response) => {
  const request = await requestService.fulfill(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "Request fulfilled", request));
});
