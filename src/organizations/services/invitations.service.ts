import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'crypto';
import {
  InvitationStatus,
  MembershipStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { OrganizationRolesService } from '../../organization-provisioning/services/organization-roles.service';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateOrganizationInvitationResponseDto,
  OrganizationInvitationDto,
  OrganizationInvitationResponseDto,
  OrganizationInvitationsResponseDto,
} from '../dto/invitation-list.dto';

const INVITATION_TTL_DAYS = 7;
const MEMBERSHIP_CONFLICT_STATUSES = [
  MembershipStatus.ACTIVE,
  MembershipStatus.SUSPENDED,
  MembershipStatus.REMOVED,
] as const;

const SAFE_INVITATION_SELECT = {
  id: true,
  email: true,
  status: true,
  expiresAt: true,
  createdAt: true,
  invitedBy: {
    select: {
      id: true,
      displayName: true,
    },
  },
  proposedRole: {
    select: {
      key: true,
      name: true,
    },
  },
} satisfies Prisma.OrganizationInvitationSelect;

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serializableTransactionService: SerializableTransactionService,
    private readonly organizationRolesService: OrganizationRolesService,
  ) {}

  async createInvitation(params: {
    organizationId: string;
    invitedByUserId: string;
    email: string;
  }): Promise<CreateOrganizationInvitationResponseDto> {
    const normalizedEmail = this.normalizeEmail(params.email);
    const plaintextToken = this.generateToken();
    const tokenHash = this.hashToken(plaintextToken);

    const invitation = await this.serializableTransactionService.run((tx) =>
      this.createInvitationInTransaction(tx, {
        organizationId: params.organizationId,
        invitedByUserId: params.invitedByUserId,
        email: normalizedEmail,
        tokenHash,
      }),
    );

    return {
      invitation,
      acceptanceUrl: `/invite/${plaintextToken}`,
    };
  }

  async listCurrentInvitations(
    organizationId: string,
  ): Promise<OrganizationInvitationsResponseDto> {
    const now = new Date();
    await this.prisma.organizationInvitation.updateMany({
      where: {
        organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: { status: InvitationStatus.EXPIRED },
    });

    const invitations = await this.prisma.organizationInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: SAFE_INVITATION_SELECT,
    });

    return { invitations };
  }

  async revokeInvitation(
    organizationId: string,
    invitationId: string,
  ): Promise<OrganizationInvitationResponseDto> {
    const now = new Date();
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId },
      select: {
        ...SAFE_INVITATION_SELECT,
        status: true,
        expiresAt: true,
      },
    });

    if (!invitation) {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new AuthError(
        'INVITATION_ALREADY_ACCEPTED',
        409,
        'La invitación ya fue aceptada',
      );
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new AuthError(
        'INVITATION_REVOKED',
        410,
        'La invitación fue revocada',
      );
    }

    if (
      invitation.status === InvitationStatus.EXPIRED ||
      invitation.expiresAt < now
    ) {
      if (invitation.status === InvitationStatus.PENDING) {
        await this.prisma.organizationInvitation.updateMany({
          where: {
            id: invitationId,
            organizationId,
            status: InvitationStatus.PENDING,
          },
          data: { status: InvitationStatus.EXPIRED },
        });
      }
      throw new AuthError('INVITATION_EXPIRED', 410, 'La invitación expiró');
    }

    const revokedCount = await this.prisma.organizationInvitation.updateMany({
      where: {
        id: invitationId,
        organizationId,
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.REVOKED },
    });

    if (revokedCount.count !== 1) {
      await this.throwCurrentRevokeState(organizationId, invitationId);
    }

    const revoked = await this.prisma.organizationInvitation.findFirstOrThrow({
      where: { id: invitationId, organizationId },
      select: SAFE_INVITATION_SELECT,
    });

    return { invitation: revoked };
  }

  private async throwCurrentRevokeState(
    organizationId: string,
    invitationId: string,
  ): Promise<never> {
    const now = new Date();
    const invitation = await this.prisma.organizationInvitation.findFirst({
      where: { id: invitationId, organizationId },
      select: { status: true, expiresAt: true },
    });

    if (!invitation) {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
    }

    if (invitation.status === InvitationStatus.ACCEPTED) {
      throw new AuthError(
        'INVITATION_ALREADY_ACCEPTED',
        409,
        'La invitación ya fue aceptada',
      );
    }

    if (invitation.status === InvitationStatus.REVOKED) {
      throw new AuthError(
        'INVITATION_REVOKED',
        410,
        'La invitación fue revocada',
      );
    }

    if (
      invitation.status === InvitationStatus.EXPIRED ||
      invitation.expiresAt < now
    ) {
      if (invitation.status === InvitationStatus.PENDING) {
        await this.prisma.organizationInvitation.updateMany({
          where: {
            id: invitationId,
            organizationId,
            status: InvitationStatus.PENDING,
          },
          data: { status: InvitationStatus.EXPIRED },
        });
      }
      throw new AuthError('INVITATION_EXPIRED', 410, 'La invitación expiró');
    }

    throw new AuthError(
      'INVITATION_NOT_FOUND',
      404,
      'Invitación no encontrada',
    );
  }

  private async createInvitationInTransaction(
    tx: Prisma.TransactionClient,
    params: {
      organizationId: string;
      invitedByUserId: string;
      email: string;
      tokenHash: string;
    },
  ): Promise<OrganizationInvitationDto> {
    const now = new Date();
    const existingUser = await tx.user.findUnique({
      where: { email: params.email },
      select: { id: true },
    });

    if (existingUser) {
      const membership = await tx.organizationMembership.findFirst({
        where: {
          organizationId: params.organizationId,
          userId: existingUser.id,
          status: { in: [...MEMBERSHIP_CONFLICT_STATUSES] },
        },
        select: { id: true },
      });

      if (membership) {
        throw new AuthError(
          'MEMBER_ALREADY_EXISTS',
          409,
          'El usuario ya pertenece a la organización',
        );
      }
    }

    await tx.organizationInvitation.updateMany({
      where: {
        organizationId: params.organizationId,
        email: params.email,
        status: InvitationStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: { status: InvitationStatus.EXPIRED },
    });

    const pendingInvitation = await tx.organizationInvitation.findFirst({
      where: {
        organizationId: params.organizationId,
        email: params.email,
        status: InvitationStatus.PENDING,
        expiresAt: { gt: now },
      },
      select: { id: true },
    });

    if (pendingInvitation) {
      throw new AuthError(
        'INVITATION_ALREADY_PENDING',
        409,
        'Ya existe una invitación pendiente para ese email',
      );
    }

    const memberRole = await this.organizationRolesService.ensureMemberRole(
      tx,
      params.organizationId,
    );
    const expiresAt = new Date(
      now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    return tx.organizationInvitation.create({
      data: {
        organizationId: params.organizationId,
        email: params.email,
        status: InvitationStatus.PENDING,
        invitedByUserId: params.invitedByUserId,
        proposedRoleId: memberRole.id,
        tokenHash: params.tokenHash,
        expiresAt,
      },
      select: SAFE_INVITATION_SELECT,
    });
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private generateToken(): string {
    return randomBytes(48).toString('hex');
  }

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
