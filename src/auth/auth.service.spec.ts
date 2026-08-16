/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';

function makeServices() {
  const passwordService = {
    hash: jest.fn().mockResolvedValue('phash'),
    verify: jest.fn().mockResolvedValue(true),
  };
  const tokenService = {
    sign: jest.fn(
      (p: { sub: string; sid: string; org: string | null }) =>
        `tok.${p.sub}.${p.sid}.${p.org}`,
    ),
    verify: jest.fn(),
    hashToken: jest.fn((v: string) => `h(${v})`),
    generateRefreshToken: jest.fn(() => 'refresh-plain'),
    expiresIn: 900,
  };
  const sessionService = {
    create: jest.fn().mockResolvedValue({}),
    revoke: jest.fn().mockResolvedValue({}),
    activateOrganization: jest.fn().mockResolvedValue({}),
    findValidById: jest.fn().mockResolvedValue({}),
    findByRefreshTokenHash: jest.fn().mockResolvedValue(null),
    rotateRefresh: jest.fn().mockResolvedValue({}),
  };
  const configService = {
    get: (key: string) =>
      key === 'AUTH_REFRESH_TOKEN_TTL_DAYS' ? 30 : undefined,
  } as unknown as ConfigService;

  const membership = {
    id: 'm1',
    status: 'ACTIVE',
    organization: { id: 'o1', name: 'Acme', slug: 'acme' },
    roles: [{ role: { key: 'OWNER' } }],
  };

  const prisma: any = {
    $transaction: jest.fn((fn: (tx: any) => any) => fn(prisma)),
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(({ data }: any) => ({ id: 'u1', ...data })),
    },
    userCredential: {
      create: jest.fn(({ data }: any) => ({ id: 'c1', ...data })),
    },
    organization: {
      create: jest.fn(({ data }: any) => ({ id: 'o1', ...data })),
      findUnique: jest.fn(),
    },
    organizationMembership: {
      create: jest.fn(({ data }: any) => ({ id: 'm1', ...data })),
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
    role: { upsert: jest.fn(({ create }: any) => ({ id: 'r1', ...create })) },
    permission: { findMany: jest.fn() },
    rolePermission: { upsert: jest.fn() },
    membershipRole: { upsert: jest.fn() },
    userSession: {
      create: jest.fn(({ data }: any) => ({ id: data.id, ...data })),
    },
  };

  const service = new AuthService(
    prisma,
    passwordService as any,
    tokenService as any,
    sessionService as any,
    configService,
  );

  return {
    service,
    prisma,
    passwordService,
    tokenService,
    sessionService,
    membership,
  };
}

