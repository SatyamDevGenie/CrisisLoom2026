import Disaster from "../models/disaster.model";
import Shelter from "../models/shelter.model";
import Volunteer from "../models/volunteer.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import { toGeoPoint, nearQuery } from "../utils/geo";
import { cacheService } from "./cache.service";
import { CACHE_KEYS, CACHE_TTL, SOCKET_EVENTS } from "../utils/constants";
import { emitEvent } from "../sockets";
import { logActivity } from "./activityLog.service";
import type { DisasterStatus, DisasterType, SeverityLevel } from "../types";

export const disasterService = {
  async create(userId: string, input: Record<string, unknown>) {
    const disaster = await Disaster.create({
      ...input,
      reportedBy: userId,
      location: toGeoPoint(Number(input.lng), Number(input.lat)),
    });

    await cacheService.del(CACHE_KEYS.activeDisasters);
    await cacheService.del(CACHE_KEYS.dashboardStats);
    emitEvent(SOCKET_EVENTS.DISASTER_UPDATED, disaster, "dashboard");
    await logActivity({
      actor: userId,
      action: "disaster.created",
      entityType: "Disaster",
      entityId: disaster.id,
    });
    return disaster;
  },

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: DisasterStatus;
    severity?: SeverityLevel;
    type?: DisasterType;
  }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.severity) filter.severity = query.severity;
    if (query.type) filter.type = query.type;
    if (query.search) {
      filter.$or = [
        { title: { $regex: query.search, $options: "i" } },
        { description: { $regex: query.search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Disaster.find(filter)
        .populate("reportedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Disaster.countDocuments(filter),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  },

  async active() {
    const cached = await cacheService.get(CACHE_KEYS.activeDisasters);
    if (cached) return cached;

    const items = await Disaster.find({ status: { $in: ["active", "contained"] } })
      .sort({ severity: -1, createdAt: -1 });
    await cacheService.set(CACHE_KEYS.activeDisasters, items, CACHE_TTL.activeDisasters);
    return items;
  },

  async getById(id: string) {
    const disaster = await Disaster.findById(id).populate(
      "reportedBy",
      "name email role"
    );
    if (!disaster) throw new ApiError(404, "Disaster not found");
    return disaster;
  },

  async update(userId: string, id: string, input: Record<string, unknown>) {
    const payload: Record<string, unknown> = { ...input };
    if (input.lng !== undefined && input.lat !== undefined) {
      payload.location = toGeoPoint(Number(input.lng), Number(input.lat));
    }
    delete payload.lng;
    delete payload.lat;

    const disaster = await Disaster.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!disaster) throw new ApiError(404, "Disaster not found");

    await cacheService.del(CACHE_KEYS.activeDisasters);
    await cacheService.del(CACHE_KEYS.dashboardStats);
    emitEvent(SOCKET_EVENTS.DISASTER_UPDATED, disaster, "dashboard");
    await logActivity({
      actor: userId,
      action: "disaster.updated",
      entityType: "Disaster",
      entityId: id,
    });
    return disaster;
  },

  async nearbyAssets(id: string) {
    const disaster = await Disaster.findById(id);
    if (!disaster) throw new ApiError(404, "Disaster not found");

    const [lng, lat] = disaster.location.coordinates;
    const radius = disaster.radiusMeters;

    const [shelters, volunteers] = await Promise.all([
      Shelter.find({ location: nearQuery(lng, lat, radius) }).limit(50),
      Volunteer.find({ location: nearQuery(lng, lat, radius) })
        .populate("userId", "name email phone")
        .limit(50),
    ]);

    return { disaster, shelters, volunteers };
  },
};
