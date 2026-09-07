import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReplaceProjectAccessDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  roleId!: string;
}
