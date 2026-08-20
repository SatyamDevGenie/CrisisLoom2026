import { Schema, model, Types } from "mongoose";
import {
  DONOR_TYPES,
  RESOURCE_TYPES,
  type DonorType,
  type GeoPoint,
  type ResourceType,
} from "../types";
import { geoPointSchema } from "./geo.schema";

export interface IDonor {
  userId: Types.ObjectId;
  organizationName?: string;
  donorType: DonorType;
  location: GeoPoint;
  resourcesOffered: ResourceType[];
  totalDonations: number;
  isVerified: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const donorSchema = new Schema<IDonor>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    organizationName: { type: String, trim: true },
    donorType: { type: String, enum: DONOR_TYPES, required: true },
    location: { type: geoPointSchema, required: true },
    resourcesOffered: { type: [String], enum: RESOURCE_TYPES, default: [] },
    totalDonations: { type: Number, default: 0, min: 0 },
    isVerified: { type: Boolean, default: false },
    notes: { type: String, maxlength: 500 },
  },
  { timestamps: true, versionKey: false }
);

donorSchema.index({ location: "2dsphere" });
donorSchema.index({ donorType: 1 });

donorSchema.set("toJSON", { virtuals: true });

const Donor = model<IDonor>("Donor", donorSchema);
export default Donor;
