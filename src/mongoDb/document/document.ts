import { TimeZone } from './../../models/timeZone.model';
import { Document, Schema } from 'mongoose';
export type Documents={
  name?:string;
  key?:string;
  date?:number
}
export default interface UserDocument extends Document {
  deviceId?: string;
  userName: string;
  email: string;
  gender:string;
  userProfile?:Documents;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  timeZone: string | TimeZone ;
  password: string;
  role: string;
  notes?: string;
  isActive?: boolean;
  tenantId?: string;
  isDeleted?: boolean;
  verificationToken?:string;
  isVerified:boolean;
}
