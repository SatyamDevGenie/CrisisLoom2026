import User from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import {
  generateOtp,
  hashToken,
  parseExpiryToMs,
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/tokens";
import { env } from "../config/env";
import { COOKIE_NAMES } from "../utils/constants";
import type { AuthUser, UserRole } from "../types";
import { enqueueEmail } from "../queues";
import { logActivity } from "./activityLog.service";
import type { CookieOptions, Response } from "express";

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    maxAge: parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN),
    path: "/",
  };
}

function toAuthUser(user: {
  id: string;
  email: string;
  role: UserRole;
  name: string;
}): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  };
}

export const authService = {
  async register(input: {
    name: string;
    email: string;
    password: string;
    phone?: string;
    role: UserRole;
  }) {
    const exists = await User.findOne({ email: input.email.toLowerCase() });
    if (exists) throw new ApiError(409, "Email already registered");

    const user = await User.create(input);
    await logActivity({
      actor: user.id,
      action: "auth.register",
      entityType: "User",
      entityId: user.id,
    });

    return this.issueTokens(user);
  },

  async login(
    email: string,
    password: string,
    meta: { userAgent?: string; ip?: string }
  ) {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password +refreshTokens"
    );
    if (!user) throw new ApiError(401, "Invalid credentials");
    if (!user.isActive) throw new ApiError(403, "Account is disabled");

    const valid = await user.comparePassword(password);
    if (!valid) throw new ApiError(401, "Invalid credentials");

    user.lastLogin = new Date();
    return this.issueTokens(user, meta);
  },

  async issueTokens(
    user: InstanceType<typeof User>,
    meta: { userAgent?: string; ip?: string } = {}
  ) {
    const authUser = toAuthUser({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    });
    const accessToken = signAccessToken(authUser);
    const refreshToken = signRefreshToken({ id: user.id });

    user.refreshTokens.push({
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + parseExpiryToMs(env.JWT_REFRESH_EXPIRES_IN)),
      userAgent: meta.userAgent,
      ip: meta.ip,
    });

    if (user.refreshTokens.length > 10) {
      user.refreshTokens = user.refreshTokens.slice(-10);
    }

    await user.save();

    return {
      user: authUser,
      accessToken,
      refreshToken,
    };
  },

  attachRefreshCookie(res: Response, refreshToken: string) {
    res.cookie(COOKIE_NAMES.refreshToken, refreshToken, cookieOptions());
  },

  clearRefreshCookie(res: Response) {
    res.clearCookie(COOKIE_NAMES.refreshToken, { path: "/" });
  },

  async refresh(refreshToken?: string, cookieToken?: string) {
    const token = refreshToken || cookieToken;
    if (!token) throw new ApiError(401, "Refresh token missing");

    let payload: { id: string };
    try {
      payload = verifyRefreshToken(token);
    } catch {
      throw new ApiError(401, "Invalid refresh token");
    }

    const user = await User.findById(payload.id).select("+refreshTokens");
    if (!user || !user.isActive) throw new ApiError(401, "Invalid refresh token");

    const hashed = hashToken(token);
    const session = user.refreshTokens.find((item) => item.tokenHash === hashed);
    if (!session || session.expiresAt < new Date()) {
      throw new ApiError(401, "Refresh token expired or revoked");
    }

    user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== hashed);
    return this.issueTokens(user);
  },

  async logout(userId: string, refreshToken?: string, cookieToken?: string) {
    const token = refreshToken || cookieToken;
    const user = await User.findById(userId).select("+refreshTokens");
    if (!user) return;

    if (token) {
      const hashed = hashToken(token);
      user.refreshTokens = user.refreshTokens.filter((item) => item.tokenHash !== hashed);
    } else {
      user.refreshTokens = [];
    }
    await user.save();
  },

  async me(userId: string) {
    const user = await User.findById(userId);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await User.findById(userId).select("+password");
    if (!user) throw new ApiError(404, "User not found");
    const valid = await user.comparePassword(currentPassword);
    if (!valid) throw new ApiError(400, "Current password is incorrect");
    user.password = newPassword;
    user.refreshTokens = [];
    await user.save();
  },

  async forgotPassword(email: string) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) return;

    const otp = generateOtp();
    user.resetPasswordToken = hashToken(otp);
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000);
    await user.save();

    await enqueueEmail({
      to: user.email,
      subject: "Password reset OTP",
      html: `<p>Your CrisisLoom reset OTP is <b>${otp}</b>. It expires in 15 minutes.</p>`,
      text: `Your reset OTP is ${otp}`,
    });
  },

  async resetPassword(email: string, otp: string, password: string) {
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+resetPasswordToken +resetPasswordExpires +password"
    );
    if (
      !user ||
      !user.resetPasswordToken ||
      !user.resetPasswordExpires ||
      user.resetPasswordExpires < new Date() ||
      user.resetPasswordToken !== hashToken(otp)
    ) {
      throw new ApiError(400, "Invalid or expired OTP");
    }

    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    user.refreshTokens = [];
    await user.save();
  },
};
