export const CACHE_KEYS = {
  dashboardStats: "cache:dashboard:stats",
  activeDisasters: "cache:disasters:active",
  shelter: (id: string) => `cache:shelter:${id}`,
  nearbyVolunteers: (lng: number, lat: number, radius: number) =>
    `cache:nearby:volunteers:${lng}:${lat}:${radius}`,
  nearbyShelters: (lng: number, lat: number, radius: number) =>
    `cache:nearby:shelters:${lng}:${lat}:${radius}`,
};

export const CACHE_TTL = {
  dashboard: 15,
  nearby: 30,
  shelter: 60,
  activeDisasters: 20,
};

export const SOCKET_EVENTS = {
  SHELTER_UPDATED: "shelter:updated",
  REQUEST_CREATED: "request:created",
  REQUEST_CRITICAL: "request:critical",
  REQUEST_UPDATED: "request:updated",
  ASSIGNMENT_UPDATED: "assignment:updated",
  VOLUNTEER_LOCATION: "volunteer:location",
  DISASTER_UPDATED: "disaster:updated",
  DASHBOARD_STATS: "dashboard:stats",
  NOTIFICATION_NEW: "notification:new",
} as const;

export const QUEUE_NAMES = {
  email: "email-queue",
  sms: "sms-queue",
  notification: "notification-queue",
} as const;

export const COOKIE_NAMES = {
  refreshToken: "refreshToken",
} as const;
