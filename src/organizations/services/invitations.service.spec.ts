/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/unbound-method */
import { InvitationStatus } from '../../generated/prisma/client';
import type { PrismaService } from '../../prisma/prisma.service';
import { InvitationsService } from './invitations.service';

function makePrisma() {
  return {
    organizationInvitation: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    organizationInvitation: { updateMany: jest.Mock; findMany: jest.Mock };
  };
}

describe('InvitationsService', () => {
  it('expires only stale pending invitations from the current tenant before listing', async () => {
    const prisma = makePrisma();
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });
    prisma.organizationInvitation.findMany.mockResolvedValue([]);
    const service = new InvitationsService(prisma);

    await service.listCurrentInvitations('org-1');

    expect(prisma.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        status: InvitationStatus.PENDING,
        expiresAt: { lt: expect.any(Date) },
      },
      data: { status: InvitationStatus.EXPIRED },
    });
  });

  it('uses the current tenant organizationId in the list query', async () => {
    const prisma = makePrisma();
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });
    prisma.organizationInvitation.findMany.mockResolvedValue([]);
    const service = new InvitationsService(prisma);

    await service.listCurrentInvitations('org-1');

    expect(prisma.organizationInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });

  it('returns safe invitation metadata with invitedBy and proposedRole', async () => {
    const expiresAt = new Date('2026-02-01T00:00:00.000Z');
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const prisma = makePrisma();
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });
    prisma.organizationInvitation.findMany.mockResolvedValue([
      {
        id: 'invitation-1',
        email: 'member@example.com',
        status: InvitationStatus.EXPIRED,
        expiresAt,
        createdAt,
        invitedBy: { id: 'user-1', displayName: 'Owner User' },
        proposedRole: { key: 'MEMBER', name: 'Member' },
      },
    ]);
    const service = new InvitationsService(prisma);

    const result = await service.listCurrentInvitations('org-1');

    expect(result).toEqual({
      invitations: [
        {
          id: 'invitation-1',
          email: 'member@example.com',
          status: InvitationStatus.EXPIRED,
          expiresAt,
          createdAt,
          invitedBy: { id: 'user-1', displayName: 'Owner User' },
          proposedRole: { key: 'MEMBER', name: 'Member' },
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('tokenHash');
    expect(JSON.stringify(result)).not.toContain('invitedByUserId');
    expect(JSON.stringify(result)).not.toContain('proposedRoleId');
  });

  it('selects only safe invitation fields and relation fields', async () => {
    const prisma = makePrisma();
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });
    prisma.organizationInvitation.findMany.mockResolvedValue([]);
    const service = new InvitationsService(prisma);

    await service.listCurrentInvitations('org-1');

    expect(prisma.organizationInvitation.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
        proposedRole: {
          select: {
            key: true,
            name: true,
          },
        },
      },
    });
  });
});
