/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/unbound-method */
import { validate } from 'class-validator';
import { createHash } from 'crypto';
import {
  InvitationStatus,
  MembershipStatus,
} from '../../generated/prisma/client';
import type { OrganizationRolesService } from '../../organization-provisioning/services/organization-roles.service';
import type { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import type { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationInvitationDto } from '../dto/invitation-list.dto';
import { InvitationsService } from './invitations.service';

function safeInvitation(overrides: Record<string, unknown> = {}) {
  return {
    id: 'invitation-1',
    email: 'member@example.com',
    status: InvitationStatus.PENDING,
    expiresAt: new Date('2026-02-01T00:00:00.000Z'),
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    invitedBy: { id: 'user-1', displayName: 'Owner User' },
    proposedRole: { key: 'MEMBER', name: 'Member' },
    ...overrides,
  };
}

function makeTx() {
  return {
    user: { findUnique: jest.fn() },
    organizationMembership: { findFirst: jest.fn() },
    organizationInvitation: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };
}

function makePrisma() {
  return {
    organizationInvitation: {
      updateMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findFirstOrThrow: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
    },
  } as unknown as PrismaService & {
    organizationInvitation: {
      updateMany: jest.Mock;
      findMany: jest.Mock;
      findFirst: jest.Mock;
      findFirstOrThrow: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
  };
}

function makeService() {
  const prisma = makePrisma();
  const tx = makeTx();
  const serializableTransactionService = {
    run: jest.fn((callback: (transactionClient: typeof tx) => unknown) =>
      callback(tx),
    ),
  } as unknown as SerializableTransactionService & { run: jest.Mock };
  const organizationRolesService = {
    ensureMemberRole: jest.fn().mockResolvedValue({ id: 'role-member' }),
  } as unknown as OrganizationRolesService & { ensureMemberRole: jest.Mock };
  const service = new InvitationsService(
    prisma,
    serializableTransactionService,
    organizationRolesService,
  );

  tx.user.findUnique.mockResolvedValue(null);
  tx.organizationMembership.findFirst.mockResolvedValue(null);
  tx.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });
  tx.organizationInvitation.findFirst.mockResolvedValue(null);
  tx.organizationInvitation.create.mockResolvedValue(safeInvitation());
  prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });
  prisma.organizationInvitation.findMany.mockResolvedValue([]);
  prisma.organizationInvitation.findFirstOrThrow.mockResolvedValue(
    safeInvitation({ status: InvitationStatus.REVOKED }),
  );

  return {
    service,
    prisma,
    tx,
    serializableTransactionService,
    organizationRolesService,
  };
}

describe('InvitationsService list', () => {
  it('expires only stale pending invitations from the current tenant before listing', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });

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
    const { service, prisma } = makeService();

    await service.listCurrentInvitations('org-1');

    expect(prisma.organizationInvitation.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organizationId: 'org-1' } }),
    );
  });

  it('returns safe invitation metadata with invitedBy and proposedRole', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findMany.mockResolvedValue([
      safeInvitation({ status: InvitationStatus.EXPIRED }),
    ]);

    const result = await service.listCurrentInvitations('org-1');

    expect(result).toEqual({
      invitations: [safeInvitation({ status: InvitationStatus.EXPIRED })],
    });
    expect(JSON.stringify(result)).not.toContain('tokenHash');
    expect(JSON.stringify(result)).not.toContain('invitedByUserId');
    expect(JSON.stringify(result)).not.toContain('proposedRoleId');
  });

  it('selects only safe invitation fields and relation fields', async () => {
    const { service, prisma } = makeService();

    await service.listCurrentInvitations('org-1');

    expect(prisma.organizationInvitation.findMany).toHaveBeenCalledWith({
      where: { organizationId: 'org-1' },
      orderBy: { createdAt: 'desc' },
      select: expect.objectContaining({
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: { select: { id: true, displayName: true } },
        proposedRole: { select: { key: true, name: true } },
      }),
    });
  });
});

