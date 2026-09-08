import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentTenant,
  CurrentUser,
  type AuthContext,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { Project } from '../generated/prisma/client';
import {
  CreateProjectDto,
  ProjectDto,
  ProjectListQueryDto,
  ProjectResponseDto,
  ProjectsResponseDto,
  UpdateProjectDto,
  UpdateProjectStatusDto,
} from './dto/project.dto';
import { ProjectsService } from './services/projects.service';
import { TenantRequiredGuard } from './guards/tenant-required.guard';

function asProjectDto(project: Project): ProjectDto {
  return {
    id: project.id,
    key: project.key,
    name: project.name,
    description: project.description,
    status: project.status,
    clientReference: project.clientReference,
    tags: Array.isArray(project.tags)
      ? project.tags.filter(
          (tag: unknown): tag is string => typeof tag === 'string',
        )
      : [],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
    archivedAt: project.archivedAt,
  };
}

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ProjectsController {
  constructor(private readonly projects: ProjectsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a project in the active tenant' })
  @ApiResponse({ status: 201, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({ status: 409, description: 'PROJECT_ALREADY_EXISTS' })
  async create(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Body() dto: CreateProjectDto,
  ): Promise<ProjectResponseDto> {
    return {
      project: asProjectDto(
        await this.projects.create(user.userId, organizationId, dto),
      ),
    };
  }

  @Get()
  @ApiOperation({ summary: 'List accessible tenant projects' })
  @ApiResponse({ status: 200, type: ProjectsResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 403, description: 'TENANT_REQUIRED' })
  async list(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Query() query: ProjectListQueryDto,
  ): Promise<ProjectsResponseDto> {
    return {
      projects: (
        await this.projects.list(user.userId, organizationId, query.archived)
      ).map(asProjectDto),
    };
  }

  @Get(':projectId')
  @ApiOperation({ summary: 'Get an accessible tenant project' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  async find(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ): Promise<ProjectResponseDto> {
    return {
      project: asProjectDto(
        await this.projects.find(user.userId, organizationId, projectId),
      ),
    };
  }

  @Patch(':projectId')
  @ApiOperation({ summary: 'Update permitted project metadata' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PROJECT_ALREADY_ARCHIVED' })
  async update(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() dto: UpdateProjectDto,
  ): Promise<ProjectResponseDto> {
    return {
      project: asProjectDto(
        await this.projects.update(user.userId, organizationId, projectId, dto),
      ),
    };
  }

  @Patch(':projectId/status')
  @ApiOperation({ summary: 'Advance the strict project workflow' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or PROJECT_STATUS_INVALID',
  })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description: 'PROJECT_STATUS_TRANSITION_INVALID',
  })
  async updateStatus(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() dto: UpdateProjectStatusDto,
  ): Promise<ProjectResponseDto> {
    return {
      project: asProjectDto(
        await this.projects.updateStatus(
          user.userId,
          organizationId,
          projectId,
          dto.status,
        ),
      ),
    };
  }

  @Delete(':projectId')
  @ApiOperation({ summary: 'Archive a project without deleting it' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'PROJECT_ALREADY_ARCHIVED' })
  async archive(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ): Promise<ProjectResponseDto> {
    return {
      project: asProjectDto(
        await this.projects.archive(user.userId, organizationId, projectId),
      ),
    };
  }
}
