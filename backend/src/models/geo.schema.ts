import { Schema } from "mongoose";
import type { GeoPoint } from "../types";

export const geoPointSchema = new Schema<GeoPoint>(
  {
    type: {
      type: String,
      enum: ["Point"],
      required: true,
      default: "Point",
    },
    coordinates: {
      type: [Number],
      required: true,
      validate: {
        validator(value: number[]) {
          return (
            Array.isArray(value) &&
            value.length === 2 &&
            value[0] >= -180 &&
            value[0] <= 180 &&
            value[1] >= -90 &&
            value[1] <= 90
          );
        },
        message: "Coordinates must be [longitude, latitude]",
      },
    },
  },
  { _id: false }
);
