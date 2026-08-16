import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Request } from 'express';
import { TokenService } from '../services/token.service';
import { SessionService } from '../services/session.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthError } from '../../common/exceptions/auth-error';
import { MembershipStatus } from '../../generated/prisma/client';

interface TokenPayload {
  sub: string;
  sid: string;
  org: string | null;
}

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context
      .switchToHttp()
      .getRequest<Request & { user?: unknown }>();
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
      throw new AuthError('SESSION_REVOKED', 401, 'Token de acceso requerido');
    }

    const token = header.slice('Bearer '.length);
    let payload: TokenPayload;
    try {
      payload = this.tokenService.verify(token);
    } catch {
      throw new AuthError('SESSION_REVOKED', 401, 'Token de acceso inválido');
    }

    const session = await this.sessionService.findValidById(payload.sid);

    if (
      session.userId !== payload.sub ||
      session.organizationId !== payload.org
    ) {
      throw new AuthError(
        'SESSION_REVOKED',
        401,
        'El token no coincide con la sesión',
      );
    }

    if (session.organizationId) {
      const membership = await this.prisma.organizationMembership.findFirst({
        where: {
          userId: session.userId,
          organizationId: session.organizationId,
          status: MembershipStatus.ACTIVE,
        },
      });
      if (!membership) {
        throw new AuthError(
          'ORGANIZATION_ACCESS_DENIED',
          403,
          'Acceso denegado a la organización',
        );
      }
    }

    req.user = {
      userId: session.userId,
      sessionId: payload.sid,
      organizationId: session.organizationId,
    };
    return true;
  }
}
