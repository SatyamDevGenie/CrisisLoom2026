import { Schema, model, Types } from "mongoose";
import {
  NOTIFICATION_CHANNELS,
  NOTIFICATION_STATUSES,
  type NotificationChannel,
  type NotificationStatus,
} from "../types";

export interface INotification {
  user: Types.ObjectId;
  title: string;
  message: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  isRead: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, required: true, maxlength: 160 },
    message: { type: String, required: true, maxlength: 1000 },
    channel: { type: String, enum: NOTIFICATION_CHANNELS, required: true },
    status: { type: String, enum: NOTIFICATION_STATUSES, default: "queued" },
    isRead: { type: Boolean, default: false },
    metadata: { type: Schema.Types.Mixed },
  },
  { timestamps: true, versionKey: false }
);

notificationSchema.index({ user: 1, isRead: 1, createdAt: -1 });

notificationSchema.set("toJSON", { virtuals: true });

const Notification = model<INotification>("Notification", notificationSchema);
export default Notification;
