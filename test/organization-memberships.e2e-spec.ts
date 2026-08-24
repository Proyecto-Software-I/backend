import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { createHash, randomUUID } from 'crypto';
import * as jwt from 'jsonwebtoken';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import {
  InvitationStatus,
  MembershipStatus,
  RoleScope,
  UserStatus,
} from '../src/generated/prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import type { AuthResponse } from '../src/auth/auth.service';

type ErrorBody = { statusCode: number; code: string; message: string };
type InvitationListBody = {
  invitations: Array<{
    id: string;
    email: string;
    status: string;
    invitedBy: { id: string; displayName: string | null } | null;
    proposedRole: { key: string; name: string } | null;
  }>;
};
type InvitationResponseBody = {
  invitation: { id: string; status: string };
};
type MembersListBody = {
  members: Array<{
    id: string;
    status: string;
    joinedAt: string | null;
    jobTitle: string | null;
    user: {
      id: string;
      email: string;
      displayName: string | null;
      firstName: string | null;
      lastName: string | null;
      avatarUrl: string | null;
    };
    roles: string[];
  }>;
};

const REQUIRED_PERMISSIONS = [
  'organization.read',
  'members.read',
  'members.manage',
] as const;

describe('Organization memberships and invitations (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let dbReady = false;
  const prefix = `e2e-${randomUUID()}`;
  const password = 'SecurePassword123!';
  const server = (): import('http').Server =>
    app.getHttpServer() as import('http').Server;

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for real PostgreSQL E2E tests');
    }
    process.env.NODE_ENV = 'test';
    process.env.AUTH_JWT_SECRET ??= 'e2e-test-secret-with-enough-length';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$queryRaw`SELECT 1`;
    dbReady = true;
    await ensureRequiredPermissions();
  });

  afterAll(async () => {
    if (prisma && dbReady) {
      await cleanupTestData();
    }
    if (app) {
      await app.close();
    }
  });

  const email = (label: string) => `${prefix}+${label}@example.com`;
  const orgName = (label: string) => `${prefix} ${label}`;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const hash = (value: string) =>
    createHash('sha256').update(value).digest('hex');
  const decodeJwt = (token: string) =>
    jwt.decode(token) as Record<string, unknown>;
  const tokenFromAcceptanceUrl = (acceptanceUrl: string): string =>
    acceptanceUrl.split('/').at(-1) ?? '';
  const cookieHeader = (rawCookies: unknown): string => {
    const cookies =
      typeof rawCookies === 'string'
        ? [rawCookies]
        : Array.isArray(rawCookies)
          ? rawCookies.filter(
              (cookie): cookie is string => typeof cookie === 'string',
            )
          : [];
    return cookies.map((cookie) => cookie.split(';')[0]).join('; ');
  };

  async function ensureRequiredPermissions(): Promise<void> {
    for (const key of REQUIRED_PERMISSIONS) {
      await prisma.permission.upsert({
        where: { key },
        update: {},
        create: { key, description: `${key} permission for e2e` },
      });
    }
  }

  async function cleanupTestData(): Promise<void> {
    const users = await prisma.user.findMany({
      where: { email: { contains: prefix } },
      select: { id: true },
    });
    const organizations = await prisma.organization.findMany({
      where: { name: { startsWith: prefix } },
      select: { id: true },
    });
    const userIds = users.map((user) => user.id);
    const organizationIds = organizations.map(
      (organization) => organization.id,
    );
    const roles = await prisma.role.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { id: true },
    });
    const roleIds = roles.map((role) => role.id);
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { organizationId: { in: organizationIds } },
        ],
      },
      select: { id: true },
    });
    const membershipIds = memberships.map((membership) => membership.id);

    await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.userCredential.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.passwordResetToken.deleteMany({
      where: { userId: { in: userIds } },
    });
    await prisma.organizationInvitation.deleteMany({
      where: {
        OR: [
          { organizationId: { in: organizationIds } },
          { email: { contains: prefix } },
          { invitedByUserId: { in: userIds } },
        ],
      },
    });
    await prisma.membershipRole.deleteMany({
      where: {
        OR: [
          { membershipId: { in: membershipIds } },
          { roleId: { in: roleIds } },
        ],
      },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: roleIds } },
    });
    await prisma.organizationMembership.deleteMany({
      where: { id: { in: membershipIds } },
    });
    await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  }

  async function registerOwner(label: string): Promise<AuthResponse> {
    const response = await request(server())
      .post('/api/auth/register')
      .send({
        email: email(label),
        password,
        firstName: 'Owner',
        lastName: label,
        organizationName: orgName(label),
      })
      .expect(201);
    return response.body as AuthResponse;
  }

  async function login(label: string): Promise<AuthResponse> {
    const response = await request(server())
      .post('/api/auth/login')
      .send({ email: email(label), password })
      .expect(200);
    return response.body as AuthResponse;
  }

  async function loginWithCookies(
    label: string,
  ): Promise<{ body: AuthResponse; cookies: string }> {
    const response = await request(server())
      .post('/api/auth/login')
      .send({ email: email(label), password })
      .expect(200);
    return {
      body: response.body as AuthResponse,
      cookies: cookieHeader(response.headers['set-cookie']),
    };
  }

  async function createInvitation(
    owner: AuthResponse,
    invitedEmail: string,
  ): Promise<{
    invitationId: string;
    token: string;
    body: Record<string, unknown>;
  }> {
    const response = await request(server())
      .post('/api/organizations/current/invitations')
      .set(auth(owner.auth.accessToken))
      .send({ email: invitedEmail })
      .expect(201);
    const body = response.body as {
      invitation: { id: string };
      acceptanceUrl: string;
    };
    return {
      invitationId: body.invitation.id,
      token: tokenFromAcceptanceUrl(body.acceptanceUrl),
      body: response.body as Record<string, unknown>,
    };
  }

  async function createStoredInvitation(params: {
    organizationId: string;
    invitedByUserId?: string;
    email: string;
    token: string;
    status?: InvitationStatus;
    expiresAt?: Date;
  }) {
    const memberRole = await prisma.role.findUniqueOrThrow({
      where: {
        organizationId_scope_key: {
          organizationId: params.organizationId,
          scope: RoleScope.ORGANIZATION,
          key: 'MEMBER',
        },
      },
    });
    return prisma.organizationInvitation.create({
      data: {
        organizationId: params.organizationId,
        email: params.email.trim().toLowerCase(),
        tokenHash: hash(params.token),
        status: params.status ?? InvitationStatus.PENDING,
        invitedByUserId: params.invitedByUserId,
        proposedRoleId: memberRole.id,
        expiresAt:
          params.expiresAt ?? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        acceptedAt:
          params.status === InvitationStatus.ACCEPTED ? new Date() : null,
      },
    });
  }

  async function membershipFor(userId: string, organizationId: string) {
    return prisma.organizationMembership.findUniqueOrThrow({
      where: { organizationId_userId: { organizationId, userId } },
      include: { roles: { include: { role: true } } },
    });
  }

  async function createUserOnly(label: string) {
    return prisma.user.create({
      data: {
        email: email(label),
        firstName: 'Target',
        lastName: label,
        displayName: `Target ${label}`,
        status: UserStatus.ACTIVE,
      },
    });
  }

  async function addMembership(
    userId: string,
    organizationId: string,
    status: MembershipStatus,
  ) {
    return prisma.organizationMembership.create({
      data: {
        organizationId,
        userId,
        status,
        joinedAt: new Date(),
      },
    });
  }

  async function membershipPermissionKeys(membershipId: string) {
    const membership = await prisma.organizationMembership.findUniqueOrThrow({
      where: { id: membershipId },
      select: {
        organizationId: true,
        roles: {
          select: {
            role: {
              select: {
                organizationId: true,
                scope: true,
                permissions: {
                  select: { permission: { select: { key: true } } },
                },
              },
            },
          },
        },
      },
    });

    const permissions = new Set<string>();
    for (const membershipRole of membership.roles) {
      const role = membershipRole.role;
      if (
        role.organizationId !== membership.organizationId ||
        role.scope !== RoleScope.ORGANIZATION
      ) {
        continue;
      }
      for (const rolePermission of role.permissions) {
        permissions.add(rolePermission.permission.key);
      }
    }

    return [...permissions].sort();
  }

  it('register normal persists user, credential, organization, roles, session, DB-driven permissions, and JWT shape', async () => {
    const body = await registerOwner('register-normal');
    expect(Object.keys(body.activeMembership ?? {}).sort()).toEqual([
      'id',
      'permissions',
      'roles',
      'status',
    ]);
    expect(body.activeMembership).not.toHaveProperty('organization');
    expect(body.memberships[0].organization).toMatchObject({
      id: body.activeOrganization?.id,
      name: orgName('register-normal'),
    });
    expect(body.activeMembership?.roles).toEqual(['OWNER']);
    expect(body.activeMembership?.permissions).toEqual(
      await membershipPermissionKeys(body.activeMembership?.id ?? ''),
    );
    expect(body.activeMembership?.permissions).toEqual(
      expect.arrayContaining([
        'members.manage',
        'members.read',
        'organization.read',
      ]),
    );

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: email('register-normal') },
      include: { credential: true, sessions: true, memberships: true },
    });
    expect(user.credential?.passwordHash).toBeDefined();
    expect(user.credential?.passwordHash).not.toBe(password);
    expect(user.sessions).toHaveLength(1);
    expect(user.sessions[0].organizationId).toBe(body.activeOrganization?.id);
    expect(user.memberships).toHaveLength(1);
    expect(user.memberships[0].status).toBe(MembershipStatus.ACTIVE);

    const ownerRole = await prisma.role.findUnique({
      where: {
        organizationId_scope_key: {
          organizationId: body.activeOrganization?.id ?? '',
          scope: RoleScope.ORGANIZATION,
          key: 'OWNER',
        },
      },
    });
    const memberRole = await prisma.role.findUnique({
      where: {
        organizationId_scope_key: {
          organizationId: body.activeOrganization?.id ?? '',
          scope: RoleScope.ORGANIZATION,
          key: 'MEMBER',
        },
      },
    });
    expect(ownerRole).not.toBeNull();
    expect(memberRole).not.toBeNull();

    const decoded = decodeJwt(body.auth.accessToken);
    expect(decoded.sub).toBe(user.id);
    expect(decoded.sid).toBe(user.sessions[0].id);
    expect(decoded.org).toBe(body.activeOrganization?.id);
    expect(decoded).not.toHaveProperty('roles');
    expect(decoded).not.toHaveProperty('permissions');
    expect(decoded).not.toHaveProperty('membershipId');
  });

  it('creates, previews, lists, revokes, and protects invitations with hashed single-use tokens', async () => {
    const owner = await registerOwner('invite-admin');
    const invitedEmail = email('invited-create').toUpperCase();
    const before = Date.now();
    const created = await createInvitation(owner, invitedEmail);

    expect(created.token).toHaveLength(96);
    const persisted = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: created.invitationId },
      include: { proposedRole: true, invitedBy: true },
    });
    expect(persisted.email).toBe(email('invited-create'));
    expect(persisted.tokenHash).toBe(hash(created.token));
    expect(persisted.tokenHash).not.toBe(created.token);
    expect(persisted.proposedRole?.key).toBe('MEMBER');
    expect(persisted.invitedBy?.id).toBe(owner.user.id);
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(persisted.expiresAt.getTime()).toBeGreaterThanOrEqual(
      before + sevenDaysMs - 60_000,
    );
    expect(persisted.expiresAt.getTime()).toBeLessThanOrEqual(
      Date.now() + sevenDaysMs + 60_000,
    );

    const preview = await request(server())
      .get(`/api/invitations/${created.token}`)
      .expect(200);
    expect(preview.body).toMatchObject({
      email: email('invited-create'),
      organization: {
        name: owner.activeOrganization?.name,
        slug: owner.activeOrganization?.slug,
      },
    });
    expect(preview.body).not.toHaveProperty('tokenHash');

    const list = await request(server())
      .get('/api/organizations/current/invitations')
      .set(auth(owner.auth.accessToken))
      .expect(200);
    const invitationList = list.body as InvitationListBody;
    expect(invitationList.invitations[0]).toMatchObject({
      id: created.invitationId,
      email: email('invited-create'),
      invitedBy: { id: owner.user.id, displayName: 'Owner invite-admin' },
      proposedRole: { key: 'MEMBER', name: 'Member' },
    });
    expect(invitationList.invitations[0]).not.toHaveProperty('tokenHash');
    expect(invitationList.invitations[0].proposedRole).not.toHaveProperty('id');

    await request(server())
      .post('/api/organizations/current/invitations')
      .set(auth(owner.auth.accessToken))
      .send({ email: email('invited-create') })
      .expect(409)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body).toMatchObject({
          statusCode: 409,
          code: 'INVITATION_ALREADY_PENDING',
        });
      });

    const revoked = await request(server())
      .delete(`/api/organizations/current/invitations/${created.invitationId}`)
      .set(auth(owner.auth.accessToken))
      .expect(200);
    expect((revoked.body as InvitationResponseBody).invitation.status).toBe(
      InvitationStatus.REVOKED,
    );
    await request(server())
      .get(`/api/invitations/${created.token}`)
      .expect(410)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body).toMatchObject({
          statusCode: 410,
          code: 'INVITATION_REVOKED',
        });
      });
  });

  it('returns state-specific errors when revoking accepted, expired, revoked, or missing invitations', async () => {
    const owner = await registerOwner('revoke-states');
    const organizationId = owner.activeOrganization?.id ?? '';
    const accepted = await createStoredInvitation({
      organizationId,
      invitedByUserId: owner.user.id,
      email: email('rev-accepted'),
      token: `${prefix}-rev-accepted-token`,
      status: InvitationStatus.ACCEPTED,
    });
    const expired = await createStoredInvitation({
      organizationId,
      invitedByUserId: owner.user.id,
      email: email('rev-expired'),
      token: `${prefix}-rev-expired-token`,
      expiresAt: new Date(Date.now() - 60_000),
    });
    const revoked = await createStoredInvitation({
      organizationId,
      invitedByUserId: owner.user.id,
      email: email('rev-revoked'),
      token: `${prefix}-rev-revoked-token`,
      status: InvitationStatus.REVOKED,
    });

    const cases: Array<[string, number, string]> = [
      [accepted.id, 409, 'INVITATION_ALREADY_ACCEPTED'],
      [expired.id, 410, 'INVITATION_EXPIRED'],
      [revoked.id, 410, 'INVITATION_REVOKED'],
      [randomUUID(), 404, 'INVITATION_NOT_FOUND'],
    ];
    for (const [invitationId, statusCode, code] of cases) {
      await request(server())
        .delete(`/api/organizations/current/invitations/${invitationId}`)
        .set(auth(owner.auth.accessToken))
        .expect(statusCode)
        .expect(({ body }: { body: ErrorBody }) => {
          expect(body.code).toBe(code);
        });
    }
  });

  it('rejects invitation creation for existing ACTIVE, SUSPENDED, and REMOVED memberships without creating invitations', async () => {
    const owner = await registerOwner('ic-owner');
    const organizationId = owner.activeOrganization?.id ?? '';
    const cases: Array<[string, MembershipStatus]> = [
      ['ic-active', MembershipStatus.ACTIVE],
      ['ic-susp', MembershipStatus.SUSPENDED],
      ['ic-rem', MembershipStatus.REMOVED],
    ];

    for (const [label, status] of cases) {
      const target = await createUserOnly(label);
      await addMembership(target.id, organizationId, status);

      await request(server())
        .post('/api/organizations/current/invitations')
        .set(auth(owner.auth.accessToken))
        .send({ email: target.email })
        .expect(409)
        .expect(({ body }: { body: ErrorBody }) => {
          expect(body.code).toBe('MEMBER_ALREADY_EXISTS');
        });
      expect(
        await prisma.organizationInvitation.count({
          where: { organizationId, email: target.email },
        }),
      ).toBe(0);
    }
  });

  it('handles invitation preview states and safe functional error contracts', async () => {
    const owner = await registerOwner('preview-states');
    const orgId = owner.activeOrganization?.id ?? '';
    const acceptedToken = `${prefix}-accepted-token`;
    const expiredToken = `${prefix}-expired-token`;
    const revokedToken = `${prefix}-revoked-token`;
    await createStoredInvitation({
      organizationId: orgId,
      invitedByUserId: owner.user.id,
      email: email('preview-accepted'),
      token: acceptedToken,
      status: InvitationStatus.ACCEPTED,
    });
    await createStoredInvitation({
      organizationId: orgId,
      invitedByUserId: owner.user.id,
      email: email('preview-expired'),
      token: expiredToken,
      expiresAt: new Date(Date.now() - 60_000),
    });
    await createStoredInvitation({
      organizationId: orgId,
      invitedByUserId: owner.user.id,
      email: email('preview-revoked'),
      token: revokedToken,
      status: InvitationStatus.REVOKED,
    });

    const cases: Array<[string, number, string]> = [
      [`${prefix}-missing-token`, 404, 'INVITATION_NOT_FOUND'],
      [expiredToken, 410, 'INVITATION_EXPIRED'],
      [revokedToken, 410, 'INVITATION_REVOKED'],
      [acceptedToken, 409, 'INVITATION_ALREADY_ACCEPTED'],
    ];
    for (const [token, statusCode, code] of cases) {
      await request(server())
        .get(`/api/invitations/${token}`)
        .expect(statusCode)
        .expect(({ body }: { body: ErrorBody }) => {
          expect(Object.keys(body).sort()).toEqual([
            'code',
            'message',
            'statusCode',
          ]);
          expect(body).toMatchObject({ statusCode, code });
        });
    }
  });

  it('registers a new user from invitation without creating a new organization and keeps MEMBER permissions DB-driven', async () => {
    const owner = await registerOwner('register-invite-owner');
    const created = await createInvitation(owner, email('new-invited-user'));
    const organizationCountBefore = await prisma.organization.count();

    const response = await request(server())
      .post('/api/auth/register')
      .send({
        invitationToken: created.token,
        password,
        firstName: 'Invited',
        lastName: 'Member',
      })
      .expect(201);
    const body = response.body as AuthResponse;
    expect(await prisma.organization.count()).toBe(organizationCountBefore);
    expect(body.user.email).toBe(email('new-invited-user'));
    expect(body.activeOrganization?.id).toBe(owner.activeOrganization?.id);
    const activeMembershipId = body.activeMembership?.id ?? '';
    expect(body.activeMembership).toEqual({
      id: activeMembershipId,
      status: MembershipStatus.ACTIVE,
      roles: ['MEMBER'],
      permissions: ['members.read', 'organization.read'],
    });
    expect(activeMembershipId).not.toBe('');
    expect(body.activeMembership?.permissions).not.toContain('members.manage');
    expect(body.activeMembership).not.toHaveProperty('organization');

    const invitation = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: created.invitationId },
    });
    expect(invitation.status).toBe(InvitationStatus.ACCEPTED);
    expect(invitation.acceptedAt).not.toBeNull();

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: email('new-invited-user') },
      include: { credential: true, sessions: true },
    });
    const membership = await membershipFor(
      user.id,
      owner.activeOrganization?.id ?? '',
    );
    expect(user.credential).not.toBeNull();
    expect(user.sessions[0].organizationId).toBe(owner.activeOrganization?.id);
    expect(membership.roles.map((role) => role.role.key)).toEqual(['MEMBER']);

    await request(server())
      .post('/api/auth/register')
      .send({
        invitationToken: created.token,
        password,
        firstName: 'Replay',
        lastName: 'User',
      })
      .expect(409)
      .expect(({ body: error }: { body: ErrorBody }) => {
        expect(error.code).toBe('INVITATION_ALREADY_ACCEPTED');
      });
    expect(
      await prisma.organizationMembership.count({
        where: {
          organizationId: owner.activeOrganization?.id,
          userId: user.id,
        },
      }),
    ).toBe(1);
  });

  it('keeps invitation pending when invitation registration email already exists, then existing user can accept without auto-selecting invited org', async () => {
    const owner = await registerOwner('existing-user-owner');
    await registerOwner('existing-user');
    const existingLogin = await login('existing-user');
    const created = await createInvitation(owner, email('existing-user'));

    await request(server())
      .post('/api/auth/register')
      .send({
        invitationToken: created.token,
        password,
        firstName: 'Existing',
        lastName: 'Duplicate',
      })
      .expect(409)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('EMAIL_ALREADY_REGISTERED');
      });
    expect(
      await prisma.organizationInvitation.findUniqueOrThrow({
        where: { id: created.invitationId },
      }),
    ).toMatchObject({ status: InvitationStatus.PENDING, acceptedAt: null });

    await request(server())
      .post(`/api/invitations/${created.token}/accept`)
      .set(auth(existingLogin.auth.accessToken))
      .expect(200);
    const existing = await prisma.user.findUniqueOrThrow({
      where: { email: email('existing-user') },
      include: { sessions: true },
    });
    const membership = await membershipFor(
      existing.id,
      owner.activeOrganization?.id ?? '',
    );
    expect(membership.status).toBe(MembershipStatus.ACTIVE);
    expect(membership.roles.map((role) => role.role.key)).toEqual(['MEMBER']);
    expect(
      existing.sessions.find(
        (session) =>
          session.id === decodeJwt(existingLogin.auth.accessToken).sid,
      )?.organizationId,
    ).toBe(existingLogin.activeOrganization?.id);

    await request(server())
      .post(`/api/invitations/${created.token}/accept`)
      .set(auth(existingLogin.auth.accessToken))
      .expect(409)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('INVITATION_ALREADY_ACCEPTED');
      });
  });

  it('rejects invitation accept for existing ACTIVE, SUSPENDED, and REMOVED memberships without changing invitation or membership', async () => {
    const owner = await registerOwner('ac-owner');
    const organizationId = owner.activeOrganization?.id ?? '';
    const cases: Array<[string, MembershipStatus]> = [
      ['ac-active', MembershipStatus.ACTIVE],
      ['ac-susp', MembershipStatus.SUSPENDED],
      ['ac-rem', MembershipStatus.REMOVED],
    ];

    for (const [label, status] of cases) {
      await registerOwner(label);
      const targetLogin = await login(label);
      const membership = await addMembership(
        targetLogin.user.id,
        organizationId,
        status,
      );
      const token = `${prefix}-${label}-token`;
      const invitation = await createStoredInvitation({
        organizationId,
        invitedByUserId: owner.user.id,
        email: targetLogin.user.email,
        token,
      });

      await request(server())
        .post(`/api/invitations/${token}/accept`)
        .set(auth(targetLogin.auth.accessToken))
        .expect(409)
        .expect(({ body }: { body: ErrorBody }) => {
          expect(body.code).toBe('MEMBER_ALREADY_EXISTS');
        });
      expect(
        await prisma.organizationInvitation.findUniqueOrThrow({
          where: { id: invitation.id },
        }),
      ).toMatchObject({ status: InvitationStatus.PENDING, acceptedAt: null });
      expect(
        (
          await prisma.organizationMembership.findUniqueOrThrow({
            where: { id: membership.id },
          })
        ).status,
      ).toBe(status);
    }
  });

  it('persists EXPIRED before rejecting existing-user invitation accept', async () => {
    const owner = await registerOwner('accept-expired-owner');
    const invited = await registerOwner('accept-expired-user');
    const token = `${prefix}-accept-expired-token`;
    const invitation = await createStoredInvitation({
      organizationId: owner.activeOrganization?.id ?? '',
      invitedByUserId: owner.user.id,
      email: invited.user.email,
      token,
      expiresAt: new Date(Date.now() - 60_000),
    });

    await request(server())
      .post(`/api/invitations/${token}/accept`)
      .set(auth(invited.auth.accessToken))
      .expect(410)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('INVITATION_EXPIRED');
      });

    await expect(
      prisma.organizationInvitation.findUniqueOrThrow({
        where: { id: invitation.id },
      }),
    ).resolves.toMatchObject({
      status: InvitationStatus.EXPIRED,
      acceptedAt: null,
    });
    expect(
      await prisma.organizationMembership.count({
        where: {
          organizationId: owner.activeOrganization?.id,
          userId: invited.user.id,
        },
      }),
    ).toBe(0);
  });

  it('rejects unusable invitation registration tokens without partial records', async () => {
    const owner = await registerOwner('rt-owner');
    const organizationId = owner.activeOrganization?.id ?? '';
    const cases: Array<{
      label: string;
      token: string;
      expectedStatus: number;
      expectedCode: string;
      create?: () => Promise<void>;
    }> = [
      {
        label: 'rt-missing',
        token: `${prefix}-missing-register-token`,
        expectedStatus: 404,
        expectedCode: 'INVITATION_NOT_FOUND',
      },
      {
        label: 'rt-expired',
        token: `${prefix}-expired-register-token`,
        expectedStatus: 410,
        expectedCode: 'INVITATION_EXPIRED',
        create: async () => {
          await createStoredInvitation({
            organizationId,
            invitedByUserId: owner.user.id,
            email: email('rt-expired'),
            token: `${prefix}-expired-register-token`,
            expiresAt: new Date(Date.now() - 60_000),
          });
        },
      },
      {
        label: 'rt-revoked',
        token: `${prefix}-revoked-register-token`,
        expectedStatus: 410,
        expectedCode: 'INVITATION_REVOKED',
        create: async () => {
          await createStoredInvitation({
            organizationId,
            invitedByUserId: owner.user.id,
            email: email('rt-revoked'),
            token: `${prefix}-revoked-register-token`,
            status: InvitationStatus.REVOKED,
          });
        },
      },
      {
        label: 'rt-accepted',
        token: `${prefix}-accepted-register-token`,
        expectedStatus: 409,
        expectedCode: 'INVITATION_ALREADY_ACCEPTED',
        create: async () => {
          await createStoredInvitation({
            organizationId,
            invitedByUserId: owner.user.id,
            email: email('rt-accepted'),
            token: `${prefix}-accepted-register-token`,
            status: InvitationStatus.ACCEPTED,
          });
        },
      },
    ];

    for (const current of cases) {
      await current.create?.();
      await request(server())
        .post('/api/auth/register')
        .send({
          invitationToken: current.token,
          password,
          firstName: 'Invalid',
          lastName: 'Token',
        })
        .expect(current.expectedStatus)
        .expect(({ body }: { body: ErrorBody }) => {
          expect(body.code).toBe(current.expectedCode);
        });
      expect(
        await prisma.user.findUnique({
          where: { email: email(current.label) },
        }),
      ).toBeNull();
      expect(
        await prisma.userCredential.count({
          where: { user: { email: email(current.label) } },
        }),
      ).toBe(0);
      expect(
        await prisma.organizationMembership.count({
          where: {
            organizationId,
            user: { email: email(current.label) },
          },
        }),
      ).toBe(0);
      expect(
        await prisma.membershipRole.count({
          where: {
            membership: {
              organizationId,
              user: { email: email(current.label) },
            },
          },
        }),
      ).toBe(0);
      expect(
        await prisma.userSession.count({
          where: { user: { email: email(current.label) } },
        }),
      ).toBe(0);
      if (current.label === 'rt-expired') {
        await expect(
          prisma.organizationInvitation.findFirstOrThrow({
            where: { organizationId, email: email(current.label) },
          }),
        ).resolves.toMatchObject({
          status: InvitationStatus.EXPIRED,
          acceptedAt: null,
        });
      }
    }
  });

  it('rejects null invitationToken at DTO validation without creating records', async () => {
    const countsBefore = {
      users: await prisma.user.count(),
      memberships: await prisma.organizationMembership.count(),
      sessions: await prisma.userSession.count(),
    };

    await request(server())
      .post('/api/auth/register')
      .send({
        invitationToken: null,
        password,
        firstName: 'Null',
        lastName: 'Token',
      })
      .expect(400)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('VALIDATION_ERROR');
      });

    await expect(prisma.user.count()).resolves.toBe(countsBefore.users);
    await expect(prisma.organizationMembership.count()).resolves.toBe(
      countsBefore.memberships,
    );
    await expect(prisma.userSession.count()).resolves.toBe(
      countsBefore.sessions,
    );
  });

  it('rolls back PostgreSQL transaction when invitation registration fails after claim', async () => {
    const owner = await registerOwner('rollback-owner');
    const created = await createInvitation(owner, email('rollback-invited'));
    await request(server())
      .post('/api/auth/register')
      .send({
        invitationToken: created.token,
        password,
        firstName: 'x'.repeat(101),
        lastName: 'Rollback',
      })
      .expect(500);

    const invitation = await prisma.organizationInvitation.findUniqueOrThrow({
      where: { id: created.invitationId },
    });
    expect(invitation.status).toBe(InvitationStatus.PENDING);
    expect(invitation.acceptedAt).toBeNull();
    const user = await prisma.user.findUnique({
      where: { email: email('rollback-invited') },
    });
    expect(user).toBeNull();
    expect(
      await prisma.organizationMembership.count({
        where: {
          organizationId: owner.activeOrganization?.id,
          user: { email: email('rollback-invited') },
        },
      }),
    ).toBe(0);
    expect(
      await prisma.userSession.count({
        where: { user: { email: email('rollback-invited') } },
      }),
    ).toBe(0);
  });

  it('lists only current-tenant members, enforces MEMBER permissions, and requires tenant selection', async () => {
    const owner = await registerOwner('permission-owner');
    const otherOwner = await registerOwner('permission-other-owner');
    const created = await createInvitation(owner, email('permission-member'));
    await request(server())
      .post('/api/auth/register')
      .send({
        invitationToken: created.token,
        password,
        firstName: 'Permission',
        lastName: 'Member',
      })
      .expect(201);
    const memberLogin = await login('permission-member');
    await prisma.user.update({
      where: { id: memberLogin.user.id },
      data: { avatarUrl: 'https://example.com/permission-member.png' },
    });
    await prisma.organizationMembership.update({
      where: {
        id: memberLogin.activeMembership?.id ?? 'missing-membership-id',
      },
      data: { jobTitle: 'QA Engineer' },
    });

    const members = await request(server())
      .get('/api/organizations/current/members')
      .set(auth(memberLogin.auth.accessToken))
      .expect(200);
    const memberList = members.body as MembersListBody;
    expect(memberList.members.map((member) => member.user.email)).toContain(
      email('permission-member'),
    );
    expect(memberList.members.map((member) => member.user.email)).not.toContain(
      email('permission-other-owner'),
    );
    const listedMember = memberList.members.find(
      (member) => member.user.email === email('permission-member'),
    );
    expect(listedMember).toMatchObject({
      id: memberLogin.activeMembership?.id,
      status: MembershipStatus.ACTIVE,
      jobTitle: 'QA Engineer',
      roles: ['MEMBER'],
      user: {
        id: memberLogin.user.id,
        email: email('permission-member'),
        displayName: 'Permission Member',
        firstName: 'Permission',
        lastName: 'Member',
        avatarUrl: 'https://example.com/permission-member.png',
      },
    });
    expect(typeof listedMember?.joinedAt).toBe('string');
    expect(listedMember?.user).toMatchObject({
      displayName: 'Permission Member',
      firstName: 'Permission',
      lastName: 'Member',
      avatarUrl: 'https://example.com/permission-member.png',
    });
    expect(listedMember?.user).not.toHaveProperty('jobTitle');
    expect(memberList.members[0].user).not.toHaveProperty('credential');
    expect(memberList.members[0].user).not.toHaveProperty('sessions');

    const deniedRequests = [
      () =>
        request(server())
          .post('/api/organizations/current/invitations')
          .set(auth(memberLogin.auth.accessToken))
          .send({ email: email('permission-denied-invite') }),
      () =>
        request(server())
          .patch(
            `/api/organizations/current/members/${owner.activeMembership?.id}`,
          )
          .set(auth(memberLogin.auth.accessToken))
          .send({ status: MembershipStatus.SUSPENDED }),
      () =>
        request(server())
          .delete(
            `/api/organizations/current/members/${owner.activeMembership?.id}`,
          )
          .set(auth(memberLogin.auth.accessToken)),
    ];
    for (const deniedRequest of deniedRequests) {
      await deniedRequest()
        .expect(403)
        .expect(({ body }: { body: ErrorBody }) => {
          expect(body.code).toBe('MEMBER_ACCESS_DENIED');
        });
    }

    const crossTenant = await request(server())
      .patch(
        `/api/organizations/current/members/${otherOwner.activeMembership?.id}`,
      )
      .set(auth(owner.auth.accessToken))
      .send({ status: MembershipStatus.SUSPENDED })
      .expect(404);
    expect((crossTenant.body as ErrorBody).code).toBe('MEMBERSHIP_NOT_FOUND');

    const createdForExisting = await createInvitation(
      otherOwner,
      email('permission-owner'),
    );
    await request(server())
      .post(`/api/invitations/${createdForExisting.token}/accept`)
      .set(auth(owner.auth.accessToken))
      .expect(200);
    const selectionLogin = await login('permission-owner');
    expect(selectionLogin.requiresOrganizationSelection).toBe(true);
    expect(selectionLogin.activeMembership).toBeNull();
    await request(server())
      .get('/api/organizations/current/members')
      .set(auth(selectionLogin.auth.accessToken))
      .expect(403)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('TENANT_REQUIRED');
      });
  });

  it('suspends, reactivates, removes, invalidates old JWT tenant sessions, and preserves other-tenant sessions', async () => {
    const owner = await registerOwner('lifecycle-owner');
    const otherOwner = await registerOwner('lifecycle-other-owner');
    const created = await createInvitation(owner, email('lifecycle-member'));
    await request(server())
      .post('/api/auth/register')
      .send({
        invitationToken: created.token,
        password,
        firstName: 'Life',
        lastName: 'Cycle',
      })
      .expect(201);
    const { body: memberLogin, cookies: memberCookies } =
      await loginWithCookies('lifecycle-member');
    const userId = memberLogin.user.id;
    const membershipId = memberLogin.activeMembership?.id ?? '';

    const otherInvite = await createInvitation(
      otherOwner,
      email('lifecycle-member'),
    );
    await request(server())
      .post(`/api/invitations/${otherInvite.token}/accept`)
      .set(auth(memberLogin.auth.accessToken))
      .expect(200);
    const otherTenantLogin = await login('lifecycle-member');
    expect(otherTenantLogin.requiresOrganizationSelection).toBe(true);
    const otherSelected = await request(server())
      .post('/api/auth/select-organization')
      .set(auth(otherTenantLogin.auth.accessToken))
      .send({ organizationId: otherOwner.activeOrganization?.id })
      .expect(200);
    const otherSelectedBody = otherSelected.body as AuthResponse;
    const otherSessionId = decodeJwt(otherSelectedBody.auth.accessToken)
      .sid as string;

    await request(server())
      .patch(`/api/organizations/current/members/${membershipId}`)
      .set(auth(owner.auth.accessToken))
      .send({ status: MembershipStatus.SUSPENDED })
      .expect(200);
    expect(
      (await membershipFor(userId, owner.activeOrganization?.id ?? '')).status,
    ).toBe(MembershipStatus.SUSPENDED);
    const targetSession = await prisma.userSession.findUniqueOrThrow({
      where: { id: decodeJwt(memberLogin.auth.accessToken).sid as string },
    });
    expect(targetSession.organizationId).toBeNull();
    expect(
      (
        await prisma.userSession.findUniqueOrThrow({
          where: { id: otherSessionId },
        })
      ).organizationId,
    ).toBe(otherOwner.activeOrganization?.id);
    await request(server())
      .get('/api/organizations/current/members')
      .set(auth(memberLogin.auth.accessToken))
      .expect(401)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('SESSION_REVOKED');
      });
    const refreshAfterSuspend = await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', memberCookies)
      .expect(200);
    const refreshAfterSuspendBody = refreshAfterSuspend.body as {
      auth: { accessToken: string };
    };
    expect(decodeJwt(refreshAfterSuspendBody.auth.accessToken).org).toBeNull();

    await request(server())
      .patch(`/api/organizations/current/members/${membershipId}`)
      .set(auth(owner.auth.accessToken))
      .send({ status: MembershipStatus.ACTIVE })
      .expect(200);
    expect(
      (await membershipFor(userId, owner.activeOrganization?.id ?? '')).status,
    ).toBe(MembershipStatus.ACTIVE);
    await request(server())
      .get('/api/organizations/current/members')
      .set(auth(memberLogin.auth.accessToken))
      .expect(401);

    const { body: freshLogin, cookies: freshCookies } =
      await loginWithCookies('lifecycle-member');
    expect(freshLogin.requiresOrganizationSelection).toBe(true);
    const selected = await request(server())
      .post('/api/auth/select-organization')
      .set(auth(freshLogin.auth.accessToken))
      .send({ organizationId: owner.activeOrganization?.id })
      .expect(200);
    await request(server())
      .delete(`/api/organizations/current/members/${membershipId}`)
      .set(auth(owner.auth.accessToken))
      .expect(200);
    expect(
      (await membershipFor(userId, owner.activeOrganization?.id ?? '')).status,
    ).toBe(MembershipStatus.REMOVED);
    expect(
      (
        await prisma.userSession.findUniqueOrThrow({
          where: {
            id: decodeJwt((selected.body as AuthResponse).auth.accessToken)
              .sid as string,
          },
        })
      ).organizationId,
    ).toBeNull();
    const refreshAfterRemove = await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', freshCookies)
      .expect(200);
    const refreshAfterRemoveBody = refreshAfterRemove.body as {
      auth: { accessToken: string };
    };
    expect(decodeJwt(refreshAfterRemoveBody.auth.accessToken).org).toBeNull();
    await request(server())
      .patch(`/api/organizations/current/members/${membershipId}`)
      .set(auth(owner.auth.accessToken))
      .send({ status: MembershipStatus.ACTIVE })
      .expect(404)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('MEMBERSHIP_NOT_FOUND');
      });
  });

  it('protects last owner and preserves at least one active owner under concurrent owner mutations', async () => {
    const owner = await registerOwner('last-owner');
    await request(server())
      .patch(`/api/organizations/current/members/${owner.activeMembership?.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ status: MembershipStatus.SUSPENDED })
      .expect(409)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('LAST_OWNER_REQUIRED');
      });
    await request(server())
      .delete(
        `/api/organizations/current/members/${owner.activeMembership?.id}`,
      )
      .set(auth(owner.auth.accessToken))
      .expect(409)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('LAST_OWNER_REQUIRED');
      });
    expect(
      (await membershipFor(owner.user.id, owner.activeOrganization?.id ?? ''))
        .status,
    ).toBe(MembershipStatus.ACTIVE);

    const ownerRole = await prisma.role.findUniqueOrThrow({
      where: {
        organizationId_scope_key: {
          organizationId: owner.activeOrganization?.id ?? '',
          scope: RoleScope.ORGANIZATION,
          key: 'OWNER',
        },
      },
    });
    const userB = await prisma.user.create({
      data: {
        email: email('last-owner-b'),
        firstName: 'Owner',
        lastName: 'B',
        displayName: 'Owner B',
        status: UserStatus.ACTIVE,
      },
    });
    const membershipB = await prisma.organizationMembership.create({
      data: {
        organizationId: owner.activeOrganization?.id ?? '',
        userId: userB.id,
        status: MembershipStatus.ACTIVE,
        joinedAt: new Date(),
      },
    });
    await prisma.membershipRole.create({
      data: { membershipId: membershipB.id, roleId: ownerRole.id },
    });
    await request(server())
      .patch(`/api/organizations/current/members/${membershipB.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ status: MembershipStatus.SUSPENDED })
      .expect(200);

    await prisma.organizationMembership.update({
      where: { id: membershipB.id },
      data: { status: MembershipStatus.ACTIVE },
    });
    const concurrentResults = await Promise.allSettled([
      request(server())
        .delete(
          `/api/organizations/current/members/${owner.activeMembership?.id}`,
        )
        .set(auth(owner.auth.accessToken)),
      request(server())
        .delete(`/api/organizations/current/members/${membershipB.id}`)
        .set(auth(owner.auth.accessToken)),
    ]);
    expect(concurrentResults).toHaveLength(2);
    const activeOwnerCount = await prisma.organizationMembership.count({
      where: {
        organizationId: owner.activeOrganization?.id,
        status: MembershipStatus.ACTIVE,
        roles: {
          some: { role: { key: 'OWNER', scope: RoleScope.ORGANIZATION } },
        },
      },
    });
    expect(activeOwnerCount).toBeGreaterThanOrEqual(1);
  });

  it('keeps invitation concurrency invariants for duplicate creation and token acceptance', async () => {
    const owner = await registerOwner('ci-owner');
    const invitedEmail = email('ci-pending');
    const duplicateResults = await Promise.allSettled([
      request(server())
        .post('/api/organizations/current/invitations')
        .set(auth(owner.auth.accessToken))
        .send({ email: invitedEmail }),
      request(server())
        .post('/api/organizations/current/invitations')
        .set(auth(owner.auth.accessToken))
        .send({ email: invitedEmail }),
    ]);
    expect(duplicateResults).toHaveLength(2);
    expect(
      await prisma.organizationInvitation.count({
        where: {
          organizationId: owner.activeOrganization?.id,
          email: invitedEmail,
          status: InvitationStatus.PENDING,
        },
      }),
    ).toBeLessThanOrEqual(1);

    await registerOwner('ca-user');
    const targetLogin = await login('ca-user');
    const created = await createInvitation(owner, email('ca-user'));
    const acceptResults = await Promise.allSettled([
      request(server())
        .post(`/api/invitations/${created.token}/accept`)
        .set(auth(targetLogin.auth.accessToken)),
      request(server())
        .post(`/api/invitations/${created.token}/accept`)
        .set(auth(targetLogin.auth.accessToken)),
    ]);
    expect(acceptResults).toHaveLength(2);
    expect(
      await prisma.organizationMembership.count({
        where: {
          organizationId: owner.activeOrganization?.id,
          userId: targetLogin.user.id,
        },
      }),
    ).toBe(1);
    expect(
      (
        await prisma.organizationInvitation.findUniqueOrThrow({
          where: { id: created.invitationId },
        })
      ).status,
    ).toBe(InvitationStatus.ACCEPTED);
  });

  it('exposes Auth activeMembership permissions in register, login, select-organization, and me', async () => {
    const owner = await registerOwner('auth-owner');
    expect(owner.activeMembership?.permissions.length).toBeGreaterThan(0);

    const singleTenantLogin = await login('auth-owner');
    expect(singleTenantLogin.activeMembership?.permissions).toEqual(
      await membershipPermissionKeys(
        singleTenantLogin.activeMembership?.id ?? '',
      ),
    );

    const secondOwner = await registerOwner('auth-second');
    const invitation = await createInvitation(secondOwner, email('auth-owner'));
    await request(server())
      .post(`/api/invitations/${invitation.token}/accept`)
      .set(auth(singleTenantLogin.auth.accessToken))
      .expect(200);
    const multiTenantLogin = await login('auth-owner');
    expect(multiTenantLogin.requiresOrganizationSelection).toBe(true);
    expect(multiTenantLogin.activeMembership).toBeNull();

    const selected = await request(server())
      .post('/api/auth/select-organization')
      .set(auth(multiTenantLogin.auth.accessToken))
      .send({ organizationId: secondOwner.activeOrganization?.id })
      .expect(200);
    const selectedBody = selected.body as AuthResponse;
    expect(selectedBody.activeMembership?.permissions).toEqual(
      await membershipPermissionKeys(selectedBody.activeMembership?.id ?? ''),
    );

    const me = await request(server())
      .get('/api/auth/me')
      .set(auth(selectedBody.auth.accessToken))
      .expect(200);
    expect((me.body as AuthResponse).activeMembership?.permissions).toEqual(
      await membershipPermissionKeys(selectedBody.activeMembership?.id ?? ''),
    );
  });

  it('reflects changed RolePermission rows in Auth responses without JWT permission claims', async () => {
    const owner = await registerOwner('db-driven-owner');
    const managePermission = await prisma.permission.findUniqueOrThrow({
      where: { key: 'members.manage' },
    });
    const ownerRole = await prisma.role.findUniqueOrThrow({
      where: {
        organizationId_scope_key: {
          organizationId: owner.activeOrganization?.id ?? '',
          scope: RoleScope.ORGANIZATION,
          key: 'OWNER',
        },
      },
    });
    await prisma.rolePermission.delete({
      where: {
        roleId_permissionId: {
          roleId: ownerRole.id,
          permissionId: managePermission.id,
        },
      },
    });
    const expectedPermissions = await membershipPermissionKeys(
      owner.activeMembership?.id ?? '',
    );
    const me = await request(server())
      .get('/api/auth/me')
      .set(auth(owner.auth.accessToken))
      .expect(200);
    expect(expectedPermissions).not.toContain('members.manage');
    expect((me.body as AuthResponse).activeMembership?.permissions).toEqual(
      expectedPermissions,
    );
    await request(server())
      .post('/api/organizations/current/invitations')
      .set(auth(owner.auth.accessToken))
      .send({ email: email('db-driven-denied') })
      .expect(403)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('MEMBER_ACCESS_DENIED');
      });
    const decoded = decodeJwt(owner.auth.accessToken);
    expect(decoded).not.toHaveProperty('roles');
    expect(decoded).not.toHaveProperty('permissions');
  });

  it('rejects invitation accept email mismatch and cross-tenant invitation revocation IDOR', async () => {
    const ownerA = await registerOwner('idor-owner-a');
    const ownerB = await registerOwner('idor-owner-b');
    const invitationB = await createInvitation(ownerB, email('idor-invited-b'));
    await request(server())
      .delete(
        `/api/organizations/current/invitations/${invitationB.invitationId}`,
      )
      .set(auth(ownerA.auth.accessToken))
      .expect(404)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('INVITATION_NOT_FOUND');
      });
    expect(
      await prisma.organizationInvitation.findUniqueOrThrow({
        where: { id: invitationB.invitationId },
      }),
    ).toMatchObject({ status: InvitationStatus.PENDING });

    await request(server())
      .post(`/api/invitations/${invitationB.token}/accept`)
      .set(auth(ownerA.auth.accessToken))
      .expect(403)
      .expect(({ body }: { body: ErrorBody }) => {
        expect(body.code).toBe('INVITATION_EMAIL_MISMATCH');
      });
  });
});