describe('InvitationsService create', () => {
  it('validates invalid emails through the DTO', async () => {
    const dto = new CreateOrganizationInvitationDto();
    dto.email = 'not-an-email';

    await expect(validate(dto)).resolves.toHaveLength(1);
  });

  it('normalizes email, uses serializable helper, provisions MEMBER with same tx, and stores only token hash', async () => {
    const {
      service,
      tx,
      serializableTransactionService,
      organizationRolesService,
    } = makeService();

    const result = await service.createInvitation({
      organizationId: 'org-1',
      invitedByUserId: 'user-1',
      email: '  MEMBER@Example.COM  ',
    });

    expect(serializableTransactionService.run).toHaveBeenCalledTimes(1);
    expect(organizationRolesService.ensureMemberRole).toHaveBeenCalledWith(
      tx,
      'org-1',
    );
    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { email: 'member@example.com' },
      select: { id: true },
    });
    expect(tx.organizationInvitation.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        organizationId: 'org-1',
        email: 'member@example.com',
        status: InvitationStatus.PENDING,
        invitedByUserId: 'user-1',
        proposedRoleId: 'role-member',
        tokenHash: expect.any(String),
        expiresAt: expect.any(Date),
      }),
      select: expect.any(Object),
    });
    const createData = tx.organizationInvitation.create.mock.calls[0][0].data;
    const plaintextToken = result.acceptanceUrl.replace('/invite/', '');
    const expectedHash = createHash('sha256')
      .update(plaintextToken)
      .digest('hex');
    expect(plaintextToken).toBeTruthy();
    expect(createData.tokenHash).not.toBe(plaintextToken);
    expect(createData.tokenHash).toBe(expectedHash);
    expect(createData.tokenHash).toHaveLength(64);
    expect(result.acceptanceUrl).toBe(`/invite/${plaintextToken}`);
    expect(JSON.stringify(result)).not.toContain(createData.tokenHash);
    expect(JSON.stringify(result)).not.toContain('tokenHash');
  });

  it('sets expiration approximately seven days after creation', async () => {
    const { service, tx } = makeService();
    const before = Date.now();

    await service.createInvitation({
      organizationId: 'org-1',
      invitedByUserId: 'user-1',
      email: 'member@example.com',
    });

    const expiresAt = tx.organizationInvitation.create.mock.calls[0][0].data
      .expiresAt as Date;
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    expect(expiresAt.getTime()).toBeGreaterThanOrEqual(before + sevenDaysMs);
    expect(expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + sevenDaysMs);
  });

  it.each([
    MembershipStatus.ACTIVE,
    MembershipStatus.SUSPENDED,
    MembershipStatus.REMOVED,
  ])(
    'rejects existing %s membership without creating invitation',
    async (status) => {
      const { service, tx } = makeService();
      tx.user.findUnique.mockResolvedValue({ id: 'target-user' });
      tx.organizationMembership.findFirst.mockResolvedValue({
        id: 'membership-1',
        status,
      });

      await expect(
        service.createInvitation({
          organizationId: 'org-1',
          invitedByUserId: 'user-1',
          email: 'member@example.com',
        }),
      ).rejects.toMatchObject({ code: 'MEMBER_ALREADY_EXISTS', status: 409 });
      expect(tx.organizationMembership.findFirst).toHaveBeenCalledWith({
        where: {
          organizationId: 'org-1',
          userId: 'target-user',
          status: {
            in: [
              MembershipStatus.ACTIVE,
              MembershipStatus.SUSPENDED,
              MembershipStatus.REMOVED,
            ],
          },
        },
        select: { id: true },
      });
      expect(tx.organizationInvitation.create).not.toHaveBeenCalled();
      expect(status).toBeDefined();
    },
  );

  it('expires stale pending invitations before duplicate check and allows a new invitation', async () => {
    const { service, tx } = makeService();

    await service.createInvitation({
      organizationId: 'org-1',
      invitedByUserId: 'user-1',
      email: 'member@example.com',
    });

    expect(tx.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        email: 'member@example.com',
        status: InvitationStatus.PENDING,
        expiresAt: { lt: expect.any(Date) },
      },
      data: { status: InvitationStatus.EXPIRED },
    });
    expect(tx.organizationInvitation.create).toHaveBeenCalled();
  });

  it('rejects active pending invitation without creating a duplicate', async () => {
    const { service, tx } = makeService();
    tx.organizationInvitation.findFirst.mockResolvedValue({ id: 'pending-1' });

    await expect(
      service.createInvitation({
        organizationId: 'org-1',
        invitedByUserId: 'user-1',
        email: 'member@example.com',
      }),
    ).rejects.toMatchObject({
      code: 'INVITATION_ALREADY_PENDING',
      status: 409,
    });
    expect(tx.organizationInvitation.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-1',
        email: 'member@example.com',
        status: InvitationStatus.PENDING,
        expiresAt: { gt: expect.any(Date) },
      },
      select: { id: true },
    });
    expect(tx.organizationInvitation.create).not.toHaveBeenCalled();
  });
});

