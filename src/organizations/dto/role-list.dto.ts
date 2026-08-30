import { ApiProperty } from '@nestjs/swagger';
import { RoleScope } from '../../generated/prisma/client';

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
