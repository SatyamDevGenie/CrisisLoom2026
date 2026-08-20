import Notification from "../models/notification.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";

export const notificationService = {
  async list(userId: string, query: { page?: number; limit?: number }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter = { user: userId };
    const [items, total] = await Promise.all([
      Notification.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      Notification.countDocuments(filter),
    ]);
    return { items, meta: paginationMeta(total, page, limit) };
  },

  async markRead(userId: string, id: string) {
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: userId },
      { isRead: true },
      { new: true }
    );
    if (!notification) throw new ApiError(404, "Notification not found");
    return notification;
  },

  async markAllRead(userId: string) {
    await Notification.updateMany({ user: userId, isRead: false }, { isRead: true });
  },
};
