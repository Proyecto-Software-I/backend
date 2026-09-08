import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  RoleScope,
} from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ProjectAuthorizationService } from './project-authorization.service';

@Injectable()
export class ProjectAccessService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: ProjectAuthorizationService,
    private readonly transactions?: SerializableTransactionService,
  ) {}

  async list(userId: string, organizationId: string, projectId: string) {
    await this.requireProjectAdmin(userId, organizationId, projectId);
    return this.prisma.projectAccess.findMany({
      where: {
        projectId,
        project: { organizationId, deletedAt: null },
        membership: { organizationId, status: MembershipStatus.ACTIVE },
        role: { organizationId, scope: RoleScope.PROJECT },
      },
      include: {
        membership: {
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
        },
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
  }

  async put(
    userId: string,
    organizationId: string,
    projectId: string,
    membershipId: string,
    roleId: string,
  ) {
    return this.write(async (tx) => {
      const adminAccess = await this.requireProjectAdmin(
        userId,
        organizationId,
        projectId,
        tx,
      );
      const [membership, role] = await Promise.all([
        tx.organizationMembership.findFirst({
          where: { id: membershipId, organizationId },
        }),
        tx.role.findFirst({
          where: { id: roleId, organizationId },
          include: { permissions: { include: { permission: true } } },
        }),
      ]);
      if (!membership)
        throw new AuthError(
          'MEMBERSHIP_NOT_FOUND',
          404,
          'Membership not found',
        );
      if (!role) throw new AuthError('ROLE_NOT_FOUND', 404, 'Role not found');
      if (
        membership.status !== MembershipStatus.ACTIVE ||
        role.scope !== RoleScope.PROJECT
      )
        throw new AuthError(
          'PROJECT_ACCESS_INVALID',
          400,
          'Invalid project access',
        );
      if (
        (role.permissions ?? []).some(
          ({ permission }) => !adminAccess.permissions.includes(permission.key),
        )
      )
        throw new AuthError(
          'PROJECT_ACCESS_INVALID',
          400,
          'Project permissions exceed delegation authority',
        );
      return tx.projectAccess.upsert({
        where: { projectId_membershipId: { projectId, membershipId } },
        update: { roleId },
        create: { projectId, membershipId, roleId },
        include: {
          membership: {
            include: {
              user: { select: { id: true, email: true, displayName: true } },
            },
          },
          role: { include: { permissions: { include: { permission: true } } } },
        },
      });
    });
  }

  async delete(
    userId: string,
    organizationId: string,
    projectId: string,
    membershipId: string,
  ) {
    await this.write(async (tx) => {
      await this.requireProjectAdmin(userId, organizationId, projectId, tx);
      await tx.projectAccess.deleteMany({
        where: {
          projectId,
          membershipId,
          project: { organizationId, deletedAt: null },
          membership: { organizationId, status: MembershipStatus.ACTIVE },
          role: { organizationId, scope: RoleScope.PROJECT },
        },
      });
    });
  }

  private async requireProjectAdmin(
    userId: string,
    organizationId: string,
    projectId: string,
    client: Prisma.TransactionClient | PrismaService = this.prisma,
  ) {
    const project = await client.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project)
      throw new AuthError('PROJECT_NOT_FOUND', 404, 'Project not found');
    return this.authorization.requireOrganization(
      userId,
      organizationId,
      'members.manage',
      client === this.prisma ? undefined : client,
    );
  }

  private write<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.transactions
      ? this.transactions.run(callback)
      : callback(this.prisma);
  }
}
