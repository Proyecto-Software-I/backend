/* eslint-disable @typescript-eslint/unbound-method */
import { MembershipStatus } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { MembershipsService } from './memberships.service';

function makePrisma() {
  return {
    organizationMembership: {
      findMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    organizationMembership: { findMany: jest.Mock };
  };
}

describe('MembershipsService', () => {
  it('uses the current tenant organizationId in the Prisma query', async () => {
    const prisma = makePrisma();
    prisma.organizationMembership.findMany.mockResolvedValue([]);
    const service = new MembershipsService(prisma);

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
          firstName: 'Owner',
          lastName: 'User',
        },
        roles: [{ role: { key: 'OWNER' } }],
      },
    ]);
    const service = new MembershipsService(prisma);

    const result = await service.listCurrentMembers('org-1');

    expect(result).toEqual({
      members: [
        {
          id: 'membership-1',
          status: MembershipStatus.ACTIVE,
          joinedAt,
          user: {
            id: 'user-1',
            email: 'owner@example.com',
            firstName: 'Owner',
            lastName: 'User',
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
    const service = new MembershipsService(prisma);

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
            firstName: true,
            lastName: true,
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
});
