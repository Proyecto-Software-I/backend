import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import type { Request } from 'express';

export interface AuthContext {
  userId: string;
  sessionId: string;
  organizationId: string | null;
}

function getAuthContext(ctx: ExecutionContext): AuthContext {
  const req = ctx.switchToHttp().getRequest<Request & { user?: AuthContext }>();
  if (!req.user) {
    throw new InternalServerErrorException('Contexto de autenticación ausente');
  }
  return req.user;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => getAuthContext(ctx),
);

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null =>
    getAuthContext(ctx).organizationId,
);
