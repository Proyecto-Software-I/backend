import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import {
  MembershipStatus,
  OrganizationStatus,
  RoleScope,
  UserStatus,
} from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AuthError } from '../common/exceptions/auth-error';
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
  activeMembership: { id: string; status: string; roles: string[] } | null;
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
  activeMembership: { id: string; status: string; roles: string[] } | null;
  memberships: MembershipView[];
  requiresOrganizationSelection: boolean;
}

@Injectable()
export class AuthService {
  private readonly refreshTtlDays: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    configService: ConfigService,
  ) {
    this.refreshTtlDays =
      configService.get<number>('AUTH_REFRESH_TOKEN_TTL_DAYS') ?? 30;
  }

  async register(dto: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    organizationName: string;
  }): Promise<SessionResult> {
    const email = this.normalizeEmail(dto.email);
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new AuthError(
        'EMAIL_ALREADY_REGISTERED',
        409,
        'El email ya está registrado',
      );
    }

    const slug = await this.generateUniqueSlug(dto.organizationName);
    const passwordHash = await this.passwordService.hash(dto.password);
    const sessionId = randomUUID();

    const result = await this.prisma.$transaction(async (tx) => {
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
          name: dto.organizationName,
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

      const role = await tx.role.upsert({
        where: {
          organizationId_scope_key: {
            organizationId: organization.id,
            scope: RoleScope.ORGANIZATION,
            key: 'OWNER',
          },
        },
        update: {},
        create: {
          organizationId: organization.id,
          scope: RoleScope.ORGANIZATION,
          key: 'OWNER',
          name: 'Owner',
          isSystem: true,
        },
      });

      const permissions = await tx.permission.findMany();
      for (const permission of permissions) {
        await tx.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permission.id,
            },
          },
          update: {},
          create: { roleId: role.id, permissionId: permission.id },
        });
      }

      await tx.membershipRole.upsert({
        where: {
          membershipId_roleId: {
            membershipId: membership.id,
            roleId: role.id,
          },
        },
        update: {},
        create: { membershipId: membership.id, roleId: role.id },
      });

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
    });

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
      activeMembership: active
        ? { id: active.id, status: active.status, roles: active.roles }
        : null,
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
      include: {
        organization: true,
        roles: { include: { role: true } },
      },
    });

    return memberships.map((m) => ({
      id: m.id,
      status: m.status,
      organization: {
        id: m.organization.id,
        name: m.organization.name,
        slug: m.organization.slug,
      },
      roles: m.roles.map((r) => r.role.key),
    }));
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
      activeMembership: active
        ? { id: active.id, status: active.status, roles: active.roles }
        : null,
      memberships,
      requiresOrganizationSelection: requiresSelection,
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
