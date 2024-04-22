import { Gender } from '../mongoDb/gender.enum';
import { Schema } from 'mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  MinLength,
  MaxLength,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsBoolean,
  IsOptional,
  IsMongoId,
  NotContains,
} from 'class-validator';
import { TimeZone } from './timeZone.model';
import { Documents } from 'mongoDb/document/document';

export class EditUserRequest {
  @IsEmail({}, { message: 'Email is invalid' })
  @IsNotEmpty()
  @IsString()
  @ApiProperty()
  @NotContains(' ')
  email: string;

  profile?: Documents = {};
  userProfile?: Documents = {};
  documents?: Documents[] = [];
  @ApiProperty()
  // @MinLength(8)
  @MaxLength(20)
  @IsOptional()
  @IsString()
  password: string;

  @ApiProperty()
  
  shouldUpdatePassword: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(50)
  @IsString()
  @NotContains(' ')
  userName: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(50)
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(50)
  @IsString()
  lastName: string;

  @ApiProperty()
  @IsNotEmpty()
  deviceId: string;

  @ApiProperty({
    type: String,
  })
  @IsString()
  @IsNotEmpty()
  timeZone?: string | TimeZone;

  @ApiProperty({ enum: Gender })
  @IsString()
  @IsEnum(Gender)
  gender: string;

  @ApiProperty()
  @IsNotEmpty()
  
  isActive?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  notes: string;

  @ApiProperty()
  @IsNotEmpty()
  @MaxLength(15)
  @IsString()
 
  phoneNumber: string;

  @ApiProperty()
  @IsString()
  @IsMongoId()
  @IsNotEmpty()
  role: string;
}
