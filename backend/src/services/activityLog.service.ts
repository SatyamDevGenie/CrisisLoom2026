import ActivityLog from "../models/activityLog.model";

export async function logActivity(input: {
  actor?: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
  ip?: string;
}) {
  await ActivityLog.create(input);
}

export async function listActivity(limit = 50) {
  return ActivityLog.find()
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("actor", "name email role");
}
