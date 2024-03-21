import { IsBoolean, IsNotEmpty, IS_ALPHA } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class IsActive {
  @ApiProperty()
  @IsBoolean()
  @IsNotEmpty()
  isActive: boolean;
}
