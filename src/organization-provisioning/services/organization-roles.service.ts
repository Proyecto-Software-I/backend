import { Injectable } from '@nestjs/common';
import { Prisma, Role, RoleScope } from '../../generated/prisma/client';

const OWNER_ROLE_KEY = 'OWNER';
const MEMBER_ROLE_KEY = 'MEMBER';
const MEMBER_PERMISSION_KEYS = ['organization.read', 'members.read'] as const;

@Injectable()
export class OrganizationRolesService {
  async ensureOwnerRole(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<Role> {
    const role = await tx.role.upsert({
      where: {
        organizationId_scope_key: {
          organizationId,
          scope: RoleScope.ORGANIZATION,
          key: OWNER_ROLE_KEY,
        },
      },
      update: {
        name: 'Owner',
        isSystem: true,
      },
      create: {
        organizationId,
        scope: RoleScope.ORGANIZATION,
        key: OWNER_ROLE_KEY,
        name: 'Owner',
        isSystem: true,
      },
    });

    const permissions = await tx.permission.findMany();
    await this.replaceRolePermissions(
      tx,
      role.id,
      permissions.map((permission) => permission.id),
    );

    return role;
  }

  async ensureMemberRole(
    tx: Prisma.TransactionClient,
    organizationId: string,
  ): Promise<Role> {
    const role = await tx.role.upsert({
      where: {
        organizationId_scope_key: {
          organizationId,
          scope: RoleScope.ORGANIZATION,
          key: MEMBER_ROLE_KEY,
        },
      },
      update: {
        name: 'Member',
        isSystem: true,
      },
      create: {
        organizationId,
        scope: RoleScope.ORGANIZATION,
        key: MEMBER_ROLE_KEY,
        name: 'Member',
        isSystem: true,
      },
    });

    const permissions = await tx.permission.findMany({
      where: { key: { in: [...MEMBER_PERMISSION_KEYS] } },
    });

    if (permissions.length !== MEMBER_PERMISSION_KEYS.length) {
      throw new Error('Required MEMBER permissions are missing from seed data');
    }

    await this.replaceRolePermissions(
      tx,
      role.id,
      permissions.map((permission) => permission.id),
    );

    return role;
  }

  async assignRoleToMembership(
    tx: Prisma.TransactionClient,
    membershipId: string,
    roleId: string,
  ): Promise<void> {
    await tx.membershipRole.upsert({
      where: {
        membershipId_roleId: {
          membershipId,
          roleId,
        },
      },
      update: {},
      create: { membershipId, roleId },
    });
  }

  private async replaceRolePermissions(
    tx: Prisma.TransactionClient,
    roleId: string,
    permissionIds: string[],
  ): Promise<void> {
    await tx.rolePermission.deleteMany({
      where: { roleId, permissionId: { notIn: permissionIds } },
    });

    for (const permissionId of permissionIds) {
      await tx.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId,
            permissionId,
          },
        },
        update: {},
        create: { roleId, permissionId },
      });
    }
  }
}
