import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentTenant } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../access-control/guards/permission.guard';
import { OrganizationInvitationsResponseDto } from './dto/invitation-list.dto';
import { OrganizationMembersResponseDto } from './dto/member-list.dto';
import { InvitationsService } from './services/invitations.service';
import { MembershipsService } from './services/memberships.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations/current')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrganizationsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly invitationsService: InvitationsService,
  ) {}

  @Get('members')
  @RequirePermissions('members.read')
  @ApiOperation({ summary: 'Listar miembros de la organización activa' })
  @ApiResponse({
    status: 200,
    description: 'Miembros de la organización activa',
    type: OrganizationMembersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  async listMembers(
    @CurrentTenant() organizationId: string,
  ): Promise<OrganizationMembersResponseDto> {
    return this.membershipsService.listCurrentMembers(organizationId);
  }

  @Get('invitations')
  @RequirePermissions('members.read')
  @ApiOperation({ summary: 'Listar invitaciones de la organización activa' })
  @ApiResponse({
    status: 200,
    description: 'Invitaciones de la organización activa',
    type: OrganizationInvitationsResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  async listInvitations(
    @CurrentTenant() organizationId: string,
  ): Promise<OrganizationInvitationsResponseDto> {
    return this.invitationsService.listCurrentInvitations(organizationId);
  }
}
