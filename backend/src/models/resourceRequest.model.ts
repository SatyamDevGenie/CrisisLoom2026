import { Schema, model, Types } from "mongoose";
import {
  PRIORITY_LEVELS,
  REQUEST_STATUSES,
  RESOURCE_TYPES,
  type PriorityLevel,
  type RequestStatus,
  type ResourceType,
} from "../types";

export interface IResourceRequest {
  shelter: Types.ObjectId;
  disaster?: Types.ObjectId;
  requestedBy: Types.ObjectId;
  resourceType: ResourceType;
  quantity: number;
  unit: string;
  priority: PriorityLevel;
  status: RequestStatus;
  description?: string;
  neededBy?: Date;
  dispatchRadiusMeters: number;
  escalationStep: number;
  escalationExhausted: boolean;
  fairnessStatus: "underserved" | "balanced" | "overserved";
  zoneAidCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceRequestSchema = new Schema<IResourceRequest>(
  {
    shelter: { type: Schema.Types.ObjectId, ref: "Shelter", required: true },
    disaster: { type: Schema.Types.ObjectId, ref: "Disaster" },
    requestedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    resourceType: { type: String, enum: RESOURCE_TYPES, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unit: { type: String, required: true, default: "units" },
    priority: { type: String, enum: PRIORITY_LEVELS, default: "medium" },
    status: { type: String, enum: REQUEST_STATUSES, default: "open" },
    description: { type: String, maxlength: 1000 },
    neededBy: Date,
    dispatchRadiusMeters: { type: Number, default: 5000, min: 100 },
    escalationStep: { type: Number, default: 0, min: 0, max: 3 },
    escalationExhausted: { type: Boolean, default: false },
    fairnessStatus: {
      type: String,
      enum: ["underserved", "balanced", "overserved"],
      default: "balanced",
    },
    zoneAidCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

resourceRequestSchema.index({ status: 1, priority: 1, createdAt: -1 });
resourceRequestSchema.index({ shelter: 1, status: 1 });
resourceRequestSchema.index({ disaster: 1 });

resourceRequestSchema.set("toJSON", { virtuals: true });

const ResourceRequest = model<IResourceRequest>(
  "ResourceRequest",
  resourceRequestSchema
);
export default ResourceRequest;
