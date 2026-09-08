import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthError } from '../../common/exceptions/auth-error';
import type { AuthContext } from '../../auth/decorators/current-user.decorator';

@Injectable()
export class TenantRequiredGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{ user?: AuthContext }>();
    if (!request.user?.organizationId) {
      throw new AuthError(
        'TENANT_REQUIRED',
        403,
        'Active organization required',
      );
    }
    return true;
  }
}
