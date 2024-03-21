import { Schema } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';
import UserDocument from '../mongoDb/document/document';
import { Gender } from '../mongoDb/gender.enum';
import { TimeZone } from './timeZone.model';
import { BaseResponseType } from '@shafiqrathore/logeld-tenantbackend-common-future';
class Doc {
  @ApiProperty()
  name?: string;
  @ApiProperty()
  imagePath?: string;
  @ApiProperty()
  date?: number;

  constructor(image: any) {
    this.name = image.name;
    this.imagePath = image.imagePath;
    this.date = image.date;
  }
}
class Profile {
  @ApiProperty()
  name?: string;
  @ApiProperty()
  imagePath?: string;
  @ApiProperty()
  date?: number;
  constructor(profile: any) {
    this.name = profile.name;
    this.imagePath = profile.imagePath;
    this.date = profile.date;
  }
}
export class UserResponse extends BaseResponseType {
  @ApiProperty()
  id: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  userProfile?: Profile;

  @ApiProperty()
  documents?: Doc;

  @ApiProperty()
  userName?: string;

  @ApiProperty()
  firstName?: string;

  @ApiProperty()
  lastName?: string;

  @ApiProperty()
  timeZone?: TimeZone;

  @ApiProperty()
  gender?: Gender;

  @ApiProperty()
  isActive?: boolean;

  @ApiProperty()
  notes?: string;

  @ApiProperty()
  phoneNumber?: string;

  @ApiProperty()
  role?: object;

  @ApiProperty()
  tenantId: Schema.Types.ObjectId;
  verificationToken:string;
  isVerified:boolean;
  password:string;


  constructor(userDocument: UserDocument | any, isJson: boolean = false) {
    super();
    this.id = !isJson ? userDocument.id : userDocument._id;
    this.email = userDocument.email;
    this.userName = userDocument.userName;
    this.firstName = userDocument.firstName;
    this.lastName = userDocument.lastName;
    this.userProfile = userDocument.userProfile;
    this.timeZone = !isJson
      ? userDocument.get('timeZone')
      : userDocument.timeZone;
    this.timeZone = userDocument.timeZone;
    this.gender = !isJson ? userDocument.get('gender') : userDocument.gender;
    this.isActive = userDocument.isActive;
    this.notes = userDocument.notes;
    this.phoneNumber = userDocument.phoneNumber;
    this.role = !isJson ? userDocument.get('role') : userDocument.role;
    this.tenantId = userDocument.tenantId;
    this.verificationToken=userDocument.verificationToken;
    this.isVerified = userDocument.isVerified;
    this.documents = userDocument?.documents?.map((keys) => new Doc(keys));
    this.password = userDocument.password;
  }
}
