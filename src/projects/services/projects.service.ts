import { Injectable } from '@nestjs/common';
import {
  MembershipStatus,
  Prisma,
  ProjectStatus,
  RoleScope,
} from '../../generated/prisma/client';
import { AuthError } from '../../common/exceptions/auth-error';
import { SerializableTransactionService } from '../../organization-provisioning/services/serializable-transaction.service';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateProjectDto,
  normalizeProjectKey,
  UpdateProjectDto,
} from '../dto/project.dto';
import { ProjectAuthorizationService } from './project-authorization.service';

const CREATOR_PERMISSIONS = [
  'projects.read',
  'projects.manage',
  'projects.delete',
];
const NEXT_STATUS: Partial<Record<ProjectStatus, ProjectStatus>> = {
  [ProjectStatus.DRAFT]: ProjectStatus.DISCOVERY,
  [ProjectStatus.DISCOVERY]: ProjectStatus.PLANNING,
  [ProjectStatus.PLANNING]: ProjectStatus.MIGRATING,
  [ProjectStatus.MIGRATING]: ProjectStatus.VALIDATING,
  [ProjectStatus.VALIDATING]: ProjectStatus.COMPLETED,
};

@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: SerializableTransactionService,
    private readonly authorization: ProjectAuthorizationService,
  ) {}

  async create(userId: string, organizationId: string, dto: CreateProjectDto) {
    const access = await this.authorization.requireOrganization(
      userId,
      organizationId,
      'projects.create',
    );
    try {
      return await this.transactions.run(async (tx) => {
        const role = await tx.role.upsert({
          where: {
            organizationId_scope_key: {
              organizationId,
              scope: RoleScope.PROJECT,
              key: 'PROJECT_CREATOR',
            },
          },
          update: { name: 'Project creator', isSystem: true },
          create: {
            organizationId,
            scope: RoleScope.PROJECT,
            key: 'PROJECT_CREATOR',
            name: 'Project creator',
            isSystem: true,
          },
        });
        const permissions = await tx.permission.findMany({
          where: { key: { in: CREATOR_PERMISSIONS } },
        });
        if (permissions.length !== CREATOR_PERMISSIONS.length)
          throw new Error('Project permissions are missing');
        await tx.rolePermission.deleteMany({
          where: {
            roleId: role.id,
            permissionId: { notIn: permissions.map(({ id }) => id) },
          },
        });
        await Promise.all(
          permissions.map(({ id }) =>
            tx.rolePermission.upsert({
              where: {
                roleId_permissionId: { roleId: role.id, permissionId: id },
              },
              update: {},
              create: { roleId: role.id, permissionId: id },
            }),
          ),
        );
        const project = await tx.project.create({
          data: {
            organizationId,
            createdByUserId: userId,
            key: normalizeProjectKey(dto.key),
            name: dto.name,
            description: dto.description,
            clientReference: dto.clientReference,
            tags: dto.tags ?? [],
            status: ProjectStatus.DRAFT,
          },
        });
        await tx.projectAccess.create({
          data: {
            projectId: project.id,
            membershipId: access.membershipId,
            roleId: role.id,
          },
        });
        return project;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      )
        throw new AuthError(
          'PROJECT_ALREADY_EXISTS',
          409,
          'Project key already exists',
        );
      throw error;
    }
  }

  async list(userId: string, organizationId: string | null, archived = false) {
    if (!organizationId) {
      throw new AuthError(
        'TENANT_REQUIRED',
        403,
        'Organización activa requerida',
      );
    }
    let access;
    try {
      access = await this.authorization.requireOrganization(
        userId,
        organizationId,
        'projects.read',
      );
    } catch (error) {
      if (
        error instanceof AuthError &&
        error.code === 'PROJECT_ACCESS_DENIED'
      ) {
        access = null;
      } else {
        throw error;
      }
    }
    const where = {
      organizationId,
      deletedAt: null,
      status: archived
        ? ProjectStatus.ARCHIVED
        : { not: ProjectStatus.ARCHIVED },
      ...(access
        ? {}
        : {
            accesses: {
              some: {
                membership: {
                  userId,
                  organizationId,
                  status: MembershipStatus.ACTIVE,
                },
                role: {
                  organizationId,
                  scope: RoleScope.PROJECT,
                  permissions: {
                    some: { permission: { key: 'projects.read' } },
                  },
                },
              },
            },
          }),
    };
    return this.prisma.project.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async find(userId: string, organizationId: string, projectId: string) {
    const project = await this.findInTenant(organizationId, projectId);
    await this.authorization.requireProject(
      userId,
      organizationId,
      projectId,
      'projects.read',
    );
    return project;
  }

  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    dto: UpdateProjectDto,
  ) {
    const project = await this.findInTenant(organizationId, projectId);
    if (project.status === ProjectStatus.ARCHIVED)
      throw new AuthError(
        'PROJECT_ALREADY_ARCHIVED',
        409,
        'Project is archived',
      );
    await this.authorization.requireProject(
      userId,
      organizationId,
      projectId,
      'projects.manage',
    );
    return this.prisma.project.update({ where: { id: projectId }, data: dto });
  }

  async updateStatus(
    userId: string,
    organizationId: string,
    projectId: string,
    status: ProjectStatus,
  ) {
    const project = await this.findInTenant(organizationId, projectId);
    if (status === ProjectStatus.ARCHIVED || status === ProjectStatus.ON_HOLD)
      throw new AuthError(
        'PROJECT_STATUS_INVALID',
        400,
        'Invalid project status',
      );
    if (NEXT_STATUS[project.status] !== status)
      throw new AuthError(
        'PROJECT_STATUS_TRANSITION_INVALID',
        409,
        'Invalid project status transition',
      );
    await this.authorization.requireProject(
      userId,
      organizationId,
      projectId,
      'projects.manage',
    );
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status },
    });
  }

  async archive(userId: string, organizationId: string, projectId: string) {
    const project = await this.findInTenant(organizationId, projectId);
    if (project.status === ProjectStatus.ARCHIVED || project.archivedAt)
      throw new AuthError(
        'PROJECT_ALREADY_ARCHIVED',
        409,
        'Project is already archived',
      );
    await this.authorization.requireProject(
      userId,
      organizationId,
      projectId,
      'projects.delete',
    );
    const archivedAt = new Date();
    return this.prisma.project.update({
      where: { id: projectId },
      data: { status: ProjectStatus.ARCHIVED, archivedAt },
    });
  }

  private async findInTenant(organizationId: string, projectId: string) {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) {
      throw new AuthError('PROJECT_NOT_FOUND', 404, 'Project not found');
    }
    return project;
  }
}
