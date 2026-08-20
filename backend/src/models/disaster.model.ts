import { Schema, model, Types } from "mongoose";
import {
  DISASTER_STATUSES,
  DISASTER_TYPES,
  SEVERITY_LEVELS,
  type DisasterStatus,
  type DisasterType,
  type GeoPoint,
  type SeverityLevel,
} from "../types";
import { geoPointSchema } from "./geo.schema";

export interface IDisaster {
  title: string;
  type: DisasterType;
  description: string;
  severity: SeverityLevel;
  status: DisasterStatus;
  location: GeoPoint;
  radiusMeters: number;
  affectedAreas: string[];
  startDate: Date;
  endDate?: Date;
  reportedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const disasterSchema = new Schema<IDisaster>(
  {
    title: { type: String, required: true, trim: true, maxlength: 160 },
    type: { type: String, enum: DISASTER_TYPES, required: true },
    description: { type: String, required: true, maxlength: 2000 },
    severity: { type: String, enum: SEVERITY_LEVELS, required: true },
    status: { type: String, enum: DISASTER_STATUSES, default: "active" },
    location: { type: geoPointSchema, required: true },
    radiusMeters: { type: Number, required: true, min: 100 },
    affectedAreas: { type: [String], default: [] },
    startDate: { type: Date, required: true, default: Date.now },
    endDate: Date,
    reportedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false }
);

disasterSchema.index({ location: "2dsphere" });
disasterSchema.index({ status: 1, severity: 1 });
disasterSchema.index({ title: "text", description: "text" });

disasterSchema.set("toJSON", { virtuals: true });

const Disaster = model<IDisaster>("Disaster", disasterSchema);
export default Disaster;
