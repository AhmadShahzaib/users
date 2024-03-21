import { Get, HttpStatus, SetMetadata } from '@nestjs/common';

import { ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { sortableAttributes } from '../models';
import {
  CombineDecorators,
  CombineDecoratorType,
  USER,
} from '@shafiqrathore/logeld-tenantbackend-common-future';
import { UserResponse } from '../models/response.model';

export default function GetDecorators() {
  const GetDecorators: Array<CombineDecoratorType> = [
    Get(),
    SetMetadata('permissions', [USER.LIST]),
    ApiBearerAuth('access-token'),
    ApiResponse({ status: HttpStatus.OK, type: UserResponse }),
    ApiQuery({
      name: 'search',
      example: 'Search by email or first name or last name or notes',
      required: false,
    }),
    ApiQuery({
      name: 'orderBy',
      example: 'Field by which records will be ordered',
      required: false,
      enum: sortableAttributes,
    }),
    ApiQuery({
      name: 'orderType',
      example: 'Ascending (1) or Descending (-1)',
      enum: [-1, 1],
      required: false,
    }),
    ApiQuery({
      name: 'pageNo',
      example: '1',
      description: 'The page number you want to get i.e 1, 2, 3...',
      required: false,
    }),
    ApiQuery({
      name: 'limit',
      example: '10',
      description: 'The number of records you want on one page.',
      required: false,
    }),
  ];
  return CombineDecorators(GetDecorators);
}
