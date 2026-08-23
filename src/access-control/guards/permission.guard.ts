import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { MembershipStatus, RoleScope } from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import type { AuthContext } from '../../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { REQUIRED_PERMISSIONS_KEY } from '../decorators/require-permissions.decorator';

export interface AccessControlContext {
  userId: string;
  organizationId: string;
  membershipId: string;
  permissions: string[];
}

type AccessControlledRequest = Request & {
  user?: AuthContext;
  accessControl?: AccessControlContext;
};

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[]>(REQUIRED_PERMISSIONS_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) ?? [];

    if (requiredPermissions.length === 0) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<AccessControlledRequest>();
    const auth = request.user;

    if (!auth) {
      throw new AuthError('SESSION_REVOKED', 401, 'Sesión inválida');
    }

    if (!auth.organizationId) {
      throw new AuthError(
        'TENANT_REQUIRED',
        403,
        'Organización activa requerida',
      );
    }

    const organizationId = auth.organizationId;
    const cachedAccessControl = request.accessControl;
    const accessControl = this.matchesCurrentAuth(
      cachedAccessControl,
      auth.userId,
      organizationId,
    )
      ? cachedAccessControl
      : await this.resolvePermissions(auth, organizationId);
    request.accessControl = accessControl;

    const granted = new Set(accessControl.permissions);
    const allowed = requiredPermissions.every((permission) =>
      granted.has(permission),
    );

    if (!allowed) {
      throw new AuthError(
        'MEMBER_ACCESS_DENIED',
        403,
        'Permisos insuficientes para la organización activa',
      );
    }

    return true;
  }

  private matchesCurrentAuth(
    accessControl: AccessControlContext | undefined,
    userId: string,
    organizationId: string,
  ): accessControl is AccessControlContext {
    return (
      accessControl?.userId === userId &&
      accessControl.organizationId === organizationId
    );
  }

  private async resolvePermissions(
    auth: AuthContext,
    organizationId: string,
  ): Promise<AccessControlContext> {
    const membership = await this.prisma.organizationMembership.findFirst({
      where: {
        userId: auth.userId,
        organizationId,
        status: MembershipStatus.ACTIVE,
      },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new AuthError(
        'MEMBER_ACCESS_DENIED',
        403,
        'Membresía activa requerida',
      );
    }

    const permissions = new Set<string>();
    for (const membershipRole of membership.roles) {
      const role = membershipRole.role;
      if (
        role.organizationId !== organizationId ||
        role.scope !== RoleScope.ORGANIZATION
      ) {
        continue;
      }
      for (const rolePermission of role.permissions) {
        permissions.add(rolePermission.permission.key);
      }
    }

    return {
      userId: auth.userId,
      organizationId,
      membershipId: membership.id,
      permissions: [...permissions],
    };
  }
}
