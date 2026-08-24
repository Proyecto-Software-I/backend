/* eslint-disable @typescript-eslint/unbound-method */
import { MembershipStatus, RoleScope } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { MembershipsService } from './memberships.service';

function member(overrides: Record<string, unknown> = {}) {
  return {
    id: 'membership-1',
    organizationId: 'org-1',
    userId: 'user-1',
    status: MembershipStatus.ACTIVE,
    joinedAt: new Date('2026-01-01T00:00:00.000Z'),
    user: {
      id: 'user-1',
      email: 'member@example.com',
      displayName: 'Member User',
      firstName: 'Member',
      lastName: 'User',
      avatarUrl: 'https://example.com/member.png',
    },
    jobTitle: 'Developer',
    roles: [
      {
        role: {
          organizationId: 'org-1',
          key: 'MEMBER',
          scope: RoleScope.ORGANIZATION,
        },
      },
    ],
    ...overrides,
  };
}

function ownerRole(overrides: Record<string, unknown> = {}) {
  return {
    role: {
      organizationId: 'org-1',
      key: 'OWNER',
      scope: RoleScope.ORGANIZATION,
      ...overrides,
    },
  };
}

function makePrisma() {
  return {
    organizationMembership: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    organizationMembership: { findMany: jest.Mock };
  };
}

