/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return */
import { ProjectStatus } from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  it('creates a normalized project key with creator access in one transaction', async () => {
    const tx = {
      project: {
        create: jest.fn().mockResolvedValue({ id: 'project-1', key: 'CORE' }),
      },
      role: { upsert: jest.fn().mockResolvedValue({ id: 'creator-role' }) },
      permission: {
        findMany: jest
          .fn()
          .mockResolvedValue([
            { id: 'read' },
            { id: 'manage' },
            { id: 'delete' },
          ]),
      },
      rolePermission: { deleteMany: jest.fn(), upsert: jest.fn() },
      projectAccess: { create: jest.fn() },
    };
    const transactions = { run: jest.fn((callback) => callback(tx)) };
    const authorization = {
      requireOrganization: jest
        .fn()
        .mockResolvedValue({ membershipId: 'member-1' }),
    };
    const service = new ProjectsService(
      {} as any,
      transactions as any,
      authorization as any,
    );

    await expect(
      service.create('user-1', 'org-1', { key: ' core ', name: 'Core' }),
    ).resolves.toMatchObject({ key: 'CORE' });
    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          organizationId: 'org-1',
          createdByUserId: 'user-1',
          key: 'CORE',
          status: ProjectStatus.DRAFT,
        }),
      }),
    );
    expect(tx.projectAccess.create).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        membershipId: 'member-1',
        roleId: 'creator-role',
      },
    });
  });

  it('rejects skipped lifecycle transitions and repeated archive without updating', async () => {
    const prisma = {
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'project-1',
          status: ProjectStatus.ARCHIVED,
          archivedAt: new Date(),
        }),
      },
    };
    const service = new ProjectsService(
      prisma as any,
      {} as any,
      { requireProject: jest.fn() } as any,
    );

    await expect(
      service.updateStatus(
        'user-1',
        'org-1',
        'project-1',
        ProjectStatus.PLANNING,
      ),
    ).rejects.toMatchObject({ code: 'PROJECT_STATUS_TRANSITION_INVALID' });
    await expect(
      service.archive('user-1', 'org-1', 'project-1'),
    ).rejects.toMatchObject({ code: 'PROJECT_ALREADY_ARCHIVED' });
  });

  it('allows manage-only access to update metadata without requiring read access', async () => {
    const update = jest
      .fn()
      .mockResolvedValue({ id: 'project-1', name: 'Renamed' });
    const requireProject = jest
      .fn()
      .mockImplementation(
        (_userId, _organizationId, _projectId, permission) => {
          if (permission === 'projects.read') {
            throw new Error('read must not be required for metadata updates');
          }
        },
      );
    const service = new ProjectsService(
      {
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'project-1',
            status: ProjectStatus.DRAFT,
          }),
          update,
        },
      } as any,
      {} as any,
      { requireProject } as any,
    );

    await expect(
      service.update('user-1', 'org-1', 'project-1', { name: 'Renamed' }),
    ).resolves.toMatchObject({ name: 'Renamed' });
    expect(requireProject).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'project-1',
      'projects.manage',
    );
  });

  it('limits restricted listings to active same-tenant PROJECT roles that grant read', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new ProjectsService(
      { project: { findMany } } as any,
      {} as any,
      {
        requireOrganization: jest
          .fn()
          .mockRejectedValue(
            new AuthError(
              'PROJECT_ACCESS_DENIED',
              403,
              'Project access denied',
            ),
          ),
      } as any,
    );

    await service.list('user-1', 'org-1', false);

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          accesses: {
            some: expect.objectContaining({
              role: expect.objectContaining({
                organizationId: 'org-1',
                scope: 'PROJECT',
                permissions: {
                  some: { permission: { key: 'projects.read' } },
                },
              }),
            }),
          },
        }),
      }),
    );
  });

  it('propagates unexpected authorization resolver errors instead of treating them as restricted access', async () => {
    const findMany = jest.fn();
    const service = new ProjectsService(
      { project: { findMany } } as any,
      {} as any,
      {
        requireOrganization: jest
          .fn()
          .mockRejectedValue(new Error('database unavailable')),
      } as any,
    );

    await expect(service.list('user-1', 'org-1', false)).rejects.toThrow(
      'database unavailable',
    );
    expect(findMany).not.toHaveBeenCalled();
  });
});
