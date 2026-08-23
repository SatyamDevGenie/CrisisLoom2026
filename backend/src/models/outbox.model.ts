import { Schema, model } from "mongoose";

export type OutboxStatus = "pending" | "published" | "failed";

export interface IOutboxEvent {
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  status: OutboxStatus;
  attempts: number;
  lastError?: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const outboxSchema = new Schema<IOutboxEvent>(
  {
    eventType: { type: String, required: true },
    aggregateType: { type: String, required: true },
    aggregateId: { type: String, required: true },
    payload: { type: Schema.Types.Mixed, required: true },
    status: {
      type: String,
      enum: ["pending", "published", "failed"],
      default: "pending",
    },
    attempts: { type: Number, default: 0 },
    lastError: String,
    publishedAt: Date,
  },
  { timestamps: true, versionKey: false }
);

outboxSchema.index({ status: 1, createdAt: 1 });
outboxSchema.index({ aggregateType: 1, aggregateId: 1 });

const OutboxEvent = model<IOutboxEvent>("OutboxEvent", outboxSchema);
export default OutboxEvent;
