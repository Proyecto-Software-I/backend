import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Put,
  ParseUUIDPipe,
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
import {
  ProjectAccessDto,
  ProjectAccessesResponseDto,
  ProjectAccessResponseDto,
  ReplaceProjectAccessDto,
} from './dto/project-access.dto';
import { TenantRequiredGuard } from './guards/tenant-required.guard';
import { ProjectAccessService } from './services/project-access.service';

type AccessWithRelations = Awaited<
  ReturnType<ProjectAccessService['list']>
>[number];

function asProjectAccessDto(access: AccessWithRelations): ProjectAccessDto {
  return {
    projectId: access.projectId,
    membership: {
      id: access.membership.id,
      userId: access.membership.user.id,
      email: access.membership.user.email,
      displayName: access.membership.user.displayName,
    },
    role: {
      id: access.role.id,
      key: access.role.key,
      name: access.role.name,
    },
  };
}

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects/:projectId/accesses')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ProjectAccessController {
  constructor(private readonly accesses: ProjectAccessService) {}
  @Get()
  @ApiOperation({ summary: 'List project access assignments' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectAccessesResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  async list(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ): Promise<ProjectAccessesResponseDto> {
    return {
      accesses: (await this.accesses.list(user.userId, org, projectId)).map(
        asProjectAccessDto,
      ),
    };
  }
  @Put(':membershipId')
  @ApiOperation({ summary: 'Create or replace project access' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectAccessResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or PROJECT_ACCESS_INVALID',
  })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND, ROLE_NOT_FOUND, or MEMBERSHIP_NOT_FOUND',
  })
  async put(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('membershipId', new ParseUUIDPipe({ version: '4' }))
    membershipId: string,
    @Body() dto: ReplaceProjectAccessDto,
  ): Promise<ProjectAccessResponseDto> {
    const access = await this.accesses.put(
      user.userId,
      org,
      projectId,
      membershipId,
      dto.roleId,
    );
    return {
      access: asProjectAccessDto(access),
    };
  }
  @Delete(':membershipId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke project access idempotently' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Requires members.manage' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({
    status: 403,
    description: 'TENANT_REQUIRED or PROJECT_ACCESS_DENIED',
  })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  async delete(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('membershipId', new ParseUUIDPipe({ version: '4' }))
    membershipId: string,
  ): Promise<void> {
    await this.accesses.delete(user.userId, org, projectId, membershipId);
  }
}
