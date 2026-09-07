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
  UpdateProjectRoleDto,
} from './dto/project-role.dto';
import { ProjectRolesService } from './services/project-roles.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects/roles')
@UseGuards(JwtAuthGuard)
export class ProjectRolesController {
  constructor(private readonly roles: ProjectRolesService) {}
  @Get()
  @ApiOperation({ summary: 'List active-tenant project roles' })
  @ApiResponse({ status: 200, description: 'Requires members.read' })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  list(@CurrentTenant() org: string, @CurrentUser() user: AuthContext) {
    return this.roles.list(user.userId, org).then((roles) => ({ roles }));
  }
  @Post()
  @ApiOperation({ summary: 'Create a tenant PROJECT role' })
  @ApiResponse({ status: 201, description: 'Requires members.manage' })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or PROJECT_ROLE_INVALID',
  })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  create(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Body() dto: CreateProjectRoleDto,
  ) {
    return this.roles.create(user.userId, org, dto).then((role) => ({ role }));
  }
  @Patch(':roleId')
  @ApiOperation({ summary: 'Update a non-system PROJECT role' })
  @ApiParam({ name: 'roleId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Requires members.manage' })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or PROJECT_ROLE_INVALID',
  })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  @ApiResponse({ status: 404, description: 'ROLE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ROLE_IS_SYSTEM' })
  update(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
    @Body() dto: UpdateProjectRoleDto,
  ) {
    return this.roles
      .update(user.userId, org, roleId, dto)
      .then((role) => ({ role }));
  }
  @Delete(':roleId')
  @ApiOperation({ summary: 'Delete an unused non-system PROJECT role' })
  @ApiParam({ name: 'roleId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Requires members.manage' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  @ApiResponse({ status: 404, description: 'ROLE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ROLE_IS_SYSTEM or ROLE_IN_USE' })
  delete(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('roleId', new ParseUUIDPipe({ version: '4' })) roleId: string,
  ) {
    return this.roles
      .delete(user.userId, org, roleId)
      .then((role) => ({ role }));
  }
}
