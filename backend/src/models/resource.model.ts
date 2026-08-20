import { Schema, model, Types } from "mongoose";
import { RESOURCE_TYPES, type ResourceType } from "../types";

export interface IResource {
  shelter: Types.ObjectId;
  resourceType: ResourceType;
  quantity: number;
  unit: string;
  minThreshold: number;
  lastUpdatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<IResource>(
  {
    shelter: { type: Schema.Types.ObjectId, ref: "Shelter", required: true },
    resourceType: { type: String, enum: RESOURCE_TYPES, required: true },
    quantity: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, trim: true, default: "units" },
    minThreshold: { type: Number, required: true, default: 10, min: 0 },
    lastUpdatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false }
);

resourceSchema.index({ shelter: 1, resourceType: 1 }, { unique: true });
resourceSchema.index({ quantity: 1, minThreshold: 1 });

resourceSchema.set("toJSON", { virtuals: true });

const Resource = model<IResource>("Resource", resourceSchema);
export default Resource;
