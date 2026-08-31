import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayUnique,
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { RoleScope } from '../../generated/prisma/client';

const ROLE_NAME_MAX_LENGTH = 120;

export class OrganizationRoleDto {
  @ApiProperty({ description: 'ID del rol' })
  id!: string;

  @ApiProperty({ description: 'Clave estable del rol' })
  key!: string;

  @ApiProperty({ description: 'Nombre visible del rol' })
  name!: string;

  @ApiProperty({ nullable: true, description: 'Descripción opcional del rol' })
  description!: string | null;

  @ApiProperty({
    enum: RoleScope,
    example: RoleScope.ORGANIZATION,
    description: 'Scope del rol. Esta API administra roles ORGANIZATION.',
  })
  scope!: RoleScope;

  @ApiProperty({
    description: 'Indica si el rol es administrado por el sistema',
  })
  isSystem!: boolean;

  @ApiProperty({
    type: [String],
    example: ['organization.read', 'members.read'],
    description: 'Permisos asociados, como claves del catálogo global',
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
  @ApiProperty({ description: 'Clave única del permiso global' })
  key!: string;

  @ApiProperty({ nullable: true, description: 'Descripción del permiso' })
  description!: string | null;
}

export class PermissionCatalogResponseDto {
  @ApiProperty({ type: [PermissionCatalogItemDto] })
  permissions!: PermissionCatalogItemDto[];
}

export class CreateOrganizationRoleDto {
  @ApiProperty({
    example: 'Security reviewer',
    description: 'Nombre del rol personalizado. La key se genera en backend.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: 'Can inspect analysis and audit information.',
    description: 'Descripción opcional del rol personalizado',
  })
  @ValidateIf((dto: CreateOrganizationRoleDto) => dto.description !== null)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    type: [String],
    example: ['analysis.read', 'audit.read'],
    description: 'Claves de permisos existentes. Puede ser un array vacío.',
  })
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys!: string[];
}

export class UpdateOrganizationRoleDto {
  @ApiProperty({
    required: false,
    example: 'Security and audit reviewer',
    description: 'Nuevo nombre del rol. No modifica la key.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(ROLE_NAME_MAX_LENGTH)
  name?: string;

  @ApiProperty({
    required: false,
    nullable: true,
    example: null,
    description: 'Nueva descripción. null limpia la descripción.',
  })
  @ValidateIf((dto: UpdateOrganizationRoleDto) => dto.description !== null)
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiProperty({
    required: false,
    type: [String],
    example: ['analysis.read', 'audit.read'],
    description:
      'Si se envía, reemplaza el set completo de permisos del rol personalizado.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  permissionKeys?: string[];
}

export class ReplaceMembershipRolesDto {
  @ApiProperty({
    type: 'array',
    items: { type: 'string', format: 'uuid' },
    example: ['1b5f4c50-1f3d-4f4d-8e6a-0a7c0b1d2e3f'],
    description:
      'Set completo deseado de roles personalizados ORGANIZATION adicionales. Puede ser []. No acepta OWNER, MEMBER ni otros roles de sistema.',
  })
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  roleIds!: string[];
}
