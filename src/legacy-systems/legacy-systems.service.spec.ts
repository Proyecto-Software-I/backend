import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAuthorizationService } from '../projects/services/project-authorization.service';
import { mock } from '../projects/testing/mock';
import { LegacySystemsService } from './legacy-systems.service';

const project = { id: 'project-1' };
const system = { id: 'system-1', projectId: 'project-1' };

describe('LegacySystemsService', () => {
  const authorization = (permissions: string[]) =>
    mock<ProjectAuthorizationService>({
      permissionsFor: jest.fn().mockResolvedValue(new Set(permissions)),
    });

  it('requires projects.read before systems permissions', async () => {
    const findFirst = jest.fn().mockResolvedValue(project);
    const service = new LegacySystemsService(
      mock<PrismaService>({ project: { findFirst } }),
      authorization(['systems.read']),
    );

    await expect(
      service.list('user-1', 'org-1', 'project-1'),
    ).rejects.toMatchObject({ code: 'PROJECT_ACCESS_DENIED' });
    expect(findFirst).toHaveBeenCalledWith({
      where: { id: 'project-1', organizationId: 'org-1', deletedAt: null },
    });
  });

  it('requires an operation-specific system permission after project access', async () => {
    const service = new LegacySystemsService(
      mock<PrismaService>({
        project: { findFirst: jest.fn().mockResolvedValue(project) },
      }),
      authorization(['projects.read']),
    );

    await expect(
      service.list('user-1', 'org-1', 'project-1'),
    ).rejects.toMatchObject({ code: 'SYSTEM_ACCESS_DENIED' });
  });

  it('scopes a system lookup to its already-authorized project', async () => {
    const findFirst = jest
      .fn()
      .mockResolvedValueOnce(project)
      .mockResolvedValueOnce(null);
    const service = new LegacySystemsService(
      mock<PrismaService>({
        project: { findFirst },
        legacySystem: { findFirst },
      }),
      authorization(['projects.read', 'systems.read']),
    );

    await expect(
      service.find('user-1', 'org-1', 'project-1', 'foreign-system'),
    ).rejects.toMatchObject({ code: 'SYSTEM_NOT_FOUND' });
    expect(findFirst).toHaveBeenLastCalledWith({
      where: { id: 'foreign-system', projectId: 'project-1', deletedAt: null },
    });
  });

  it('maps unique create conflicts without a deletedAt qualification', async () => {
    const duplicate = new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
    });
    const create = jest.fn().mockRejectedValue(duplicate);
    const service = new LegacySystemsService(
      mock<PrismaService>({
        project: { findFirst: jest.fn().mockResolvedValue(project) },
        legacySystem: { create },
      }),
      authorization(['projects.read', 'systems.manage']),
    );

    await expect(
      service.create('user-1', 'org-1', 'project-1', {
        code: 'CORE',
        name: 'Core',
        criticality: 'HIGH',
      }),
    ).rejects.toMatchObject({ code: 'SYSTEM_ALREADY_EXISTS' });
  });

  it('orders project-local non-deleted systems deterministically', async () => {
    const findMany = jest.fn().mockResolvedValue([system]);
    const service = new LegacySystemsService(
      mock<PrismaService>({
        project: { findFirst: jest.fn().mockResolvedValue(project) },
        legacySystem: { findMany },
      }),
      authorization(['projects.read', 'systems.read']),
    );

    await expect(service.list('user-1', 'org-1', 'project-1')).resolves.toEqual(
      [system],
    );
    expect(findMany).toHaveBeenCalledWith({
      where: { projectId: 'project-1', deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  });
});
