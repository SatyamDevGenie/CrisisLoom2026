import Shelter from "../models/shelter.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import { toGeoPoint, nearQuery } from "../utils/geo";
import { cacheService } from "./cache.service";
import { CACHE_KEYS, CACHE_TTL, SOCKET_EVENTS } from "../utils/constants";
import { emitEvent } from "../sockets";
import { logActivity } from "./activityLog.service";
import { env } from "../config/env";
import type { ShelterStatus } from "../types";

export const shelterService = {
  async create(userId: string, input: Record<string, unknown>) {
    const shelter = await Shelter.create({
      ...input,
      managedBy: userId,
      occupied: input.occupied ?? 0,
      location: toGeoPoint(Number(input.lng), Number(input.lat)),
    });

    await cacheService.delByPrefix("cache:nearby:shelters:");
    await cacheService.del(CACHE_KEYS.dashboardStats);
    emitEvent(SOCKET_EVENTS.SHELTER_UPDATED, shelter, "dashboard");
    await logActivity({
      actor: userId,
      action: "shelter.created",
      entityType: "Shelter",
      entityId: shelter.id,
    });
    return shelter;
  },

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: ShelterStatus;
    city?: string;
  }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.city) filter.city = { $regex: query.city, $options: "i" };
    if (query.search) {
      filter.$or = [
        { shelterName: { $regex: query.search, $options: "i" } },
        { address: { $regex: query.search, $options: "i" } },
      ];
    }

    const [items, total] = await Promise.all([
      Shelter.find(filter)
        .populate("managedBy", "name email role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Shelter.countDocuments(filter),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const cached = await cacheService.get(CACHE_KEYS.shelter(id));
    if (cached) return cached;

    const shelter = await Shelter.findById(id).populate("managedBy", "name email role");
    if (!shelter) throw new ApiError(404, "Shelter not found");
    await cacheService.set(CACHE_KEYS.shelter(id), shelter, CACHE_TTL.shelter);
    return shelter;
  },

  async update(userId: string, id: string, input: Record<string, unknown>) {
    const payload = { ...input };
    if (input.lng !== undefined && input.lat !== undefined) {
      payload.location = toGeoPoint(Number(input.lng), Number(input.lat));
    }
    delete payload.lng;
    delete payload.lat;

    const shelter = await Shelter.findByIdAndUpdate(id, payload, {
      new: true,
      runValidators: true,
    });
    if (!shelter) throw new ApiError(404, "Shelter not found");

    await cacheService.del(CACHE_KEYS.shelter(id));
    await cacheService.delByPrefix("cache:nearby:shelters:");
    emitEvent(SOCKET_EVENTS.SHELTER_UPDATED, shelter, "dashboard");
    await logActivity({
      actor: userId,
      action: "shelter.updated",
      entityType: "Shelter",
      entityId: id,
    });
    return shelter;
  },

  async updateOccupancy(
    userId: string,
    id: string,
    occupied: number,
    status?: ShelterStatus
  ) {
    const shelter = await Shelter.findById(id);
    if (!shelter) throw new ApiError(404, "Shelter not found");
    shelter.occupied = occupied;
    if (status) shelter.status = status;
    await shelter.save();

    await cacheService.del(CACHE_KEYS.shelter(id));
    await cacheService.del(CACHE_KEYS.dashboardStats);
    emitEvent(SOCKET_EVENTS.SHELTER_UPDATED, shelter, `shelter:${id}`);
    emitEvent(SOCKET_EVENTS.SHELTER_UPDATED, shelter, "dashboard");
    await logActivity({
      actor: userId,
      action: "shelter.occupancy_updated",
      entityType: "Shelter",
      entityId: id,
      metadata: { occupied, availableBeds: shelter.availableBeds },
    });
    return shelter;
  },

  async nearby(lng: number, lat: number, radius?: number) {
    const maxDistance = radius || env.DEFAULT_MATCH_RADIUS_METERS;
    const cacheKey = CACHE_KEYS.nearbyShelters(lng, lat, maxDistance);
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const items = await Shelter.find({
      status: { $in: ["active", "emergency"] },
      location: nearQuery(lng, lat, maxDistance),
    }).limit(50);

    await cacheService.set(cacheKey, items, CACHE_TTL.nearby);
    return items;
  },

  async remove(userId: string, id: string) {
    const shelter = await Shelter.findByIdAndDelete(id);
    if (!shelter) throw new ApiError(404, "Shelter not found");
    await cacheService.del(CACHE_KEYS.shelter(id));
    await cacheService.delByPrefix("cache:nearby:shelters:");
    await logActivity({
      actor: userId,
      action: "shelter.deleted",
      entityType: "Shelter",
      entityId: id,
    });
  },
};
