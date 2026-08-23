/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { MembershipStatus, RoleScope } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import type { AuthContext } from '../../auth/decorators/current-user.decorator';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';
import { PermissionGuard } from './permission.guard';

type TestRequest = {
  user?: AuthContext & { permissions?: string[] };
  accessControl?: unknown;
};

function makeContext(request: TestRequest): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => 'handler',
    getClass: () => 'class',
  } as unknown as ExecutionContext;
}

function makeGuard(requiredPermissions: string[], membership: unknown) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) =>
      key === REQUIRED_PERMISSIONS_KEY ? requiredPermissions : undefined,
    ),
  } as unknown as Reflector;
  const findFirst = jest.fn().mockResolvedValue(membership);
  const prisma = {
    organizationMembership: { findFirst },
  } as unknown as PrismaService;

  return { guard: new PermissionGuard(reflector, prisma), findFirst };
}

const authContext: AuthContext = {
  userId: 'user-1',
  sessionId: 'session-1',
  organizationId: 'org-1',
};

const membership = {
  id: 'membership-1',
  roles: [
    {
      role: {
        organizationId: 'org-1',
        scope: RoleScope.ORGANIZATION,
        permissions: [
          { permission: { key: 'members.read' } },
          { permission: { key: 'members.manage' } },
        ],
      },
    },
  ],
};

describe('PermissionGuard', () => {
  it('allows when the required permission is present in the database', async () => {
    const request: TestRequest = { user: authContext };
    const { guard, findFirst } = makeGuard(['members.manage'], membership);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: 'user-1',
          organizationId: 'org-1',
          status: MembershipStatus.ACTIVE,
        },
      }),
    );
    expect(request.accessControl).toEqual({
      userId: 'user-1',
      organizationId: 'org-1',
      membershipId: 'membership-1',
      permissions: expect.arrayContaining(['members.read', 'members.manage']),
    });
  });

  it('rejects when the required permission is absent', async () => {
    const limitedMembership = {
      ...membership,
      roles: [
        {
          role: {
            organizationId: 'org-1',
            scope: RoleScope.ORGANIZATION,
            permissions: [{ permission: { key: 'members.read' } }],
          },
        },
      ],
    };
    const { guard } = makeGuard(['members.manage'], limitedMembership);

    await expect(
      guard.canActivate(makeContext({ user: authContext })),
    ).rejects.toMatchObject({ code: 'MEMBER_ACCESS_DENIED' });
  });

  it('rejects when there is no active membership in the active tenant', async () => {
    const { guard } = makeGuard(['members.read'], null);

    await expect(
      guard.canActivate(makeContext({ user: authContext })),
    ).rejects.toMatchObject({ code: 'MEMBER_ACCESS_DENIED' });
  });

  it('rejects when the session has no active tenant', async () => {
    const { guard, findFirst } = makeGuard(['members.read'], membership);

    await expect(
      guard.canActivate(
        makeContext({ user: { ...authContext, organizationId: null } }),
      ),
    ).rejects.toMatchObject({ code: 'TENANT_REQUIRED' });
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('denies when request user contains false permissions but the database does not grant them', async () => {
    const request: TestRequest = {
      user: { ...authContext, permissions: ['members.manage'] },
    };
    const limitedMembership = {
      ...membership,
      roles: [
        {
          role: {
            organizationId: 'org-1',
            scope: RoleScope.ORGANIZATION,
            permissions: [{ permission: { key: 'members.read' } }],
          },
        },
      ],
    };
    const { guard } = makeGuard(['members.manage'], limitedMembership);

    await expect(guard.canActivate(makeContext(request))).rejects.toMatchObject(
      {
        code: 'MEMBER_ACCESS_DENIED',
      },
    );
  });

  it('allows when the database grants permission even if request user has no permissions field', async () => {
    const request: TestRequest = { user: authContext };
    const { guard } = makeGuard(['members.manage'], membership);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
  });

  it('reuses request-local cache when userId and organizationId match', async () => {
    const request: TestRequest = {
      user: authContext,
      accessControl: {
        userId: 'user-1',
        organizationId: 'org-1',
        membershipId: 'membership-1',
        permissions: ['members.manage'],
      },
    };
    const { guard, findFirst } = makeGuard(['members.manage'], null);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(findFirst).not.toHaveBeenCalled();
  });

  it('ignores request-local cache from another user and resolves from the database', async () => {
    const request: TestRequest = {
      user: authContext,
      accessControl: {
        userId: 'user-2',
        organizationId: 'org-1',
        membershipId: 'membership-2',
        permissions: ['members.manage'],
      },
    };
    const { guard, findFirst } = makeGuard(['members.manage'], membership);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(request.accessControl).toEqual({
      userId: 'user-1',
      organizationId: 'org-1',
      membershipId: 'membership-1',
      permissions: expect.arrayContaining(['members.manage']),
    });
  });

  it('ignores request-local cache from another organization and resolves from the database', async () => {
    const request: TestRequest = {
      user: authContext,
      accessControl: {
        userId: 'user-1',
        organizationId: 'org-2',
        membershipId: 'membership-2',
        permissions: ['members.manage'],
      },
    };
    const { guard, findFirst } = makeGuard(['members.manage'], membership);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);
    expect(findFirst).toHaveBeenCalledTimes(1);
    expect(request.accessControl).toEqual({
      userId: 'user-1',
      organizationId: 'org-1',
      membershipId: 'membership-1',
      permissions: expect.arrayContaining(['members.manage']),
    });
  });
});
