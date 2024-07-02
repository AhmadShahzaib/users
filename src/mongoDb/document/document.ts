import { TimeZone } from './../../models/timeZone.model';
import { Document, Schema } from 'mongoose';
export type Documents={
  name?:string;
  key?:string;
  date?:number
  imagePath?:any
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
  client?:string;
  tenantId?: string;
  isDeleted?: boolean;
  verificationToken?:string;
  isVerified:boolean;
}
