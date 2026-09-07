import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  RoleScope,
} from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationPermissionResolver } from '../../access-control/services/organization-permission-resolver.service';

@Injectable()
export class ProjectAuthorizationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationPermissions: OrganizationPermissionResolver,
  ) {}

  async requireOrganization(
    userId: string,
    organizationId: string,
    permission: string,
    client?: Prisma.TransactionClient,
  ) {
    const access = await this.organizationPermissions.resolve(
      userId,
      organizationId,
      client,
    );
    if (!access?.permissions.includes(permission)) {
      throw new AuthError(
        'PROJECT_ACCESS_DENIED',
        403,
        'Project access denied',
      );
    }
    return access;
  }

  async permissionsFor(
    userId: string,
    organizationId: string,
    projectId: string,
  ) {
    const access = await this.organizationPermissions.resolve(
      userId,
      organizationId,
    );
    if (!access) return new Set<string>();
    const grant = await this.prisma.projectAccess.findFirst({
      where: {
        projectId,
        membershipId: access.membershipId,
        project: { organizationId, deletedAt: null },
        membership: { organizationId, status: MembershipStatus.ACTIVE },
        role: { organizationId, scope: RoleScope.PROJECT },
      },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    return new Set([
      ...access.permissions,
      ...(grant?.role.permissions.map(({ permission }) => permission.key) ??
        []),
    ]);
  }

  async requireProject(
    userId: string,
    organizationId: string,
    projectId: string,
    permission: string,
  ) {
    const permissions = await this.permissionsFor(
      userId,
      organizationId,
      projectId,
    );
    if (!permissions.has(permission)) {
      throw new AuthError(
        'PROJECT_ACCESS_DENIED',
        403,
        'Project access denied',
      );
    }
  }
}
