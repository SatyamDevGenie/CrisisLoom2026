import { z } from "zod";
import {
  ASSIGNEE_TYPES,
  DISASTER_STATUSES,
  DISASTER_TYPES,
  DONOR_TYPES,
  PRIORITY_LEVELS,
  REQUEST_STATUSES,
  RESOURCE_TYPES,
  SEVERITY_LEVELS,
  SHELTER_STATUSES,
  USER_ROLES,
  VOLUNTEER_AVAILABILITY,
} from "../types";

export const objectId = z
  .string()
  .regex(/^[a-fA-F0-9]{24}$/, "Invalid MongoDB ObjectId");

export const geoBody = z.object({
  lng: z.coerce.number().min(-180).max(180),
  lat: z.coerce.number().min(-90).max(90),
});

export const paginationQuery = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
});

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(80),
    email: z.string().email(),
    password: z.string().min(8).max(72),
    phone: z.string().min(8).max(20).optional(),
    role: z.enum(["ngo_manager", "shelter_staff", "volunteer", "donor"]),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    email: z.string().email(),
    otp: z.string().length(6),
    password: z.string().min(8).max(72),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(8),
    newPassword: z.string().min(8).max(72),
  }),
});

export const updateUserSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    name: z.string().min(2).max(80).optional(),
    phone: z.string().min(8).max(20).optional(),
    avatar: z.string().url().optional(),
  }),
});

export const updateRoleSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    role: z.enum(USER_ROLES),
  }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    isActive: z.boolean(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: objectId }),
});

export const listUsersQuery = z.object({
  query: paginationQuery.extend({
    role: z.enum(USER_ROLES).optional(),
    isActive: z.coerce.boolean().optional(),
  }),
});

export const createShelterSchema = z.object({
  body: z.object({
    shelterName: z.string().min(2).max(120),
    description: z.string().max(1000).optional(),
    address: z.string().min(4),
    city: z.string().min(2),
    state: z.string().min(2),
    lng: z.coerce.number().min(-180).max(180),
    lat: z.coerce.number().min(-90).max(90),
    contactPhone: z.string().min(8),
    contactEmail: z.string().email().optional(),
    capacity: z.coerce.number().int().positive(),
    occupied: z.coerce.number().int().min(0).optional(),
    disaster: objectId.optional(),
  }),
});

export const updateShelterSchema = z.object({
  params: z.object({ id: objectId }),
  body: createShelterSchema.shape.body.partial(),
});

export const occupancySchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    occupied: z.coerce.number().int().min(0),
    status: z.enum(SHELTER_STATUSES).optional(),
  }),
});

export const nearbyQuerySchema = z.object({
  query: geoBody.extend({
    radius: z.coerce.number().positive().max(100000).optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
  }),
});

export const listShelterQuery = z.object({
  query: paginationQuery.extend({
    status: z.enum(SHELTER_STATUSES).optional(),
    city: z.string().optional(),
  }),
});

export const createVolunteerSchema = z.object({
  body: z.object({
    skills: z.array(z.enum(RESOURCE_TYPES)).default([]),
    lng: z.coerce.number().min(-180).max(180),
    lat: z.coerce.number().min(-90).max(90),
    radiusKm: z.coerce.number().min(1).max(100).optional(),
    bloodGroup: z.string().optional(),
    vehicleType: z.string().optional(),
  }),
});

export const updateVolunteerSchema = z.object({
  body: createVolunteerSchema.shape.body.partial(),
});

export const volunteerLocationSchema = z.object({
  body: geoBody,
});

export const volunteerAvailabilitySchema = z.object({
  body: z.object({
    availability: z.enum(VOLUNTEER_AVAILABILITY),
  }),
});

export const listVolunteerQuery = z.object({
  query: paginationQuery.extend({
    availability: z.enum(VOLUNTEER_AVAILABILITY).optional(),
    skill: z.enum(RESOURCE_TYPES).optional(),
  }),
});

export const createDonorSchema = z.object({
  body: z.object({
    donorType: z.enum(DONOR_TYPES),
    organizationName: z.string().optional(),
    lng: z.coerce.number().min(-180).max(180),
    lat: z.coerce.number().min(-90).max(90),
    resourcesOffered: z.array(z.enum(RESOURCE_TYPES)).default([]),
    notes: z.string().max(500).optional(),
  }),
});

export const updateDonorSchema = z.object({
  body: createDonorSchema.shape.body.partial(),
});

export const createDisasterSchema = z.object({
  body: z.object({
    title: z.string().min(3).max(160),
    type: z.enum(DISASTER_TYPES),
    description: z.string().min(10).max(2000),
    severity: z.enum(SEVERITY_LEVELS),
    lng: z.coerce.number().min(-180).max(180),
    lat: z.coerce.number().min(-90).max(90),
    radiusMeters: z.coerce.number().min(100),
    affectedAreas: z.array(z.string()).optional(),
    startDate: z.coerce.date().optional(),
  }),
});

export const updateDisasterSchema = z.object({
  params: z.object({ id: objectId }),
  body: createDisasterSchema.shape.body.partial().extend({
    status: z.enum(DISASTER_STATUSES).optional(),
    endDate: z.coerce.date().optional(),
  }),
});

export const listDisasterQuery = z.object({
  query: paginationQuery.extend({
    status: z.enum(DISASTER_STATUSES).optional(),
    severity: z.enum(SEVERITY_LEVELS).optional(),
    type: z.enum(DISASTER_TYPES).optional(),
  }),
});

export const upsertResourceSchema = z.object({
  params: z.object({ shelterId: objectId }),
  body: z.object({
    resourceType: z.enum(RESOURCE_TYPES),
    quantity: z.coerce.number().min(0),
    unit: z.string().default("units"),
    minThreshold: z.coerce.number().min(0).optional(),
  }),
});

export const updateResourceSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    quantity: z.coerce.number().min(0).optional(),
    unit: z.string().optional(),
    minThreshold: z.coerce.number().min(0).optional(),
  }),
});

export const createRequestSchema = z.object({
  body: z.object({
    shelter: objectId,
    disaster: objectId.optional(),
    resourceType: z.enum(RESOURCE_TYPES),
    quantity: z.coerce.number().int().positive(),
    unit: z.string().default("units"),
    priority: z.enum(PRIORITY_LEVELS).default("medium"),
    description: z.string().max(1000).optional(),
    neededBy: z.coerce.date().optional(),
  }),
});

export const updateRequestSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    quantity: z.coerce.number().int().positive().optional(),
    priority: z.enum(PRIORITY_LEVELS).optional(),
    status: z.enum(REQUEST_STATUSES).optional(),
    description: z.string().max(1000).optional(),
  }),
});

export const listRequestQuery = z.object({
  query: paginationQuery.extend({
    status: z.enum(REQUEST_STATUSES).optional(),
    priority: z.enum(PRIORITY_LEVELS).optional(),
    shelter: objectId.optional(),
    disaster: objectId.optional(),
  }),
});

export const createAssignmentSchema = z.object({
  body: z.object({
    request: objectId,
    assigneeType: z.enum(ASSIGNEE_TYPES),
    assignee: objectId,
    notes: z.string().max(500).optional(),
  }),
});

export const listAssignmentQuery = z.object({
  query: paginationQuery.extend({
    status: z.string().optional(),
    request: objectId.optional(),
  }),
});

export const completeAssignmentSchema = z.object({
  params: z.object({ id: objectId }),
  body: z.object({
    lng: z.coerce.number().min(-180).max(180).optional(),
    lat: z.coerce.number().min(-90).max(90).optional(),
  }),
});
