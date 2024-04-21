import {
  Controller,
  Body,
  Res,
  HttpStatus,
  Param,
  Req,
  InternalServerErrorException,
  HttpException,
  NotFoundException,
  Logger,
  Query,
  UseInterceptors,
  UploadedFiles,
  Inject,
} from '@nestjs/common';
import { Types, Schema, FilterQuery, CastError, Error } from 'mongoose';
import {
  searchableAttributes,
  sortableAttributes,
  searchableIds,
  UsersModel,
  UserResponse,
  Login,
  EditUserRequest,
  IsActive,
} from './models';
import { ApiTags } from '@nestjs/swagger';
import { Response, Request } from 'express';
import { ResetPasswordRequest } from './models/updatePasswordRequest.model';
import { AppService } from './app.service';
import { MessagePattern } from '@nestjs/microservices';
import AddDecorators from './decorators/add';
import GetByIdDecorators from './decorators/getById';
import UpdateByIdDecorators from './decorators/updateById';
import GetDecorators from './decorators/get';
import DeleteDecorators from './decorators/delete';
import IsActiveDecorators from './decorators/isActive';
import {
  BaseController,
  MongoIdValidationPipe,
  ListingParams,
  MessagePatternResponseInterceptor,
  ListingParamsValidationPipe,
  AwsService,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import timezones from 'timezones-list';
import UserDocument from './mongoDb/document/document';
import { addUpdateValidations } from './util/addUpdate.validator';
import { checkStatusChangePermission } from './util/statusPermission.validator';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { uploadDocument } from 'util/upload';
import { getDocuments } from 'util/getDocuments';
import { EmailService } from 'email.service';

@Controller('user')
@ApiTags('Users')
export class AppController extends BaseController {
  constructor(
    private readonly appService: AppService,
    private readonly awsService: AwsService,
    @Inject(EmailService) private readonly emailService: EmailService
  ) {
    super();
  }

  // **************************** MICROSERVIE METHODS ****************************

  @UseInterceptors(MessagePatternResponseInterceptor)
  @MessagePattern({ cmd: 'get_user_for_login' })
  async getLoginUser(userLogin: Login): Promise<UserResponse | HttpException> {
    try {
      const { userName, password, tenantId }: Login = userLogin;
      return this.appService.login(userName, password, tenantId);
    } catch (error) {
      return error;
    }
  }
  @UseInterceptors(MessagePatternResponseInterceptor)
  @MessagePattern({ cmd: 'get_user_for_login_validation' })
  async getLoginUserForValidation(userLogin: any): Promise<UserResponse | HttpException> {
    try {
      const { userName, id, tenantId } = userLogin;
      return this.appService.loginForValidation(userName, id, tenantId);
    } catch (error) {
      return error;
    }
  }
  @UseInterceptors(new MessagePatternResponseInterceptor())
  @MessagePattern({ cmd: 'get_user_by_email' })
  async tcp_geUserByEmail(email: string): Promise<UserResponse | Error> {
    try {
      Logger.log(`find user with email`);
      let option = {
        isActive: true,
        isDeleted: false,
        email: { $regex: new RegExp(`^${email}`, 'i') },
      };
      const user = await this.appService.findOne(option);
      if (user && Object.keys(user).length > 0) {
        Logger.log(`user data get successfully`);
        return new UserResponse(user);
      } else {
        Logger.log(`not find login user`);
        throw new NotFoundException(`The email you entered is incorrect`);
      }
    } catch (err) {
      Logger.error({ message: err.message, stack: err.stack });
      return err;
    }
  }

  @UseInterceptors(new MessagePatternResponseInterceptor())
  @MessagePattern({ cmd: 'update_user_password' })
  async tcp_updatePassword(
    identify: ResetPasswordRequest,
  ): Promise<UserResponse | Error> {
    try {
      const driver = await this.appService.findOneAndUpdate(identify);
      if (driver && Object.keys(driver).length > 0) {
        Logger.log(`user password update successfully`);
        return new UserResponse(driver);
      } else {
        Logger.log(`not find  user`);
        throw new NotFoundException(`user not found`);
      }
    } catch (err) {
      Logger.error({ message: err.message, stack: err.stack });
      return err;
    }
  }
  @UseInterceptors(new MessagePatternResponseInterceptor())
  @MessagePattern({ cmd: 'add_user' })
  async addUser(
    data
  ): Promise<UserResponse | Error> {
    try {
      const user = await this.appService.register(data);
      if (user && Object.keys(user).length > 0) {
        Logger.log(`user password update successfully`);
        return new UserResponse(user);
      } else {
        Logger.log(`not find  user`);
        throw new NotFoundException(`user not found`);
      }
    } catch (err) {
      Logger.error({ message: err.message, stack: err.stack });
      return err;
    }
  }
  @UseInterceptors(MessagePatternResponseInterceptor)
  @MessagePattern({ cmd: 'is_role_assigned_user' })
  async roleAssignedUser(id: Schema.Types.ObjectId): Promise<boolean> {
    try {
      const user = await this.appService.assignedRoleUser(id);

      if (user) {
        return true;
      } else {
        return false;
      }
    } catch (error) {
      return error;
    }
  }

  @AddDecorators()
  @UseInterceptors(
    FileFieldsInterceptor([  { name: 'userDocument', maxCount: 10 },
    { name: 'profile', maxCount: 1 },]),
  )
  async addUsers(
    @Body() registerUserReqData: UsersModel,
    @UploadedFiles()
    files: {
      userDocument: Express.Multer.File[];
      profile: Express.Multer.File;
    },
    @Res() response: Response,
    @Req() request: Request,
  ) {
    Logger.log(
      `${request.method} request received from ${request.ip} for ${
        request.originalUrl
      } by: ${
        !response.locals.user ? 'Unauthorized User' : response.locals.user.id
      }`,
    );

    const { email, phoneNumber, userName } = registerUserReqData;
    const { tenantId } = request.user ?? ({ tenantId: undefined } as any);
    try {
      const option: FilterQuery<UserDocument> = {
        $and: [{ isDeleted: false }],
        $or: [
          { email: { $regex: new RegExp(`^${email}`, 'i') } },
          { userName: { $regex: new RegExp(`^${userName}`, 'i') } },
          { phoneNumber: phoneNumber },
        ],
      };
      Logger.log(`Calling request data validator from addUsers`);
      await addUpdateValidations(this.appService, registerUserReqData, option);

      Logger.log(`Validation completed with no errors or conflicts.`);
      registerUserReqData.tenantId = tenantId;
      let requestModel = await uploadDocument(
        files?.userDocument,       
        files?.profile,
        this.appService,
        registerUserReqData,
        tenantId,
      );
      Logger.log(`Calling register method of User Service`);
      const userDoc = await this.appService.register(
        requestModel as UsersModel,
      );
      if (!userDoc) {
        Logger.log(`Unknown error while adding user occurred.`);
        throw new InternalServerErrorException(
          'Unknown error while adding user occurred.',
        );
      }
      Logger.log(`User added successfully. Creating response object.`);
      Logger.log(JSON.stringify(userDoc));

      let model: UserDocument = await getDocuments(userDoc, this.appService);
      Logger.log(`User image get.`);

      const result: UserResponse = new UserResponse(model);
      response.status(HttpStatus.CREATED).send({
        message: 'User has been created successfully',
        data: result,
      });
    } catch (error) {
      Logger.error({ message: error.message, stack: error.stack });
      throw error;
    }
  }

  @DeleteDecorators()
  async deleteUser(
    @Param('id', MongoIdValidationPipe) id: string,
    @Res() response: Response,
    @Req() request: Request,
  ) {
    Logger.log(
      `${request.method} request received from ${request.ip} for ${
        request.originalUrl
      } by: ${
        !response.locals.user ? 'Unauthorized User' : response.locals.user.id
      }`,
    );

    try {
      Logger.log(`Calling deleteOne method of User Service with id: ${id}`);
      const result = await this.appService.deleteOne(id);
      if (result) {
        return response.status(200).send({
          message: 'User has been deleted successfully',
        });
      } else {
        throw new NotFoundException(`${id} not exist`);
      }
    } catch (error) {
      Logger.error({ message: error.message, stack: error.stack });
      throw error;
    }
  }

  @GetDecorators()
  async getUsers(
    @Query(ListingParamsValidationPipe) queryParams: ListingParams,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    Logger.log(
      `${request.method} request received from ${request.ip} for ${
        request.originalUrl
      } by: ${
        !response.locals.user ? 'Unauthorized User' : response.locals.user.id
      }`,
    );
    try {
      const options: FilterQuery<UserDocument> = {};
      const { tenantId: id } = request.user ?? ({ tenantId: undefined } as any);
      const { search, orderBy, orderType, pageNo, limit } = queryParams;
      options['$and']=[{tenantId:id}]
      if (search) {
        options.$or = [];
        if (Types.ObjectId.isValid(search)) {
          searchableIds.forEach((attribute) => {
            options.$or.push({ [attribute]: new RegExp(search, 'i') });
          });
        }
        searchableAttributes.forEach((attribute) => {
          options.$or.push({ [attribute]: new RegExp(search, 'i') });
        });
      }
      // options.$and = [];
    //  options['$and'].push({ _id: { $ne: response.locals.user.id } });

      Logger.log(
        `Calling find method of User service with search options to get query.`,
      );
      const query = this.appService.find(options);

      Logger.log(`Adding sort options to query.`);
      if (orderBy && sortableAttributes.includes(orderBy)) {
        query.collation({ locale: 'en' }).sort({ [orderBy]: orderType ?? 1 });
      } else {
        query.sort({ createdAt: 1 });
      }

      Logger.log(
        `Calling count method of user service with search options to get total count of records.`,
      );
      const total = await this.appService.count(options);

      Logger.log(
        `Executing query with pagination. Skipping: ${
          ((pageNo ?? 1) - 1) * (limit ?? 10)
        }, Limit: ${limit ?? 10}`,
      );
      let queryResponse;
      if (!limit || !isNaN(limit)) {
        query.skip(((pageNo ?? 1) - 1) * (limit ?? 10)).limit(limit ?? 10);
      }
      queryResponse = await query.exec();
      const userList: UserResponse[] = [];
      for (const user of queryResponse) {
        let result = await this.appService.populateRole(user.role);
        let model: UserDocument = await getDocuments(user, this.appService);
        const jsonUser = model.toJSON();
        jsonUser.role = result;
        userList.push(new UserResponse(jsonUser, true));
      }

      return response.status(HttpStatus.OK).send({
        data: userList,
        total,
        pageNo: pageNo ?? 1,
        last_page: Math.ceil(
          total /
            (limit && limit.toString().toLowerCase() === 'all'
              ? total
              : limit ?? 10),
        ),
      });
    } catch (error) {
      Logger.error({ message: error.message, stack: error.stack });
      throw error;
    }
  }

  @UpdateByIdDecorators()
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'userProfile', maxCount: 1 }]),
  )
  async updateById(
    @Param('id', MongoIdValidationPipe) id: string,
    @UploadedFiles()
    files: {
      userProfile: Express.Multer.File;
    },
    @Body() editRequestData: EditUserRequest,
    @Res() response: Response,
    @Req() request: Request,
  ) {
    Logger.log(
      `${request.method} request received from ${request.ip} for ${
        request.originalUrl
      } by: ${
        !response.locals.user ? 'Unauthorized User' : response.locals.user.id
      }`,
    );
    try {
      const { tenantId } = request.user ?? ({ tenantId: undefined } as any);
      const option: FilterQuery<UserDocument> = {
        $and: [{ _id: { $ne: id } }],
        $or: [
          { email: { $regex: new RegExp(`^${editRequestData.email}`, 'i') } },
          {
            userName: {
              $regex: new RegExp(`^${editRequestData.userName}`, 'i'),
            },
          },
          { phoneNumber: editRequestData.phoneNumber },
        ],
      };
      Logger.log(`Calling request data validator from addUsers`);
      await addUpdateValidations(this.appService, editRequestData, option);

      Logger.log(`Validation completed with no errors or conflicts.`);
      Logger.log(`Calling updateUser method of User Service`);
      // let requestModel = await uploadDocument(
      //   files?.userProfile,
      //   this.awsService,
      //   editRequestData,
      //   tenantId,
      // );
      let requestModel ;
      const user = await this.appService.updateUser(
        id,
        requestModel as EditUserRequest,
      );
      if (!user) {
        throw new NotFoundException(`${id} does not exist`);
      }
      Logger.log(`User updated successfully. Creating response object.`);
      const result: UserResponse = new UserResponse(user);
      response.status(200).send({
        message: 'User has been updated successfully',
        data: result,
      });
    } catch (error) {
      Logger.error({ message: error.message, stack: error.stack });
      throw error;
    }
  }

  @GetByIdDecorators()
  async getUserById(
    @Param('id', MongoIdValidationPipe) id: string,
    @Res() response: Response,
    @Req() request: Request,
  ) {
    Logger.log(
      `${request.method} request received from ${request.ip} for ${
        request.originalUrl
      } by: ${
        !response.locals.user ? 'Unauthorized User' : response.locals.user.id
      }`,
    );
    try {
      Logger.log(`Calling findUserById method of User Service with id: ${id}`);
      const user = await this.appService.findUserById(id);
      if (!user) {
        throw new NotFoundException(
          `User ID not provided or invalid.`,
          `${id} does not exist`,
        );
      }
      Logger.log(
        `Calling populateRole method of User Service to populate role with role ID: ${user.role}`,
      );
      let model: UserDocument = await getDocuments(user, this.appService);
      const roleResponse = await this.appService.populateRole(model.role);
      const jsonUser = model.toJSON();
      
      jsonUser.role = roleResponse;
      const result: UserResponse = new UserResponse(jsonUser, true);
      if (result) {
        return response.status(200).send({
          message: 'User found successfully',
          data: result,
        });
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      Logger.error({ message: error.message, stack: error.stack });
      throw error;
    }
  }

  @IsActiveDecorators()
  async userStatus(
    @Param('id', MongoIdValidationPipe) id: string,
    @Body() requestData: IsActive,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    Logger.log(
      `${request.method} request received from ${request.ip} for ${
        request.originalUrl
      } by: ${
        !response.locals.user ? 'Unauthorized User' : response.locals.user.id
      }`,
    );
    try {
      const { isActive } = requestData;
      const { permissions } =
        response.locals.user ?? ({ permissions: undefined } as any);

      Logger.log(
        `Calling checkStatusChangePermission util with params: isActive: ${isActive}, permissions: ${permissions?.toString()}`,
      );
      await checkStatusChangePermission(isActive, permissions);

      const user = await this.appService.userStatus(id, isActive);
      if (user && Object.keys(user).length > 0) {
        const result: UserResponse = new UserResponse(user);
        if (result) {
          return response.status(200).send({
            message: 'User status has been changed successfully',
            data: result,
          });
        }
      } else {
        throw new NotFoundException(`user ${id}  does not exist`);
      }
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      Logger.error({ message: error.message, stack: error.stack });
      throw error;
    }
  }
  @UseInterceptors(new MessagePatternResponseInterceptor())
  @MessagePattern({ cmd: 'get_user_by_token' })
  async getByToken(token: string): Promise<UserResponse | Error> {
    try {
      Logger.log(`find user with token`);
      let option = {
        
        isDeleted: false,
        verificationToken: token,
      };
      const user = await this.appService.findOne(option);
      if (user && Object.keys(user).length > 0) {
        Logger.log(`user data get successfully`);
        return new UserResponse(user);
      } else {
        Logger.log(`not find login user`);
        throw new NotFoundException(`The token you entered is incorrect`);
      }
    } catch (err) {
      Logger.error({ message: err.message, stack: err.stack });
      return err;
    }
  }
  @UseInterceptors(new MessagePatternResponseInterceptor())
  @MessagePattern({ cmd: 'update_user_validation'})
  async updateValidation(data: any): Promise<UserResponse | Error> {
    try {
      const userID = data.id
      const user = await this.appService.updateUserWithoutPassword(userID,data);
      // const user = await this.appService.findOne(option);
      if (user && Object.keys(user).length > 0) {
        Logger.log(`user data get successfully`);
        return new UserResponse(user);
      } else {
        Logger.log(`not find login user`);
        throw new NotFoundException(`The token you entered is incorrect`);
      }
    } catch (err) {
      Logger.error({ message: err.message, stack: err.stack });
      return err;
    }
  }
}
