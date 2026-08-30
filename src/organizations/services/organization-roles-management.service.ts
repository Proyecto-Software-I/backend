import { Injectable } from '@nestjs/common';
import { RoleScope } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  OrganizationRolesResponseDto,
  PermissionCatalogResponseDto,
} from '../dto/role-list.dto';

@Injectable()
export class OrganizationRolesManagementService {
  constructor(private readonly prisma: PrismaService) {}

  async listOrganizationRoles(
    organizationId: string,
  ): Promise<OrganizationRolesResponseDto> {
    const roles = await this.prisma.role.findMany({
      where: {
        organizationId,
        scope: RoleScope.ORGANIZATION,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }, { key: 'asc' }],
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });

    return {
      roles: roles.map((role) => ({
        id: role.id,
        key: role.key,
        name: role.name,
        description: role.description,
        scope: role.scope,
        isSystem: role.isSystem,
        permissions: role.permissions
          .map((rolePermission) => rolePermission.permission.key)
          .sort(),
      })),
    };
  }

  async listPermissionCatalog(): Promise<PermissionCatalogResponseDto> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      select: {
        key: true,
        description: true,
      },
    });

    return { permissions };
  }
}
