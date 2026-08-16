/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument */
import { SessionService } from './session.service';

function makePrisma() {
  return {
    userSession: {
      create: jest.fn().mockResolvedValue({ id: 's1', userId: 'u1' }),
      update: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
  } as any;
}

describe('SessionService', () => {
  let prisma: ReturnType<typeof makePrisma>;
  let service: SessionService;

  beforeEach(() => {
    prisma = makePrisma();
    service = new SessionService(prisma);
  });

  describe('create', () => {
    it('creates a session with the provided data', async () => {
      const data = {
        id: 's1',
        userId: 'u1',
        organizationId: 'o1',
        tokenHash: 'th',
        refreshTokenHash: 'rh',
        expiresAt: new Date('2026-09-01'),
      };

      const result = await service.create(data);

      expect(prisma.userSession.create).toHaveBeenCalledWith({ data });
      expect(result.id).toBe('s1');
    });
  });

  describe('revoke', () => {
    it('sets revokedAt on the session', async () => {
      await service.revoke('s1');

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { revokedAt: expect.any(Date) },
      });
    });
  });

  describe('updateOrganization', () => {
    it('updates the organizationId', async () => {
      await service.updateOrganization('s1', 'o2');

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { organizationId: 'o2' },
      });
    });
  });

  describe('activateOrganization', () => {
    it('updates organizationId and tokenHash', async () => {
      await service.activateOrganization('s1', 'o2', 'newHash');

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: { organizationId: 'o2', tokenHash: 'newHash' },
      });
    });
  });

  describe('findValidById', () => {
    it('returns session when valid', async () => {
      const futureDate = new Date(Date.now() + 100_000);
      prisma.userSession.findUnique.mockResolvedValue({
        id: 's1',
        revokedAt: null,
        expiresAt: futureDate,
      });

      const result = await service.findValidById('s1');

      expect(result.id).toBe('s1');
    });

    it('throws SESSION_REVOKED when session not found', async () => {
      prisma.userSession.findUnique.mockResolvedValue(null);

      await expect(service.findValidById('s1')).rejects.toMatchObject({
        code: 'SESSION_REVOKED',
      });
    });

    it('throws SESSION_REVOKED when session is revoked', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        id: 's1',
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 100_000),
      });

      await expect(service.findValidById('s1')).rejects.toMatchObject({
        code: 'SESSION_REVOKED',
      });
    });

    it('throws SESSION_EXPIRED when session is expired', async () => {
      prisma.userSession.findUnique.mockResolvedValue({
        id: 's1',
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
      });

      await expect(service.findValidById('s1')).rejects.toMatchObject({
        code: 'SESSION_EXPIRED',
      });
    });
  });

  describe('findByRefreshTokenHash', () => {
    it('finds a valid session by refresh token hash', async () => {
      prisma.userSession.findFirst.mockResolvedValue({ id: 's1' });

      const result = await service.findByRefreshTokenHash('rh');

      expect(result).not.toBeNull();
      if (result === null) {
        throw new Error('Expected a matching session');
      }
      expect(result.id).toBe('s1');
      expect(prisma.userSession.findFirst).toHaveBeenCalledWith({
        where: {
          refreshTokenHash: 'rh',
          revokedAt: null,
          expiresAt: { gt: expect.any(Date) },
        },
      });
    });

    it('returns null when no matching session exists', async () => {
      prisma.userSession.findFirst.mockResolvedValue(null);

      const result = await service.findByRefreshTokenHash('bad');

      expect(result).toBeNull();
    });
  });

  describe('rotateRefresh', () => {
    it('updates refreshTokenHash, expiresAt, and tokenHash', async () => {
      const expiresAt = new Date('2026-10-01');

      await service.rotateRefresh('s1', 'newRh', expiresAt, 'newTh');

      expect(prisma.userSession.update).toHaveBeenCalledWith({
        where: { id: 's1' },
        data: {
          refreshTokenHash: 'newRh',
          expiresAt,
          tokenHash: 'newTh',
        },
      });
    });
  });
});
