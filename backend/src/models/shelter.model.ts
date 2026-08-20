import { Schema, model, Types } from "mongoose";
import { SHELTER_STATUSES, type GeoPoint, type ShelterStatus } from "../types";
import { geoPointSchema } from "./geo.schema";

export interface IShelter {
  shelterName: string;
  description?: string;
  managedBy: Types.ObjectId;
  address: string;
  city: string;
  state: string;
  location: GeoPoint;
  contactPhone: string;
  contactEmail?: string;
  capacity: number;
  occupied: number;
  availableBeds: number;
  status: ShelterStatus;
  disaster?: Types.ObjectId;
  isVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const shelterSchema = new Schema<IShelter>(
  {
    shelterName: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    managedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    location: { type: geoPointSchema, required: true },
    contactPhone: { type: String, required: true },
    contactEmail: { type: String, lowercase: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    occupied: { type: Number, required: true, default: 0, min: 0 },
    availableBeds: { type: Number, default: 0, min: 0 },
    status: { type: String, enum: SHELTER_STATUSES, default: "active" },
    disaster: { type: Schema.Types.ObjectId, ref: "Disaster" },
    isVerified: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false }
);

shelterSchema.index({ location: "2dsphere" });
shelterSchema.index({ status: 1, city: 1 });
shelterSchema.index({ managedBy: 1 });
shelterSchema.index({ shelterName: "text", city: "text" });

shelterSchema.pre("validate", function () {
  if (this.occupied > this.capacity) {
    throw new Error("Occupied beds cannot exceed capacity.");
  }
});

shelterSchema.pre("save", function () {
  this.availableBeds = Math.max(0, this.capacity - this.occupied);
  if (this.availableBeds === 0 && this.status === "active") {
    this.status = "full";
  }
});

shelterSchema.set("toJSON", { virtuals: true });

const Shelter = model<IShelter>("Shelter", shelterSchema);
export default Shelter;
