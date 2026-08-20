import type { NextFunction, Request, Response } from "express";
import { ApiError } from "../utils/ApiError";
import { verifyAccessToken } from "../utils/tokens";
import type { UserRole } from "../types";
import User from "../models/user.model";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  try {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : undefined;

    if (!token) {
      throw new ApiError(401, "Authentication required");
    }

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select("name email role isActive");

    if (!user || !user.isActive) {
      throw new ApiError(401, "Invalid or inactive user");
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    };

    next();
  } catch (error) {
    if (error instanceof ApiError) return next(error);
    next(new ApiError(401, "Invalid or expired access token"));
  }
};

export const authorize =
  (...roles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new ApiError(401, "Authentication required"));
    }
    if (!roles.includes(req.user.role)) {
      return next(new ApiError(403, "You do not have permission for this action"));
    }
    next();
  };

export const optionalAuth = async (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.split(" ")[1] : undefined;
  if (!token) return next();

  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id).select("name email role isActive");
    if (user?.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
    }
  } catch {
    // ignore optional auth failures
  }
  next();
};
