import { ConflictException, Logger, NotFoundException } from '@nestjs/common';
import { AppService } from '../app.service';
import { EditUserRequest, UsersModel } from '../models';
import UserDocument from '../mongoDb/document/document';
import { FilterQuery } from 'mongoose';
import timezones from 'timezones-list';

export const addUpdateValidations = async (
  appService: AppService,
  requestData: UsersModel | EditUserRequest,
  options: FilterQuery<UserDocument>,
) => {
  Logger.log(`Calling findOne of UserService with arguments ${options}`);
  const emailOccupier = await appService.findOne(options);
  if (emailOccupier) {
    if (emailOccupier.email.toLowerCase() === requestData.email.toLowerCase()) {
      Logger.log(`Email already exists`);
      throw new ConflictException(`Email already exists`);
    }
  
    if (emailOccupier.phoneNumber === requestData.phoneNumber) {
      Logger.log(`Phone number already exists`);
      throw new ConflictException(`Phone number already exists`);
    }
  }

  if (
   ( requestData.password ||  requestData.password == '') &&
    requestData.shouldUpdatePassword == 'false'
  ) {
    delete requestData.password;
  }

  // Checking timezone
  Logger.log(`Validating timezone tzcode from timezones list.`);
  const index = timezones.findIndex((ele) => {
    return ele.tzCode == (requestData.timeZone as string);
  });
  if (index < 0) {
    Logger.log(`No timezone found against tzcode ${requestData.timeZone}`);
    throw new NotFoundException(`TimeZone you select does not exist`);
  }

  requestData.timeZone = timezones[index];

  // Checking role
  const role = await appService.populateRole(requestData.role);
};
