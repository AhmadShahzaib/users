import { AwsService } from '@shafiqrathore/logeld-tenantbackend-common-future';
import UserDocument from 'mongoDb/document/document';
import { AppService } from '../app.service';

export const getDocuments = async (
  user: UserDocument,
  appService: AppService,
): Promise<UserDocument> => {
  if (user?.userProfile?.key) {
    let url = await appService.getObject(user.userProfile.key);
    user.userProfile['imagePath'] = `data:image/${user.userProfile.name
      .split('.')
      .pop()};base64,${url.replace(/\s+/g, '')}`;
    delete user.userProfile['key'];
  }
  return user;
};
