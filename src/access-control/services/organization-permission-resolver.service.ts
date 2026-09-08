import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  RoleScope,
} from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessControlContext {
  userId: string;
  organizationId: string;
  membershipId: string;
  permissions: string[];
}

@Injectable()
export class OrganizationPermissionResolver {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(
    userId: string,
    organizationId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ): Promise<AccessControlContext | null> {
    const membership = await client.organizationMembership.findFirst({
      where: { userId, organizationId, status: MembershipStatus.ACTIVE },
      include: {
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!membership) {
      return null;
    }

    const permissions = new Set<string>();
    for (const { role } of membership.roles) {
      if (
        role.organizationId !== organizationId ||
        role.scope !== RoleScope.ORGANIZATION
      ) {
        continue;
      }
      for (const { permission } of role.permissions) {
        permissions.add(permission.key);
      }
    }

    return {
      userId,
      organizationId,
      membershipId: membership.id,
      permissions: [...permissions],
    };
  }
}
