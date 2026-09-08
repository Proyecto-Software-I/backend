import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  ParseUUIDPipe,
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
import {
  CreateProjectRoleDto,
  ProjectRoleDto,
  ProjectRoleResponseDto,
  ProjectRolesResponseDto,
  UpdateProjectRoleDto,
} from './dto/project-role.dto';
import { TenantRequiredGuard } from './guards/tenant-required.guard';
import { ProjectRolesService } from './services/project-roles.service';

type RoleWithPermissions = Awaited<
  ReturnType<ProjectRolesService['list']>
>[number];

function asProjectRoleDto(role: RoleWithPermissions): ProjectRoleDto {
  return {
    id: role.id,
    key: role.key,
    name: role.name,
    description: role.description,
    permissions: role.permissions.map(({ permission }) => ({
      key: permission.key,
    })),
  };
}

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects/roles')
@UseGuards(JwtAuthGuard, TenantRequiredGuard)
export class ProjectRolesController {
  constructor(private readonly roles: ProjectRolesService) {}
  @Get()
  @ApiOperation({ summary: 'List active-tenant project roles' })
  @ApiResponse({ status: 200, type: ProjectRolesResponseDto })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  async list(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
  ): Promise<ProjectRolesResponseDto> {
    return {
      roles: (await this.roles.list(user.userId, org)).map(asProjectRoleDto),
    };
  }
  @Post()
  @ApiOperation({ summary: 'Create a tenant PROJECT role' })
  @ApiResponse({ status: 201, type: ProjectRoleResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or PROJECT_ROLE_INVALID',
  })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  async create(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Body() dto: CreateProjectRoleDto,
  ): Promise<ProjectRoleResponseDto> {
    return {
      role: asProjectRoleDto(await this.roles.create(user.userId, org, dto)),
    };
  }
  @Patch(':roleId')
  @ApiOperation({ summary: 'Update a non-system PROJECT role' })
  @ApiParam({ name: 'roleId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectRoleResponseDto })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or PROJECT_ROLE_INVALID',
  })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  @ApiResponse({ status: 404, description: 'ROLE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ROLE_IS_SYSTEM' })
  async update(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
    @Body() dto: UpdateProjectRoleDto,
  ): Promise<ProjectRoleResponseDto> {
    return {
      role: asProjectRoleDto(
        await this.roles.update(user.userId, org, roleId, dto),
      ),
    };
  }
  @Delete(':roleId')
  @ApiOperation({ summary: 'Delete an unused non-system PROJECT role' })
  @ApiParam({ name: 'roleId', format: 'uuid' })
  @ApiResponse({ status: 200, type: ProjectRoleResponseDto })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  @ApiResponse({ status: 404, description: 'ROLE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ROLE_IS_SYSTEM or ROLE_IN_USE' })
  async delete(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
  ): Promise<ProjectRoleResponseDto> {
    return {
      role: asProjectRoleDto(await this.roles.delete(user.userId, org, roleId)),
    };
  }
}
