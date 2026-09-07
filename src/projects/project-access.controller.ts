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
import { ReplaceProjectAccessDto } from './dto/project-access.dto';
import { ProjectAccessService } from './services/project-access.service';

@ApiTags('projects')
@ApiBearerAuth()
@Controller('projects/:projectId/accesses')
@UseGuards(JwtAuthGuard)
export class ProjectAccessController {
  constructor(private readonly accesses: ProjectAccessService) {}
  @Get()
  @ApiOperation({ summary: 'List project access assignments' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Requires members.manage' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  @ApiResponse({ status: 404, description: 'PROJECT_NOT_FOUND' })
  list(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
  ) {
    return this.accesses
      .list(user.userId, org, projectId)
      .then((accesses) => ({ accesses }));
  }
  @Put(':membershipId')
  @ApiOperation({ summary: 'Create or replace project access' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Requires members.manage' })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR or PROJECT_ACCESS_INVALID',
  })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
  @ApiResponse({
    status: 404,
    description: 'PROJECT_NOT_FOUND, ROLE_NOT_FOUND, or MEMBERSHIP_NOT_FOUND',
  })
  put(
    @CurrentTenant() org: string,
    @CurrentUser() user: AuthContext,
    @Param('projectId', new ParseUUIDPipe({ version: '4' })) projectId: string,
    @Param('membershipId', new ParseUUIDPipe({ version: '4' }))
    membershipId: string,
    @Body() dto: ReplaceProjectAccessDto,
  ) {
    return this.accesses.put(
      user.userId,
      org,
      projectId,
      membershipId,
      dto.roleId,
    );
  }
  @Delete(':membershipId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke project access idempotently' })
  @ApiParam({ name: 'projectId', format: 'uuid' })
  @ApiParam({ name: 'membershipId', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Requires members.manage' })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 403, description: 'PROJECT_ACCESS_DENIED' })
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
