import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
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
import type { LegacySystem } from '../generated/prisma/client';
import { TenantRequiredGuard } from '../projects/guards/tenant-required.guard';
import {
  CreateLegacySystemDto,
  LegacySystemErrorResponseDto,
  LegacySystemDto,
  LegacySystemResponseDto,
  LegacySystemsResponseDto,
  UpdateLegacySystemDto,
} from './dto/legacy-system.dto';
import { LegacySystemsService } from './legacy-systems.service';

function asLegacySystemDto(system: LegacySystem): LegacySystemDto {
  return {
    id: system.id,
    projectId: system.projectId,
    code: system.code,
    name: system.name,
    description: system.description,
    businessOwner: system.businessOwner,
    technicalOwner: system.technicalOwner,
    criticality: system.criticality,
    businessDomain: system.businessDomain,
    createdAt: system.createdAt,
    updatedAt: system.updatedAt,
  };
}

const READ_CONTRACT =
  'Requires ordered permissions: projects.read then systems.read. Project-to-System ownership is enforced by the route projectId; a route-ID mismatch for systemId returns SYSTEM_NOT_FOUND. Cross-tenant or foreign-project access is not disclosed and returns PROJECT_NOT_FOUND. Response includes mutable fields (name, description, businessOwner, technicalOwner, criticality, businessDomain) and immutable fields (id, projectId, code, createdAt, updatedAt).';

const WRITE_CONTRACT =
  'Requires ordered permissions: projects.read then systems.manage. Project-to-System ownership is enforced by the route projectId; a route-ID mismatch for systemId returns SYSTEM_NOT_FOUND. Cross-tenant or foreign-project access is not disclosed and returns PROJECT_NOT_FOUND. mutable fields are name, description, businessOwner, technicalOwner, criticality, and businessDomain. immutable fields are id, projectId, code, createdAt, and updatedAt; projectId/code in update payloads are rejected with VALIDATION_ERROR.';

@ApiTags('legacy-systems')
@ApiBearerAuth()
@Controller('projects/:projectId/systems')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class LegacySystemsController {
  constructor(private readonly systems: LegacySystemsService) {}

  @Post()
  @ApiOperation({
    summary: 'Register a legacy system',
    description: WRITE_CONTRACT,
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 201, type: LegacySystemResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or SYSTEM_CRITICALITY_INVALID',
    type: LegacySystemErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'TENANT_REQUIRED, PROJECT_ACCESS_DENIED, or SYSTEM_ACCESS_DENIED',
    type: LegacySystemErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND',
    type: LegacySystemErrorResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: 'SYSTEM_ALREADY_EXISTS',
    type: LegacySystemErrorResponseDto,
  })
  async create(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Body() dto: CreateLegacySystemDto,
  ): Promise<LegacySystemResponseDto> {
    return {
      system: asLegacySystemDto(
        await this.systems.create(user.userId, organizationId, projectId, dto),
      ),
    };
  }

  @Get()
  @ApiOperation({
    summary: 'List legacy systems in a project',
    description: READ_CONTRACT,
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, type: LegacySystemsResponseDto })
  @ApiResponse({
    status: 403,
    description:
      'TENANT_REQUIRED, PROJECT_ACCESS_DENIED, or SYSTEM_ACCESS_DENIED',
    type: LegacySystemErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND',
    type: LegacySystemErrorResponseDto,
  })
  async list(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ): Promise<LegacySystemsResponseDto> {
    return {
      systems: (
        await this.systems.list(user.userId, organizationId, projectId)
      ).map(asLegacySystemDto),
    };
  }

  @Get(':systemId')
  @ApiOperation({
    summary: 'Get a legacy system in a project',
    description: READ_CONTRACT,
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'systemId', format: 'uuid' })
  @ApiResponse({ status: 200, type: LegacySystemResponseDto })
  @ApiResponse({
    status: 403,
    description:
      'TENANT_REQUIRED, PROJECT_ACCESS_DENIED, or SYSTEM_ACCESS_DENIED',
    type: LegacySystemErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND or SYSTEM_NOT_FOUND',
    type: LegacySystemErrorResponseDto,
  })
  async find(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('systemId', new ParseUUIDPipe({ version: '4' })) systemId: string,
  ): Promise<LegacySystemResponseDto> {
    return {
      system: asLegacySystemDto(
        await this.systems.find(
          user.userId,
          organizationId,
          projectId,
          systemId,
        ),
      ),
    };
  }

  @Patch(':systemId')
  @ApiOperation({
    summary: 'Update mutable legacy-system metadata',
    description: WRITE_CONTRACT,
  })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'systemId', format: 'uuid' })
  @ApiResponse({ status: 200, type: LegacySystemResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or SYSTEM_CRITICALITY_INVALID',
    type: LegacySystemErrorResponseDto,
  })
  @ApiResponse({
    status: 403,
    description:
      'TENANT_REQUIRED, PROJECT_ACCESS_DENIED, or SYSTEM_ACCESS_DENIED',
    type: LegacySystemErrorResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND or SYSTEM_NOT_FOUND',
    type: LegacySystemErrorResponseDto,
  })
  async update(
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('systemId', new ParseUUIDPipe({ version: '4' })) systemId: string,
    @Body() dto: UpdateLegacySystemDto,
  ): Promise<LegacySystemResponseDto> {
    return {
      system: asLegacySystemDto(
        await this.systems.update(
          user.userId,
          organizationId,
          projectId,
          systemId,
          dto,
        ),
      ),
    };
  }
}
