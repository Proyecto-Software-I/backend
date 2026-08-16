import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class SelectOrganizationDto {
  @ApiProperty({ example: 'uuid' })
  @IsString()
  @IsNotEmpty()
  organizationId: string;
}
