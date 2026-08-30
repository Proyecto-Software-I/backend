/* eslint-disable @typescript-eslint/unbound-method */
import {
  MembershipStatus,
  Prisma,
  RoleScope,
} from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRolesManagementService } from './organization-roles-management.service';

type RoleCreateCall = { data: Record<string, unknown> };
type RoleFindFirstCall = { where: { key?: string; scope?: RoleScope } };
type MembershipFindFirstCall = {
  where: { id: string; organizationId: string; status: unknown };
};

function getRoleCreateCall(create: jest.Mock, index: number): RoleCreateCall {
  const calls = create.mock.calls as unknown as Array<[RoleCreateCall]>;
  return calls[index][0];
}

function getRoleFindFirstCall(
  findFirst: jest.Mock,
  index: number,
): RoleFindFirstCall {
  const calls = findFirst.mock.calls as unknown as Array<[RoleFindFirstCall]>;
  return calls[index][0];
}

function getMembershipFindFirstCall(
  findFirst: jest.Mock,
  index: number,
): MembershipFindFirstCall {
  const calls = findFirst.mock.calls as unknown as Array<
    [MembershipFindFirstCall]
  >;
  return calls[index][0];
}

function p2002RoleKeyError(): Prisma.PrismaClientKnownRequestError {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
    meta: { target: ['organizationId', 'scope', 'key'] },
  });
}

function role(overrides: Record<string, unknown> = {}) {
  return {
    id: 'role-1',
    organizationId: 'org-1',
    key: 'security-reviewer',
    name: 'Security reviewer',
    description: 'Can inspect analysis and audit information.',
    scope: RoleScope.ORGANIZATION,
    isSystem: false,
    permissions: [
      { permission: { key: 'analysis.read' } },
      { permission: { key: 'audit.read' } },
    ],
    ...overrides,
  };
}

function membershipRole(roleOverrides: Record<string, unknown>) {
  return {
    role: {
      id: 'role-member',
      organizationId: 'org-1',
      key: 'MEMBER',
      scope: RoleScope.ORGANIZATION,
      isSystem: true,
      ...roleOverrides,
    },
  };
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1',
    organizationId: 'org-1',
    userId: 'user-1',
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    jobTitle: 'Developer',
    user: {
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member User',
      firstName: 'Member',
      lastName: 'User',
      avatarUrl: null,
    },
    roles: [
      membershipRole({ id: 'role-member', key: 'MEMBER', isSystem: true }),
      membershipRole({ id: 'role-a', key: 'ROLE_A', isSystem: false }),
    ],
    ...overrides,
  };
}

