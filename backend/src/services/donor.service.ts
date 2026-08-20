import Donor from "../models/donor.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import { toGeoPoint, nearQuery } from "../utils/geo";
import { env } from "../config/env";

export const donorService = {
  async upsertProfile(userId: string, input: Record<string, unknown>) {
    const donor = await Donor.findOneAndUpdate(
      { userId },
      {
        userId,
        donorType: input.donorType,
        organizationName: input.organizationName,
        location: toGeoPoint(Number(input.lng), Number(input.lat)),
        resourcesOffered: input.resourcesOffered,
        notes: input.notes,
      },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    return donor;
  },

  async list(query: { page?: number; limit?: number; search?: string }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.search) {
      filter.organizationName = { $regex: query.search, $options: "i" };
    }

    const [items, total] = await Promise.all([
      Donor.find(filter)
        .populate("userId", "name email phone role")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Donor.countDocuments(filter),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  },

  async me(userId: string) {
    const donor = await Donor.findOne({ userId }).populate(
      "userId",
      "name email phone role"
    );
    if (!donor) throw new ApiError(404, "Donor profile not found");
    return donor;
  },

  async getById(id: string) {
    const donor = await Donor.findById(id).populate("userId", "name email phone role");
    if (!donor) throw new ApiError(404, "Donor not found");
    return donor;
  },

  async updateMe(userId: string, input: Record<string, unknown>) {
    const payload: Record<string, unknown> = { ...input };
    if (input.lng !== undefined && input.lat !== undefined) {
      payload.location = toGeoPoint(Number(input.lng), Number(input.lat));
    }
    delete payload.lng;
    delete payload.lat;

    const donor = await Donor.findOneAndUpdate({ userId }, payload, {
      new: true,
      runValidators: true,
    });
    if (!donor) throw new ApiError(404, "Donor profile not found");
    return donor;
  },

  async nearby(lng: number, lat: number, radius?: number) {
    return Donor.find({
      location: nearQuery(lng, lat, radius || env.DEFAULT_MATCH_RADIUS_METERS),
    })
      .populate("userId", "name email phone")
      .limit(50);
  },
};
