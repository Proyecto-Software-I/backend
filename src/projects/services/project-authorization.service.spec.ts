import { PrismaService } from '../../prisma/prisma.service';
import { OrganizationPermissionResolver } from '../../access-control/services/organization-permission-resolver.service';
import { mock } from '../testing/mock';
import { ProjectAuthorizationService } from './project-authorization.service';

describe('ProjectAuthorizationService', () => {
  it('filters persisted malformed cross-tenant ProjectAccess records', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const service = new ProjectAuthorizationService(
      mock<PrismaService>({ projectAccess: { findFirst } }),
      mock<OrganizationPermissionResolver>({
        resolve: jest
          .fn()
          .mockResolvedValue({ membershipId: 'member-1', permissions: [] }),
      }),
    );
    await expect(
      service.permissionsFor('user-1', 'org-1', 'project-1'),
    ).resolves.toEqual(new Set());
    expect(findFirst).toHaveBeenCalledTimes(1);
  });
});
