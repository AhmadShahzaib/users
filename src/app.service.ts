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
      user.password = await this.hashPassword(user.password);
      user.isActive = true;
      //code to create jwt token
      const userVerificaionToken = await this.JwtAuthService.signPayload(user);
      user.verificationToken = userVerificaionToken;
      user.isVerified = true;
      const userdata = await this.userModel.create(user);
      const serviceBaseUrl = this.configService.get<string>('SERVICE_BASE_URL');
      const port = this.configService.get<string>('PORT');

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
