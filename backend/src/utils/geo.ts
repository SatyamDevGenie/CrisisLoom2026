import type { GeoPoint } from "../types";

export function toGeoPoint(lng: number, lat: number): GeoPoint {
  return {
    type: "Point",
    coordinates: [lng, lat],
  };
}

export function nearQuery(lng: number, lat: number, maxDistance: number) {
  return {
    $near: {
      $geometry: {
        type: "Point" as const,
        coordinates: [lng, lat] as [number, number],
      },
      $maxDistance: maxDistance,
    },
  };
}
