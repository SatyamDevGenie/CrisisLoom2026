import { Schema, model, Types } from "mongoose";
import bcrypt from "bcryptjs";
import { USER_ROLES, type UserRole } from "../types";
import { env } from "../config/env";

export interface IRefreshSession {
  tokenHash: string;
  expiresAt: Date;
  userAgent?: string;
  ip?: string;
}

export interface IUser {
  name: string;
  email: string;
  phone?: string;
  password: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  refreshTokens: IRefreshSession[];
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLogin?: Date;
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    phone: { type: String, trim: true },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    refreshTokens: [
      {
        tokenHash: { type: String, required: true },
        expiresAt: { type: Date, required: true },
        userAgent: String,
        ip: String,
      },
    ],
    resetPasswordToken: { type: String, select: false },
    resetPasswordExpires: { type: Date, select: false },
    lastLogin: Date,
    avatar: String,
  },
  { timestamps: true, versionKey: false }
);

userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ phone: 1 }, { unique: true, sparse: true });

userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, env.BCRYPT_SALT_ROUNDS);
});

userSchema.methods.comparePassword = function (candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  virtuals: true,
  transform(_doc, ret) {
    const value = ret as unknown as Record<string, unknown>;
    delete value.password;
    delete value.refreshTokens;
    delete value.resetPasswordToken;
    delete value.resetPasswordExpires;
    return value;
  },
});

export const User = model<IUser>("User", userSchema);
export type UserId = Types.ObjectId;
export default User;
