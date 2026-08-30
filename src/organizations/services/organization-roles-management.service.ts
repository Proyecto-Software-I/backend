import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  RoleScope,
} from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  CreateOrganizationRoleDto,
  OrganizationRoleDto,
  OrganizationRolesResponseDto,
  PermissionCatalogResponseDto,
  ReplaceMembershipRolesDto,
  UpdateOrganizationRoleDto,
} from '../dto/role-list.dto';
import type {
  OrganizationMemberDto,
  OrganizationMemberResponseDto,
} from '../dto/member-list.dto';

const ROLE_KEY_MAX_LENGTH = 100;
const ROLE_KEY_FALLBACK = 'custom-role';
const MAX_ROLE_KEY_ATTEMPTS = 5;

const ROLE_WITH_PERMISSIONS_INCLUDE = {
  permissions: {
    include: { permission: true },
  },
} satisfies Prisma.RoleInclude;

const MEMBERSHIP_WITH_ROLES_INCLUDE = {
  user: {
    select: {
      id: true,
      email: true,
      displayName: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
  },
  roles: {
    include: {
      role: {
        select: {
          id: true,
          organizationId: true,
          key: true,
          scope: true,
          isSystem: true,
        },
      },
    },
  },
} satisfies Prisma.OrganizationMembershipInclude;

@Injectable()
export class OrganizationRolesManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly serializableTransactionService: SerializableTransactionService,
  ) {}

  async listOrganizationRoles(
    organizationId: string,
  ): Promise<OrganizationRolesResponseDto> {
    const roles = await this.prisma.role.findMany({
      where: {
        organizationId,
        scope: RoleScope.ORGANIZATION,
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }, { key: 'asc' }],
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });

    return {
      roles: roles.map((role) => this.toRoleDto(role)),
    };
  }

  async listPermissionCatalog(): Promise<PermissionCatalogResponseDto> {
    const permissions = await this.prisma.permission.findMany({
      orderBy: { key: 'asc' },
      select: {
        key: true,
        description: true,
      },
    });

    return { permissions };
  }

  async createOrganizationRole(
    organizationId: string,
    dto: CreateOrganizationRoleDto,
  ): Promise<{ role: OrganizationRoleDto }> {
    this.ensureUniquePermissionKeys(dto.permissionKeys);

    for (let attempt = 1; attempt <= MAX_ROLE_KEY_ATTEMPTS; attempt += 1) {
      const key = await this.nextAvailableRoleKey(organizationId, dto.name);

      try {
        const role = await this.serializableTransactionService.run((tx) =>
          this.createRoleInTransaction(tx, organizationId, dto, key),
        );

        return { role };
      } catch (error) {
        if (
          !this.isRoleKeyUniqueCollision(error) ||
          attempt === MAX_ROLE_KEY_ATTEMPTS
        ) {
          if (this.isRoleKeyUniqueCollision(error)) {
            this.throwRoleAlreadyExists();
          }
          throw error;
        }
      }
    }

    this.throwRoleAlreadyExists();
  }

  async updateOrganizationRole(
    organizationId: string,
    roleId: string,
    dto: UpdateOrganizationRoleDto,
  ): Promise<{ role: OrganizationRoleDto }> {
    if (dto.permissionKeys !== undefined) {
      this.ensureUniquePermissionKeys(dto.permissionKeys);
    }

    const role = await this.serializableTransactionService.run((tx) =>
      this.updateRoleInTransaction(tx, organizationId, roleId, dto),
    );

    return { role };
  }

  async deleteOrganizationRole(
    organizationId: string,
    roleId: string,
  ): Promise<{ role: OrganizationRoleDto }> {
    const role = await this.serializableTransactionService.run((tx) =>
      this.deleteRoleInTransaction(tx, organizationId, roleId),
    );

    return { role };
  }

  async replaceMembershipRoles(
    organizationId: string,
    membershipId: string,
    dto: ReplaceMembershipRolesDto,
  ): Promise<OrganizationMemberResponseDto> {
    this.ensureUniqueRoleIds(dto.roleIds);

    const member = await this.serializableTransactionService.run((tx) =>
      this.replaceMembershipRolesInTransaction(
        tx,
        organizationId,
        membershipId,
        dto.roleIds,
      ),
    );

    return { member };
  }

  private async createRoleInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    dto: CreateOrganizationRoleDto,
    key: string,
  ): Promise<OrganizationRoleDto> {
    const permissions = await this.findPermissionsOrThrow(
      tx,
      dto.permissionKeys,
    );
    const role = await tx.role.create({
      data: {
        organizationId,
        scope: RoleScope.ORGANIZATION,
        key,
        name: dto.name,
        description: dto.description ?? null,
        isSystem: false,
        ...(permissions.length > 0
          ? {
              permissions: {
                create: permissions.map((permission) => ({
                  permissionId: permission.id,
                })),
              },
            }
          : {}),
      },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });

    return this.toRoleDto(role);
  }

  private async updateRoleInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    roleId: string,
    dto: UpdateOrganizationRoleDto,
  ): Promise<OrganizationRoleDto> {
    const role = await this.findTenantRoleOrThrow(tx, organizationId, roleId);
    this.ensureCustomRole(role);

    if (dto.permissionKeys !== undefined) {
      const permissions = await this.findPermissionsOrThrow(
        tx,
        dto.permissionKeys,
      );
      await tx.rolePermission.deleteMany({ where: { roleId: role.id } });
      if (permissions.length > 0) {
        await tx.rolePermission.createMany({
          data: permissions.map((permission) => ({
            roleId: role.id,
            permissionId: permission.id,
          })),
        });
      }
    }

    const updated = await tx.role.update({
      where: { id: role.id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.description !== undefined
          ? { description: dto.description }
          : {}),
      },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });

    return this.toRoleDto(updated);
  }

  private async deleteRoleInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    roleId: string,
  ): Promise<OrganizationRoleDto> {
    const role = await this.findTenantRoleOrThrow(tx, organizationId, roleId);
    this.ensureCustomRole(role);

    const assignedCount = await tx.membershipRole.count({
      where: { roleId: role.id },
    });
    if (assignedCount > 0) {
      throw new AuthError(
        'ROLE_IN_USE',
        409,
        'El rol está asignado a una o más membresías',
      );
    }

    const deletedRole = this.toRoleDto(role);
    await tx.role.delete({ where: { id: role.id } });

    return deletedRole;
  }

  private async replaceMembershipRolesInTransaction(
    tx: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
    roleIds: string[],
  ): Promise<OrganizationMemberDto> {
    const membership = await this.findMutableMembershipOrThrow(
      tx,
      organizationId,
      membershipId,
    );
    const requestedRoles = await this.findReplacementRolesOrThrow(
      tx,
      organizationId,
      roleIds,
    );
    const requestedRoleIds = new Set(requestedRoles.map((role) => role.id));
    const currentCustomRoleIds = membership.roles
      .filter((membershipRole) =>
        this.isManagedCustomRole(membershipRole.role, organizationId),
      )
      .map((membershipRole) => membershipRole.role.id);
    const currentCustomRoleIdSet = new Set(currentCustomRoleIds);
    const roleIdsToRemove = currentCustomRoleIds.filter(
      (roleId) => !requestedRoleIds.has(roleId),
    );
    const roleIdsToAdd = roleIds.filter(
      (roleId) => !currentCustomRoleIdSet.has(roleId),
    );

    if (roleIdsToRemove.length > 0) {
      await tx.membershipRole.deleteMany({
        where: {
          membershipId: membership.id,
          roleId: { in: roleIdsToRemove },
        },
      });
    }

    if (roleIdsToAdd.length > 0) {
      await tx.membershipRole.createMany({
        data: roleIdsToAdd.map((roleId) => ({
          membershipId: membership.id,
          roleId,
        })),
      });
    }

    const updatedMembership = await tx.organizationMembership.findFirstOrThrow({
      where: { id: membership.id, organizationId },
      include: MEMBERSHIP_WITH_ROLES_INCLUDE,
    });

    return this.toMemberDto(updatedMembership);
  }

  private async findTenantRoleOrThrow(
    tx: Prisma.TransactionClient,
    organizationId: string,
    roleId: string,
  ) {
    const role = await tx.role.findFirst({
      where: {
        id: roleId,
        organizationId,
        scope: RoleScope.ORGANIZATION,
      },
      include: ROLE_WITH_PERMISSIONS_INCLUDE,
    });

    if (!role) {
      throw new AuthError('ROLE_NOT_FOUND', 404, 'Rol no encontrado');
    }

    return role;
  }

  private async findMutableMembershipOrThrow(
    tx: Prisma.TransactionClient,
    organizationId: string,
    membershipId: string,
  ) {
    const membership = await tx.organizationMembership.findFirst({
      where: {
        id: membershipId,
        organizationId,
        status: { not: MembershipStatus.REMOVED },
      },
      include: MEMBERSHIP_WITH_ROLES_INCLUDE,
    });

    if (!membership) {
      throw new AuthError(
        'MEMBERSHIP_NOT_FOUND',
        404,
        'Membresía no encontrada',
      );
    }

    return membership;
  }

  private async findReplacementRolesOrThrow(
    tx: Prisma.TransactionClient,
    organizationId: string,
    roleIds: string[],
  ): Promise<Array<{ id: string; isSystem: boolean }>> {
    if (roleIds.length === 0) {
      return [];
    }

    const roles = await tx.role.findMany({
      where: {
        id: { in: roleIds },
        organizationId,
        scope: RoleScope.ORGANIZATION,
      },
      select: { id: true, isSystem: true },
    });

    if (roles.length !== roleIds.length) {
      throw new AuthError('ROLE_NOT_FOUND', 404, 'Rol no encontrado');
    }

    if (roles.some((role) => role.isSystem)) {
      throw new AuthError(
        'ROLE_IS_SYSTEM',
        409,
        'Los roles del sistema no pueden asignarse mediante esta operación',
      );
    }

    return roles;
  }

  private ensureCustomRole(role: { isSystem: boolean }): void {
    if (role.isSystem) {
      throw new AuthError(
        'ROLE_IS_SYSTEM',
        409,
        'Los roles del sistema no pueden modificarse',
      );
    }
  }

  private async findPermissionsOrThrow(
    tx: Prisma.TransactionClient,
    permissionKeys: string[],
  ): Promise<Array<{ id: string; key: string }>> {
    if (permissionKeys.length === 0) {
      return [];
    }

    const permissions = await tx.permission.findMany({
      where: { key: { in: permissionKeys } },
      select: { id: true, key: true },
    });

    if (permissions.length !== permissionKeys.length) {
      throw new AuthError(
        'PERMISSION_NOT_FOUND',
        400,
        'Uno o más permisos no existen',
      );
    }

    return permissions;
  }

  private ensureUniquePermissionKeys(permissionKeys: string[]): void {
    if (new Set(permissionKeys).size !== permissionKeys.length) {
      throw new AuthError(
        'VALIDATION_ERROR',
        400,
        'permissionKeys no puede contener duplicados',
      );
    }
  }

  private ensureUniqueRoleIds(roleIds: string[]): void {
    if (new Set(roleIds).size !== roleIds.length) {
      throw new AuthError(
        'VALIDATION_ERROR',
        400,
        'roleIds no puede contener duplicados',
      );
    }
  }

  private isManagedCustomRole(
    role: {
      organizationId: string;
      scope: RoleScope;
      isSystem: boolean;
    },
    organizationId: string,
  ): boolean {
    return (
      role.organizationId === organizationId &&
      role.scope === RoleScope.ORGANIZATION &&
      !role.isSystem
    );
  }

  private async nextAvailableRoleKey(
    organizationId: string,
    name: string,
  ): Promise<string> {
    const baseKey = this.slugRoleKey(name);

    for (let suffix = 1; suffix <= MAX_ROLE_KEY_ATTEMPTS; suffix += 1) {
      const candidate = this.applyRoleKeySuffix(baseKey, suffix);
      const existingRole = await this.prisma.role.findFirst({
        where: {
          organizationId,
          scope: RoleScope.ORGANIZATION,
          key: candidate,
        },
        select: { id: true },
      });
      if (!existingRole) {
        return candidate;
      }
    }

    this.throwRoleAlreadyExists();
  }

  private slugRoleKey(name: string): string {
    const slug = name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    return (slug || ROLE_KEY_FALLBACK).slice(0, ROLE_KEY_MAX_LENGTH);
  }

  private applyRoleKeySuffix(baseKey: string, suffix: number): string {
    if (suffix === 1) {
      return baseKey;
    }

    const suffixText = `-${suffix}`;
    return `${baseKey.slice(0, ROLE_KEY_MAX_LENGTH - suffixText.length)}${suffixText}`;
  }

  private isRoleKeyUniqueCollision(error: unknown): boolean {
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== 'P2002'
    ) {
      return false;
    }

    const target = error.meta?.['target'];
    if (Array.isArray(target)) {
      return ['organizationId', 'scope', 'key'].every((field) =>
        target.includes(field),
      );
    }

    return (
      typeof target === 'string' &&
      ['organizationId', 'scope', 'key'].every((field) =>
        target.includes(field),
      )
    );
  }

  private throwRoleAlreadyExists(): never {
    throw new AuthError(
      'ROLE_ALREADY_EXISTS',
      409,
      'No se pudo generar una clave única para el rol',
    );
  }

  private toRoleDto(
    role: Prisma.RoleGetPayload<{
      include: typeof ROLE_WITH_PERMISSIONS_INCLUDE;
    }>,
  ): OrganizationRoleDto {
    return {
      id: role.id,
      key: role.key,
      name: role.name,
      description: role.description,
      scope: role.scope,
      isSystem: role.isSystem,
      permissions: role.permissions
        .map((rolePermission) => rolePermission.permission.key)
        .sort(),
    };
  }

  private toMemberDto(
    membership: Prisma.OrganizationMembershipGetPayload<{
      include: typeof MEMBERSHIP_WITH_ROLES_INCLUDE;
    }>,
  ): OrganizationMemberDto {
    return {
      id: membership.id,
      status: membership.status,
      joinedAt: membership.joinedAt,
      jobTitle: membership.jobTitle,
      user: membership.user,
      roles: membership.roles.map((membershipRole) => membershipRole.role.key),
    };
  }
}
