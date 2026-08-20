import User from "../models/user.model";
import Shelter from "../models/shelter.model";
import Volunteer from "../models/volunteer.model";
import Disaster from "../models/disaster.model";
import ResourceRequest from "../models/resourceRequest.model";
import Assignment from "../models/assignment.model";
import Resource from "../models/resource.model";
import { cacheService } from "./cache.service";
import { CACHE_KEYS, CACHE_TTL } from "../utils/constants";
import { listActivity } from "./activityLog.service";

export const dashboardService = {
  async stats() {
    const cached = await cacheService.get(CACHE_KEYS.dashboardStats);
    if (cached) return cached;

    const [
      users,
      shelters,
      volunteers,
      activeDisasters,
      openRequests,
      criticalRequests,
      assignmentsInProgress,
      lowStock,
    ] = await Promise.all([
      User.countDocuments({ isActive: true }),
      Shelter.countDocuments({ status: { $in: ["active", "emergency", "full"] } }),
      Volunteer.countDocuments({ availability: "available" }),
      Disaster.countDocuments({ status: { $in: ["active", "contained"] } }),
      ResourceRequest.countDocuments({ status: { $in: ["open", "matched", "in_progress"] } }),
      ResourceRequest.countDocuments({
        priority: "critical",
        status: { $ne: "fulfilled" },
      }),
      Assignment.countDocuments({ status: { $in: ["notified", "accepted", "in_progress"] } }),
      Resource.countDocuments({ $expr: { $lte: ["$quantity", "$minThreshold"] } }),
    ]);

    const stats = {
      users,
      shelters,
      availableVolunteers: volunteers,
      activeDisasters,
      openRequests,
      criticalRequests,
      assignmentsInProgress,
      lowStock,
      generatedAt: new Date().toISOString(),
    };

    await cacheService.set(CACHE_KEYS.dashboardStats, stats, CACHE_TTL.dashboard);
    return stats;
  },

  async activity(limit = 50) {
    return listActivity(limit);
  },
};
