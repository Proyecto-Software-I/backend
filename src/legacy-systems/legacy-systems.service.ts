import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { AuthError } from '../common/exceptions/auth-error';
import { PrismaService } from '../prisma/prisma.service';
import { ProjectAuthorizationService } from '../projects/services/project-authorization.service';
import {
  CreateLegacySystemDto,
  UpdateLegacySystemDto,
} from './dto/legacy-system.dto';

@Injectable()
export class LegacySystemsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authorization: ProjectAuthorizationService,
  ) {}

  async create(
    userId: string,
    organizationId: string,
    projectId: string,
    dto: CreateLegacySystemDto,
  ) {
    await this.requireProjectPermission(
      userId,
      organizationId,
      projectId,
      'systems.manage',
    );
    try {
      return await this.prisma.legacySystem.create({
        data: {
          projectId,
          code: dto.code,
          name: dto.name,
          description: dto.description,
          businessOwner: dto.businessOwner,
          technicalOwner: dto.technicalOwner,
          criticality: dto.criticality,
          businessDomain: dto.businessDomain,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AuthError(
          'SYSTEM_ALREADY_EXISTS',
          409,
          'A system with this code already exists in the project',
        );
      }
      throw error;
    }
  }

  async list(userId: string, organizationId: string, projectId: string) {
    await this.requireProjectPermission(
      userId,
      organizationId,
      projectId,
      'systems.read',
    );
    return this.prisma.legacySystem.findMany({
      where: { projectId, deletedAt: null },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
    });
  }

  async find(
    userId: string,
    organizationId: string,
    projectId: string,
    systemId: string,
  ) {
    await this.requireProjectPermission(
      userId,
      organizationId,
      projectId,
      'systems.read',
    );
    return this.findSystem(projectId, systemId);
  }

  async update(
    userId: string,
    organizationId: string,
    projectId: string,
    systemId: string,
    dto: UpdateLegacySystemDto,
  ) {
    await this.requireProjectPermission(
      userId,
      organizationId,
      projectId,
      'systems.manage',
    );
    const system = await this.findSystem(projectId, systemId);
    return this.prisma.legacySystem.update({
      where: { id: system.id },
      data: dto,
    });
  }

  private async requireProjectPermission(
    userId: string,
    organizationId: string,
    projectId: string,
    permission: 'systems.read' | 'systems.manage',
  ): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId, deletedAt: null },
    });
    if (!project) {
      throw new AuthError('PROJECT_NOT_FOUND', 404, 'Project not found');
    }
    const permissions = await this.authorization.permissionsFor(
      userId,
      organizationId,
      projectId,
    );
    if (!permissions.has('projects.read')) {
      throw new AuthError(
        'PROJECT_ACCESS_DENIED',
        403,
        'Project access denied',
      );
    }
    if (!permissions.has(permission)) {
      throw new AuthError('SYSTEM_ACCESS_DENIED', 403, 'System access denied');
    }
  }

  private async findSystem(projectId: string, systemId: string) {
    const system = await this.prisma.legacySystem.findFirst({
      where: { id: systemId, projectId, deletedAt: null },
    });
    if (!system) {
      throw new AuthError('SYSTEM_NOT_FOUND', 404, 'System not found');
    }
    return system;
  }
}
