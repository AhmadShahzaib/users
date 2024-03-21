import { AwsService } from '@shafiqrathore/logeld-tenantbackend-common-future';
import { EditUserRequest, UsersModel } from 'models';
import moment from 'moment';

export const uploadDocument = async (
  profile: any,
  awsService: AwsService,
  userModel: UsersModel | EditUserRequest,
  tenantId: string,
) => {
  if (profile) {
    let keyProfile = await awsService.uploadFile(
      profile[0]?.buffer,
      `${tenantId}/${userModel.email}/userProfile/${moment().unix()}-${
        profile[0]?.originalname
      }`,
      profile[0].mimetype,
    );
    userModel.userProfile = {
      key: keyProfile.key,
      name: profile[0]?.originalname,
      date:moment().unix()
    };
  }
  return userModel;
};
