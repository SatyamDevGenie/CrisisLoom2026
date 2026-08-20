import { Schema, model, Types } from "mongoose";

export interface IActivityLog {
  actor?: Types.ObjectId;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
  createdAt: Date;
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: String,
    metadata: { type: Schema.Types.Mixed },
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false }, versionKey: false }
);

activityLogSchema.index({ createdAt: -1 });
activityLogSchema.index({ actor: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });

const ActivityLog = model<IActivityLog>("ActivityLog", activityLogSchema);
export default ActivityLog;
