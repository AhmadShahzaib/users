import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { AppService } from '../app.service';
import { EditUserRequest, UsersModel } from '../models';
import UserDocument from '../mongoDb/document/document';
import { FilterQuery } from 'mongoose';
import timezones from 'timezones-list';

export const beforeUpdateValidations = async (
  appService: AppService,
  requestData: UsersModel | EditUserRequest,
  options: FilterQuery<UserDocument>,
) => {
  Logger.log(`Calling findOne of UserService with arguments ${options}`);
  const emailOccupier = await appService.findOne(options);
  if (emailOccupier) {
    if (emailOccupier.email.toLowerCase() === requestData.email.toLowerCase()) {
      return `Email already exists`;
      
    }
  
    if (emailOccupier.phoneNumber === requestData.phoneNumber) {
      return `Phone number already exists`
    }
  }
return "true"
 
};
