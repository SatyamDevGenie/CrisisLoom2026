import type { GeoPoint } from "../types";

export function toGeoPoint(lng: number, lat: number): GeoPoint {
  return {
    type: "Point",
    coordinates: [lng, lat],
  };
}

export function distanceMeters(
  from: [number, number],
  to: [number, number]
): number {
  const toRad = (degrees: number) => (degrees * Math.PI) / 180;
  const [lng1, lat1] = from;
  const [lng2, lat2] = to;
  const earthRadius = 6371000;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * earthRadius * Math.asin(Math.sqrt(a));
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
