import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { ApiError } from "../utils/ApiError";
import { userService } from "../services/user.service";

export const listUsers = asyncHandler(async (req: Request, res: Response) => {
  const data = await userService.list(req.query as never);
  res.json(new ApiResponse(200, "Users fetched", data));
});

export const getUser = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.getById(req.params.id);
  res.json(new ApiResponse(200, "User fetched", user));
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  if (req.user!.id !== req.params.id && req.user!.role !== "admin") {
    throw new ApiError(403, "You can only update your own profile");
  }
  const user = await userService.update(req.params.id, req.body);
  res.json(new ApiResponse(200, "User updated", user));
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateRole(req.user!.id, req.params.id, req.body.role);
  res.json(new ApiResponse(200, "Role updated", user));
});

export const updateStatus = asyncHandler(async (req: Request, res: Response) => {
  const user = await userService.updateStatus(
    req.user!.id,
    req.params.id,
    req.body.isActive
  );
  res.json(new ApiResponse(200, "Status updated", user));
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  await userService.remove(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "User deleted", null));
});
