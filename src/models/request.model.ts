import { Gender } from '../mongoDb/gender.enum';
import { Schema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  MinLength,
  MaxLength,
  IsNotEmpty,
  ValidateNested,
  IsString,
  IsBoolean,
  IsNumberString,
  IsInt,
  IsOptional,
  IsNumber,
  IsEnum,
  IsMongoId,
  NotContains,
} from 'class-validator';

import { TimeZone } from './timeZone.model';
import { Documents } from 'mongoDb/document/document';

export class UsersModel {
  @IsEmail({}, { message: 'Email is invalid' })
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  @NotContains(' ')
  email: string;

  @ApiPropertyOptional({
    type: 'array',
    items: {
      type: 'string',
      format: 'binary',
    },
  })
  userDocuments?: Express.Multer.File[];

  @ApiPropertyOptional({
    type: 'string',
    format: 'binary',
  })
  userProfile?: Express.Multer.File;

  @IsNotEmpty({ message: 'Password is required' })
  @MinLength(8)
  @MaxLength(20)
  @IsString()
  @ApiProperty()
  password: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  @NotContains(' ')
  userName: string;
  profile?: Documents = {};

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  deviceId?: string;

  @ApiProperty({
    type: String,
  })
  @IsNotEmpty()
  timeZone: string | TimeZone;

  @ApiProperty({ enum: Gender })
  @IsString()
  @IsEnum(Gender)
  gender: string;

  @ApiProperty()
  isActive?: boolean;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes: string;


  @ApiProperty()
  // @IsNumberString()
  @IsNotEmpty()
  @IsString()
  @MaxLength(15)
  // @NotContains(' ')
  phoneNumber: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @IsMongoId()
  role: string;
  driverProfile?: Documents = {};
  documents?: Documents[] = [];
  tenantId?: string;
  verificationToken:string;
  isVerified:boolean;
}
