import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { assignmentService } from "../services/assignment.service";

export const createAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await assignmentService.create(req.user!.id, req.body);
  res.status(201).json(new ApiResponse(201, "Assignment created", assignment));
});

export const listAssignments = asyncHandler(async (req: Request, res: Response) => {
  const query = req.query as {
    page?: number;
    limit?: number;
    status?: string;
    request?: string;
  };
  const data = await assignmentService.list({
    page: query.page,
    limit: query.limit,
    status: query.status,
    request: query.request,
    userId: req.user!.id,
    role: req.user!.role,
  });
  res.json(new ApiResponse(200, "Assignments fetched", data));
});

export const acceptAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await assignmentService.accept(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "Assignment accepted", assignment));
});

export const rejectAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await assignmentService.reject(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "Assignment rejected", assignment));
});

export const completeAssignment = asyncHandler(async (req: Request, res: Response) => {
  const assignment = await assignmentService.complete(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "Assignment completed", assignment));
});
