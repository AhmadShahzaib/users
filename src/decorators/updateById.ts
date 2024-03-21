import { HttpStatus, Put, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  CombineDecorators,
  CombineDecoratorType,
  ErrorType,
  USER,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import { UserResponse } from '../models/response.model';

export default function UpdateByIdDecorators() {
  const UpdateByIdDecorators: Array<CombineDecoratorType> = [
    Put(':id'),
    SetMetadata('permissions', [USER.EDIT]),
    ApiConsumes('multipart/form-data'),
    ApiBearerAuth('access-token'),
    ApiResponse({ status: HttpStatus.OK, type: UserResponse }),
    ApiResponse({ status: HttpStatus.CONFLICT, type: ErrorType }),
    ApiParam({
      name: 'id',
      description: 'The ID of the user you want to update.',
    }),
  ];
  return CombineDecorators(UpdateByIdDecorators);
}
