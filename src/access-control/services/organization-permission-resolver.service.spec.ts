import { MembershipStatus, RoleScope } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { OrganizationPermissionResolver } from './organization-permission-resolver.service';

function makeResolver(membership: unknown) {
  const findFirst = jest.fn().mockResolvedValue(membership);
  const prisma = {
    organizationMembership: { findFirst },
  } as unknown as PrismaService;

  return { resolver: new OrganizationPermissionResolver(prisma), findFirst };
}

describe('OrganizationPermissionResolver', () => {
  it('resolves fresh organization-scoped permissions for the active membership', async () => {
    const { resolver, findFirst } = makeResolver({
      id: 'membership-1',
      roles: [
        {
          role: {
            organizationId: 'org-1',
            scope: RoleScope.ORGANIZATION,
            permissions: [{ permission: { key: 'projects.read' } }],
          },
        },
        {
          role: {
            organizationId: 'org-1',
            scope: RoleScope.PROJECT,
            permissions: [{ permission: { key: 'projects.manage' } }],
          },
        },
      ],
    });

    await expect(resolver.resolve('user-1', 'org-1')).resolves.toEqual({
      userId: 'user-1',
      organizationId: 'org-1',
      membershipId: 'membership-1',
      permissions: ['projects.read'],
    });
    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          organizationId: 'org-1',
          status: MembershipStatus.ACTIVE,
        },
      }),
    );
  });

  it('returns no access context when the user has no active membership in the tenant', async () => {
    const { resolver } = makeResolver(null);

    await expect(resolver.resolve('user-1', 'org-2')).resolves.toBeNull();
  });
});
