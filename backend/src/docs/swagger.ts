import swaggerJSDoc from "swagger-jsdoc";
import { env } from "../config/env";

export const swaggerSpec = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "CrisisLoom API",
      version: "1.0.0",
      description:
        "CrisisLoom production backend for real-time disaster relief coordination: auth, geospatial matching, resource requests, Socket.IO, Redis queues, and notifications.",
    },
    servers: [{ url: `http://localhost:${env.PORT}${env.API_PREFIX}` }],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [{ bearerAuth: [] }],
    tags: [
      { name: "Health" },
      { name: "Auth" },
      { name: "Users" },
      { name: "Shelters" },
      { name: "Volunteers" },
      { name: "Donors" },
      { name: "Disasters" },
      { name: "Resources" },
      { name: "Requests" },
      { name: "Assignments" },
      { name: "Notifications" },
      { name: "Dashboard" },
    ],
    paths: {
      "/health": {
        get: { tags: ["Health"], security: [], summary: "Liveness probe" },
      },
      "/health/ready": {
        get: { tags: ["Health"], security: [], summary: "Readiness probe for MongoDB and Redis" },
      },
      "/auth/register": {
        post: {
          tags: ["Auth"],
          security: [],
          summary: "Register ngo_manager, shelter_staff, volunteer, or donor",
        },
      },
      "/auth/login": {
        post: { tags: ["Auth"], security: [], summary: "Login and receive JWT tokens" },
      },
      "/auth/refresh": {
        post: { tags: ["Auth"], security: [], summary: "Rotate refresh token" },
      },
      "/auth/logout": { post: { tags: ["Auth"], summary: "Logout and revoke refresh token" } },
      "/auth/me": { get: { tags: ["Auth"], summary: "Current authenticated user" } },
      "/auth/change-password": { patch: { tags: ["Auth"], summary: "Change password" } },
      "/auth/forgot-password": {
        post: { tags: ["Auth"], security: [], summary: "Queue password reset OTP email" },
      },
      "/auth/reset-password": {
        post: { tags: ["Auth"], security: [], summary: "Reset password using OTP" },
      },
      "/users": { get: { tags: ["Users"], summary: "List users (admin/NGO)" } },
      "/users/{id}": {
        get: { tags: ["Users"], summary: "Get user by id" },
        patch: { tags: ["Users"], summary: "Update user profile" },
        delete: { tags: ["Users"], summary: "Delete user (admin)" },
      },
      "/shelters": {
        get: { tags: ["Shelters"], security: [], summary: "List shelters" },
        post: { tags: ["Shelters"], summary: "Create shelter" },
      },
      "/shelters/nearby": {
        get: {
          tags: ["Shelters"],
          security: [],
          summary: "Find shelters near a GeoJSON point",
        },
      },
      "/shelters/{id}": {
        get: { tags: ["Shelters"], security: [], summary: "Get shelter" },
        patch: { tags: ["Shelters"], summary: "Update shelter" },
        delete: { tags: ["Shelters"], summary: "Delete shelter" },
      },
      "/shelters/{id}/occupancy": {
        patch: { tags: ["Shelters"], summary: "Update occupied beds and live status" },
      },
      "/volunteers": {
        get: { tags: ["Volunteers"], summary: "List volunteers" },
        post: { tags: ["Volunteers"], summary: "Create or upsert volunteer profile" },
      },
      "/volunteers/nearby": {
        get: { tags: ["Volunteers"], security: [], summary: "Geospatial volunteer lookup" },
      },
      "/volunteers/me": {
        get: { tags: ["Volunteers"], summary: "My volunteer profile" },
        patch: { tags: ["Volunteers"], summary: "Update my volunteer profile" },
      },
      "/volunteers/me/location": {
        patch: { tags: ["Volunteers"], summary: "Update live volunteer location" },
      },
      "/donors": {
        get: { tags: ["Donors"], summary: "List donors" },
        post: { tags: ["Donors"], summary: "Create donor profile" },
      },
      "/disasters": {
        get: { tags: ["Disasters"], security: [], summary: "List disasters" },
        post: { tags: ["Disasters"], summary: "Create disaster zone" },
      },
      "/disasters/active": {
        get: { tags: ["Disasters"], security: [], summary: "Cached active disaster zones" },
      },
      "/disasters/{id}/nearby-assets": {
        get: { tags: ["Disasters"], summary: "Shelters and volunteers inside disaster radius" },
      },
      "/resources/low-stock": {
        get: { tags: ["Resources"], summary: "Inventory below threshold" },
      },
      "/resources/shelter/{shelterId}": {
        get: { tags: ["Resources"], summary: "Shelter inventory" },
        post: { tags: ["Resources"], summary: "Upsert shelter resource" },
      },
      "/requests": {
        get: { tags: ["Requests"], summary: "List resource requests" },
        post: { tags: ["Requests"], summary: "Create request; critical priority auto-dispatches" },
      },
      "/requests/{id}/fulfill": {
        post: { tags: ["Requests"], summary: "Mark request fulfilled and restock inventory" },
      },
      "/assignments": {
        get: { tags: ["Assignments"], summary: "List assignments" },
        post: { tags: ["Assignments"], summary: "Manually assign volunteer or donor" },
      },
      "/assignments/{id}/accept": {
        post: {
          tags: ["Assignments"],
          summary: "Atomic claim lock: only one accept wins",
        },
      },
      "/assignments/{id}/complete": {
        post: {
          tags: ["Assignments"],
          summary: "Complete assignment; volunteers must be within 500m of the shelter",
        },
      },
      "/notifications": {
        get: { tags: ["Notifications"], summary: "My notifications" },
      },
      "/dashboard/stats": {
        get: { tags: ["Dashboard"], summary: "Cached operational statistics" },
      },
      "/dashboard/activity": {
        get: { tags: ["Dashboard"], summary: "Recent activity logs" },
      },
    },
  },
  apis: [],
});
