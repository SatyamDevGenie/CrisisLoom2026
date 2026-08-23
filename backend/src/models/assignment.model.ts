import { Schema, model, Types } from "mongoose";
import {
  ASSIGNEE_TYPES,
  ASSIGNMENT_STATUSES,
  type AssigneeType,
  type AssignmentStatus,
} from "../types";

export interface IAssignment {
  request: Types.ObjectId;
  assigneeType: AssigneeType;
  assignee: Types.ObjectId;
  assignedBy: Types.ObjectId;
  status: AssignmentStatus;
  notes?: string;
  acceptedAt?: Date;
  completedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const assignmentSchema = new Schema<IAssignment>(
  {
    request: {
      type: Schema.Types.ObjectId,
      ref: "ResourceRequest",
      required: true,
    },
    assigneeType: { type: String, enum: ASSIGNEE_TYPES, required: true },
    assignee: { type: Schema.Types.ObjectId, required: true },
    assignedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: { type: String, enum: ASSIGNMENT_STATUSES, default: "notified" },
    notes: { type: String, maxlength: 500 },
    acceptedAt: Date,
    completedAt: Date,
  },
  { timestamps: true, versionKey: false }
);

assignmentSchema.index({ request: 1, assignee: 1 }, { unique: true });
assignmentSchema.index({ assignee: 1, status: 1 });
assignmentSchema.index({ status: 1, createdAt: -1 });
assignmentSchema.index(
  { request: 1 },
  {
    unique: true,
    name: "one_active_claim_per_request",
    partialFilterExpression: { status: { $in: ["accepted", "in_progress"] } },
  }
);

assignmentSchema.set("toJSON", { virtuals: true });

const Assignment = model<IAssignment>("Assignment", assignmentSchema);
export default Assignment;
