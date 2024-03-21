import { HttpStatus, Post, SetMetadata } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import {
  CombineDecorators,
  CombineDecoratorType,
  GetOperationId,
  ErrorType,
  USER,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import { UserResponse } from '../models/response.model';

export default function AddDecorators() {
  const AddDecorators: Array<CombineDecoratorType> = [
    Post('add'),
    SetMetadata('permissions', [USER.ADD]),
    ApiConsumes('multipart/form-data'),
    ApiBearerAuth('access-token'),
    ApiResponse({ status: HttpStatus.CREATED, type: UserResponse }),
    ApiResponse({ status: HttpStatus.CONFLICT, type: ErrorType }),
    ApiOperation(GetOperationId('User', 'Register')),
  ];
  return CombineDecorators(AddDecorators);
}