describe('AuthService', () => {
  it('registro exitoso crea usuario, org, membership, OWNER y sesión', async () => {
    const { service, prisma, membership } = makeServices();
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.permission.findMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]);
    prisma.organization.findUnique.mockResolvedValue(null);
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'O',
      lastName: 'M',
      displayName: 'O M',
    });

    const result = await service.register({
      email: 'A@B.com',
      password: 'SecurePassword123!',
      firstName: 'O',
      lastName: 'M',
      organizationName: 'Acme',
    });

    expect(prisma.user.create).toHaveBeenCalled();
    expect(prisma.organization.create).toHaveBeenCalled();
    expect(prisma.role.upsert).toHaveBeenCalled();
    expect(prisma.rolePermission.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.userSession.create).toHaveBeenCalled();
    expect(result.response.requiresOrganizationSelection).toBe(false);
    expect(result.response.activeOrganization).not.toBeNull();
    expect(result.response.activeMembership?.roles).toContain('OWNER');
    expect(result.response.auth.accessToken).toBeTruthy();
  });

  it('registro con email duplicado rechaza con EMAIL_ALREADY_REGISTERED', async () => {
    const { service, prisma } = makeServices();
    prisma.user.findUnique.mockResolvedValue({ id: 'uid' });

    await expect(
      service.register({
        email: 'a@b.com',
        password: 'SecurePassword123!',
        firstName: 'O',
        lastName: 'M',
        organizationName: 'Acme',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it('login con 1 tenant establece org y requiresOrganizationSelection false', async () => {
    const { service, prisma, membership } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
      credential: { passwordHash: 'h' },
    });
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);

    const result = await service.login({ email: 'a@b.com', password: 'pw' });

    expect(result.response.requiresOrganizationSelection).toBe(false);
    expect(result.response.activeOrganization).not.toBeNull();
    expect(result.response.auth.accessToken).toBeTruthy();
  });

  it('regla dedicada: 1 org activa NUNCA devuelve requiresOrganizationSelection true', async () => {
    const { service, prisma, membership } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
      credential: { passwordHash: 'h' },
    });
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);

    const result = await service.login({ email: 'a@b.com', password: 'pw' });
    expect(result.response.requiresOrganizationSelection).not.toBe(true);
    expect(result.response.requiresOrganizationSelection).toBe(false);
  });

  it('login con 2+ tenants deja org null y requiresOrganizationSelection true', async () => {
    const { service, prisma, membership } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
      credential: { passwordHash: 'h' },
    });
    const other = {
      ...membership,
      id: 'm2',
      organization: { id: 'o2', name: 'Banco', slug: 'banco' },
    };
    prisma.organizationMembership.findMany.mockResolvedValue([
      membership,
      other,
    ]);

    const result = await service.login({ email: 'a@b.com', password: 'pw' });

    expect(result.response.requiresOrganizationSelection).toBe(true);
    expect(result.response.activeOrganization).toBeNull();
  });

  it('login sin membresías activas rechaza con NO_ACTIVE_MEMBERSHIP', async () => {
    const { service, prisma } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
      credential: { passwordHash: 'h' },
    });
    prisma.organizationMembership.findMany.mockResolvedValue([]);

    await expect(
      service.login({ email: 'a@b.com', password: 'pw' }),
    ).rejects.toMatchObject({ code: 'NO_ACTIVE_MEMBERSHIP' });
  });

  it('login con credenciales inválidas rechaza con INVALID_CREDENTIALS', async () => {
    const { service, prisma, passwordService } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
      credential: { passwordHash: 'h' },
    });
    passwordService.verify.mockResolvedValue(false);

    await expect(
      service.login({ email: 'a@b.com', password: 'bad' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('login sin usuario existente rechaza con INVALID_CREDENTIALS', async () => {
    const { service, prisma } = makeServices();
    prisma.user.findUnique.mockResolvedValue(null);

    await expect(
      service.login({ email: 'nobody@b.com', password: 'pw' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('login con usuario sin credential rechaza con INVALID_CREDENTIALS', async () => {
    const { service, prisma } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
      credential: null,
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'pw' }),
    ).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' });
  });

  it('login con usuario no activo rechaza con USER_NOT_ACTIVE', async () => {
    const { service, prisma } = makeServices();
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'PENDING',
      credential: { passwordHash: 'h' },
    });

    await expect(
      service.login({ email: 'a@b.com', password: 'pw' }),
    ).rejects.toMatchObject({ code: 'USER_NOT_ACTIVE' });
  });

  it('selección válida de tenant emite token con org activo', async () => {
    const { service, prisma, membership } = makeServices();
    prisma.organizationMembership.findFirst.mockResolvedValue(membership);
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'O',
      lastName: 'M',
      displayName: 'O M',
    });

    const result = await service.selectOrganization('u1', 's1', 'o1');

    expect(prisma.organizationMembership.findFirst).toHaveBeenCalled();
    expect(result.response.requiresOrganizationSelection).toBe(false);
    expect(result.response.activeOrganization?.id).toBe('o1');
  });

  it('selección de tenant ajeno rechaza con ORGANIZATION_ACCESS_DENIED', async () => {
    const { service, prisma } = makeServices();
    prisma.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.selectOrganization('u1', 's1', 'foreign'),
    ).rejects.toMatchObject({ code: 'ORGANIZATION_ACCESS_DENIED' });
  });

  it('GET /auth/me refleja tenant y membership activos', async () => {
    const { service, prisma, membership } = makeServices();
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'O',
      lastName: 'M',
      displayName: 'O M',
    });

    const result = await service.me('u1', 'o1');

    expect(result.activeOrganization?.id).toBe('o1');
    expect(result.requiresOrganizationSelection).toBe(false);
  });

  it('refresh con sesión inexistente rechaza con SESSION_REVOKED', async () => {
    const { service, sessionService } = makeServices();
    sessionService.findByRefreshTokenHash.mockResolvedValue(null);

    await expect(service.refresh('bad-refresh')).rejects.toMatchObject({
      code: 'SESSION_REVOKED',
    });
  });

  it('refresh emite nuevo access token conservando tenant', async () => {
    const { service, sessionService } = makeServices();
    sessionService.findByRefreshTokenHash.mockResolvedValue({
      id: 's1',
      userId: 'u1',
      organizationId: 'o1',
    });

    const result = await service.refresh('refresh-cookie');

    expect(sessionService.rotateRefresh).toHaveBeenCalled();
    expect(result.accessToken).toBeTruthy();
    expect(result.refreshToken).toBe('refresh-plain');
  });

  it('logout revoca la sesión', async () => {
    const { service, sessionService } = makeServices();
    await service.logout('u1', 's1');
    expect(sessionService.revoke).toHaveBeenCalledWith('s1');
  });
});
