/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call */
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { InvitationStatus, RoleScope } from '../generated/prisma/client';
import { OrganizationRolesService } from '../organization-provisioning/services/organization-roles.service';
import { AuthService } from './auth.service';

const futureDate = () => new Date(Date.now() + 60_000);
const pastDate = () => new Date(Date.now() - 60_000);

function invitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invitation-1',
    email: ' Invited@Example.COM ',
    status: InvitationStatus.PENDING,
    expiresAt: futureDate(),
    organizationId: 'org-invited',
    ...overrides,
  };
}

function membershipRole(
  key: string,
  permissionKeys: string[],
  organizationId = 'o1',
) {
  return {
    role: {
      organizationId,
      scope: RoleScope.ORGANIZATION,
      key,
      permissions: permissionKeys.map((permissionKey) => ({
        permission: { key: permissionKey },
      })),
    },
  };
}

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
    organizationId: 'o1',
    roles: [
      membershipRole('OWNER', [
        'members.manage',
        'members.read',
        'organization.read',
      ]),
    ],
  };

  const tx: any = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(({ data }: any) => ({ id: 'u1', ...data })),
    },
    userCredential: {
      create: jest.fn(({ data }: any) => ({ id: 'c1', ...data })),
    },
    organization: {
      create: jest.fn(({ data }: any) => ({ id: 'o1', ...data })),
    },
    organizationMembership: {
      create: jest.fn(({ data }: any) => ({ id: 'm1', ...data })),
    },
    organizationInvitation: {
      findUnique: jest.fn(),
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    role: { upsert: jest.fn(({ create }: any) => ({ id: 'r1', ...create })) },
    permission: { findMany: jest.fn() },
    rolePermission: { deleteMany: jest.fn(), upsert: jest.fn() },
    membershipRole: { upsert: jest.fn() },
    userSession: {
      create: jest.fn(({ data }: any) => ({ id: data.id, ...data })),
    },
  };

  const prisma: any = {
    $transaction: jest.fn((fn: (transactionClient: any) => any) => fn(tx)),
    user: {
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    organizationMembership: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const serializableTransactionService = {
    run: jest.fn((fn: (transactionClient: any) => any) => fn(tx)),
  };

  const service = new AuthService(
    prisma,
    passwordService as any,
    tokenService as any,
    sessionService as any,
    new OrganizationRolesService(),
    serializableTransactionService as any,
    configService,
  );

  return {
    service,
    prisma,
    tx,
    passwordService,
    tokenService,
    sessionService,
    serializableTransactionService,
    membership,
  };
}

describe('AuthService', () => {
  it('registro exitoso crea usuario, org, membership, OWNER, MEMBER y sesión', async () => {
    const { service, prisma, tx, membership } = makeServices();
    prisma.user.findUnique.mockResolvedValue(null);
    tx.permission.findMany
      .mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }])
      .mockResolvedValueOnce([
        { id: 'p-org-read', key: 'organization.read' },
        { id: 'p-members-read', key: 'members.read' },
      ]);
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

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.user.create).toHaveBeenCalled();
    expect(tx.organization.create).toHaveBeenCalled();
    expect(tx.role.upsert).toHaveBeenCalledTimes(2);
    expect(tx.role.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ key: 'OWNER', name: 'Owner' }),
      }),
    );
    expect(tx.role.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ key: 'MEMBER', name: 'Member' }),
      }),
    );
    expect(tx.permission.findMany).toHaveBeenCalledWith({
      where: { key: { in: ['organization.read', 'members.read'] } },
    });
    expect(tx.rolePermission.upsert).toHaveBeenCalledTimes(4);
    expect(tx.userSession.create).toHaveBeenCalled();
    expect(result.response.requiresOrganizationSelection).toBe(false);
    expect(result.response.activeOrganization).not.toBeNull();
    expect(result.response.activeMembership).toEqual({
      id: 'm1',
      status: 'ACTIVE',
      roles: ['OWNER'],
      permissions: ['members.manage', 'members.read', 'organization.read'],
    });
    expect(result.response.activeMembership).not.toHaveProperty('organization');
    expect(result.response.memberships[0].organization).toEqual({
      id: 'o1',
      name: 'Acme',
      slug: 'acme',
    });
    expect(result.response.auth.accessToken).toBeTruthy();
    expect(prisma.organizationMembership.findMany).toHaveBeenCalledWith({
      where: { userId: 'u1', status: 'ACTIVE' },
      select: expect.objectContaining({
        roles: {
          select: {
            role: {
              select: expect.objectContaining({
                key: true,
                permissions: {
                  select: {
                    permission: { select: { key: true } },
                  },
                },
              }),
            },
          },
        },
      }),
    });
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

  it('registro por invitación crea User, Credential, MEMBER membership y sesión en org invitada', async () => {
    const { service, prisma, tx, membership, serializableTransactionService } =
      makeServices();
    membership.roles = [{ role: { key: 'MEMBER' } }];
    membership.organizationId = 'org-invited';
    membership.roles = [
      membershipRole(
        'MEMBER',
        ['organization.read', 'members.read'],
        'org-invited',
      ),
    ];
    membership.organization = {
      id: 'org-invited',
      name: 'Invited Org',
      slug: 'invited-org',
    };
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation());
    tx.user.findUnique.mockResolvedValue(null);
    tx.permission.findMany.mockResolvedValue([
      { id: 'p-org-read', key: 'organization.read' },
      { id: 'p-members-read', key: 'members.read' },
    ]);
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);

    const result = await service.register({
      password: 'SecurePassword123!',
      firstName: 'Invited',
      lastName: 'User',
      invitationToken: 'plain-token',
    });

    const expectedHash = createHash('sha256')
      .update('plain-token')
      .digest('hex');
    expect(serializableTransactionService.run).toHaveBeenCalledTimes(1);
    expect(tx.organizationInvitation.findUnique).toHaveBeenCalledWith({
      where: { tokenHash: expectedHash },
      select: expect.objectContaining({ organizationId: true }),
    });
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'invited@example.com' },
      select: { id: true },
    });
    expect(tx.organization.create).not.toHaveBeenCalled();
    expect(tx.role.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ key: 'MEMBER' }),
      }),
    );
    expect(tx.role.upsert).not.toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ key: 'OWNER' }),
      }),
    );
    expect(tx.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: 'invitation-1', status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: expect.any(Date) },
    });
    expect(
      tx.organizationInvitation.updateMany.mock.invocationCallOrder[0],
    ).toBeLessThan(tx.user.create.mock.invocationCallOrder[0]);
    expect(tx.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'invited@example.com',
        firstName: 'Invited',
        lastName: 'User',
        status: 'ACTIVE',
      }),
    });
    expect(tx.userCredential.create).toHaveBeenCalledWith({
      data: { userId: 'u1', passwordHash: 'phash' },
    });
    expect(tx.organizationMembership.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-invited',
        userId: 'u1',
        status: 'ACTIVE',
        joinedAt: expect.any(Date),
      }),
      select: { id: true },
    });
    expect(tx.membershipRole.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ membershipId: 'm1' }),
      }),
    );
    expect(tx.userSession.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'u1',
        organizationId: 'org-invited',
      }),
    });
    expect(result.response.activeOrganization?.id).toBe('org-invited');
    expect(result.response.activeMembership).toEqual({
      id: 'm1',
      status: 'ACTIVE',
      roles: ['MEMBER'],
      permissions: ['members.read', 'organization.read'],
    });
    expect(result.response.activeMembership).not.toHaveProperty('organization');
    expect(result.response.activeMembership?.permissions).not.toContain(
      'members.manage',
    );
    expect(result.response.auth.accessToken).toContain('org-invited');
    expect(
      JSON.stringify([
        tx.organizationInvitation.findUnique.mock.calls,
        tx.organizationInvitation.updateMany.mock.calls,
      ]),
    ).not.toContain('plain-token');
  });

  it.each([
    [null, 'INVITATION_NOT_FOUND', 404],
    [
      invitation({ status: InvitationStatus.EXPIRED }),
      'INVITATION_EXPIRED',
      410,
    ],
    [
      invitation({ status: InvitationStatus.REVOKED }),
      'INVITATION_REVOKED',
      410,
    ],
    [
      invitation({ status: InvitationStatus.ACCEPTED }),
      'INVITATION_ALREADY_ACCEPTED',
      409,
    ],
    [invitation({ expiresAt: pastDate() }), 'INVITATION_EXPIRED', 410],
  ])(
    'registro por invitación rechaza token no usable %#',
    async (storedInvitation, code, status) => {
      const { service, tx } = makeServices();
      tx.organizationInvitation.findUnique.mockResolvedValue(storedInvitation);

      await expect(
        service.register({
          password: 'SecurePassword123!',
          firstName: 'Invited',
          lastName: 'User',
          invitationToken: 'plain-token',
        }),
      ).rejects.toMatchObject({ code, status });
      expect(tx.user.create).not.toHaveBeenCalled();
      expect(tx.userCredential.create).not.toHaveBeenCalled();
      expect(tx.organizationMembership.create).not.toHaveBeenCalled();
      expect(tx.userSession.create).not.toHaveBeenCalled();
    },
  );

  it('registro por invitación expirada persiste EXPIRED y lanza fuera de la transacción', async () => {
    const { service, tx, serializableTransactionService } = makeServices();
    const transactionResults: unknown[] = [];
    serializableTransactionService.run.mockImplementationOnce(
      async (callback: (transactionClient: typeof tx) => Promise<unknown>) => {
        const result = await callback(tx);
        transactionResults.push(result);
        return result;
      },
    );
    tx.organizationInvitation.findUnique.mockResolvedValue(
      invitation({ expiresAt: pastDate() }),
    );

    await expect(
      service.register({
        password: 'SecurePassword123!',
        firstName: 'Invited',
        lastName: 'User',
        invitationToken: 'plain-token',
      }),
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED' });
    expect(tx.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: 'invitation-1', status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.EXPIRED },
    });
    expect(transactionResults).toEqual([{ kind: 'expired' }]);
    expect(tx.user.create).not.toHaveBeenCalled();
    expect(tx.userCredential.create).not.toHaveBeenCalled();
    expect(tx.organizationMembership.create).not.toHaveBeenCalled();
    expect(tx.membershipRole.upsert).not.toHaveBeenCalled();
    expect(tx.userSession.create).not.toHaveBeenCalled();
  });

  it('registro por invitación rechaza User existente con EMAIL_ALREADY_REGISTERED antes del claim', async () => {
    const { service, tx } = makeServices();
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation());
    tx.user.findUnique.mockResolvedValue({ id: 'existing-user' });

    await expect(
      service.register({
        password: 'SecurePassword123!',
        firstName: 'Invited',
        lastName: 'User',
        invitationToken: 'plain-token',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
    expect(tx.organizationInvitation.updateMany).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: InvitationStatus.ACCEPTED }),
      }),
    );
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it('registro por invitación con claim count 0 reconsulta ACCEPTED y no crea User', async () => {
    const { service, tx } = makeServices();
    tx.organizationInvitation.findUnique
      .mockResolvedValueOnce(invitation())
      .mockResolvedValueOnce(invitation({ status: InvitationStatus.ACCEPTED }));
    tx.user.findUnique.mockResolvedValue(null);
    tx.permission.findMany.mockResolvedValue([
      { id: 'p-org-read', key: 'organization.read' },
      { id: 'p-members-read', key: 'members.read' },
    ]);
    tx.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.register({
        password: 'SecurePassword123!',
        firstName: 'Invited',
        lastName: 'User',
        invitationToken: 'plain-token',
      }),
    ).rejects.toMatchObject({ code: 'INVITATION_ALREADY_ACCEPTED' });
    expect(tx.user.create).not.toHaveBeenCalled();
  });

  it.each([
    ['user create failed', 'user', 'create'],
    ['credential create failed', 'userCredential', 'create'],
    ['membership create failed', 'organizationMembership', 'create'],
    ['session create failed', 'userSession', 'create'],
  ])(
    'registro por invitación propaga fallo de %s dentro del transaction callback',
    async (message, model, method) => {
      const { service, tx } = makeServices();
      tx.organizationInvitation.findUnique.mockResolvedValue(invitation());
      tx.user.findUnique.mockResolvedValue(null);
      tx.permission.findMany.mockResolvedValue([
        { id: 'p-org-read', key: 'organization.read' },
        { id: 'p-members-read', key: 'members.read' },
      ]);
      tx[model][method].mockRejectedValueOnce(new Error(message));

      await expect(
        service.register({
          password: 'SecurePassword123!',
          firstName: 'Invited',
          lastName: 'User',
          invitationToken: 'plain-token',
        }),
      ).rejects.toThrow(message);
      expect(tx.organizationInvitation.updateMany).toHaveBeenCalledWith({
        where: { id: 'invitation-1', status: InvitationStatus.PENDING },
        data: {
          status: InvitationStatus.ACCEPTED,
          acceptedAt: expect.any(Date),
        },
      });
    },
  );

  it('registro por invitación propaga fallo de MembershipRole dentro del transaction callback', async () => {
    const { service, tx } = makeServices();
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation());
    tx.user.findUnique.mockResolvedValue(null);
    tx.permission.findMany.mockResolvedValue([
      { id: 'p-org-read', key: 'organization.read' },
      { id: 'p-members-read', key: 'members.read' },
    ]);
    tx.membershipRole.upsert.mockRejectedValueOnce(
      new Error('membership role failed'),
    );

    await expect(
      service.register({
        password: 'SecurePassword123!',
        firstName: 'Invited',
        lastName: 'User',
        invitationToken: 'plain-token',
      }),
    ).rejects.toThrow('membership role failed');
    expect(tx.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: { id: 'invitation-1', status: InvitationStatus.PENDING },
      data: { status: InvitationStatus.ACCEPTED, acceptedAt: expect.any(Date) },
    });
  });

  it('registro por invitación mapea P2002 de User.email a EMAIL_ALREADY_REGISTERED', async () => {
    const { service, tx } = makeServices();
    tx.organizationInvitation.findUnique.mockResolvedValue(invitation());
    tx.user.findUnique.mockResolvedValue(null);
    tx.permission.findMany.mockResolvedValue([
      { id: 'p-org-read', key: 'organization.read' },
      { id: 'p-members-read', key: 'members.read' },
    ]);
    tx.user.create.mockRejectedValueOnce({
      code: 'P2002',
      meta: { target: ['email'] },
    });

    await expect(
      service.register({
        password: 'SecurePassword123!',
        firstName: 'Invited',
        lastName: 'User',
        invitationToken: 'plain-token',
      }),
    ).rejects.toMatchObject({ code: 'EMAIL_ALREADY_REGISTERED' });
  });

  it('login con 1 tenant establece org y requiresOrganizationSelection false', async () => {
    const { service, prisma, membership, tokenService } = makeServices();
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
    expect(result.response.activeMembership).not.toHaveProperty('organization');
    expect(result.response.activeMembership?.permissions).toEqual([
      'members.manage',
      'members.read',
      'organization.read',
    ]);
    expect(result.response.auth.accessToken).toBeTruthy();
    expect(tokenService.sign).toHaveBeenCalledWith({
      sub: 'u1',
      sid: expect.any(String),
      org: 'o1',
    });
  });

  it('deduplicates permission keys from multiple roles without hardcoding role names', async () => {
    const { service, prisma, membership } = makeServices();
    membership.roles = [
      membershipRole('CUSTOM_A', ['members.read', 'custom.permission']),
      membershipRole('CUSTOM_B', ['members.read', 'organization.read']),
    ];
    prisma.user.findUnique.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      status: 'ACTIVE',
      credential: { passwordHash: 'h' },
    });
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);

    const result = await service.login({ email: 'a@b.com', password: 'pw' });

    expect(result.response.activeMembership?.roles).toEqual([
      'CUSTOM_A',
      'CUSTOM_B',
    ]);
    expect(result.response.activeMembership?.permissions).toEqual([
      'custom.permission',
      'members.read',
      'organization.read',
    ]);
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
    expect(result.response.activeMembership).toBeNull();
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
    expect(result.response.activeMembership).not.toHaveProperty('organization');
    expect(result.response.activeMembership?.permissions).toEqual([
      'members.manage',
      'members.read',
      'organization.read',
    ]);
  });

  it('select-organization uses only permissions from the selected tenant membership', async () => {
    const { service, prisma, membership } = makeServices();
    const other = {
      ...membership,
      id: 'm2',
      organizationId: 'o2',
      organization: { id: 'o2', name: 'Banco', slug: 'banco' },
      roles: [membershipRole('OWNER', ['other.only'], 'o2')],
    };
    prisma.organizationMembership.findFirst.mockResolvedValue(membership);
    prisma.organizationMembership.findMany.mockResolvedValue([
      membership,
      other,
    ]);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'O',
      lastName: 'M',
      displayName: 'O M',
    });

    const result = await service.selectOrganization('u1', 's1', 'o1');

    expect(result.response.activeMembership?.permissions).not.toContain(
      'other.only',
    );
    expect(result.response.activeOrganization?.id).toBe('o1');
    expect(result.response.activeMembership).not.toHaveProperty('organization');
    expect(result.response.memberships[0].organization.id).toBe('o1');
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
    expect(result.activeMembership).not.toHaveProperty('organization');
    expect(result.activeMembership?.permissions).toEqual([
      'members.manage',
      'members.read',
      'organization.read',
    ]);
    expect(result.requiresOrganizationSelection).toBe(false);
  });

  it('GET /auth/me without active tenant keeps activeMembership null', async () => {
    const { service, prisma, membership } = makeServices();
    prisma.organizationMembership.findMany.mockResolvedValue([membership]);
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: 'u1',
      email: 'a@b.com',
      firstName: 'O',
      lastName: 'M',
      displayName: 'O M',
    });

    const result = await service.me('u1', null);

    expect(result.activeOrganization).toBeNull();
    expect(result.activeMembership).toBeNull();
    expect(result.requiresOrganizationSelection).toBe(true);
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
