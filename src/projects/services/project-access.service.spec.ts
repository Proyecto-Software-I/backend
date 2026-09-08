import { MembershipStatus, RoleScope } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { mock } from '../testing/mock';
import { ProjectAccessService } from './project-access.service';
import { ProjectAuthorizationService } from './project-authorization.service';

describe('ProjectAccessService', () => {
  it('lists only active same-tenant PROJECT access relations', async () => {
    const findMany = jest.fn().mockResolvedValue([]);
    const service = new ProjectAccessService(
      mock<PrismaService>({
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
        },
        projectAccess: { findMany },
      }),
      mock<ProjectAuthorizationService>({
        requireOrganization: jest
          .fn()
          .mockResolvedValue({ permissions: ['members.manage'] }),
      }),
    );

    await service.list('user-1', 'org-1', 'project-1');

    expect(findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          projectId: 'project-1',
          project: { organizationId: 'org-1', deletedAt: null },
          membership: {
            organizationId: 'org-1',
            status: MembershipStatus.ACTIVE,
          },
          role: { organizationId: 'org-1', scope: RoleScope.PROJECT },
        },
      }),
    );
  });

  it('rejects an inactive membership before changing project access', async () => {
    const upsert = jest.fn();
    const service = new ProjectAccessService(
      mock<PrismaService>({
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
        },
        organizationMembership: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'member-2',
            status: MembershipStatus.INVITED,
          }),
        },
        role: {
          findFirst: jest.fn().mockResolvedValue({
            id: 'role-1',
            scope: RoleScope.PROJECT,
            permissions: [],
          }),
        },
        projectAccess: { upsert },
      }),
      mock<ProjectAuthorizationService>({
        requireOrganization: jest
          .fn()
          .mockResolvedValue({ permissions: ['members.manage'] }),
      }),
    );
    await expect(
      service.put('user-1', 'org-1', 'project-1', 'member-2', 'role-1'),
    ).rejects.toMatchObject({ code: 'PROJECT_ACCESS_INVALID' });
    expect(upsert).not.toHaveBeenCalled();
  });

  it('revokes same-tenant access even when the membership is inactive', async () => {
    const deleted = jest.fn().mockResolvedValue({ count: 1 });
    const service = new ProjectAccessService(
      mock<PrismaService>({
        project: {
          findFirst: jest.fn().mockResolvedValue({ id: 'project-1' }),
        },
        projectAccess: { deleteMany: deleted },
      }),
      mock<ProjectAuthorizationService>({
        requireOrganization: jest
          .fn()
          .mockResolvedValue({ permissions: ['members.manage'] }),
      }),
    );
    await expect(
      service.delete('user-1', 'org-1', 'project-1', 'member-2'),
    ).resolves.toBeUndefined();
    expect(deleted).toHaveBeenCalledWith({
      where: {
        projectId: 'project-1',
        membershipId: 'member-2',
        project: { organizationId: 'org-1', deletedAt: null },
        membership: { organizationId: 'org-1' },
        role: { organizationId: 'org-1', scope: RoleScope.PROJECT },
      },
    });
  });
});
