import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  RoleScope,
} from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  OrganizationMemberDto,
  OrganizationMemberResponseDto,
  OrganizationMembersResponseDto,
} from '../dto/member-list.dto';

const OWNER_ROLE_KEY = 'OWNER';

const TARGET_MEMBERSHIP_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
    },
  },
  roles: {
    include: {
      role: { select: { organizationId: true, key: true, scope: true } },
    },
  },
} satisfies Prisma.OrganizationMembershipInclude;

@Injectable()
export class MembershipsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serializableTransactionService: SerializableTransactionService,
  ) {}

  async listCurrentMembers(
    organizationId: string,
  ): Promise<OrganizationMembersResponseDto> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        roles: {
          include: {
            role: { select: { key: true } },
          },
        },
      },
    });

    return {
      members: memberships.map((membership) => ({
        id: membership.id,
        status: membership.status,
        joinedAt: membership.joinedAt,
        user: membership.user,
        roles: membership.roles.map(
          (membershipRole) => membershipRole.role.key,
        ),
      })),
    };
  }

  async updateMembershipStatus(
    organizationId: string,
    membershipId: string,
    status: MembershipStatus,
  ): Promise<OrganizationMemberResponseDto> {
    const member = await this.serializableTransactionService.run((tx) =>
      this.updateMembershipStatusInTransaction(
        tx,
        organizationId,
        membershipId,
        status,
      ),
    );

    return { member };
  }

  async removeMembership(
    organizationId: string,
    membershipId: string,
  ): Promise<OrganizationMemberResponseDto> {
    const member = await this.serializableTransactionService.run((tx) =>
      this.removeMembershipInTransaction(tx, organizationId, membershipId),
    );

    return { member };
  }

  private async updateMembershipStatusInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
    status: MembershipStatus,
  ): Promise<OrganizationMemberDto> {
    const membership = await this.findMutableMembership(
      tx,
      organizationId,
      membershipId,
    );

    if (membership.status === status) {
      return this.toMemberDto(membership);
    }

    if (status === MembershipStatus.SUSPENDED) {
      await this.ensureNotLastActiveOwner(tx, membership);
      await tx.organizationMembership.update({
        where: { id: membership.id },
        data: { status: MembershipStatus.SUSPENDED },
      });
      await this.clearTenantFromActiveSessions(tx, membership);
      return this.toMemberDto({
        ...membership,
        status: MembershipStatus.SUSPENDED,
      });
    }

    await tx.organizationMembership.update({
      where: { id: membership.id },
      data: { status: MembershipStatus.ACTIVE },
    });
    return this.toMemberDto({ ...membership, status: MembershipStatus.ACTIVE });
  }

  private async removeMembershipInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
  ): Promise<OrganizationMemberDto> {
    const membership = await this.findMutableMembership(
      tx,
      organizationId,
      membershipId,
    );

    await this.ensureNotLastActiveOwner(tx, membership);
    await tx.organizationMembership.update({
      where: { id: membership.id },
      data: { status: MembershipStatus.REMOVED },
    });
    await this.clearTenantFromActiveSessions(tx, membership);

    return this.toMemberDto({
      ...membership,
      status: MembershipStatus.REMOVED,
    });
  }

  private async findMutableMembership(
    tx: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
  ) {
    const membership = await tx.organizationMembership.findFirst({
      where: { id: membershipId, organizationId },
      include: TARGET_MEMBERSHIP_INCLUDE,
    });

    if (!membership || membership.status === MembershipStatus.REMOVED) {
      throw new AuthError(
        'MEMBERSHIP_NOT_FOUND',
        404,
        'Membresía no encontrada',
      );
    }

    return membership;
  }

  private async ensureNotLastActiveOwner(
    tx: Prisma.TransactionClient,
    membership: Awaited<
      ReturnType<MembershipsService['findMutableMembership']>
    >,
  ): Promise<void> {
    if (
      membership.status !== MembershipStatus.ACTIVE ||
      !this.hasOwnerRole(membership)
    ) {
      return;
    }

    const activeOwners = await tx.organizationMembership.count({
      where: {
        organizationId: membership.organizationId,
        status: MembershipStatus.ACTIVE,
        roles: {
          some: {
            role: {
              organizationId: membership.organizationId,
              scope: RoleScope.ORGANIZATION,
              key: OWNER_ROLE_KEY,
            },
          },
        },
      },
    });

    if (activeOwners <= 1) {
      throw new AuthError(
        'LAST_OWNER_REQUIRED',
        409,
        'La organización debe conservar al menos un owner activo',
      );
    }
  }

  private hasOwnerRole(
    membership: Awaited<
      ReturnType<MembershipsService['findMutableMembership']>
    >,
  ): boolean {
    return membership.roles.some(
      (membershipRole) =>
        membershipRole.role.organizationId === membership.organizationId &&
        membershipRole.role.scope === RoleScope.ORGANIZATION &&
        membershipRole.role.key === OWNER_ROLE_KEY,
    );
  }

  private async clearTenantFromActiveSessions(
    tx: Prisma.TransactionClient,
    membership: Awaited<
      ReturnType<MembershipsService['findMutableMembership']>
    >,
  ): Promise<void> {
    await tx.userSession.updateMany({
      where: {
        userId: membership.userId,
        organizationId: membership.organizationId,
        revokedAt: null,
      },
      data: { organizationId: null },
    });
  }

  private toMemberDto(
    membership: Awaited<
      ReturnType<MembershipsService['findMutableMembership']>
    >,
  ): OrganizationMemberDto {
    return {
      id: membership.id,
      status: membership.status,
      joinedAt: membership.joinedAt,
      user: membership.user,
      roles: membership.roles.map((membershipRole) => membershipRole.role.key),
    };
  }
}
