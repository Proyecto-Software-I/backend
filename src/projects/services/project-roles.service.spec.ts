import { Prisma } from '../../generated/prisma/client';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import { mock } from '../testing/mock';
import { ProjectAuthorizationService } from './project-authorization.service';
import { ProjectRolesService } from './project-roles.service';

describe('ProjectRolesService', () => {
  const authorization = (permissions: string[]) =>
    mock<ProjectAuthorizationService>({
      requireOrganization: jest.fn().mockResolvedValue({ permissions }),
    });

  it('returns PROJECT_ROLE_INVALID for duplicate permissions', async () => {
    const service = new ProjectRolesService(
      mock<PrismaService>({}),
      authorization(['members.manage', 'projects.read']),
    );
    await expect(
      service.create('user-1', 'org-1', {
        name: 'Reader',
        permissionKeys: ['projects.read', 'projects.read'],
      }),
    ).rejects.toMatchObject({ code: 'PROJECT_ROLE_INVALID' });
  });

  it('maps deterministic key collisions to a stable functional outcome', async () => {
    const collision = new Prisma.PrismaClientKnownRequestError('unique', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const transactions = mock<SerializableTransactionService>({
      run: jest.fn(() => Promise.reject(collision)),
    });
    const service = new ProjectRolesService(
      mock<PrismaService>({}),
      authorization(['members.manage']),
      transactions,
    );
    await expect(
      service.create('user-1', 'org-1', { name: 'Reader', permissionKeys: [] }),
    ).rejects.toMatchObject({ code: 'PROJECT_ROLE_ALREADY_EXISTS' });
  });

  it.each(['   ', '!!!'])(
    'rejects a role name that normalizes to an empty key: %p',
    async (name) => {
      const create = jest.fn();
      const tx = mock<Prisma.TransactionClient>({
        role: { create },
      });
      const service = new ProjectRolesService(
        mock<PrismaService>({}),
        authorization(['members.manage']),
        mock<SerializableTransactionService>({
          run: jest.fn(
            (
              callback: (client: Prisma.TransactionClient) => Promise<unknown>,
            ) => callback(tx),
          ),
        }),
      );

      await expect(
        service.create('user-1', 'org-1', { name, permissionKeys: [] }),
      ).rejects.toMatchObject({ code: 'PROJECT_ROLE_INVALID' });
      expect(create).not.toHaveBeenCalled();
    },
  );

  it('preserves empty permission arrays', async () => {
    const tx = mock<Prisma.TransactionClient>({
      role: { create: jest.fn().mockResolvedValue({ id: 'role-1' }) },
      permission: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const service = new ProjectRolesService(
      mock<PrismaService>({}),
      authorization(['members.manage']),
      mock<SerializableTransactionService>({
        run: jest.fn(
          (callback: (client: Prisma.TransactionClient) => Promise<unknown>) =>
            callback(tx),
        ),
      }),
    );
    await expect(
      service.create('user-1', 'org-1', {
        name: 'Empty role',
        permissionKeys: [],
      }),
    ).resolves.toMatchObject({ id: 'role-1' });
  });
});
