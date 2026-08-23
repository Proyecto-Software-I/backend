/* eslint-disable @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-argument */
import { RoleScope } from '../../generated/prisma/client';
import { OrganizationRolesService } from './organization-roles.service';

function makeTx() {
  return {
    role: {
      upsert: jest.fn(({ create }) => ({
        id: `role-${create.key}`,
        ...create,
      })),
    },
    permission: {
      findMany: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      upsert: jest.fn(),
    },
    membershipRole: {
      upsert: jest.fn(),
    },
  };
}

function expectMemberRoleUpsert(tx: ReturnType<typeof makeTx>) {
  expect(tx.role.upsert).toHaveBeenCalledWith({
    where: {
      organizationId_scope_key: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
        key: 'MEMBER',
      },
    },
    update: {
      name: 'Member',
      isSystem: true,
    },
    create: {
      organizationId: 'org-1',
      scope: RoleScope.ORGANIZATION,
      key: 'MEMBER',
      name: 'Member',
      isSystem: true,
    },
  });
}

function expectMemberPermissionAssignments(tx: ReturnType<typeof makeTx>) {
  expect(tx.rolePermission.upsert).toHaveBeenCalledWith({
    where: {
      roleId_permissionId: {
        roleId: 'role-MEMBER',
        permissionId: 'permission-organization-read',
      },
    },
    update: {},
    create: {
      roleId: 'role-MEMBER',
      permissionId: 'permission-organization-read',
    },
  });
  expect(tx.rolePermission.upsert).toHaveBeenCalledWith({
    where: {
      roleId_permissionId: {
        roleId: 'role-MEMBER',
        permissionId: 'permission-members-read',
      },
    },
    update: {},
    create: {
      roleId: 'role-MEMBER',
      permissionId: 'permission-members-read',
    },
  });
  expect(JSON.stringify(tx.rolePermission.upsert.mock.calls)).not.toContain(
    'members.manage',
  );
  expect(JSON.stringify(tx.rolePermission.upsert.mock.calls)).not.toContain(
    'permission-members-manage',
  );
}

describe('OrganizationRolesService', () => {
  it('creates MEMBER with organization.read and members.read only', async () => {
    const service = new OrganizationRolesService();
    const tx = makeTx();
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-organization-read', key: 'organization.read' },
      { id: 'permission-members-read', key: 'members.read' },
    ]);

    const role = await service.ensureMemberRole(tx as any, 'org-1');

    expect(role).toMatchObject({
      organizationId: 'org-1',
      scope: RoleScope.ORGANIZATION,
      key: 'MEMBER',
      name: 'Member',
      isSystem: true,
    });
    expect(tx.permission.findMany).toHaveBeenCalledWith({
      where: { key: { in: ['organization.read', 'members.read'] } },
    });
    expectMemberRoleUpsert(tx);
    expect(tx.rolePermission.deleteMany).toHaveBeenCalledWith({
      where: {
        roleId: 'role-MEMBER',
        permissionId: {
          notIn: ['permission-organization-read', 'permission-members-read'],
        },
      },
    });
    expect(tx.rolePermission.upsert).toHaveBeenCalledTimes(2);
    expectMemberPermissionAssignments(tx);
  });

  it('is idempotent for MEMBER provisioning', async () => {
    const service = new OrganizationRolesService();
    const tx = makeTx();
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-organization-read', key: 'organization.read' },
      { id: 'permission-members-read', key: 'members.read' },
    ]);

    await service.ensureMemberRole(tx as any, 'org-1');
    await service.ensureMemberRole(tx as any, 'org-1');

    expect(tx.role.upsert).toHaveBeenCalledTimes(2);
    expectMemberRoleUpsert(tx);
    expect(tx.rolePermission.upsert).toHaveBeenCalledTimes(4);
    expectMemberPermissionAssignments(tx);
    expect(tx.rolePermission.upsert.mock.calls.slice(0, 2)).toEqual(
      tx.rolePermission.upsert.mock.calls.slice(2, 4),
    );
  });

  it('creates OWNER with all seeded permissions', async () => {
    const service = new OrganizationRolesService();
    const tx = makeTx();
    tx.permission.findMany.mockResolvedValue([
      { id: 'permission-1' },
      { id: 'permission-2' },
      { id: 'permission-3' },
    ]);

    const role = await service.ensureOwnerRole(tx as any, 'org-1');

    expect(role).toMatchObject({ key: 'OWNER', name: 'Owner' });
    expect(tx.rolePermission.upsert).toHaveBeenCalledTimes(3);
  });

  it('assigns roles to memberships with the provided transaction client', async () => {
    const service = new OrganizationRolesService();
    const tx = makeTx();

    await service.assignRoleToMembership(tx as any, 'membership-1', 'role-1');

    expect(tx.membershipRole.upsert).toHaveBeenCalledWith({
      where: {
        membershipId_roleId: {
          membershipId: 'membership-1',
          roleId: 'role-1',
        },
      },
      update: {},
      create: { membershipId: 'membership-1', roleId: 'role-1' },
    });
  });
});