function makeService() {
  const tx = {
    role: {
      create: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    organizationMembership: {
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
    },
    permission: { findMany: jest.fn() },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    membershipRole: {
      count: jest.fn(),
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  };
  const prisma = {
    role: { findMany: jest.fn(), findFirst: jest.fn() },
    permission: { findMany: jest.fn() },
  } as unknown as PrismaService & {
    role: { findMany: jest.Mock; findFirst: jest.Mock };
    permission: { findMany: jest.Mock };
  };
  const serializableTransactionService = {
    run: jest.fn((callback: (transactionClient: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return {
    prisma,
    tx,
    serializableTransactionService,
    service: new OrganizationRolesManagementService(
      prisma,
      serializableTransactionService as never,
    ),
  };
}

describe('OrganizationRolesManagementService', () => {
  it('lists only current-tenant organization roles with the approved ordering', async () => {
    const { service, prisma } = makeService();
    prisma.role.findMany.mockResolvedValue([]);

    await service.listOrganizationRoles('org-1');

    expect(prisma.role.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }, { key: 'asc' }],
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  });

  it('returns system and custom roles with permission key arrays only', async () => {
    const { service, prisma } = makeService();
    prisma.role.findMany.mockResolvedValue([
      role({
        id: 'role-owner',
        key: 'OWNER',
        name: 'Owner',
        description: null,
        isSystem: true,
        permissions: [
          { permission: { key: 'members.read' } },
          { permission: { key: 'organization.read' } },
        ],
      }),
      role({
        id: 'role-reviewer',
        permissions: [
          { permission: { key: 'audit.read' } },
          { permission: { key: 'analysis.read' } },
        ],
      }),
    ]);

    await expect(service.listOrganizationRoles('org-1')).resolves.toEqual({
      roles: [
        {
          id: 'role-owner',
          key: 'OWNER',
          name: 'Owner',
          description: null,
          scope: RoleScope.ORGANIZATION,
          isSystem: true,
          permissions: ['members.read', 'organization.read'],
        },
        {
          id: 'role-reviewer',
          key: 'security-reviewer',
          name: 'Security reviewer',
          description: 'Can inspect analysis and audit information.',
          scope: RoleScope.ORGANIZATION,
          isSystem: false,
          permissions: ['analysis.read', 'audit.read'],
        },
      ],
    });
  });

  it('lists the global permission catalog ordered by key without internal ids', async () => {
    const { service, prisma } = makeService();
    prisma.permission.findMany.mockResolvedValue([
      { key: 'analysis.read', description: 'Ver análisis.' },
      { key: 'members.read', description: 'Ver miembros.' },
    ]);

    await expect(service.listPermissionCatalog()).resolves.toEqual({
      permissions: [
        { key: 'analysis.read', description: 'Ver análisis.' },
        { key: 'members.read', description: 'Ver miembros.' },
      ],
    });
    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      orderBy: { key: 'asc' },
      select: {
        key: true,
        description: true,
      },
    });
  });

  it('creates a custom organization role atomically with tenant, scope, key and permissions', async () => {
    const { service, prisma, tx, serializableTransactionService } =
      makeService();
    prisma.role.findFirst.mockResolvedValue(null);
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-analysis', key: 'analysis.read' },
      { id: 'permission-audit', key: 'audit.read' },
    ]);
    tx.role.create.mockResolvedValue(role());

    await expect(
      service.createOrganizationRole('org-1', {
        name: 'Security reviewer',
        description: 'Can inspect analysis and audit information.',
        permissionKeys: ['analysis.read', 'audit.read'],
      }),
    ).resolves.toEqual({
      role: {
        id: 'role-1',
        key: 'security-reviewer',
        name: 'Security reviewer',
        description: 'Can inspect analysis and audit information.',
        scope: RoleScope.ORGANIZATION,
        isSystem: false,
        permissions: ['analysis.read', 'audit.read'],
      },
    });
    expect(serializableTransactionService.run).toHaveBeenCalledTimes(1);
    expect(tx.role.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
        key: 'security-reviewer',
        name: 'Security reviewer',
        description: 'Can inspect analysis and audit information.',
        isSystem: false,
        permissions: {
          create: [
            { permissionId: 'permission-analysis' },
            { permissionId: 'permission-audit' },
          ],
        },
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  });

  it('creates a custom role with an empty permission set', async () => {
    const { service, prisma, tx } = makeService();
    prisma.role.findFirst.mockResolvedValue(null);
    tx.role.create.mockResolvedValue(role({ permissions: [] }));

    await service.createOrganizationRole('org-1', {
      name: 'Empty role',
      permissionKeys: [],
    });

    expect(tx.permission.findMany).not.toHaveBeenCalled();
    const createCall = getRoleCreateCall(tx.role.create, 0);
    expect(createCall.data).not.toHaveProperty('permissions');
  });

  it('generates normalized lowercase slug keys with fallback and suffix collisions', async () => {
    const { service, prisma, tx } = makeService();
    prisma.role.findFirst
      .mockResolvedValueOnce({ id: 'role-1' })
      .mockResolvedValueOnce({ id: 'role-2' })
      .mockResolvedValueOnce(null);
    tx.role.create.mockResolvedValue(role({ key: 'seguridad-auditoria-3' }));

    await service.createOrganizationRole('org-1', {
      name: ' Seguridad & Auditoría! ',
      permissionKeys: [],
    });

    const createCall = getRoleCreateCall(tx.role.create, 0);
    expect(createCall.data.key).toBe('seguridad-auditoria-3');
  });

  it('uses an explicit role key fallback when the role name has no slug characters', async () => {
    const { service, prisma, tx } = makeService();
    prisma.role.findFirst.mockResolvedValue(null);
    tx.role.create.mockResolvedValue(role({ key: 'custom-role' }));

    await service.createOrganizationRole('org-1', {
      name: '¿¿¿',
      permissionKeys: [],
    });

    const createCall = getRoleCreateCall(tx.role.create, 0);
    expect(createCall.data.key).toBe('custom-role');
  });

  it('uses truncated suffix candidates when the base role key reaches 100 characters', async () => {
    const { service, prisma, tx } = makeService();
    const baseKey = 'a'.repeat(100);
    const secondCandidate = `${'a'.repeat(98)}-2`;
    const thirdCandidate = `${'a'.repeat(98)}-3`;
    prisma.role.findFirst
      .mockResolvedValueOnce({ id: 'role-base' })
      .mockResolvedValueOnce({ id: 'role-second' })
      .mockResolvedValueOnce(null);
    tx.role.create.mockResolvedValue(role({ key: thirdCandidate }));

    await service.createOrganizationRole('org-1', {
      name: baseKey,
      permissionKeys: [],
    });

    expect(prisma.role.findFirst).toHaveBeenNthCalledWith(1, {
      where: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
        key: baseKey,
      },
      select: { id: true },
    });
    expect(prisma.role.findFirst).toHaveBeenNthCalledWith(2, {
      where: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
        key: secondCandidate,
      },
      select: { id: true },
    });
    expect(prisma.role.findFirst).toHaveBeenNthCalledWith(3, {
      where: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
        key: thirdCandidate,
      },
      select: { id: true },
    });
    for (let index = 0; index < 3; index += 1) {
      const call = getRoleFindFirstCall(prisma.role.findFirst, index);
      expect(call.where.key).toHaveLength(100);
    }
    const createCall = getRoleCreateCall(tx.role.create, 0);
    expect(createCall.data.key).toBe(thirdCandidate);
  });

  it('rejects duplicate permission keys before opening a transaction', async () => {
    const { service, serializableTransactionService } = makeService();

    await expect(
      service.createOrganizationRole('org-1', {
        name: 'Security reviewer',
        permissionKeys: ['analysis.read', 'analysis.read'],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(serializableTransactionService.run).not.toHaveBeenCalled();
  });

  it('rejects unknown permission keys', async () => {
    const { service, prisma, tx } = makeService();
    prisma.role.findFirst.mockResolvedValue(null);
    tx.permission.findMany.mockResolvedValue([{ id: 'permission-analysis' }]);

    await expect(
      service.createOrganizationRole('org-1', {
        name: 'Security reviewer',
        permissionKeys: ['analysis.read', 'missing.permission'],
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_NOT_FOUND', status: 400 });
    expect(tx.role.create).not.toHaveBeenCalled();
  });

  it('retries locally when custom role creation hits the expected role key P2002', async () => {
    const { service, prisma, tx } = makeService();
    prisma.role.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'role-1' })
      .mockResolvedValueOnce(null);
    tx.role.create
      .mockRejectedValueOnce(p2002RoleKeyError())
      .mockResolvedValueOnce(role({ key: 'security-reviewer-2' }));

    await expect(
      service.createOrganizationRole('org-1', {
        name: 'Security reviewer',
        permissionKeys: [],
      }),
    ).resolves.toMatchObject({ role: { key: 'security-reviewer-2' } });
    const secondCreateCall = getRoleCreateCall(tx.role.create, 1);
    expect(secondCreateCall.data.key).toBe('security-reviewer-2');
  });

  it('returns ROLE_ALREADY_EXISTS after bounded role key P2002 attempts', async () => {
    const { service, prisma, tx } = makeService();
    prisma.role.findFirst.mockResolvedValue(null);
    tx.role.create.mockRejectedValue(p2002RoleKeyError());

    await expect(
      service.createOrganizationRole('org-1', {
        name: 'Security reviewer',
        permissionKeys: [],
      }),
    ).rejects.toMatchObject({ code: 'ROLE_ALREADY_EXISTS', status: 409 });
    expect(tx.role.create).toHaveBeenCalledTimes(5);
  });

  it('updates a custom role without regenerating its key and preserves permissions when absent', async () => {
    const { service, tx, serializableTransactionService } = makeService();
    tx.role.findFirst.mockResolvedValue(role({ key: 'security-reviewer' }));
    tx.role.update.mockResolvedValue(
      role({ key: 'security-reviewer', name: 'Security and audit reviewer' }),
    );

    await expect(
      service.updateOrganizationRole('org-1', 'role-1', {
        name: 'Security and audit reviewer',
      }),
    ).resolves.toMatchObject({
      role: {
        key: 'security-reviewer',
        name: 'Security and audit reviewer',
      },
    });
    expect(serializableTransactionService.run).toHaveBeenCalledTimes(1);
    expect(tx.role.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'role-1',
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
      },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    expect(tx.rolePermission.deleteMany).not.toHaveBeenCalled();
    expect(tx.role.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { name: 'Security and audit reviewer' },
      }),
    );
  });

  it('clears description and atomically replaces permissions when permissionKeys is present', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(role());
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-members', key: 'members.read' },
    ]);
    tx.role.update.mockResolvedValue(
      role({
        description: null,
        permissions: [{ permission: { key: 'members.read' } }],
      }),
    );

    await expect(
      service.updateOrganizationRole('org-1', 'role-1', {
        description: null,
        permissionKeys: ['members.read'],
      }),
    ).resolves.toMatchObject({
      role: { description: null, permissions: ['members.read'] },
    });
    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: { roleId: 'role-1' },
    });
    expect(tx.rolePermission.createMany).toHaveBeenCalledWith({
      data: [{ roleId: 'role-1', permissionId: 'permission-members' }],
    });
    expect(tx.role.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { description: null } }),
    );
  });

  it('rejects duplicate permission keys on update', async () => {
    const { service, serializableTransactionService } = makeService();

    await expect(
      service.updateOrganizationRole('org-1', 'role-1', {
        permissionKeys: ['members.read', 'members.read'],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(serializableTransactionService.run).not.toHaveBeenCalled();
  });

  it('rejects unknown permission keys on update without replacing permissions', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(role());
    tx.permission.findMany.mockResolvedValue([]);

    await expect(
      service.updateOrganizationRole('org-1', 'role-1', {
        permissionKeys: ['missing.permission'],
      }),
    ).rejects.toMatchObject({ code: 'PERMISSION_NOT_FOUND', status: 400 });
    expect(tx.rolePermission.deleteMany).not.toHaveBeenCalled();
    expect(tx.role.update).not.toHaveBeenCalled();
  });

  it.each(['OWNER', 'MEMBER', 'SYSTEM_CUSTOM'])(
    'rejects system role update for %s',
    async (key) => {
      const { service, tx } = makeService();
      tx.role.findFirst.mockResolvedValue(role({ key, isSystem: true }));

      await expect(
        service.updateOrganizationRole('org-1', 'role-1', { name: 'Blocked' }),
      ).rejects.toMatchObject({ code: 'ROLE_IS_SYSTEM', status: 409 });
      expect(tx.role.update).not.toHaveBeenCalled();
    },
  );

  it('returns ROLE_NOT_FOUND for cross-tenant or project role updates', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(null);

    await expect(
      service.updateOrganizationRole('org-1', 'role-from-other-scope', {
        name: 'Blocked',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND', status: 404 });
  });

  it('looks up role updates with ORGANIZATION scope so PROJECT roles are out of scope', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(null);

    await expect(
      service.updateOrganizationRole('org-1', 'project-role-1', {
        name: 'Blocked',
      }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND', status: 404 });
    const findFirstCall = getRoleFindFirstCall(tx.role.findFirst, 0);
    expect(findFirstCall.where.scope).toBe(RoleScope.ORGANIZATION);
  });

  it('deletes an unused custom role atomically and returns its representation', async () => {
    const { service, tx, serializableTransactionService } = makeService();
    tx.role.findFirst.mockResolvedValue(role());
    tx.membershipRole.count.mockResolvedValue(0);
    tx.role.delete.mockResolvedValue(role());

    await expect(
      service.deleteOrganizationRole('org-1', 'role-1'),
    ).resolves.toEqual({
      role: {
        id: 'role-1',
        key: 'security-reviewer',
        name: 'Security reviewer',
        description: 'Can inspect analysis and audit information.',
        scope: RoleScope.ORGANIZATION,
        isSystem: false,
        permissions: ['analysis.read', 'audit.read'],
      },
    });
    expect(serializableTransactionService.run).toHaveBeenCalledTimes(1);
    expect(tx.membershipRole.count).toHaveBeenCalledWith({
      where: { roleId: 'role-1' },
    });
    expect(tx.role.delete).toHaveBeenCalledWith({ where: { id: 'role-1' } });
  });

  it('rejects system role delete', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(role({ key: 'OWNER', isSystem: true }));

    await expect(
      service.deleteOrganizationRole('org-1', 'role-1'),
    ).rejects.toMatchObject({ code: 'ROLE_IS_SYSTEM', status: 409 });
    expect(tx.membershipRole.count).not.toHaveBeenCalled();
    expect(tx.role.delete).not.toHaveBeenCalled();
  });

  it('rejects in-use role delete without relying on cascade behavior', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(role());
    tx.membershipRole.count.mockResolvedValue(1);

    await expect(
      service.deleteOrganizationRole('org-1', 'role-1'),
    ).rejects.toMatchObject({ code: 'ROLE_IN_USE', status: 409 });
    expect(tx.role.delete).not.toHaveBeenCalled();
  });

  it('returns ROLE_NOT_FOUND for cross-tenant or project role deletes', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteOrganizationRole('org-1', 'role-from-other-scope'),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND', status: 404 });
  });

  it('looks up role deletes with ORGANIZATION scope so PROJECT roles are out of scope', async () => {
    const { service, tx } = makeService();
    tx.role.findFirst.mockResolvedValue(null);

    await expect(
      service.deleteOrganizationRole('org-1', 'project-role-1'),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND', status: 404 });
    const findFirstCall = getRoleFindFirstCall(tx.role.findFirst, 0);
    expect(findFirstCall.where.scope).toBe(RoleScope.ORGANIZATION);
  });

  it('replaces custom organization roles while preserving MEMBER', async () => {
    const { service, tx, serializableTransactionService } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(membership());
    tx.role.findMany.mockResolvedValue([{ id: 'role-b', isSystem: false }]);
    tx.organizationMembership.findFirstOrThrow.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-member', key: 'MEMBER', isSystem: true }),
          membershipRole({ id: 'role-b', key: 'ROLE_B', isSystem: false }),
        ],
      }),
    );

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-1', {
        roleIds: ['role-b'],
      }),
    ).resolves.toMatchObject({ member: { roles: ['MEMBER', 'ROLE_B'] } });
    expect(serializableTransactionService.run).toHaveBeenCalledTimes(1);
    expect(tx.membershipRole.deleteMany).toHaveBeenCalledWith({
      where: {
        membershipId: 'membership-1',
        roleId: { in: ['role-a'] },
      },
    });
    expect(tx.membershipRole.createMany).toHaveBeenCalledWith({
      data: [{ membershipId: 'membership-1', roleId: 'role-b' }],
    });
  });

  it('removes all managed custom organization roles when roleIds is empty and preserves system roles', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(membership());
    tx.organizationMembership.findFirstOrThrow.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-member', key: 'MEMBER', isSystem: true }),
        ],
      }),
    );

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-1', { roleIds: [] }),
    ).resolves.toMatchObject({ member: { roles: ['MEMBER'] } });
    expect(tx.role.findMany).not.toHaveBeenCalled();
    expect(tx.membershipRole.deleteMany).toHaveBeenCalledWith({
      where: {
        membershipId: 'membership-1',
        roleId: { in: ['role-a'] },
      },
    });
    expect(tx.membershipRole.createMany).not.toHaveBeenCalled();
  });

  it('preserves OWNER and MEMBER while replacing custom roles', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-owner', key: 'OWNER', isSystem: true }),
          membershipRole({ id: 'role-member', key: 'MEMBER', isSystem: true }),
          membershipRole({ id: 'role-a', key: 'ROLE_A', isSystem: false }),
        ],
      }),
    );
    tx.role.findMany.mockResolvedValue([{ id: 'role-b', isSystem: false }]);
    tx.organizationMembership.findFirstOrThrow.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-owner', key: 'OWNER', isSystem: true }),
          membershipRole({ id: 'role-member', key: 'MEMBER', isSystem: true }),
          membershipRole({ id: 'role-b', key: 'ROLE_B', isSystem: false }),
        ],
      }),
    );

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-1', {
        roleIds: ['role-b'],
      }),
    ).resolves.toMatchObject({
      member: { roles: ['OWNER', 'MEMBER', 'ROLE_B'] },
    });
  });

  it('does not invent MEMBER when the membership does not already have it', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-a', key: 'ROLE_A', isSystem: false }),
        ],
      }),
    );
    tx.role.findMany.mockResolvedValue([{ id: 'role-b', isSystem: false }]);
    tx.organizationMembership.findFirstOrThrow.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-b', key: 'ROLE_B', isSystem: false }),
        ],
      }),
    );

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-1', {
        roleIds: ['role-b'],
      }),
    ).resolves.toMatchObject({ member: { roles: ['ROLE_B'] } });
  });

  it.each(['OWNER', 'MEMBER', 'SYSTEM_CUSTOM'])(
    'rejects system role replacement input for %s without changing assignments',
    async (key) => {
      const { service, tx } = makeService();
      tx.organizationMembership.findFirst.mockResolvedValue(membership());
      tx.role.findMany.mockResolvedValue([
        { id: 'system-role', key, isSystem: true },
      ]);

      await expect(
        service.replaceMembershipRoles('org-1', 'membership-1', {
          roleIds: ['system-role'],
        }),
      ).rejects.toMatchObject({ code: 'ROLE_IS_SYSTEM', status: 409 });
      expect(tx.membershipRole.deleteMany).not.toHaveBeenCalled();
      expect(tx.membershipRole.createMany).not.toHaveBeenCalled();
    },
  );

  it('returns MEMBERSHIP_NOT_FOUND for cross-tenant or removed memberships', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-other', {
        roleIds: [],
      }),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND', status: 404 });
    const findFirstCall = getMembershipFindFirstCall(
      tx.organizationMembership.findFirst,
      0,
    );
    expect(findFirstCall.where).toEqual({
      id: 'membership-other',
      organizationId: 'org-1',
      status: { not: MembershipStatus.REMOVED },
    });
  });

  it('returns ROLE_NOT_FOUND for cross-tenant, PROJECT or missing role replacement input without changes', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(membership());
    tx.role.findMany.mockResolvedValue([]);

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-1', {
        roleIds: ['bad-role'],
      }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND', status: 404 });
    expect(tx.role.findMany).toHaveBeenCalledWith({
      where: {
        id: { in: ['bad-role'] },
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
      },
      select: { id: true, isSystem: true },
    });
    expect(tx.membershipRole.deleteMany).not.toHaveBeenCalled();
    expect(tx.membershipRole.createMany).not.toHaveBeenCalled();
  });

  it('rejects duplicate roleIds before opening a transaction', async () => {
    const { service, serializableTransactionService } = makeService();

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-1', {
        roleIds: ['role-a', 'role-a'],
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION_ERROR', status: 400 });
    expect(serializableTransactionService.run).not.toHaveBeenCalled();
  });

  it('validates all replacement role IDs before mutating assignments', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(membership());
    tx.role.findMany.mockResolvedValue([{ id: 'role-b', isSystem: false }]);

    await expect(
      service.replaceMembershipRoles('org-1', 'membership-1', {
        roleIds: ['role-b', 'missing-role'],
      }),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND', status: 404 });
    expect(tx.membershipRole.deleteMany).not.toHaveBeenCalled();
    expect(tx.membershipRole.createMany).not.toHaveBeenCalled();
  });

  it('does not touch custom roles outside the active tenant managed subset', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-member', key: 'MEMBER', isSystem: true }),
          membershipRole({ id: 'role-a', key: 'ROLE_A', isSystem: false }),
          membershipRole({
            id: 'foreign-custom-role',
            organizationId: 'org-2',
            key: 'FOREIGN_CUSTOM',
            isSystem: false,
          }),
        ],
      }),
    );
    tx.organizationMembership.findFirstOrThrow.mockResolvedValue(
      membership({
        roles: [
          membershipRole({ id: 'role-member', key: 'MEMBER', isSystem: true }),
          membershipRole({
            id: 'foreign-custom-role',
            organizationId: 'org-2',
            key: 'FOREIGN_CUSTOM',
            isSystem: false,
          }),
        ],
      }),
    );

    await service.replaceMembershipRoles('org-1', 'membership-1', {
      roleIds: [],
    });

    expect(tx.membershipRole.deleteMany).toHaveBeenCalledWith({
      where: {
        membershipId: 'membership-1',
        roleId: { in: ['role-a'] },
      },
    });
  });

  it('does not treat unrelated P2002 constraints as role key collisions', async () => {
    const { service, prisma, tx } = makeService();
    const unrelatedP2002 = new Prisma.PrismaClientKnownRequestError(
      'Unique constraint failed',
      {
        code: 'P2002',
        clientVersion: 'test',
        meta: { target: ['email'] },
      },
    );
    prisma.role.findFirst.mockResolvedValue(null);
    tx.role.create.mockRejectedValue(unrelatedP2002);

    await expect(
      service.createOrganizationRole('org-1', {
        name: 'Security reviewer',
        permissionKeys: [],
      }),
    ).rejects.toBe(unrelatedP2002);
    expect(tx.role.create).toHaveBeenCalledTimes(1);
  });
});
