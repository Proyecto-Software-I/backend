import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentTenant,
  CurrentUser,
  type AuthContext,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequirePermissions } from '../access-control/decorators/require-permissions.decorator';
import { PermissionGuard } from '../access-control/guards/permission.guard';
import {
  CreateOrganizationInvitationDto,
  CreateOrganizationInvitationResponseDto,
  OrganizationInvitationResponseDto,
  OrganizationInvitationsResponseDto,
} from './dto/invitation-list.dto';
import {
  OrganizationMemberResponseDto,
  OrganizationMembersResponseDto,
  UpdateMembershipStatusDto,
} from './dto/member-list.dto';
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

  @Post('invitations')
  @RequirePermissions('members.manage')
  @ApiOperation({ summary: 'Crear invitación para la organización activa' })
  @ApiResponse({
    status: 201,
    description: 'Invitación creada',
    type: CreateOrganizationInvitationResponseDto,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto. Códigos posibles: MEMBER_ALREADY_EXISTS, INVITATION_ALREADY_PENDING. Formato: { statusCode, code, message }',
  })
  async createInvitation(
    @Body() dto: CreateOrganizationInvitationDto,
    @CurrentTenant() organizationId: string,
    @CurrentUser() user: AuthContext,
  ): Promise<CreateOrganizationInvitationResponseDto> {
    return this.invitationsService.createInvitation({
      organizationId,
      invitedByUserId: user.userId,
      email: dto.email,
    });
  }

  @Delete('invitations/:invitationId')
  @RequirePermissions('members.manage')
  @ApiOperation({ summary: 'Revocar invitación de la organización activa' })
  @ApiResponse({
    status: 200,
    description: 'Invitación revocada',
    type: OrganizationInvitationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  @ApiResponse({ status: 404, description: 'INVITATION_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'INVITATION_ALREADY_ACCEPTED' })
  @ApiResponse({
    status: 410,
    description:
      'Invitación no usable. Códigos posibles: INVITATION_EXPIRED, INVITATION_REVOKED. Formato: { statusCode, code, message }',
  })
  async revokeInvitation(
    @CurrentTenant() organizationId: string,
    @Param('invitationId') invitationId: string,
  ): Promise<OrganizationInvitationResponseDto> {
    return this.invitationsService.revokeInvitation(
      organizationId,
      invitationId,
    );
  }

  @Patch('members/:membershipId')
  @RequirePermissions('members.manage')
  @ApiOperation({
    summary: 'Actualizar estado de miembro de la organización activa',
  })
  @ApiResponse({
    status: 200,
    description: 'Membresía actualizada',
    type: OrganizationMemberResponseDto,
  })
  @ApiResponse({ status: 400, description: 'VALIDATION_ERROR' })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  @ApiResponse({ status: 404, description: 'MEMBERSHIP_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'LAST_OWNER_REQUIRED' })
  async updateMembershipStatus(
    @CurrentTenant() organizationId: string,
    @Param('membershipId') membershipId: string,
    @Body() dto: UpdateMembershipStatusDto,
  ): Promise<OrganizationMemberResponseDto> {
    return this.membershipsService.updateMembershipStatus(
      organizationId,
      membershipId,
      dto.status,
    );
  }

  @Delete('members/:membershipId')
  @RequirePermissions('members.manage')
  @ApiOperation({ summary: 'Remover miembro de la organización activa' })
  @ApiResponse({
    status: 200,
    description: 'Membresía removida',
    type: OrganizationMemberResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  @ApiResponse({ status: 404, description: 'MEMBERSHIP_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'LAST_OWNER_REQUIRED' })
  async removeMembership(
    @CurrentTenant() organizationId: string,
    @Param('membershipId') membershipId: string,
  ): Promise<OrganizationMemberResponseDto> {
    return this.membershipsService.removeMembership(
      organizationId,
      membershipId,
    );
  }
}
