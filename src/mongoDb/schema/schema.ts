import { Schema } from 'mongoose';
import * as mongoose from 'mongoose';
import { Gender } from '../gender.enum';
const TimeZoneSchema = new mongoose.Schema(
  {
    tzCode: { type: String, required: true },
    utc: { type: String, required: true },
    label: { type: String },
    name: { type: String },
  },
  { _id: false },
);
const Documents = new mongoose.Schema(
  {
    name: { type: String, required: true },
    key: { type: String, required: true },
    date: { type: Number, required: true },
  },
  { _id: true },
);
export const UserSchema = new mongoose.Schema(
  {
    userName: { type: String, required: true, index: true },
    deviceId: { type: Schema.Types.ObjectId, required: true, index: true },
    email: { type: String, required: true, index: true },
    gender: {
      type: String,

      enum: Gender,

      default: Gender.Male,
    },
    firstName: { type: String, required: true, index: true },
    lastName: { type: String, required: true, index: true },
    phoneNumber: { type: String, required: true },
    userProfile: { type: Documents, required: false },
    timeZone: { type: TimeZoneSchema, required: true },
    password: { type: String, required: true },
    role: { type: Schema.Types.ObjectId, required: true, index: true },
    notes: { type: String, default: null, index: true },
    isActive: { type: Boolean, default: true },
    isDeleted: { type: Boolean, default: false },
    tenantId: { type: Schema.Types.ObjectId, index: true },
    verificationToken:{type: String },
    isVerified:{type: Boolean, default: false}
  },
  { timestamps: true },
);
