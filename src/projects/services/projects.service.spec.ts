import { Prisma, ProjectStatus } from '../../generated/prisma/client';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mock } from '../testing/mock';
import { ProjectAuthorizationService } from './project-authorization.service';
import { ProjectsService } from './projects.service';

describe('ProjectsService', () => {
  function transaction(
    tx: Prisma.TransactionClient,
  ): SerializableTransactionService {
    return mock<SerializableTransactionService>({
      run: jest.fn(
        (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
          callback(tx),
      ),
    });
  }

  it('authorizes and bootstraps creator access inside one transaction', async () => {
    const createAccess = jest.fn();
    const tx = mock<Prisma.TransactionClient>({
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
      projectAccess: { create: createAccess },
    });
    const requireOrganization = jest
      .fn()
      .mockResolvedValue({ membershipId: 'member-1' });
    const service = new ProjectsService(
      mock<PrismaService>({}),
      transaction(tx),
      mock<ProjectAuthorizationService>({ requireOrganization }),
    );

    await service.create('user-1', 'org-1', { key: ' core ', name: 'Core' });

    expect(requireOrganization).toHaveBeenCalledWith(
      'user-1',
      'org-1',
      'projects.create',
      tx,
    );
    expect(createAccess).toHaveBeenCalledWith({
      data: {
        projectId: 'project-1',
        membershipId: 'member-1',
        roleId: 'creator-role',
      },
    });
  });

  it.each([
    ['update', 'projects.manage'],
    ['updateStatus', 'projects.manage'],
    ['archive', 'projects.delete'],
  ] as const)(
    're-evaluates %s state and authorization through its transaction',
    async (method, permission) => {
      const update = jest.fn().mockResolvedValue({ id: 'project-1' });
      const tx = mock<Prisma.TransactionClient>({
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'project-1',
            status: ProjectStatus.DRAFT,
            archivedAt: null,
          }),
          update,
        },
        projectAccess: { findFirst: jest.fn().mockResolvedValue(null) },
      });
      const requireProject = jest.fn().mockResolvedValue(undefined);
      const service = new ProjectsService(
        mock<PrismaService>({}),
        transaction(tx),
        mock<ProjectAuthorizationService>({ requireProject }),
      );

      if (method === 'update')
        await service.update('user-1', 'org-1', 'project-1', {
          name: 'Renamed',
        });
      if (method === 'updateStatus')
        await service.updateStatus(
          'user-1',
          'org-1',
          'project-1',
          ProjectStatus.DISCOVERY,
        );
      if (method === 'archive')
        await service.archive('user-1', 'org-1', 'project-1');

      expect(requireProject).toHaveBeenCalledWith(
        'user-1',
        'org-1',
        'project-1',
        permission,
        tx,
      );
      expect(update).toHaveBeenCalledTimes(1);
    },
  );

  it('returns PROJECT_ALREADY_ARCHIVED before evaluating a workflow transition', async () => {
    const update = jest.fn();
    const requireProject = jest.fn();
    const tx = mock<Prisma.TransactionClient>({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'project-1',
          status: ProjectStatus.ARCHIVED,
          archivedAt: new Date(),
        }),
        update,
      },
    });
    const service = new ProjectsService(
      mock<PrismaService>({}),
      transaction(tx),
      mock<ProjectAuthorizationService>({ requireProject }),
    );

    await expect(
      service.updateStatus(
        'user-1',
        'org-1',
        'project-1',
        ProjectStatus.COMPLETED,
      ),
    ).rejects.toMatchObject({ code: 'PROJECT_ALREADY_ARCHIVED' });
    expect(requireProject).not.toHaveBeenCalled();
    expect(update).not.toHaveBeenCalled();
  });
});
