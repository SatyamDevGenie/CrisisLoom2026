export const USER_ROLES = [
  "admin",
  "ngo_manager",
  "shelter_staff",
  "volunteer",
  "donor",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const RESOURCE_TYPES = [
  "food",
  "water",
  "medicine",
  "clothing",
  "blanket",
  "shelter_kit",
  "fuel",
  "blood",
  "hygiene",
  "other",
] as const;

export type ResourceType = (typeof RESOURCE_TYPES)[number];

export const DISASTER_TYPES = [
  "flood",
  "earthquake",
  "cyclone",
  "fire",
  "pandemic",
  "drought",
  "landslide",
  "tsunami",
  "other",
] as const;

export type DisasterType = (typeof DISASTER_TYPES)[number];

export const SEVERITY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type SeverityLevel = (typeof SEVERITY_LEVELS)[number];

export const PRIORITY_LEVELS = ["low", "medium", "high", "critical"] as const;
export type PriorityLevel = (typeof PRIORITY_LEVELS)[number];

export const SHELTER_STATUSES = ["active", "inactive", "full", "emergency"] as const;
export type ShelterStatus = (typeof SHELTER_STATUSES)[number];

export const DISASTER_STATUSES = ["active", "contained", "resolved"] as const;
export type DisasterStatus = (typeof DISASTER_STATUSES)[number];

export const REQUEST_STATUSES = [
  "open",
  "matched",
  "in_progress",
  "fulfilled",
  "cancelled",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const ASSIGNMENT_STATUSES = [
  "notified",
  "accepted",
  "rejected",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number];

export const VOLUNTEER_AVAILABILITY = ["available", "busy", "offline"] as const;
export type VolunteerAvailability = (typeof VOLUNTEER_AVAILABILITY)[number];

export const DONOR_TYPES = ["individual", "organization"] as const;
export type DonorType = (typeof DONOR_TYPES)[number];

export const ASSIGNEE_TYPES = ["volunteer", "donor", "ngo"] as const;
export type AssigneeType = (typeof ASSIGNEE_TYPES)[number];

export const NOTIFICATION_CHANNELS = ["email", "sms", "in_app"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

export const NOTIFICATION_STATUSES = ["queued", "sent", "failed"] as const;
export type NotificationStatus = (typeof NOTIFICATION_STATUSES)[number];

export interface GeoPoint {
  type: "Point";
  coordinates: [number, number];
}

export interface AuthUser {
  id: string;
  role: UserRole;
  email: string;
  name: string;
}
