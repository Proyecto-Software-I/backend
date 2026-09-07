import { ProjectRolesService } from './project-roles.service';

describe('ProjectRolesService', () => {
  it('rejects delegated permissions outside the project allowlist', async () => {
    const service = new ProjectRolesService(
      {} as any,
      {
        requireOrganization: jest.fn().mockResolvedValue({
          permissions: ['members.manage', 'projects.read'],
        }),
      } as any,
    );
    await expect(
      service.create('user-1', 'org-1', {
        name: 'Creator',
        permissionKeys: ['projects.create'],
      }),
    ).rejects.toMatchObject({ code: 'PROJECT_ROLE_INVALID' });
  });

  it('does not delete protected system roles', async () => {
    const service = new ProjectRolesService(
      {
        role: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'role-1', isSystem: true }),
        },
      } as any,
      { requireOrganization: jest.fn() } as any,
    );
    await expect(
      service.delete('user-1', 'org-1', 'role-1'),
    ).rejects.toMatchObject({ code: 'ROLE_IS_SYSTEM' });
  });

  it('rejects deletion when a project role still has defensive membership references', async () => {
    const projectAccess = jest.fn().mockResolvedValue(0);
    const membershipRole = jest.fn().mockResolvedValue(1);
    const service = new ProjectRolesService(
      {
        role: {
          findFirst: jest
            .fn()
            .mockResolvedValue({ id: 'role-1', isSystem: false }),
        },
        projectAccess: { count: projectAccess },
        membershipRole: { count: membershipRole },
        rolePermission: { deleteMany: jest.fn() },
      } as any,
      { requireOrganization: jest.fn() } as any,
    );

    await expect(
      service.delete('user-1', 'org-1', 'role-1'),
    ).rejects.toMatchObject({ code: 'ROLE_IN_USE' });
    expect(projectAccess).toHaveBeenCalledWith({ where: { roleId: 'role-1' } });
    expect(membershipRole).toHaveBeenCalledWith({
      where: { roleId: 'role-1' },
    });
  });

  it('revalidates organization administration inside the serializable role-write transaction', async () => {
    const tx = {
      role: { create: jest.fn().mockResolvedValue({ id: 'role-1' }) },
      permission: { findMany: jest.fn().mockResolvedValue([]) },
    };
    const run = jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    const requireOrganization = jest.fn().mockResolvedValue({
      permissions: ['members.manage'],
    });
    const service = new ProjectRolesService(
      {} as any,
      { requireOrganization } as any,
      { run } as any,
    );

    await expect(
      service.create('user-1', 'org-1', {
        name: 'Empty project role',
        permissionKeys: [],
      }),
    ).resolves.toEqual({ id: 'role-1' });
    expect(run).toHaveBeenCalledTimes(1);
    expect(requireOrganization).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'members.manage',
      tx,
    );
  });
});
