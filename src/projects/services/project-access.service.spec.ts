import { ProjectAccessService } from './project-access.service';
import { MembershipStatus, RoleScope } from '../../generated/prisma/client';

describe('ProjectAccessService', () => {
  it('rejects a foreign or inactive membership before changing project access', async () => {
    const prisma = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }) },
      organizationMembership: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'member-2',
          organizationId: 'org-1',
          status: MembershipStatus.INVITED,
        }),
      },
      role: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'role-1',
          organizationId: 'org-1',
          scope: RoleScope.PROJECT,
        }),
      },
    };
    const service = new ProjectAccessService(
      prisma as any,
      {
        requireOrganization: jest
          .fn()
          .mockResolvedValue({ permissions: ['members.manage'] }),
      } as any,
    );
    await expect(
      service.put('user-1', 'org-1', 'project-1', 'member-2', 'role-1'),
    ).rejects.toMatchObject({ code: 'PROJECT_ACCESS_INVALID' });
  });

  it('makes delete repeatable', async () => {
    const deleted = jest.fn().mockResolvedValue({ count: 0 });
    const service = new ProjectAccessService(
      {
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
        },
        projectAccess: { deleteMany: deleted },
      } as any,
      {
        requireOrganization: jest
          .fn()
          .mockResolvedValue({ permissions: ['members.manage'] }),
      } as any,
    );
    await expect(
      service.delete('user-1', 'org-1', 'project-1', 'member-2'),
    ).resolves.toBeUndefined();
    expect(deleted).toHaveBeenCalledWith({
      where: { projectId: 'project-1', membershipId: 'member-2' },
    });
  });

  it('does not disclose or accept a missing membership while assigning access', async () => {
    const upsert = jest.fn();
    const service = new ProjectAccessService(
      {
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
        },
        organizationMembership: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        role: { findFirst: jest.fn().mockResolvedValue({ id: 'role-1' }) },
        projectAccess: { upsert },
      } as any,
      { requireOrganization: jest.fn().mockResolvedValue(undefined) } as any,
    );

    await expect(
      service.put('user-1', 'org-1', 'project-1', 'member-2', 'role-1'),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('does not disclose or accept a missing project role while assigning access', async () => {
    const upsert = jest.fn();
    const service = new ProjectAccessService(
      {
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
        },
        organizationMembership: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'member-2',
            organizationId: 'org-1',
            status: MembershipStatus.ACTIVE,
          }),
        },
        role: { findFirst: jest.fn().mockResolvedValue(null) },
        projectAccess: { upsert },
      } as any,
      { requireOrganization: jest.fn().mockResolvedValue(undefined) } as any,
    );

    await expect(
      service.put('user-1', 'org-1', 'project-1', 'member-2', 'role-1'),
    ).rejects.toMatchObject({ code: 'ROLE_NOT_FOUND' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('rejects assigning a role whose permissions exceed the caller organization delegation', async () => {
    const upsert = jest.fn();
    const service = new ProjectAccessService(
      {
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
        },
        organizationMembership: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'member-2',
            organizationId: 'org-1',
            status: MembershipStatus.ACTIVE,
          }),
        },
        role: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'role-1',
            organizationId: 'org-1',
            scope: RoleScope.PROJECT,
            permissions: [{ permission: { key: 'projects.delete' } }],
          }),
        },
        projectAccess: { upsert },
      } as any,
      {
        requireOrganization: jest.fn().mockResolvedValue({
          permissions: ['members.manage', 'projects.read'],
        }),
      } as any,
    );

    await expect(
      service.put('user-1', 'org-1', 'project-1', 'member-2', 'role-1'),
    ).rejects.toMatchObject({ code: 'PROJECT_ACCESS_INVALID' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('returns project not found before checking administration permission', async () => {
    const service = new ProjectAccessService(
      { project: { findFirst: jest.fn().mockResolvedValue(null) } } as any,
      {
        requireOrganization: jest.fn().mockRejectedValue({
          code: 'PROJECT_ACCESS_DENIED',
        }),
      } as any,
    );

    await expect(
      service.list('user-1', 'org-1', 'foreign-project'),
    ).rejects.toMatchObject({ code: 'PROJECT_NOT_FOUND' });
  });

  it('revalidates administration inside the serializable access-write transaction', async () => {
    const tx = {
      project: { findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }) },
      projectAccess: { deleteMany: jest.fn().mockResolvedValue({ count: 1 }) },
    };
    const run = jest.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );
    const requireOrganization = jest.fn().mockResolvedValue({
      permissions: ['members.manage'],
    });
    const service = new ProjectAccessService(
      {} as any,
      { requireOrganization } as any,
      { run } as any,
    );

    await expect(
      service.delete('user-1', 'org-1', 'project-1', 'member-2'),
    ).resolves.toBeUndefined();
    expect(run).toHaveBeenCalledTimes(1);
    expect(requireOrganization).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'members.manage',
      tx,
    );
  });
});
