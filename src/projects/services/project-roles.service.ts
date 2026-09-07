import { Injectable } from '@nestjs/common';
import { Prisma, RoleScope } from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProjectRoleDto,
  UpdateProjectRoleDto,
} from '../dto/project-role.dto';
import { ProjectAuthorizationService } from './project-authorization.service';

const PROJECT_PERMISSIONS = new Set([
  'projects.read',
  'projects.manage',
  'projects.delete',
]);

@Injectable()
export class ProjectRolesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: ProjectAuthorizationService,
    private readonly transactions?: SerializableTransactionService,
  ) {}

  async list(userId: string, organizationId: string) {
    await this.authorization.requireOrganization(
      userId,
      organizationId,
      'members.read',
    );
    return this.prisma.role.findMany({
      where: { organizationId, scope: RoleScope.PROJECT },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async create(
    userId: string,
    organizationId: string,
    dto: CreateProjectRoleDto,
  ) {
    return this.write(async (tx) => {
      const access = await this.authorization.requireOrganization(
        userId,
        organizationId,
        'members.manage',
        tx,
      );
      this.validatePermissions(dto.permissionKeys, access.permissions);
      return tx.role.create({
        data: {
          organizationId,
          scope: RoleScope.PROJECT,
          key: this.slug(dto.name),
          name: dto.name,
          description: dto.description,
          permissions: {
            create: await this.permissionLinks(dto.permissionKeys, tx),
          },
        },
        include: { permissions: { include: { permission: true } } },
      });
    });
  }

  async update(
    userId: string,
    organizationId: string,
    roleId: string,
    dto: UpdateProjectRoleDto,
  ) {
    return this.write(async (tx) => {
      const access = await this.authorization.requireOrganization(
        userId,
        organizationId,
        'members.manage',
        tx,
      );
      const role = await this.find(organizationId, roleId, tx);
      if (role.isSystem)
        throw new AuthError(
          'ROLE_IS_SYSTEM',
          409,
          'System roles cannot be changed',
        );
      if (dto.permissionKeys)
        this.validatePermissions(dto.permissionKeys, access.permissions);
      return tx.role.update({
        where: { id: role.id },
        data: {
          name: dto.name,
          description: dto.description,
          ...(dto.permissionKeys
            ? {
                permissions: {
                  deleteMany: {},
                  create: await this.permissionLinks(dto.permissionKeys, tx),
                },
              }
            : {}),
        },
        include: { permissions: { include: { permission: true } } },
      });
    });
  }

  async delete(userId: string, organizationId: string, roleId: string) {
    return this.write(async (tx) => {
      await this.authorization.requireOrganization(
        userId,
        organizationId,
        'members.manage',
        tx,
      );
      const role = await this.find(organizationId, roleId, tx);
      if (role.isSystem)
        throw new AuthError(
          'ROLE_IS_SYSTEM',
          409,
          'System roles cannot be deleted',
        );
      const [projectAccessCount, membershipRoleCount] = await Promise.all([
        tx.projectAccess.count({ where: { roleId } }),
        tx.membershipRole.count({ where: { roleId } }),
      ]);
      if (projectAccessCount || membershipRoleCount)
        throw new AuthError('ROLE_IN_USE', 409, 'Role is in use');
      return tx.role.delete({ where: { id: roleId } });
    });
  }

  private async find(
    organizationId: string,
    roleId: string,
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const role = await client.role.findFirst({
      where: { id: roleId, organizationId, scope: RoleScope.PROJECT },
    });
    if (!role) throw new AuthError('ROLE_NOT_FOUND', 404, 'Role not found');
    return role;
  }

  private write<T>(callback: (tx: Prisma.TransactionClient) => Promise<T>) {
    return this.transactions
      ? this.transactions.run(callback)
      : callback(this.prisma);
  }

  private validatePermissions(keys: string[], delegated: string[]) {
    if (
      new Set(keys).size !== keys.length ||
      keys.some(
        (key) => !PROJECT_PERMISSIONS.has(key) || !delegated.includes(key),
      )
    )
      throw new AuthError(
        'PROJECT_ROLE_INVALID',
        400,
        'Invalid project role permissions',
      );
  }

  private async permissionLinks(
    keys: string[],
    client: PrismaService | Prisma.TransactionClient = this.prisma,
  ) {
    const permissions = await client.permission.findMany({
      where: { key: { in: keys } },
    });
    if (permissions.length !== keys.length)
      throw new AuthError(
        'PROJECT_ROLE_INVALID',
        400,
        'Invalid project role permissions',
      );
    return permissions.map(({ id }) => ({ permissionId: id }));
  }

  private slug(name: string) {
    return name
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 100);
  }
}
