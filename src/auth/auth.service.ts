import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  InvitationStatus,
  MembershipStatus,
  OrganizationStatus,
  Prisma,
  RoleScope,
  UserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthError } from '../common/exceptions/auth-error';
import {
  getInvitationEffectiveState,
  getInvitationStateError,
  throwInvitationStateError,
} from '../organization-provisioning/invitation-state';
import { hashInvitationToken } from '../organization-provisioning/invitation-token';
import { OrganizationRolesService } from '../organization-provisioning/services/organization-roles.service';
import { SerializableTransactionService } from '../organization-provisioning/services/serializable-transaction.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';

export interface OrganizationView {
  id: string;
  name: string;
  slug: string;
}

export interface MembershipView {
  id: string;
  status: string;
  organization: OrganizationView;
  roles: string[];
  permissions: string[];
}

export interface ActiveMembershipView {
  id: string;
  status: string;
  roles: string[];
  permissions: string[];
}

export interface AuthUserView {
  id: string;
  email: string;
  displayName: string | null;
  firstName: string | null;
  lastName: string | null;
}

export interface AuthTokens {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: AuthUserView;
  auth: AuthTokens;
  activeOrganization: OrganizationView | null;
  activeMembership: ActiveMembershipView | null;
  memberships: MembershipView[];
  requiresOrganizationSelection: boolean;
}

export interface SessionResult {
  response: AuthResponse;
  refreshToken: string;
}

export interface MeResponse {
  user: AuthUserView;
  activeOrganization: OrganizationView | null;
  activeMembership: ActiveMembershipView | null;
  memberships: MembershipView[];
  requiresOrganizationSelection: boolean;
}

interface InvitationRegisterInput {
  password: string;
  firstName: string;
  lastName: string;
  invitationToken: string;
}

