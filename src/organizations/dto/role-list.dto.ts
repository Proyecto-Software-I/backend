import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { RoleScope } from '../../generated/prisma/client';

const ROLE_NAME_MAX_LENGTH = 120;

export class OrganizationRoleDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ enum: RoleScope, example: RoleScope.ORGANIZATION })
  scope!: RoleScope;

  @ApiProperty()
  isSystem!: boolean;

  @ApiProperty({
    type: [String],
    example: ['organization.read', 'members.read'],
  })
  permissions!: string[];
}

export class OrganizationRolesResponseDto {
  @ApiProperty({ type: [OrganizationRoleDto] })
  roles!: OrganizationRoleDto[];
}

export class OrganizationRoleResponseDto {
  @ApiProperty({ type: OrganizationRoleDto })
  role!: OrganizationRoleDto;
}

export class PermissionCatalogItemDto {
  @ApiProperty()
  key!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;
}

export class PermissionCatalogResponseDto {
  @ApiProperty({ type: [PermissionCatalogItemDto] })
  permissions!: PermissionCatalogItemDto[];
}

export class CreateOrganizationRoleDto {
  @ApiProperty({ example: 'Security reviewer' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Can inspect analysis and audit information.',
  })
  @ValidateIf((dto: CreateOrganizationRoleDto) => dto.description !== null)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({ type: [String], example: ['analysis.read', 'audit.read'] })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys!: string[];
}

export class UpdateOrganizationRoleDto {
  @ApiProperty({ required: false, example: 'Security and audit reviewer' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name?: string;

  @ApiProperty({ required: false, nullable: true, example: null })
  @ValidateIf((dto: UpdateOrganizationRoleDto) => dto.description !== null)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['analysis.read', 'audit.read'],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys?: string[];
}
