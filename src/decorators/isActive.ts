import { HttpStatus, Patch, SetMetadata } from '@nestjs/common';
import { ApiParam, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  CombineDecorators,
  CombineDecoratorType,
  USER,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import { UserResponse } from '../models/response.model';

export default function IsActiveDecorators() {
  const IsActiveDecorators: Array<CombineDecoratorType> = [
    Patch('/status/:id'),
    SetMetadata('permissions', [USER.EDIT]),
    ApiBearerAuth('access-token'),
    ApiResponse({ status: HttpStatus.OK, type: UserResponse }),
    ApiParam({
      name: 'id',
      description: 'The ID of the user you want to change the status',
    }),
  ];
  return CombineDecorators(IsActiveDecorators);
}
