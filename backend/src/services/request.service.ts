import ResourceRequest from "../models/resourceRequest.model";
import Shelter from "../models/shelter.model";
import Resource from "../models/resource.model";
import { ApiError } from "../utils/ApiError";
import { getPagination, paginationMeta } from "../utils/pagination";
import { SOCKET_EVENTS, CACHE_KEYS } from "../utils/constants";
import { emitEvent } from "../sockets";
import { logActivity } from "./activityLog.service";
import { matchingService } from "./matching.service";
import { cacheService } from "./cache.service";
import type { PriorityLevel, RequestStatus } from "../types";

export const requestService = {
  async create(userId: string, input: Record<string, unknown>) {
    const shelter = await Shelter.findById(input.shelter);
    if (!shelter) throw new ApiError(404, "Shelter not found");

    const request = await ResourceRequest.create({
      ...input,
      requestedBy: userId,
    });

    emitEvent(SOCKET_EVENTS.REQUEST_CREATED, request, "dashboard");
    emitEvent(SOCKET_EVENTS.REQUEST_CREATED, request, `shelter:${shelter.id}`);
    await cacheService.del(CACHE_KEYS.dashboardStats);

    if (request.priority === "critical") {
      emitEvent(SOCKET_EVENTS.REQUEST_CRITICAL, request, "dashboard");
      await matchingService.dispatchCriticalRequest(request.id, userId);
    }

    await logActivity({
      actor: userId,
      action: "request.created",
      entityType: "ResourceRequest",
      entityId: request.id,
      metadata: { priority: request.priority },
    });
    return request;
  },

  async list(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: RequestStatus;
    priority?: PriorityLevel;
    shelter?: string;
    disaster?: string;
  }) {
    const { page, limit, skip } = getPagination(query.page, query.limit);
    const filter: Record<string, unknown> = {};
    if (query.status) filter.status = query.status;
    if (query.priority) filter.priority = query.priority;
    if (query.shelter) filter.shelter = query.shelter;
    if (query.disaster) filter.disaster = query.disaster;

    const [items, total] = await Promise.all([
      ResourceRequest.find(filter)
        .populate("shelter", "shelterName city location")
        .populate("requestedBy", "name email role")
        .populate("disaster", "title severity status")
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit),
      ResourceRequest.countDocuments(filter),
    ]);

    return { items, meta: paginationMeta(total, page, limit) };
  },

  async getById(id: string) {
    const request = await ResourceRequest.findById(id)
      .populate("shelter")
      .populate("requestedBy", "name email role")
      .populate("disaster", "title severity status");
    if (!request) throw new ApiError(404, "Request not found");
    return request;
  },

  async update(userId: string, id: string, input: Record<string, unknown>) {
    const request = await ResourceRequest.findByIdAndUpdate(id, input, {
      new: true,
      runValidators: true,
    });
    if (!request) throw new ApiError(404, "Request not found");
    emitEvent(SOCKET_EVENTS.REQUEST_UPDATED, request, "dashboard");
    await logActivity({
      actor: userId,
      action: "request.updated",
      entityType: "ResourceRequest",
      entityId: id,
    });
    return request;
  },

  async cancel(userId: string, id: string) {
    const request = await ResourceRequest.findByIdAndUpdate(
      id,
      { status: "cancelled" },
      { new: true }
    );
    if (!request) throw new ApiError(404, "Request not found");
    emitEvent(SOCKET_EVENTS.REQUEST_UPDATED, request, "dashboard");
    await logActivity({
      actor: userId,
      action: "request.cancelled",
      entityType: "ResourceRequest",
      entityId: id,
    });
    return request;
  },

  async fulfill(userId: string, id: string) {
    const request = await ResourceRequest.findById(id);
    if (!request) throw new ApiError(404, "Request not found");
    request.status = "fulfilled";
    await request.save();

    await Resource.findOneAndUpdate(
      { shelter: request.shelter, resourceType: request.resourceType },
      { $inc: { quantity: request.quantity }, lastUpdatedBy: userId },
      { new: true }
    );

    await cacheService.del(CACHE_KEYS.dashboardStats);
    emitEvent(SOCKET_EVENTS.REQUEST_UPDATED, request, "dashboard");
    await logActivity({
      actor: userId,
      action: "request.fulfilled",
      entityType: "ResourceRequest",
      entityId: id,
    });
    return request;
  },
};
