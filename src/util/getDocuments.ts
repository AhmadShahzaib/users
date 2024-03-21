import { AwsService } from '@shafiqrathore/logeld-tenantbackend-common-future';
import UserDocument from 'mongoDb/document/document';

export const getDocuments = async (
  user: UserDocument,
  awsService: AwsService,
): Promise<UserDocument> => {
  if (user?.userProfile) {
    let url = await awsService.getObject(user.userProfile.key);
    user.userProfile['imagePath'] = `data:image/${user.userProfile.name
      .split('.')
      .pop()};base64,${url.replace(/\s+/g, '')}`;
    delete user.userProfile['key'];
  }
  return user;
};
