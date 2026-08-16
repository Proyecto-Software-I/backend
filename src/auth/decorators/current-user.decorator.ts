import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface AuthContext {
  userId: string;
  sessionId: string;
  organizationId: string | null;
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthContext }>();
    const result: AuthContext = req.user ?? {
      userId: '',
      sessionId: '',
      organizationId: null,
    };
    return result;
  },
);

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const req = ctx
      .switchToHttp()
      .getRequest<Request & { user?: AuthContext }>();
    return req.user?.organizationId ?? null;
  },
);
