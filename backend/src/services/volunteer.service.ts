import Volunteer from "../models/volunteer.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import { toGeoPoint, nearQuery } from "../utils/geo";
import { cacheService } from "./cache.service";
import { CACHE_KEYS, CACHE_TTL, SOCKET_EVENTS } from "../utils/constants";
import { emitEvent } from "../sockets";
import { env } from "../config/env";
import type { ResourceType, VolunteerAvailability } from "../types";

export const volunteerService = {
  async upsertProfile(userId: string, input: Record<string, unknown>) {
    const location = toGeoPoint(Number(input.lng), Number(input.lat));
    const volunteer = await Volunteer.findOneAndUpdate(
      { userId },
      {
        userId,
        skills: input.skills,
        location,
        radiusKm: input.radiusKm,
        bloodGroup: input.bloodGroup,
        vehicleType: input.vehicleType,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    await cacheService.delByPrefix("cache:nearby:volunteers:");
    return volunteer;
  },

  async list(query: {
    page?: number;
    limit?: number;
    availability?: VolunteerAvailability;
    skill?: ResourceType;
    search?: string;
  }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.availability) filter.availability = query.availability;
    if (query.skill) filter.skills = query.skill;

    const [items, total] = await Promise.all([
      Volunteer.find(filter)
        .populate("userId", "name email phone role")
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(limit),
      Volunteer.countDocuments(filter),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  },

  async me(userId: string) {
    const volunteer = await Volunteer.findOne({ userId }).populate(
      "userId",
      "name email phone role"
    );
    if (!volunteer) throw new ApiError(404, "Volunteer profile not found");
    return volunteer;
  },

  async getById(id: string) {
    const volunteer = await Volunteer.findById(id).populate(
      "userId",
      "name email phone role"
    );
    if (!volunteer) throw new ApiError(404, "Volunteer not found");
    return volunteer;
  },

  async updateMe(userId: string, input: Record<string, unknown>) {
    const payload: Record<string, unknown> = { ...input };
    if (input.lng !== undefined && input.lat !== undefined) {
      payload.location = toGeoPoint(Number(input.lng), Number(input.lat));
    }
    delete payload.lng;
    delete payload.lat;

    const volunteer = await Volunteer.findOneAndUpdate({ userId }, payload, {
      new: true,
      runValidators: true,
    });
    if (!volunteer) throw new ApiError(404, "Volunteer profile not found");
    await cacheService.delByPrefix("cache:nearby:volunteers:");
    return volunteer;
  },

  async updateLocation(userId: string, lng: number, lat: number) {
    const volunteer = await Volunteer.findOneAndUpdate(
      { userId },
      { location: toGeoPoint(lng, lat) },
      { new: true }
    );
    if (!volunteer) throw new ApiError(404, "Volunteer profile not found");
    emitEvent(SOCKET_EVENTS.VOLUNTEER_LOCATION, {
      volunteerId: volunteer.id,
      location: volunteer.location,
    });
    await cacheService.delByPrefix("cache:nearby:volunteers:");
    return volunteer;
  },

  async updateAvailability(userId: string, availability: VolunteerAvailability) {
    const volunteer = await Volunteer.findOneAndUpdate(
      { userId },
      { availability },
      { new: true }
    );
    if (!volunteer) throw new ApiError(404, "Volunteer profile not found");
    return volunteer;
  },

  async nearby(lng: number, lat: number, radius?: number, skill?: ResourceType) {
    const maxDistance = radius || env.DEFAULT_MATCH_RADIUS_METERS;
    const cacheKey = CACHE_KEYS.nearbyVolunteers(lng, lat, maxDistance);
    if (!skill) {
      const cached = await cacheService.get(cacheKey);
      if (cached) return cached;
    }

    const filter: Record<string, unknown> = {
      availability: "available",
      location: nearQuery(lng, lat, maxDistance),
    };
    if (skill) filter.skills = skill;

    const items = await Volunteer.find(filter)
      .populate("userId", "name email phone")
      .limit(50);

    if (!skill) {
      await cacheService.set(cacheKey, items, CACHE_TTL.nearby);
    }
    return items;
  },
};
