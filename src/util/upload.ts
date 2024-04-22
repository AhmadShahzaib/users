import { AwsService } from '@shafiqrathore/logeld-tenantbackend-common-future';
import { EditUserRequest, UsersModel } from 'models';
import { AppService } from '../app.service';

import moment from 'moment';
import { Logger } from '@nestjs/common';

export const uploadDocument = async (
  doc: any,
  profile: Express.Multer.File,
  appService: AppService,
  userModel: UsersModel | EditUserRequest,
  tenantId: string,
) => {
  if (doc && doc.length > 0) {
    userModel.documents = [];
    doc?.forEach(async (item) => {
      let key = await appService.uploadFile(
        item?.buffer,
        `${tenantId}/${userModel.email}/userDocuments/${moment().unix()}-${
          item?.originalname
        }`,
        item.mimetype,
      );
      userModel.documents.push({
        key: key.key,
        name: item?.originalname,
        date: moment().unix(),
      });
    });
  }
  if (profile) {
    // Logger.log(`Validation completed with no errors or conflicts.`);

    let keyProfile = await appService.uploadFile(
      profile[0]?.buffer,
      `${tenantId}/${userModel.email}/userDocuments/${moment().unix()}-${
        profile[0]?.originalname
      }`,
      profile[0].mimetype,
    );
    userModel.userProfile = {
      key: keyProfile.key,
      name: profile[0]?.originalname,
      date: moment().unix(),
    };
  }
  return userModel;
};
