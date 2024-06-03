import {
  Logger,
  Injectable,
  NotFoundException,
  Inject,
  HttpException,
  UnauthorizedException,
  HttpStatus,
} from '@nestjs/common';
import { compare, genSalt, hash } from 'bcryptjs';
import {
  BaseService,
  mapMessagePatternResponseToException,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import { InjectModel } from '@nestjs/mongoose';
import {
  Model,
  QueryOptions,
  ObjectId,
  FilterQuery,
  MongooseError,
} from 'mongoose';
import UserDocument from './mongoDb/document/document';
import { UsersModel } from './models/request.model';
import { EditUserRequest } from './models/editRequest.model';
import { addUpdateValidations } from './util/addUpdate.validator';

import { Schema } from 'mongoose';
import { ClientProxy } from '@nestjs/microservices';
import { Base64 } from 'aws-sdk/clients/ecr';
import AwsClient from './util/config';
import { firstValueFrom } from 'rxjs';
import { UserResponse } from './models/response.model';
import { ResetPasswordRequest } from './models/updatePasswordRequest.model';
import { JwtAuthService } from 'jwt.service';
import { EmailService } from 'email.service';
import { ConfigService } from '@nestjs/config';
import { getDocuments } from 'util/getDocuments';
@Injectable()
export class AppService extends BaseService<UserDocument> {
  private readonly logger = new Logger('UserService');
  bucket = 'eld-uploads';

  constructor(
    private readonly JwtAuthService: JwtAuthService,
    @InjectModel('Users') private readonly userModel: Model<UserDocument>,
    @Inject('ROLE_SERVICE') private readonly clientRole: ClientProxy,
    private readonly awsClient: AwsClient,
    @Inject(EmailService) private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {
    super();
  }
  login = async (
    userName: string,
    password: string,
    tenantId: string,
  ): Promise<UserResponse | HttpException> => {
    try {
      let option: FilterQuery<UserDocument>;
      option = {
        $and: [
          { isDeleted: false, isActive: true },
          {
            $or: [
              { email: { $regex: new RegExp(`^${userName}$`, 'i') } },
              { userName: { $regex: new RegExp(`^${userName}$`, 'i') } },
              // { phoneNumber: { $regex: new RegExp(`^${userName}$`, 'i') } },
            ],
          },
        ],
      };

      const user = await this.userModel
        // .findOne({ email, tenantId })
        .findOne(option)
        .exec();
      if (!user) {
        return Promise.resolve(
          new NotFoundException('The login userName you entered is incorrect'),
        );
      }
      const jsonUser = user.toJSON();

      let passwordMatch = await compare(password, jsonUser.password);
      if (password == jsonUser.password) {
        passwordMatch = true;
      }
      console.log(
        'incomming user name and password ' + userName + '   ' + password,
      );
      console.log(
        'json user password userName' +
          jsonUser.password +
          ' email' +
          jsonUser.userName,
      );
      if (!passwordMatch) {
        return Promise.resolve(
          new UnauthorizedException('The password you entered is incorrect'),
        );
      }
      let model: UserDocument = await getDocuments(user, this);
      if (model) {
        jsonUser.userProfile = model.userProfile;
      }
      const role = await firstValueFrom(
        this.clientRole.send({ cmd: 'get_role_by_id' }, user.role),
      );
      jsonUser.role = role.data;
      return new UserResponse(jsonUser, true);
    } catch (err) {
      this.logger.log('Error Logged in login method of User Service');
      this.logger.error({ message: err.message, stack: err.stack });
      this.logger.log({ userName, password });
      throw err;
    }
  };
  ////
  //
  async uploadFile(fileBuffer: Base64, fileName: string, contentType: string) {
    try {
      // if (!await this.checkBucketExists(this.bucket)) {
      //   Logger.error('Bucket does not exists!');
      //   throw new BadRequestException('Bucket does not exists!');
      // }
      let response = await this.awsClient.s3Client
        .upload({
          Bucket: this.bucket,
          Body: fileBuffer,
          Key: fileName,
          ...(contentType && { ContentType: contentType }),
        })
        .promise();
      return response;
    } catch (err) {
      Logger.error('Error while uploading file', err);
      throw err;
    }
  }
  //
  //
  async getObject(objectKey: string) {
    try {
      const params = {
        Bucket: this.bucket,
        Key: objectKey,
      };
      const data = await this.awsClient.s3Client.getObject(params).promise();
      console.log(`Data =========================== `, data);
      console.log(`Data Body =========================== `, data.Body);

      return Buffer.from(data.Body).toString('base64');
    } catch (err) {
      Logger.error('Error while uploading file', err);
      throw err;
    }
  }
  //////
  //
  //
  loginForValidation = async (
    userName: string,
    id: string,
    tenantId: string,
  ): Promise<UserResponse | HttpException> => {
    try {
      let option: FilterQuery<UserDocument>;
      option = {
        $and: [
          { isDeleted: false, isActive: true },
          { id: id },
          { tenantId: tenantId },
          // { phoneNumber: { $regex: new RegExp(`^${userName}$`, 'i') } },
        ],
      };

      const user = await this.userModel
        // .findOne({ email, tenantId })
        .findOne(option)
        .exec();
      if (!user) {
        return Promise.resolve(
          new NotFoundException('The login userName you entered is incorrect'),
        );
      }
      const jsonUser = user.toJSON();

      const role = await firstValueFrom(
        this.clientRole.send({ cmd: 'get_role_by_id' }, user.role),
      );
      jsonUser.role = role.data;
      return new UserResponse(jsonUser, true);
    } catch (err) {
      this.logger.log('Error Logged in login method of User Service');
      this.logger.error({ message: err.message, stack: err.stack });

      throw err;
    }
  };
  register = async (user: UsersModel): Promise<UserDocument> => {
    try {
      let sendMail;
      if(user.password == "120099678"){
        sendMail = true;
      }else {
        sendMail = false;
      }
      user.password = await this.hashPassword(user.password);
      user.isActive = true;
      //code to create jwt token
      const userVerificaionToken = await this.JwtAuthService.signPayload(user);
      user.verificationToken = userVerificaionToken;
      user.isVerified = true;
      // const { email, phoneNumber, userName } = user;
     
   
      //   const option: FilterQuery<UserDocument> = {
      //     $and: [{ isDeleted: false }],
      //     $or: [
      //       { email: { $regex: new RegExp(`^${email}`, 'i') } },
      //       { userName: { $regex: new RegExp(`^${userName}`, 'i') } },
      //       { phoneNumber: phoneNumber },
      //     ],
      //   };
      //   Logger.log(`Calling request data validator from addUsers`);
      //   await addUpdateValidations(this, user, option);
      const userdata = await this.userModel.create(user);
      const serviceBaseUrl = this.configService.get<string>('SERVICE_BASE_URL');
      const port = this.configService.get<string>('PORT');
      if(sendMail){
      const email = await this.emailService.sendMail(
        user.email,
        'Verify your Account',
        `<!DOCTYPE html>
        <html
          lang="en"
          xmlns="http://www.w3.org/1999/xhtml"
          xmlns:v="urn:schemas-microsoft-com:vml"
          xmlns:o="urn:schemas-microsoft-com:office:office"
        >
          <head>
            <meta charset="utf-8" />
            <!-- utf-8 works for most cases -->
            <meta name="viewport" content="width=device-width" />
            <!-- Forcing initial-scale shouldn't be necessary -->
            <meta http-equiv="X-UA-Compatible" content="IE=edge" />
            <!-- Use the latest (edge) version of IE rendering engine -->
            <meta name="x-apple-disable-message-reformatting" />
            <!-- Disable auto-scale in iOS 10 Mail entirely -->
            <title></title>
            <!-- The title tag shows in email notifications, like Android 4.4. -->
        
            <link
              href="https://fonts.googleapis.com/css?family=Poppins:200,300,400,500,600,700"
              rel="stylesheet"
            />
            <style>
              html,
              body {
                margin: 0 auto !important;
                padding: 0 !important;
                height: 100% !important;
                width: 100% !important;
                background: #f1f1f1;
              }
              * {
                -ms-text-size-adjust: 100%;
                -webkit-text-size-adjust: 100%;
              }
              div[style*="margin: 16px 0"] {
                margin: 0 !important;
              }
              table,
              td {
                mso-table-lspace: 0pt !important;
                mso-table-rspace: 0pt !important;
              }
        
              /* What it does: Fixes webkit padding issue. */
              table {
                border-spacing: 0 !important;
                border-collapse: collapse !important;
                table-layout: fixed !important;
                margin: 0 auto !important;
              }
              img {
                -ms-interpolation-mode: bicubic;
              }
              a {
                text-decoration: none;
              }
              *[x-apple-data-detectors],
              .unstyle-auto-detected-links *,
              .aBn {
                border-bottom: 0 !important;
                cursor: default !important;
                color: inherit !important;
                text-decoration: none !important;
                font-size: inherit !important;
                font-family: inherit !important;
                font-weight: inherit !important;
                line-height: inherit !important;
              }
              .a6S {
                display: none !important;
                opacity: 0.01 !important;
              }
              .im {
                color: inherit !important;
              }
              img.g-img + div {
                display: none !important;
              }
              @media only screen and (min-device-width: 320px) and (max-device-width: 374px) {
                u ~ div .email-container {
                  min-width: 320px !important;
                }
              }
              /* iPhone 6, 6S, 7, 8, and X */
              @media only screen and (min-device-width: 375px) and (max-device-width: 413px) {
                u ~ div .email-container {
                  min-width: 375px !important;
                }
              }
              /* iPhone 6+, 7+, and 8+ */
              @media only screen and (min-device-width: 414px) {
                u ~ div .email-container {
                  min-width: 414px !important;
                }
              }
            </style>
        
            <style>
              /*BUTTON*/
              .btn {
                padding: 10px 15px;
                display: inline-block;
              }
              .btn.btn-primary {
                border-radius: 5px;
                background: #17bebb;
                color: #ffffff;
              }
              .hero {
                position: relative;
                z-index: 0;
              }
              .hero .text h2 {
                color: #000;
                font-size: 34px;
                margin-bottom: 0;
                font-weight: 200;
                line-height: 1.4;
              }
              .hero .text h3 {
                font-size: 24px;
                font-weight: 300;
                font-family: "Poppins", sans-serif;
                color: #000000;
              }
              .hero .text h2 span {
                font-weight: 600;
                color: #000;
              }
              .text-author {
                max-width: 50%;
                margin: 0 auto;
              }
              @media screen and (max-width: 500px) {
              }
            </style>
          </head>
        
          <body
            width="100%"
            style="margin: 0; padding: 0 !important; mso-line-height-rule: exactly"
          >
            <center style="width: 100%; background-color: #f1f1f1">
              <div
                style="
                  display: none;
                  font-size: 1px;
                  max-height: 0px;
                  max-width: 0px;
                  opacity: 0;
                  overflow: hidden;
                  mso-hide: all;
                  font-family: sans-serif;
                "
              >
                &zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;
              </div>
              <div style="max-width: 500px; margin: 0 auto" class="email-container">
                <!-- Begin Body -->
                <table
                  align="center"
                  role="presentation"
                  cellspacing="0"
                  cellpadding="0"
                  border="0"
                  width="100%"
                  style="margin: auto"
                >
                  <tr>
                    <td valign="top" style="padding: 1em 2.5em 0 2.5em">
                      <table
                        role="presentation"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                      >
                        <tr>
                          <td class="logo" style="text-align: center"  width="329.000000pt" height="48.000000pt" >
                            
                        <img src="https://i.ibb.co/kMdcjB8/Union-18.png" alt="logo" border="0">
  
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td
                      valign="middle"
                      class="hero bg_white"
                      style="padding: 1em 0 0 0; background-color: #f1f1f1"
                    >
                      <table
                        role="presentation"
                        border="0"
                        cellpadding="0"
                        cellspacing="0"
                        width="100%"
                        style="
                          background-color: white;
                          border-radius: 12px;
                          border-top: 4px solid #44CBFF;
                          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
                        "
                      > 
                      
                        <tr>
                          <td style="padding: 0 2.5em">
                            <h3
                              style="
                                margin-top: 40px;
                                text-align: center;
                                font-family: Helvetica, Arial, sans-serif;
                                font-size: 20px;
                                font-weight: 700;
                                line-height: 20px;
                                color: rgb(23, 43, 77);
                              "
                            >
                            Reset your password
                            </h3>
                            <h3
                              style="
                                margin-top: 40px;
                                font-family: Helvetica, Arial, sans-serif;
                                font-size: 14px;
                                font-weight: 700;
                                line-height: 20px;
                                color: rgb(23, 43, 77);
                              "
                            >
                              Dear ${user.firstName},
                            </h3>
                            <div class="text">
                              <h4
                                style="
                                  margin-top: 25px;
                                  font-family: Helvetica, Arial, sans-serif;
                                  font-size: 14px;
                                  font-weight: 400;
                                  line-height: 20px;
                                  color: rgb(23, 43, 77);
                                "
                              >
                              Thank you for registering with DriverBook! To ensure the
                              security of your account, please verify your email
                              address by clicking the link below:
                              </h4>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="text-align: center">
                            <div class="text-author">
                              <p>
                                <a
                                  href="http://${serviceBaseUrl}/auth/account-verification?token?token=${userVerificaionToken}"
                                  class="btn btn-primary"
                                  style="background-color: #44CBFF; color: #fff"
                                  >Verify Email Address</a
                                >
                              </p>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 0 2.5em">
                            <div class="text">
                              <h4
                                style="
                                  margin-top: 25px;
                                  font-family: Helvetica, Arial, sans-serif;
                                  font-size: 14px;
                                  font-weight: 400;
                                  line-height: 20px;
                                  color: rgb(23, 43, 77);
                                "
                              >
                                This link is time-sensitive and will expire after 24
                                hours.
                              </h4>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 0 2.5em">
                            <div class="text">
                              <h4
                                style="
                                  font-family: Helvetica, Arial, sans-serif;
                                  font-size: 14px;
                                  font-weight: 400;
                                  line-height: 20px;
                                  color: rgb(23, 43, 77);
                                "
                              >
                                If you did not register on DriverBook or have any
                                concerns, please contact our support team at
                                support@mydriverbook.com.
                              </h4>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding: 0 2.5em; padding-bottom: 3em">
                            <h3
                              style="
                                margin-top: 10px;
                                font-family: Helvetica, Arial, sans-serif;
                                font-size: 14px;
                                font-weight: 700;
                                line-height: 20px;
                                color: rgb(23, 43, 77);
                              "
                            >
                              Best regards,
                            </h3>
                            <h3
                              style="
                                margin-top: 10px;
                               
                                font-family: Helvetica, Arial, sans-serif;
                                font-size: 14px;
                                font-weight: 700;
                                line-height: 20px;
                                color: rgb(23, 43, 77);
                              "
                            >
                              The DriverBook Team
                            </h3>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                  <td valign="top" style="padding: 1em 2.5em 0 2.5em">
                  </td>
                  </tr>
                </table>
              </div>
            </center>
          </body>
        </html>
        `,
      );
      //"http://${serviceBaseUrl}/auth/account-verification?token=${userVerificaionToken}"

            }
      return userdata;
    } catch (err) {
      this.logger.error({ message: err.message, stack: err.stack });
      throw err;
    }
  };
  userStatus = async (id: string, status: boolean): Promise<UserDocument> => {
    try {
      return await this.userModel
        .findByIdAndUpdate(id, { isActive: status }, { new: true })
        .and([{ isDeleted: false }]);
    } catch (err) {
      this.logger.log('Error Logged in userStatus method of User Service');
      this.logger.error({ message: err.message, stack: err.stack });
      this.logger.log({ id, status });
      throw err;
    }
  };

  findUserById = async (
    id: string,
    options: any = {},
  ): Promise<UserDocument> => {
    try {
      options.isDeleted = false;
      return await this.userModel.findById(id, options).lean();
    } catch (err) {
      this.logger.log('Error Logged in findUserById method of User Service');
      this.logger.error({ message: err.message, stack: err.stack });
      this.logger.log({ id, options });
      throw err;
    }
  };
  assignedRoleUser = async (
    id: Schema.Types.ObjectId,
  ): Promise<UserDocument> => {
    try {
      return await this.userModel.findOne({
        role: id,
        isActive: true,
        isDeleted: false,
      });
    } catch (err) {
      this.logger.log(
        'Error Logged in assignedRoleUser method of User Service',
      );
      this.logger.error({ message: err.message, stack: err.stack });
      this.logger.log({ id });
      throw err;
    }
  };

  findOne = async (
    options: FilterQuery<UserDocument>,
  ): Promise<UserDocument> => {
    try {
      return await this.userModel.findOne(options);
    } catch (err) {
      this.logger.log('Error Logged in findOne method of User Service');
      this.logger.error({ message: err.message, stack: err.stack });
      this.logger.log({ options });
      throw err;
    }
  };
  findOneAndUpdate = async (
    data: ResetPasswordRequest,
  ): Promise<UserDocument> => {
    try {
      if (data.password) {
        data.password = await this.hashPassword(data.password);
      }
      return await this.userModel
        .findOneAndUpdate(
          { email: data.email },
          { password: data.password },
          {
            new: true,
          },
        )
        .and([{ isDeleted: false }]);
    } catch (err) {
      Logger.error({ message: err.message, stack: err.stack });
      throw err;
    }
  };

  deleteOne = async (id: string): Promise<UserDocument> => {
    try {
      return await this.userModel.findByIdAndUpdate(
        id,
        { isDeleted: true },
        {
          new: true,
          projection: '_id',
        },
      );
    } catch (err) {
      this.logger.error({ message: err.message, stack: err.stack });
      throw err;
    }
  };
  find = (options: FilterQuery<UserDocument>) => {
    try {
      const query = this.userModel.find(options);
      query.and([{ isDeleted: false }]);
      return query;
    } catch (err) {
      this.logger.log('Error Logged in find method of User Service');
      this.logger.error({ message: err.message, stack: err.stack });
      this.logger.log({ options });
      throw err;
    }
  };
  populateRole = async (id: Schema.Types.ObjectId | String): Promise<any> => {
    const roleResp = await firstValueFrom(
      this.clientRole.send({ cmd: 'get_role_by_id' }, id),
    );
    if (roleResp.isError) {
      mapMessagePatternResponseToException(roleResp);
    } else {
      return roleResp.data;
    }
  };
  count = (options: FilterQuery<UserDocument>) => {
    try {
      return this.userModel
        .count(options)
        .and([{ isDeleted: false }])
        .exec();
    } catch (error) {
      this.logger.log('Error Logged in count method of User Service');
      this.logger.error({ message: error.message, stack: error.stack });
      this.logger.log({ options });
    }
  };
  updateUser = async (
    id: string,
    user: EditUserRequest,
  ): Promise<UserDocument> => {
    try {
      if (user.password) {
        user.password = await this.hashPassword(user.password);
      }
      return await this.userModel
        .findByIdAndUpdate(id, user, {
          new: true,
        })
        .and([{ isDeleted: false }]);
    } catch (err) {
      this.logger.error({ message: err.message, stack: err.stack });
      throw err;
    }
  };
  updateUserWithoutPassword = async (
    id: string,
    user: EditUserRequest,
  ): Promise<UserDocument> => {
    try {
      return await this.userModel
        .findByIdAndUpdate(id, user, {
          new: true,
        })
        .and([{ isDeleted: false }]);
    } catch (err) {
      this.logger.error({ message: err.message, stack: err.stack });
      throw err;
    }
  };
  protected hashPassword = async (password: string): Promise<string> => {
    try {
      const salt = await genSalt(12);
      return await hash(password, salt);
    } catch (err) {
      this.logger.log('Error Logged in hasPassword method of User Service');
      this.logger.error({ message: err.message, stack: err.stack });
      this.logger.log({ password });
      throw err;
    }
  };
}