function makeService() {
  const tx = {
    organizationMembership: {
      findFirst: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    userSession: {
      updateMany: jest.fn(),
    },
  };
  const prisma = makePrisma();
  const serializableTransactionService = {
    run: jest.fn((callback: (transactionClient: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return {
    prisma,
    tx,
    serializableTransactionService,
    service: new MembershipsService(
      prisma,
      serializableTransactionService as never,
    ),
  };
}

describe('MembershipsService', () => {
  it('uses the current tenant organizationId in the Prisma query', async () => {
    const prisma = makePrisma();
    prisma.organizationMembership.findMany.mockResolvedValue([]);
    const service = new MembershipsService(prisma, {} as never);

    await service.listCurrentMembers('org-1');

    expect(prisma.organizationMembership.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });

  it('returns public member data and role keys only', async () => {
    const joinedAt = new Date('2026-01-01T00:00:00.000Z');
    const prisma = makePrisma();
    prisma.organizationMembership.findMany.mockResolvedValue([
      {
        id: 'membership-1',
        status: MembershipStatus.ACTIVE,
        joinedAt,
        user: {
          id: 'user-1',
          email: 'owner@example.com',
          displayName: 'Owner User',
          firstName: 'Owner',
          lastName: 'User',
          avatarUrl: 'https://example.com/owner.png',
        },
        jobTitle: 'Owner title',
        roles: [{ role: { key: 'OWNER' } }],
      },
    ]);
    const service = new MembershipsService(prisma, {} as never);

    const result = await service.listCurrentMembers('org-1');

    expect(result).toEqual({
      members: [
        {
          id: 'membership-1',
          status: MembershipStatus.ACTIVE,
          joinedAt,
          jobTitle: 'Owner title',
          user: {
            id: 'user-1',
            email: 'owner@example.com',
            displayName: 'Owner User',
            firstName: 'Owner',
            lastName: 'User',
            avatarUrl: 'https://example.com/owner.png',
          },
          roles: ['OWNER'],
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('credential');
    expect(JSON.stringify(result)).not.toContain('sessions');
    expect(JSON.stringify(result)).not.toContain('tokenHash');
  });

  it('fetches members and roles in one Prisma query without N+1 lookups', async () => {
    const prisma = makePrisma();
    prisma.organizationMembership.findMany.mockResolvedValue([]);
    const service = new MembershipsService(prisma, {} as never);

    await service.listCurrentMembers('org-1');

    expect(prisma.organizationMembership.findMany).toHaveBeenCalledTimes(1);
    expect(prisma.organizationMembership.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        roles: {
          include: {
            role: { select: { key: true } },
          },
        },
      },
    });
  });

  it('suspends an ACTIVE membership using tenant-scoped lookup and clears active tenant sessions', async () => {
    const { service, tx, serializableTransactionService } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(member());

    const result = await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.SUSPENDED,
    );

    expect(serializableTransactionService.run).toHaveBeenCalledTimes(1);
    expect(tx.organizationMembership.findFirst).toHaveBeenCalledWith({
      where: { id: 'membership-1', organizationId: 'org-1' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            displayName: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
        roles: {
          include: {
            role: {
              select: {
                organizationId: true,
                key: true,
                scope: true,
              },
            },
          },
        },
      },
    });
    expect(tx.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: MembershipStatus.SUSPENDED },
    });
    expect(tx.userSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        organizationId: 'org-1',
        revokedAt: null,
      },
      data: { organizationId: null },
    });
    expect(result.member.status).toBe(MembershipStatus.SUSPENDED);
  });

  it('reactivates a SUSPENDED membership without selecting organization in sessions', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({ status: MembershipStatus.SUSPENDED }),
    );

    const result = await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.ACTIVE,
    );

    expect(tx.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: MembershipStatus.ACTIVE },
    });
    expect(tx.userSession.updateMany).not.toHaveBeenCalled();
    expect(result.member.status).toBe(MembershipStatus.ACTIVE);
  });

  it('keeps same-status PATCH idempotent without session invalidation', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({ status: MembershipStatus.SUSPENDED }),
    );

    const result = await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.SUSPENDED,
    );

    expect(tx.organizationMembership.update).not.toHaveBeenCalled();
    expect(tx.userSession.updateMany).not.toHaveBeenCalled();
    expect(result.member.status).toBe(MembershipStatus.SUSPENDED);
  });

  it.each([MembershipStatus.ACTIVE, MembershipStatus.SUSPENDED])(
    'treats REMOVED -> %s as MEMBERSHIP_NOT_FOUND',
    async (targetStatus) => {
      const { service, tx } = makeService();
      tx.organizationMembership.findFirst.mockResolvedValue(
        member({ status: MembershipStatus.REMOVED }),
      );

      await expect(
        service.updateMembershipStatus('org-1', 'membership-1', targetStatus),
      ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND', status: 404 });
      expect(tx.organizationMembership.update).not.toHaveBeenCalled();
    },
  );

  it('returns MEMBERSHIP_NOT_FOUND for missing or cross-tenant membership', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.updateMembershipStatus(
        'org-1',
        'foreign-membership',
        MembershipStatus.ACTIVE,
      ),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND', status: 404 });
    expect(tx.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-membership', organizationId: 'org-1' },
      }),
    );
  });

  it('removes ACTIVE membership softly and clears only current-tenant sessions', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(member());

    const result = await service.removeMembership('org-1', 'membership-1');

    expect(tx.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: MembershipStatus.REMOVED },
    });
    expect(tx.userSession.updateMany).toHaveBeenCalledWith({
      where: {
        userId: 'user-1',
        organizationId: 'org-1',
        revokedAt: null,
      },
      data: { organizationId: null },
    });
    expect(result.member.status).toBe(MembershipStatus.REMOVED);
  });

  it('removes SUSPENDED membership softly', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({ status: MembershipStatus.SUSPENDED }),
    );

    await service.removeMembership('org-1', 'membership-1');

    expect(tx.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: MembershipStatus.REMOVED },
    });
    expect(tx.organizationMembership).not.toHaveProperty('delete');
  });

  it('returns MEMBERSHIP_NOT_FOUND when removing REMOVED membership', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({ status: MembershipStatus.REMOVED }),
    );

    await expect(
      service.removeMembership('org-1', 'membership-1'),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND', status: 404 });
    expect(tx.organizationMembership.update).not.toHaveBeenCalled();
  });

  it('returns MEMBERSHIP_NOT_FOUND when removing missing or cross-tenant membership', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(null);

    await expect(
      service.removeMembership('org-1', 'foreign-membership'),
    ).rejects.toMatchObject({ code: 'MEMBERSHIP_NOT_FOUND', status: 404 });
    expect(tx.organizationMembership.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'foreign-membership', organizationId: 'org-1' },
      }),
    );
    expect(tx.organizationMembership.update).not.toHaveBeenCalled();
  });

  it('allows suspending/removing a non-owner without last-owner count', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(member());

    await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.SUSPENDED,
    );

    expect(tx.organizationMembership.count).not.toHaveBeenCalled();
  });

  it('allows suspending an OWNER when another ACTIVE OWNER exists', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({
        roles: [ownerRole()],
      }),
    );
    tx.organizationMembership.count.mockResolvedValue(2);

    await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.SUSPENDED,
    );

    expect(tx.organizationMembership.count).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        status: MembershipStatus.ACTIVE,
        roles: {
          some: {
            role: {
              organizationId: 'org-1',
              scope: RoleScope.ORGANIZATION,
              key: 'OWNER',
            },
          },
        },
      },
    });
    expect(tx.organizationMembership.update).toHaveBeenCalled();
  });

  it('rejects suspending the last ACTIVE OWNER', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({
        roles: [ownerRole()],
      }),
    );
    tx.organizationMembership.count.mockResolvedValue(1);

    await expect(
      service.updateMembershipStatus(
        'org-1',
        'membership-1',
        MembershipStatus.SUSPENDED,
      ),
    ).rejects.toMatchObject({ code: 'LAST_OWNER_REQUIRED', status: 409 });
    expect(tx.organizationMembership.update).not.toHaveBeenCalled();
    expect(tx.userSession.updateMany).not.toHaveBeenCalled();
  });

  it('rejects self-suspend of the last ACTIVE OWNER through the same last-owner rule', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({
        roles: [ownerRole()],
      }),
    );
    tx.organizationMembership.count.mockResolvedValue(1);

    await expect(
      service.updateMembershipStatus(
        'org-1',
        'membership-1',
        MembershipStatus.SUSPENDED,
      ),
    ).rejects.toMatchObject({ code: 'LAST_OWNER_REQUIRED', status: 409 });
  });

  it('rejects removing the last ACTIVE OWNER', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({
        roles: [ownerRole()],
      }),
    );
    tx.organizationMembership.count.mockResolvedValue(1);

    await expect(
      service.removeMembership('org-1', 'membership-1'),
    ).rejects.toMatchObject({ code: 'LAST_OWNER_REQUIRED', status: 409 });
    expect(tx.organizationMembership.update).not.toHaveBeenCalled();
  });

  it('rejects self-remove of the last ACTIVE OWNER through the same last-owner rule', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({
        roles: [ownerRole()],
      }),
    );
    tx.organizationMembership.count.mockResolvedValue(1);

    await expect(
      service.removeMembership('org-1', 'membership-1'),
    ).rejects.toMatchObject({ code: 'LAST_OWNER_REQUIRED', status: 409 });
  });

  it('allows self-remove OWNER when another ACTIVE OWNER exists because authorization is not duplicated in service', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({
        roles: [ownerRole()],
      }),
    );
    tx.organizationMembership.count.mockResolvedValue(2);

    await service.removeMembership('org-1', 'membership-1');

    expect(tx.organizationMembership.update).toHaveBeenCalledWith({
      where: { id: 'membership-1' },
      data: { status: MembershipStatus.REMOVED },
    });
  });

  it('does not treat OWNER role from another organization as current tenant owner', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({ roles: [ownerRole({ organizationId: 'other-org' })] }),
    );

    await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.SUSPENDED,
    );

    expect(tx.organizationMembership.count).not.toHaveBeenCalled();
    expect(tx.organizationMembership.update).toHaveBeenCalled();
  });

  it('does not treat non-organization OWNER role as organization owner', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({ roles: [ownerRole({ scope: RoleScope.PROJECT })] }),
    );

    await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.SUSPENDED,
    );

    expect(tx.organizationMembership.count).not.toHaveBeenCalled();
    expect(tx.organizationMembership.update).toHaveBeenCalled();
  });

  it('does not treat non-OWNER role as organization owner', async () => {
    const { service, tx } = makeService();
    tx.organizationMembership.findFirst.mockResolvedValue(
      member({ roles: [ownerRole({ key: 'MEMBER' })] }),
    );

    await service.updateMembershipStatus(
      'org-1',
      'membership-1',
      MembershipStatus.SUSPENDED,
    );

    expect(tx.organizationMembership.count).not.toHaveBeenCalled();
    expect(tx.organizationMembership.update).toHaveBeenCalled();
  });
});
