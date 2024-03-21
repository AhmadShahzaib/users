import { Get, HttpStatus, SetMetadata } from '@nestjs/common';
import { ApiBearerAuth, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  CombineDecorators,
  CombineDecoratorType,
  USER,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import { UserResponse } from '../models/response.model';

export default function GetByIdDecorators() {
  const GetByIdDecorators: Array<CombineDecoratorType> = [
    Get(':id'),
    SetMetadata('permissions', [USER.GETBYID]),
    ApiBearerAuth('access-token'),
    ApiResponse({ status: HttpStatus.OK, type: UserResponse }),
    ApiParam({
      name: 'id',
      description: 'The ID of the user you want to get.',
    }),
  ];
  return CombineDecorators(GetByIdDecorators);
}
