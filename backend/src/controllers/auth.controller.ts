import type { Request, Response } from "express";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/ApiResponse";
import { authService } from "../services/auth.service";
import { COOKIE_NAMES } from "../utils/constants";

export const register = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.register(req.body);
  authService.attachRefreshCookie(res, result.refreshToken);
  res.status(201).json(new ApiResponse(201, "Registered successfully", result));
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.login(req.body.email, req.body.password, {
    userAgent: req.get("user-agent") || undefined,
    ip: req.ip,
  });
  authService.attachRefreshCookie(res, result.refreshToken);
  res.json(new ApiResponse(200, "Login successful", result));
});

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const result = await authService.refresh(
    req.body.refreshToken,
    req.cookies?.[COOKIE_NAMES.refreshToken]
  );
  authService.attachRefreshCookie(res, result.refreshToken);
  res.json(new ApiResponse(200, "Token refreshed", result));
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  await authService.logout(
    req.user!.id,
    req.body.refreshToken,
    req.cookies?.[COOKIE_NAMES.refreshToken]
  );
  authService.clearRefreshCookie(res);
  res.json(new ApiResponse(200, "Logged out", null));
});

export const me = asyncHandler(async (req: Request, res: Response) => {
  const user = await authService.me(req.user!.id);
  res.json(new ApiResponse(200, "Current user", user));
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.changePassword(
    req.user!.id,
    req.body.currentPassword,
    req.body.newPassword
  );
  authService.clearRefreshCookie(res);
  res.json(new ApiResponse(200, "Password updated", null));
});

export const forgotPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.forgotPassword(req.body.email);
  res.json(new ApiResponse(200, "If the email exists, an OTP has been queued", null));
});

export const resetPassword = asyncHandler(async (req: Request, res: Response) => {
  await authService.resetPassword(req.body.email, req.body.otp, req.body.password);
  res.json(new ApiResponse(200, "Password reset successful", null));
});
