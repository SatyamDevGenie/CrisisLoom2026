import ResourceRequest from "../models/resourceRequest.model";
import Shelter from "../models/shelter.model";
import { nearQuery } from "../utils/geo";
import { env } from "../config/env";
import type { ResourceType } from "../types";

export type FairnessStatus = "underserved" | "balanced" | "overserved";

export interface ZoneFairness {
  zoneAidCount: number;
  status: FairnessStatus;
  notifyLimit: number;
}

export async function scoreZoneAid(
  lng: number,
  lat: number,
  resourceType: ResourceType,
  excludeRequestId?: string
): Promise<ZoneFairness> {
  const nearbyShelters = await Shelter.find({
    location: nearQuery(lng, lat, env.FAIRNESS_RADIUS_METERS),
  }).select("_id");

  const filter: Record<string, unknown> = {
    shelter: { $in: nearbyShelters.map((shelter) => shelter._id) },
    resourceType,
    status: { $in: ["open", "matched", "in_progress", "fulfilled"] },
  };
  if (excludeRequestId) filter._id = { $ne: excludeRequestId };

  const zoneAidCount = await ResourceRequest.countDocuments(filter);

  const status: FairnessStatus =
    zoneAidCount >= env.OVERSERVED_THRESHOLD
      ? "overserved"
      : zoneAidCount === 0
        ? "underserved"
        : "balanced";

  const notifyLimit =
    status === "overserved" ? 10 : status === "underserved" ? 25 : 15;

  return { zoneAidCount, status, notifyLimit };
}
