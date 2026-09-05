import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthError } from '../../common/exceptions/auth-error';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    id: string;
    userId: string;
    organizationId: string | null;
    tokenHash: string;
    refreshTokenHash: string;
    expiresAt: Date;
  }) {
    return this.prisma.userSession.create({ data });
  }

  async revoke(sessionId: string): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async updateOrganization(
    sessionId: string,
    organizationId: string,
  ): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { organizationId },
    });
  }

  async activateOrganization(
    sessionId: string,
    organizationId: string,
    tokenHash: string,
  ): Promise<void> {
    await this.prisma.userSession.update({
      where: { id: sessionId },
      data: { organizationId, tokenHash },
    });
  }

  async findValidById(sessionId: string) {
    const session = await this.prisma.userSession.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.revokedAt) {
      throw new AuthError('SESSION_REVOKED', 401, 'Sesión revocada');
    }
    if (session.expiresAt.getTime() < Date.now()) {
      throw new AuthError('SESSION_EXPIRED', 401, 'Sesión expirada');
    }
    return session;
  }

  async findByRefreshTokenHash(refreshTokenHash: string) {
    return this.prisma.userSession.findFirst({
      where: { refreshTokenHash },
    });
  }

  async rotateRefresh(
    sessionId: string,
    refreshTokenHash: string,
    expiresAt: Date,
    tokenHash: string,
  ) {
    return this.prisma.userSession.update({
      where: { id: sessionId },
      data: { refreshTokenHash, expiresAt, tokenHash },
    });
  }
}
