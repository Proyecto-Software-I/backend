import { ExecutionContext } from '@nestjs/common';
import { MembershipStatus } from '../../generated/prisma/client';
import { JwtAuthGuard } from './jwt-auth.guard';
import { SessionService } from '../services/session.service';
import { AccessTokenPayload, TokenService } from '../services/token.service';
import { PrismaService } from '../../prisma/prisma.service';

type TestRequest = {
  headers: { authorization: string };
  user?: unknown;
};

function makeContext(request: TestRequest): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('JwtAuthGuard', () => {
  it('authorizes from the database session and membership', async () => {
    const request: TestRequest = {
      headers: { authorization: 'Bearer token' },
    };
    const tokenService = {
      verify: jest.fn<AccessTokenPayload, [string]>().mockReturnValue({
        sub: 'user-from-token',
        sid: 'session-1',
        org: 'org-from-token',
      }),
    } as unknown as TokenService;
    const session = {
      userId: 'user-from-token',
      organizationId: 'org-from-token',
    } as Awaited<ReturnType<SessionService['findValidById']>>;
    const sessionService = {
      findValidById: jest.fn().mockResolvedValue(session),
    } as unknown as SessionService;
    const findMembership = jest.fn().mockResolvedValue({ id: 'membership-1' });
    const prisma = {
      organizationMembership: { findFirst: findMembership },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(tokenService, sessionService, prisma);

    await expect(guard.canActivate(makeContext(request))).resolves.toBe(true);

    expect(findMembership).toHaveBeenCalledWith({
      where: {
        userId: 'user-from-token',
        organizationId: 'org-from-token',
        status: MembershipStatus.ACTIVE,
      },
    });
    expect(request.user).toEqual({
      userId: 'user-from-token',
      sessionId: 'session-1',
      organizationId: 'org-from-token',
    });
  });

  it('rejects a token whose identity does not match the database session', async () => {
    const request: TestRequest = {
      headers: { authorization: 'Bearer token' },
    };
    const tokenService = {
      verify: jest.fn<AccessTokenPayload, [string]>().mockReturnValue({
        sub: 'user-from-token',
        sid: 'session-1',
        org: 'org-from-token',
      }),
    } as unknown as TokenService;
    const session = {
      userId: 'different-user',
      organizationId: 'org-from-token',
    } as Awaited<ReturnType<SessionService['findValidById']>>;
    const sessionService = {
      findValidById: jest.fn().mockResolvedValue(session),
    } as unknown as SessionService;
    const findMembership = jest.fn();
    const prisma = {
      organizationMembership: { findFirst: findMembership },
    } as unknown as PrismaService;
    const guard = new JwtAuthGuard(tokenService, sessionService, prisma);

    await expect(guard.canActivate(makeContext(request))).rejects.toMatchObject(
      {
        code: 'SESSION_REVOKED',
      },
    );
    expect(findMembership).not.toHaveBeenCalled();
  });
});
