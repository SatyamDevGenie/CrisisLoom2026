import User from "../models/user.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import type { UserRole } from "../types";
import { logActivity } from "./activityLog.service";

export const userService = {
  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    role?: UserRole;
    isActive?: boolean;
  }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.role) filter.role = query.role;
    if (typeof query.isActive === "boolean") filter.isActive = query.isActive;
    if (query.search) {
      filter.$or = [
        { name: { $regex: query.search, $options: "i" } },
        { email: { $regex: query.search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const user = await User.findById(id);
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },

  async update(id: string, data: { name?: string; phone?: string; avatar?: string }) {
    const user = await User.findByIdAndUpdate(id, data, {
      new: true,
      runValidators: true,
    });
    if (!user) throw new ApiError(404, "User not found");
    return user;
  },

  async updateRole(actorId: string, id: string, role: UserRole) {
    const user = await User.findByIdAndUpdate(id, { role }, { new: true });
    if (!user) throw new ApiError(404, "User not found");
    await logActivity({
      actor: actorId,
      action: "user.role_updated",
      entityType: "User",
      entityId: id,
      metadata: { role },
    });
    return user;
  },

  async updateStatus(actorId: string, id: string, isActive: boolean) {
    const user = await User.findByIdAndUpdate(id, { isActive }, { new: true });
    if (!user) throw new ApiError(404, "User not found");
    await logActivity({
      actor: actorId,
      action: "user.status_updated",
      entityType: "User",
      entityId: id,
      metadata: { isActive },
    });
    return user;
  },

  async remove(actorId: string, id: string) {
    const user = await User.findByIdAndDelete(id);
    if (!user) throw new ApiError(404, "User not found");
    await logActivity({
      actor: actorId,
      action: "user.deleted",
      entityType: "User",
      entityId: id,
    });
  },
};