type InvitationRegisterTransactionResult =
  | {
      kind: 'registered';
      user: {
        id: string;
        email: string;
        displayName: string | null;
        firstName: string | null;
        lastName: string | null;
      };
      organizationId: string;
      accessToken: string;
      refreshPlain: string;
    }
  | { kind: 'expired' };

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly organizationRolesService: OrganizationRolesService,
    private readonly serializableTransactionService: SerializableTransactionService,
    configService: ConfigService,
  ) {
    this.refreshTtlDays =
      configService.get<number>('AUTH_REFRESH_TOKEN_TTL_DAYS') ?? 30;
  }

  async register(dto: {
    email?: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName?: string;
    invitationToken?: string;
  }): Promise<SessionResult> {
    if (dto.invitationToken) {
      return this.registerWithInvitation(dto as InvitationRegisterInput);
    }

    if (!dto.email || !dto.organizationName) {
      throw new AuthError('VALIDATION_ERROR', 400, 'Registro inválido');
    }

    const email = this.normalizeEmail(dto.email);
    const organizationName = dto.organizationName;
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AuthError(
        'EMAIL_ALREADY_REGISTERED',
        409,
        'El email ya está registrado',
      );
    }

    const slug = await this.generateUniqueSlug(organizationName);
    const passwordHash = await this.passwordService.hash(dto.password);
    const sessionId = randomUUID();

    const result = await this.mapUniqueEmailConflict(async () =>
      this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            firstName: dto.firstName,
            lastName: dto.lastName,
            displayName: `${dto.firstName} ${dto.lastName}`.trim(),
            status: UserStatus.ACTIVE,
            emailVerifiedAt: null,
          },
        });

        await tx.userCredential.create({
          data: { userId: user.id, passwordHash },
        });

        const organization = await tx.organization.create({
          data: {
            slug,
            name: organizationName,
            status: OrganizationStatus.TRIAL,
            deploymentMode: 'SAAS',
          },
        });

        const membership = await tx.organizationMembership.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            status: MembershipStatus.ACTIVE,
            joinedAt: new Date(),
          },
        });

        const ownerRole = await this.organizationRolesService.ensureOwnerRole(
          tx,
          organization.id,
        );
        await this.organizationRolesService.ensureMemberRole(
          tx,
          organization.id,
        );
        await this.organizationRolesService.assignRoleToMembership(
          tx,
          membership.id,
          ownerRole.id,
        );

        const accessToken = this.tokenService.sign({
          sub: user.id,
          sid: sessionId,
          org: organization.id,
        });
        const tokenHash = this.tokenService.hashToken(accessToken);
        const refreshPlain = this.tokenService.generateRefreshToken();
        const refreshHash = this.tokenService.hashToken(refreshPlain);

        await tx.userSession.create({
          data: {
            id: sessionId,
            userId: user.id,
            organizationId: organization.id,
            tokenHash,
            refreshTokenHash: refreshHash,
            expiresAt: this.refreshExpiry(),
          },
        });

        return { user, organization, accessToken, refreshPlain };
      }),
    );

    const memberships = await this.getMembershipViews(result.user.id);
    const response = this.buildAuthResponse(
      this.toUserView(result.user),
      memberships,
      result.organization.id,
      false,
      result.accessToken,
    );

    return { response, refreshToken: result.refreshPlain };
  }

  private async registerWithInvitation(
    dto: InvitationRegisterInput,
  ): Promise<SessionResult> {
    const passwordHash = await this.passwordService.hash(dto.password);
    const tokenHash = hashInvitationToken(dto.invitationToken);

    const result = await this.mapUniqueEmailConflict(() =>
      this.serializableTransactionService.run((tx) =>
        this.registerWithInvitationInTransaction(
          tx,
          dto,
          passwordHash,
          tokenHash,
        ),
      ),
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

    const memberships = await this.getMembershipViews(result.user.id);
    const response = this.buildAuthResponse(
      this.toUserView(result.user),
      memberships,
      result.organizationId,
      false,
      result.accessToken,
    );

    return { response, refreshToken: result.refreshPlain };
  }

  private async registerWithInvitationInTransaction(
    tx: Prisma.TransactionClient,
    dto: InvitationRegisterInput,
    passwordHash: string,
    tokenHash: string,
  ): Promise<InvitationRegisterTransactionResult> {
    const now = new Date();
    const invitation = await tx.organizationInvitation.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        organizationId: true,
      },
    });

    if (!invitation) {
      throw new AuthError(
        'INVITATION_NOT_FOUND',
        404,
        'Invitación no encontrada',
      );
    }

    const usable = await this.ensureRegisterInvitationUsable(
      tx,
      invitation,
      now,
    );
    if (usable.kind === 'expired') {
      return usable;
    }

    const email = this.normalizeEmail(invitation.email);
    const existing = await tx.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new AuthError(
        'EMAIL_ALREADY_REGISTERED',
        409,
        'El email ya está registrado',
      );
    }

    const memberRole = await this.organizationRolesService.ensureMemberRole(
      tx,
      invitation.organizationId,
    );
    const accepted = await tx.organizationInvitation.updateMany({
      where: { id: invitation.id, status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: now },
    });

    if (accepted.count !== 1) {
      await this.throwCurrentRegisterInvitationState(tx, invitation.id, now);
    }

    const user = await tx.user.create({
      data: {
        email,
        firstName: dto.firstName,
        lastName: dto.lastName,
        displayName: `${dto.firstName} ${dto.lastName}`.trim(),
        status: UserStatus.ACTIVE,
        emailVerifiedAt: null,
      },
    });

    await tx.userCredential.create({
      data: { userId: user.id, passwordHash },
    });

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

    const sessionId = randomUUID();
    const accessToken = this.tokenService.sign({
      sub: user.id,
      sid: sessionId,
      org: invitation.organizationId,
    });
    const sessionTokenHash = this.tokenService.hashToken(accessToken);
    const refreshPlain = this.tokenService.generateRefreshToken();
    const refreshHash = this.tokenService.hashToken(refreshPlain);

    await tx.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        organizationId: invitation.organizationId,
        tokenHash: sessionTokenHash,
        refreshTokenHash: refreshHash,
        expiresAt: this.refreshExpiry(),
      },
    });

    return {
      kind: 'registered',
      user,
      organizationId: invitation.organizationId,
      accessToken,
      refreshPlain,
    };
  }

  async login(dto: {
    email: string;
    password: string;
  }): Promise<SessionResult> {
    const email = this.normalizeEmail(dto.email);
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: { credential: true },
    });

    if (!user || !user.credential) {
      throw new AuthError('INVALID_CREDENTIALS', 401, 'Credenciales inválidas');
    }
    if (user.status !== UserStatus.ACTIVE) {
      throw new AuthError('USER_NOT_ACTIVE', 401, 'El usuario no está activo');
    }
    const valid = await this.passwordService.verify(
      dto.password,
      user.credential.passwordHash,
    );
    if (!valid) {
      throw new AuthError('INVALID_CREDENTIALS', 401, 'Credenciales inválidas');
    }

    const memberships = await this.getMembershipViews(user.id);
    if (memberships.length === 0) {
      throw new AuthError(
        'NO_ACTIVE_MEMBERSHIP',
        401,
        'El usuario no tiene una membresía activa',
      );
    }

    const requiresSelection = memberships.length > 1;
    const activeOrganizationId = requiresSelection
      ? null
      : memberships[0].organization.id;

    const { accessToken, refreshPlain } = await this.createSession(
      user.id,
      activeOrganizationId,
    );

    const response = this.buildAuthResponse(
      this.toUserView(user),
      memberships,
      activeOrganizationId,
      requiresSelection,
      accessToken,
    );

    return { response, refreshToken: refreshPlain };
  }

  async selectOrganization(
    userId: string,
    sessionId: string,
    organizationId: string,
  ): Promise<SessionResult> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        organization: true,
        roles: { include: { role: true } },
      },
    });

    if (!membership) {
      throw new AuthError(
        'ORGANIZATION_ACCESS_DENIED',
        403,
        'El usuario no pertenece a la organización solicitada',
      );
    }

    const accessToken = this.tokenService.sign({
      sub: userId,
      sid: sessionId,
      org: organizationId,
    });
    const tokenHash = this.tokenService.hashToken(accessToken);
    await this.sessionService.activateOrganization(
      sessionId,
      organizationId,
      tokenHash,
    );

    const memberships = await this.getMembershipViews(userId);
    const response = this.buildAuthResponse(
      await this.getUserView(userId),
      memberships,
      organizationId,
      false,
      accessToken,
    );

    return { response, refreshToken: '' };
  }

  async me(userId: string, organizationId: string | null): Promise<MeResponse> {
    const memberships = await this.getMembershipViews(userId);
    const active =
      organizationId != null
        ? (memberships.find((m) => m.organization.id === organizationId) ??
          null)
        : null;

    return {
      user: await this.getUserView(userId),
      activeOrganization: active ? active.organization : null,
      activeMembership: active ? this.toActiveMembershipView(active) : null,
      memberships,
      requiresOrganizationSelection: organizationId == null,
    };
  }

  async refresh(refreshToken: string): Promise<{
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    refreshToken: string;
  }> {
    const refreshHash = this.tokenService.hashToken(refreshToken);
    const session =
      await this.sessionService.findByRefreshTokenHash(refreshHash);
    if (!session) {
      throw new AuthError('SESSION_REVOKED', 401, 'Sesión revocada');
    }
    if (session.revokedAt) {
      throw new AuthError('SESSION_REVOKED', 401, 'Sesión revocada');
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new AuthError('SESSION_EXPIRED', 401, 'Sesión expirada');
    }

    const accessToken = this.tokenService.sign({
      sub: session.userId,
      sid: session.id,
      org: session.organizationId,
    });
    const tokenHash = this.tokenService.hashToken(accessToken);
    const newRefresh = this.tokenService.generateRefreshToken();
    const newRefreshHash = this.tokenService.hashToken(newRefresh);

    await this.sessionService.rotateRefresh(
      session.id,
      newRefreshHash,
      this.refreshExpiry(),
      tokenHash,
    );

    return {
      accessToken,
      tokenType: 'Bearer',
      expiresIn: this.tokenService.expiresIn,
      refreshToken: newRefresh,
    };
  }

  async logout(userId: string, sessionId: string): Promise<void> {
    await this.sessionService.revoke(sessionId);
    void userId;
  }

  private async ensureRegisterInvitationUsable(
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
          await this.throwCurrentRegisterInvitationState(
            tx,
            invitation.id,
            now,
          );
        }
        return { kind: 'expired' };
      }
      throwInvitationStateError(invitation.status, invitation.expiresAt, now);
    }

    throwInvitationStateError(invitation.status, invitation.expiresAt, now);

    return { kind: 'usable' };
  }

  private async throwCurrentRegisterInvitationState(
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

  private async mapUniqueEmailConflict<T>(
    callback: () => Promise<T>,
  ): Promise<T> {
    try {
      return await callback();
    } catch (error) {
      if (this.isEmailUniqueError(error)) {
        throw new AuthError(
          'EMAIL_ALREADY_REGISTERED',
          409,
          'El email ya está registrado',
        );
      }
      throw error;
    }
  }

  private isEmailUniqueError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }
    if ((error as { code?: unknown }).code !== 'P2002') {
      return false;
    }

    const target = (error as { meta?: { target?: unknown } }).meta?.target;
    return Array.isArray(target) && target.includes('email');
  }

  private async createSession(
    userId: string,
    organizationId: string | null,
  ): Promise<{ accessToken: string; refreshPlain: string }> {
    const sessionId = randomUUID();
    const accessToken = this.tokenService.sign({
      sub: userId,
      sid: sessionId,
      org: organizationId,
    });
    const tokenHash = this.tokenService.hashToken(accessToken);
    const refreshPlain = this.tokenService.generateRefreshToken();
    const refreshHash = this.tokenService.hashToken(refreshPlain);

    await this.sessionService.create({
      id: sessionId,
      userId,
      organizationId,
      tokenHash,
      refreshTokenHash: refreshHash,
      expiresAt: this.refreshExpiry(),
    });

    return { accessToken, refreshPlain };
  }

  private async getMembershipViews(userId: string): Promise<MembershipView[]> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { userId, status: MembershipStatus.ACTIVE },
      select: {
        id: true,
        status: true,
        organizationId: true,
        organization: {
          select: { id: true, name: true, slug: true },
        },
        roles: {
          select: {
            role: {
              select: {
                organizationId: true,
                scope: true,
                key: true,
                permissions: {
                  select: {
                    permission: { select: { key: true } },
                  },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((membership) => {
      const roles = new Set<string>();
      const permissions = new Set<string>();

      for (const membershipRole of membership.roles) {
        const role = membershipRole.role;
        if (
          role.organizationId !== membership.organizationId ||
          role.scope !== RoleScope.ORGANIZATION
        ) {
          continue;
        }
        roles.add(role.key);
        for (const rolePermission of role.permissions) {
          permissions.add(rolePermission.permission.key);
        }
      }

      return {
        id: membership.id,
        status: membership.status,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
        },
        roles: [...roles].sort(),
        permissions: [...permissions].sort(),
      };
    });
  }

  private buildAuthResponse(
    user: AuthUserView,
    memberships: MembershipView[],
    activeOrganizationId: string | null,
    requiresSelection: boolean,
    accessToken: string,
  ): AuthResponse {
    const active =
      activeOrganizationId != null
        ? (memberships.find(
            (m) => m.organization.id === activeOrganizationId,
          ) ?? null)
        : null;

    return {
      user,
      auth: {
        accessToken,
        tokenType: 'Bearer',
        expiresIn: this.tokenService.expiresIn,
      },
      activeOrganization: active ? active.organization : null,
      activeMembership: active ? this.toActiveMembershipView(active) : null,
      memberships,
      requiresOrganizationSelection: requiresSelection,
    };
  }

  private toActiveMembershipView(
    membership: MembershipView,
  ): ActiveMembershipView {
    return {
      id: membership.id,
      status: membership.status,
      roles: membership.roles,
      permissions: membership.permissions,
    };
  }

  private async getUserView(userId: string): Promise<AuthUserView> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });
    return this.toUserView(user);
  }

  private toUserView(user: {
    id: string;
    email: string;
    displayName: string | null;
    firstName: string | null;
    lastName: string | null;
  }): AuthUserView {
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private slugify(name: string): string {
    const base = name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return base || 'organization';
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = this.slugify(name);
    let slug = base;
    let attempt = 1;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      attempt += 1;
      slug = `${base}-${attempt}`;
    }
    return slug;
  }

  private refreshExpiry(): Date {
    return new Date(Date.now() + this.refreshTtlDays * 24 * 60 * 60 * 1000);
  }
}
