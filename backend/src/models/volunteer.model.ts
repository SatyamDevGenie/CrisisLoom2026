import { Schema, model, Types } from "mongoose";
import {
  RESOURCE_TYPES,
  VOLUNTEER_AVAILABILITY,
  type GeoPoint,
  type ResourceType,
  type VolunteerAvailability,
} from "../types";
import { geoPointSchema } from "./geo.schema";

export interface IVolunteer {
  userId: Types.ObjectId;
  skills: ResourceType[];
  availability: VolunteerAvailability;
  location: GeoPoint;
  radiusKm: number;
  completedMissions: number;
  rating: number;
  isVerified: boolean;
  bloodGroup?: string;
  vehicleType?: string;
  createdAt: Date;
  updatedAt: Date;
}

const volunteerSchema = new Schema<IVolunteer>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    skills: { type: [String], enum: RESOURCE_TYPES, default: [] },
    availability: {
      type: String,
      enum: VOLUNTEER_AVAILABILITY,
      default: "available",
    },
    location: { type: geoPointSchema, required: true },
    radiusKm: { type: Number, default: 10, min: 1, max: 100 },
    completedMissions: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    isVerified: { type: Boolean, default: false },
    bloodGroup: String,
    vehicleType: String,
  },
  { timestamps: true, versionKey: false }
);

volunteerSchema.index({ location: "2dsphere" });
volunteerSchema.index({ availability: 1, isVerified: 1 });
volunteerSchema.index({ userId: 1 }, { unique: true });

volunteerSchema.set("toJSON", { virtuals: true });

const Volunteer = model<IVolunteer>("Volunteer", volunteerSchema);
export default Volunteer;
