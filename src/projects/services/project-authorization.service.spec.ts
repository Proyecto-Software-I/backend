/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { MembershipStatus, RoleScope } from '../../generated/prisma/client';
import { ProjectAuthorizationService } from './project-authorization.service';

describe('ProjectAuthorizationService', () => {
  it('unions organization and same-tenant project permissions', async () => {
    const resolver = {
      resolve: jest.fn().mockResolvedValue({
        membershipId: 'member-1',
        permissions: ['projects.read'],
      }),
    };
    const prisma = {
      projectAccess: {
        findFirst: jest.fn().mockResolvedValue({
          role: { permissions: [{ permission: { key: 'projects.manage' } }] },
        }),
      },
    };
    const service = new ProjectAuthorizationService(
      prisma as any,
      resolver as any,
    );

    await expect(
      service.permissionsFor('user-1', 'org-1', 'project-1'),
    ).resolves.toEqual(new Set(['projects.read', 'projects.manage']));
    expect(prisma.projectAccess.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          projectId: 'project-1',
          membershipId: 'member-1',
          project: { organizationId: 'org-1', deletedAt: null },
          membership: {
            organizationId: 'org-1',
            status: MembershipStatus.ACTIVE,
          },
          role: { organizationId: 'org-1', scope: RoleScope.PROJECT },
        }),
      }),
    );
  });

  it('does not allow project-derived permissions to authorize organization actions', async () => {
    const service = new ProjectAuthorizationService(
      { projectAccess: { findFirst: jest.fn() } } as any,
      {
        resolve: jest
          .fn()
          .mockResolvedValue({ permissions: ['projects.read'] }),
      } as any,
    );

    await expect(
      service.requireOrganization('user-1', 'org-1', 'projects.create'),
    ).rejects.toMatchObject({
      code: 'PROJECT_ACCESS_DENIED',
    });
  });
});
