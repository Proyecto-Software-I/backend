import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import {
  InvitationStatus,
  MembershipStatus,
  Prisma,
} from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import {
  getInvitationEffectiveState,
  getInvitationStateError,
  throwInvitationStateError,
} from '../../organization-provisioning/invitation-state';
import { hashInvitationToken } from '../../organization-provisioning/invitation-token';
import { OrganizationRolesService } from '../../organization-provisioning/services/organization-roles.service';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateOrganizationInvitationResponseDto,
  OrganizationInvitationDto,
  OrganizationInvitationResponseDto,
  OrganizationInvitationsResponseDto,
  InvitationPreviewResponseDto,
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

const PREVIEW_INVITATION_SELECT = {
  id: true,
  email: true,
  status: true,
  expiresAt: true,
  organization: {
    select: {
      name: true,
      slug: true,
    },
  },
} satisfies Prisma.OrganizationInvitationSelect;

const ACCEPT_INVITATION_SELECT = {
  id: true,
  email: true,
  status: true,
  expiresAt: true,
  organizationId: true,
} satisfies Prisma.OrganizationInvitationSelect;

type AcceptInvitationTransactionResult =
  | { kind: 'accepted'; invitation: OrganizationInvitationDto }
  | { kind: 'expired' };

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

  async previewInvitation(
    token: string,
  ): Promise<InvitationPreviewResponseDto> {
    const tokenHash = this.hashToken(token);
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { tokenHash },
      select: PREVIEW_INVITATION_SELECT,
    });

    if (!invitation) {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
    }

    const currentInvitation = await this.ensurePreviewUsable(invitation);

    return {
      email: currentInvitation.email,
      organization: currentInvitation.organization,
      expiresAt: currentInvitation.expiresAt,
    };
  }

  async acceptInvitation(
    token: string,
    authenticatedUserId: string,
  ): Promise<OrganizationInvitationResponseDto> {
    const tokenHash = this.hashToken(token);

    const result = await this.serializableTransactionService.run((tx) =>
      this.acceptInvitationInTransaction(tx, tokenHash, authenticatedUserId),
    );

    if (result.kind === 'expired') {
      const error = getInvitationStateError(
        InvitationStatus.EXPIRED,
        new Date(0),
        new Date(),
      );
      if (error) {
        throw error;
      }
      throw new Error('Expected expired invitation state error');
    }

    return { invitation: result.invitation };
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

    const effectiveState = getInvitationEffectiveState(
      invitation.status,
      invitation.expiresAt,
      now,
    );
    if (effectiveState === 'EXPIRED') {
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
      throwInvitationStateError(invitation.status, invitation.expiresAt, now);
    }

    throwInvitationStateError(invitation.status, invitation.expiresAt, now);

    if (effectiveState !== 'PENDING') {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
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
      await this.throwCurrentRevokeState(organizationId, invitationId, now);
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
    now: Date,
  ): Promise<never> {
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

    const effectiveState = getInvitationEffectiveState(
      invitation.status,
      invitation.expiresAt,
      now,
    );
    if (effectiveState === 'EXPIRED') {
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
      throwInvitationStateError(invitation.status, invitation.expiresAt, now);
    }

    throwInvitationStateError(invitation.status, invitation.expiresAt, now);

    throw new AuthError(
      'INVITATION_NOT_FOUND',
      404,
      'Invitación no encontrada',
    );
  }

  private async ensurePreviewUsable(invitation: {
    id: string;
    email: string;
    status: InvitationStatus;
    expiresAt: Date;
    organization: { name: string; slug: string };
  }): Promise<{
    email: string;
    expiresAt: Date;
    organization: { name: string; slug: string };
  }> {
    const now = new Date();

    const effectiveState = getInvitationEffectiveState(
      invitation.status,
      invitation.expiresAt,
      now,
    );
    if (effectiveState === 'EXPIRED') {
      if (invitation.status === InvitationStatus.PENDING) {
        const expired = await this.prisma.organizationInvitation.updateMany({
          where: {
            id: invitation.id,
            status: InvitationStatus.PENDING,
          },
          data: { status: InvitationStatus.EXPIRED },
        });
        if (expired.count !== 1) {
          return this.resolveCurrentPreviewState(invitation.id, now);
        }
      }
      throwInvitationStateError(invitation.status, invitation.expiresAt, now);
    }

    throwInvitationStateError(invitation.status, invitation.expiresAt, now);

    return {
      email: invitation.email,
      organization: invitation.organization,
      expiresAt: invitation.expiresAt,
    };
  }

  private async resolveCurrentPreviewState(
    invitationId: string,
    now: Date,
  ): Promise<{
    email: string;
    expiresAt: Date;
    organization: { name: string; slug: string };
  }> {
    const invitation = await this.prisma.organizationInvitation.findUnique({
      where: { id: invitationId },
      select: PREVIEW_INVITATION_SELECT,
    });

    if (!invitation) {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
    }

    throwInvitationStateError(invitation.status, invitation.expiresAt, now);

    return {
      email: invitation.email,
      organization: invitation.organization,
      expiresAt: invitation.expiresAt,
    };
  }

  private async acceptInvitationInTransaction(
    tx: Prisma.TransactionClient,
    tokenHash: string,
    authenticatedUserId: string,
  ): Promise<AcceptInvitationTransactionResult> {
    const now = new Date();
    const invitation = await tx.organizationInvitation.findUnique({
      where: { tokenHash },
      select: ACCEPT_INVITATION_SELECT,
    });

    if (!invitation) {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
    }

    const usable = await this.ensureAcceptableInTransaction(
      tx,
      invitation,
      now,
    );
    if (usable.kind === 'expired') {
      return usable;
    }

    const user = await tx.user.findUniqueOrThrow({
      where: { id: authenticatedUserId },
      select: { id: true, email: true },
    });

    if (
      this.normalizeEmail(user.email) !== this.normalizeEmail(invitation.email)
    ) {
      throw new AuthError(
        'INVITATION_EMAIL_MISMATCH',
        403,
        'El email autenticado no coincide con la invitación',
      );
    }

    const existingMembership = await tx.organizationMembership.findFirst({
      where: {
        organizationId: invitation.organizationId,
        userId: user.id,
      },
      select: { id: true, status: true },
    });

    if (existingMembership) {
      throw new AuthError(
        'MEMBER_ALREADY_EXISTS',
        409,
        'El usuario ya pertenece a la organización',
      );
    }

    const memberRole = await this.organizationRolesService.ensureMemberRole(
      tx,
      invitation.organizationId,
    );
    const accepted = await tx.organizationInvitation.updateMany({
      where: {
        id: invitation.id,
        status: InvitationStatus.PENDING,
      },
      data: {
        status: InvitationStatus.ACCEPTED,
        acceptedAt: now,
      },
    });

    if (accepted.count !== 1) {
      await this.throwCurrentAcceptState(tx, invitation.id, now);
    }

    const membership = await tx.organizationMembership.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        status: MembershipStatus.ACTIVE,
        joinedAt: now,
      },
      select: { id: true },
    });
    await this.organizationRolesService.assignRoleToMembership(
      tx,
      membership.id,
      memberRole.id,
    );

    const acceptedInvitation =
      await tx.organizationInvitation.findUniqueOrThrow({
        where: { id: invitation.id },
        select: SAFE_INVITATION_SELECT,
      });
    return { kind: 'accepted', invitation: acceptedInvitation };
  }

  private async ensureAcceptableInTransaction(
    tx: Prisma.TransactionClient,
    invitation: {
      id: string;
      status: InvitationStatus;
      expiresAt: Date;
    },
    now: Date,
  ): Promise<{ kind: 'usable' } | { kind: 'expired' }> {
    const effectiveState = getInvitationEffectiveState(
      invitation.status,
      invitation.expiresAt,
      now,
    );
    if (effectiveState === 'EXPIRED') {
      if (invitation.status === InvitationStatus.PENDING) {
        const expired = await tx.organizationInvitation.updateMany({
          where: { id: invitation.id, status: InvitationStatus.PENDING },
          data: { status: InvitationStatus.EXPIRED },
        });
        if (expired.count !== 1) {
          await this.throwCurrentAcceptState(tx, invitation.id, now);
        }
        return { kind: 'expired' };
      }
      throwInvitationStateError(invitation.status, invitation.expiresAt, now);
    }

    throwInvitationStateError(invitation.status, invitation.expiresAt, now);

    return { kind: 'usable' };
  }

  private async throwCurrentAcceptState(
    tx: Prisma.TransactionClient,
    invitationId: string,
    now: Date,
  ): Promise<never> {
    const invitation = await tx.organizationInvitation.findUnique({
      where: { id: invitationId },
      select: { status: true, expiresAt: true },
    });

    if (!invitation) {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
    }

    throwInvitationStateError(invitation.status, invitation.expiresAt, now);
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
    return hashInvitationToken(token);
  }
}