describe('InvitationsService revoke', () => {
  it('uses tenant-scoped lookup and returns INVITATION_NOT_FOUND for missing or cross-tenant IDs', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst.mockResolvedValue(null);

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND', status: 404 });
    expect(prisma.organizationInvitation.findFirst).toHaveBeenCalledWith({
      where: { id: 'invitation-1', organizationId: 'org-1' },
      select: expect.any(Object),
    });
  });

  it('revokes a valid pending invitation without physical delete', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst.mockResolvedValue(
      safeInvitation({
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 60_000),
      }),
    );
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.revokeInvitation('org-1', 'invitation-1');

    expect(prisma.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        organizationId: 'org-1',
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.REVOKED },
    });
    expect(prisma.organizationInvitation.delete).not.toHaveBeenCalled();
    expect(prisma.organizationInvitation.deleteMany).not.toHaveBeenCalled();
    expect(JSON.stringify(result)).not.toContain('tokenHash');
  });

  it('returns INVITATION_REVOKED when another revoke wins the pending transition', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst
      .mockResolvedValueOnce(
        safeInvitation({
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      )
      .mockResolvedValueOnce(
        safeInvitation({ status: InvitationStatus.REVOKED }),
      );
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({ code: 'INVITATION_REVOKED', status: 410 });
    expect(
      prisma.organizationInvitation.findFirstOrThrow,
    ).not.toHaveBeenCalled();
  });

  it('returns INVITATION_ALREADY_ACCEPTED when a future accept wins the pending transition', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst
      .mockResolvedValueOnce(
        safeInvitation({
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      )
      .mockResolvedValueOnce(
        safeInvitation({ status: InvitationStatus.ACCEPTED }),
      );
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({
      code: 'INVITATION_ALREADY_ACCEPTED',
      status: 409,
    });
    expect(
      prisma.organizationInvitation.findFirstOrThrow,
    ).not.toHaveBeenCalled();
  });

  it('returns INVITATION_EXPIRED when expiration wins the pending transition', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst
      .mockResolvedValueOnce(
        safeInvitation({
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      )
      .mockResolvedValueOnce(
        safeInvitation({ status: InvitationStatus.EXPIRED }),
      );
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED', status: 410 });
    expect(
      prisma.organizationInvitation.findFirstOrThrow,
    ).not.toHaveBeenCalled();
  });

  it('returns INVITATION_NOT_FOUND when transition count is zero and the tenant-scoped row disappears', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst
      .mockResolvedValueOnce(
        safeInvitation({
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      )
      .mockResolvedValueOnce(null);
    prisma.organizationInvitation.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({ code: 'INVITATION_NOT_FOUND', status: 404 });
    expect(
      prisma.organizationInvitation.findFirstOrThrow,
    ).not.toHaveBeenCalled();
  });

  it('expires stale pending invitation after a lost transition and returns INVITATION_EXPIRED', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst
      .mockResolvedValueOnce(
        safeInvitation({
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() + 60_000),
        }),
      )
      .mockResolvedValueOnce(
        safeInvitation({
          status: InvitationStatus.PENDING,
          expiresAt: new Date(Date.now() - 60_000),
        }),
      );
    prisma.organizationInvitation.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 });

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED', status: 410 });
    expect(prisma.organizationInvitation.updateMany).toHaveBeenLastCalledWith({
      where: {
        id: 'invitation-1',
        organizationId: 'org-1',
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.EXPIRED },
    });
    expect(
      prisma.organizationInvitation.findFirstOrThrow,
    ).not.toHaveBeenCalled();
  });

  it('expires stale pending invitation and returns INVITATION_EXPIRED', async () => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst.mockResolvedValue(
      safeInvitation({
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() - 60_000),
      }),
    );

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({ code: 'INVITATION_EXPIRED', status: 410 });
    expect(prisma.organizationInvitation.updateMany).toHaveBeenCalledWith({
      where: {
        id: 'invitation-1',
        organizationId: 'org-1',
        status: InvitationStatus.PENDING,
      },
      data: { status: InvitationStatus.EXPIRED },
    });
  });

  it.each([
    [InvitationStatus.ACCEPTED, 'INVITATION_ALREADY_ACCEPTED', 409],
    [InvitationStatus.EXPIRED, 'INVITATION_EXPIRED', 410],
    [InvitationStatus.REVOKED, 'INVITATION_REVOKED', 410],
  ])('maps %s state to %s', async (status, code, httpStatus) => {
    const { service, prisma } = makeService();
    prisma.organizationInvitation.findFirst.mockResolvedValue(
      safeInvitation({ status }),
    );

    await expect(
      service.revokeInvitation('org-1', 'invitation-1'),
    ).rejects.toMatchObject({ code, status: httpStatus });
    expect(prisma.organizationInvitation.delete).not.toHaveBeenCalled();
  });
});
