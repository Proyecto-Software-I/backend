import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';

export interface AccessTokenPayload {
  sub: string;
  sid: string;
  org: string | null;
}

@Injectable()
export class TokenService {
  private readonly secret: string;
  private readonly ttl: string;
  private readonly expiresInSeconds: number;

  constructor(configService: ConfigService) {
    this.secret = configService.getOrThrow<string>('AUTH_JWT_SECRET');
    this.ttl = configService.get<string>('AUTH_ACCESS_TOKEN_TTL') ?? '15m';
    this.expiresInSeconds = this.parseTtl(this.ttl);
  }

  sign(payload: AccessTokenPayload): string {
    return jwt.sign(payload, this.secret, {
      expiresIn: this.ttl as jwt.SignOptions['expiresIn'],
    });
  }

  verify(token: string): AccessTokenPayload {
    return jwt.verify(token, this.secret) as AccessTokenPayload;
  }

  get expiresIn(): number {
    return this.expiresInSeconds;
  }

  generateRefreshToken(): string {
    return crypto.randomBytes(48).toString('hex');
  }

  hashToken(value: string): string {
    return crypto.createHash('sha256').update(value).digest('hex');
  }

  private parseTtl(ttl: string): number {
    const match = /^(\d+)([smh])$/.exec(ttl.trim());
    if (!match) {
      return 900;
    }
    const amount = parseInt(match[1], 10);
    const unit = match[2];
    if (unit === 's') {
      return amount;
    }
    if (unit === 'm') {
      return amount * 60;
    }
    return amount * 3600;
  }
}
