import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { notificationService } from "../services/notification.service";

export const listNotifications = asyncHandler(async (req: Request, res: Response) => {
  const data = await notificationService.list(req.user!.id, req.query as never);
  res.json(new ApiResponse(200, "Notifications fetched", data));
});

export const markRead = asyncHandler(async (req: Request, res: Response) => {
  const item = await notificationService.markRead(req.user!.id, req.params.id);
  res.json(new ApiResponse(200, "Notification marked as read", item));
});

export const markAllRead = asyncHandler(async (req: Request, res: Response) => {
  await notificationService.markAllRead(req.user!.id);
  res.json(new ApiResponse(200, "All notifications marked as read", null));
});
