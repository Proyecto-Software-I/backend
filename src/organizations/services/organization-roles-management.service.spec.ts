/* eslint-disable @typescript-eslint/unbound-method */
import { RoleScope } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { OrganizationRolesManagementService } from './organization-roles-management.service';

function makeService() {
  const prisma = {
    role: { findMany: jest.fn() },
    permission: { findMany: jest.fn() },
  } as unknown as PrismaService & {
    role: { findMany: jest.Mock };
    permission: { findMany: jest.Mock };
  };

  return {
    prisma,
    service: new OrganizationRolesManagementService(prisma),
  };
}

describe('OrganizationRolesManagementService', () => {
  it('lists only current-tenant organization roles with the approved ordering', async () => {
    const { service, prisma } = makeService();
    prisma.role.findMany.mockResolvedValue([]);

    await service.listOrganizationRoles('org-1');

    expect(prisma.role.findMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }, { key: 'asc' }],
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
  });

  it('returns system and custom roles with permission key arrays only', async () => {
    const { service, prisma } = makeService();
    prisma.role.findMany.mockResolvedValue([
      {
        id: 'role-owner',
        key: 'OWNER',
        name: 'Owner',
        description: null,
        scope: RoleScope.ORGANIZATION,
        isSystem: true,
        permissions: [
          { permission: { key: 'members.read' } },
          { permission: { key: 'organization.read' } },
        ],
      },
      {
        id: 'role-reviewer',
        key: 'security-reviewer',
        name: 'Security reviewer',
        description: 'Can inspect analysis and audit information.',
        scope: RoleScope.ORGANIZATION,
        isSystem: false,
        permissions: [
          { permission: { key: 'audit.read' } },
          { permission: { key: 'analysis.read' } },
        ],
      },
    ]);

    await expect(service.listOrganizationRoles('org-1')).resolves.toEqual({
      roles: [
        {
          id: 'role-owner',
          key: 'OWNER',
          name: 'Owner',
          description: null,
          scope: RoleScope.ORGANIZATION,
          isSystem: true,
          permissions: ['members.read', 'organization.read'],
        },
        {
          id: 'role-reviewer',
          key: 'security-reviewer',
          name: 'Security reviewer',
          description: 'Can inspect analysis and audit information.',
          scope: RoleScope.ORGANIZATION,
          isSystem: false,
          permissions: ['analysis.read', 'audit.read'],
        },
      ],
    });
  });

  it('lists the global permission catalog ordered by key without internal ids', async () => {
    const { service, prisma } = makeService();
    prisma.permission.findMany.mockResolvedValue([
      { key: 'analysis.read', description: 'Ver análisis.' },
      { key: 'members.read', description: 'Ver miembros.' },
    ]);

    await expect(service.listPermissionCatalog()).resolves.toEqual({
      permissions: [
        { key: 'analysis.read', description: 'Ver análisis.' },
        { key: 'members.read', description: 'Ver miembros.' },
      ],
    });
    expect(prisma.permission.findMany).toHaveBeenCalledWith({
      orderBy: { key: 'asc' },
      select: {
        key: true,
        description: true,
      },
    });
  });
});
