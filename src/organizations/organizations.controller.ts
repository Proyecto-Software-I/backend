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
import {
  CreateOrganizationRoleDto,
  OrganizationRoleDto,
  OrganizationRoleResponseDto,
  OrganizationRolesResponseDto,
  PermissionCatalogResponseDto,
  UpdateOrganizationRoleDto,
} from './dto/role-list.dto';
import { InvitationsService } from './services/invitations.service';
import { MembershipsService } from './services/memberships.service';
import { OrganizationRolesManagementService } from './services/organization-roles-management.service';

@ApiTags('organizations')
@ApiBearerAuth()
@Controller('organizations/current')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class OrganizationsController {
  constructor(
    private readonly membershipsService: MembershipsService,
    private readonly invitationsService: InvitationsService,
    private readonly rolesService: OrganizationRolesManagementService,
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

  @Get('roles')
  @RequirePermissions('members.read')
  @ApiOperation({ summary: 'Listar roles de la organización activa' })
  @ApiResponse({
    status: 200,
    description: 'Roles ORGANIZATION de la organización activa',
    type: OrganizationRolesResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  async listRoles(
    @CurrentTenant() organizationId: string,
  ): Promise<OrganizationRolesResponseDto> {
    return this.rolesService.listOrganizationRoles(organizationId);
  }

  @Get('permissions')
  @RequirePermissions('members.read')
  @ApiOperation({ summary: 'Listar catálogo global de permisos' })
  @ApiResponse({
    status: 200,
    description: 'Catálogo global de permisos',
    type: PermissionCatalogResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  async listPermissions(): Promise<PermissionCatalogResponseDto> {
    return this.rolesService.listPermissionCatalog();
  }

  @Post('roles')
  @RequirePermissions('members.manage')
  @ApiOperation({
    summary: 'Crear rol personalizado de la organización activa',
  })
  @ApiResponse({
    status: 201,
    description: 'Rol personalizado creado',
    type: OrganizationRoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR, PERMISSION_NOT_FOUND',
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  @ApiResponse({ status: 409, description: 'ROLE_ALREADY_EXISTS' })
  async createRole(
    @CurrentTenant() organizationId: string,
    @Body() dto: CreateOrganizationRoleDto,
  ): Promise<{ role: OrganizationRoleDto }> {
    return this.rolesService.createOrganizationRole(organizationId, dto);
  }

  @Patch('roles/:roleId')
  @RequirePermissions('members.manage')
  @ApiOperation({
    summary: 'Actualizar rol personalizado de la organización activa',
  })
  @ApiResponse({
    status: 200,
    description: 'Rol personalizado actualizado',
    type: OrganizationRoleResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'VALIDATION_ERROR, PERMISSION_NOT_FOUND',
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  @ApiResponse({ status: 404, description: 'ROLE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ROLE_IS_SYSTEM' })
  async updateRole(
    @CurrentTenant() organizationId: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateOrganizationRoleDto,
  ): Promise<{ role: OrganizationRoleDto }> {
    return this.rolesService.updateOrganizationRole(
      organizationId,
      roleId,
      dto,
    );
  }

  @Delete('roles/:roleId')
  @RequirePermissions('members.manage')
  @ApiOperation({
    summary: 'Eliminar rol personalizado de la organización activa',
  })
  @ApiResponse({
    status: 200,
    description: 'Rol personalizado eliminado',
    type: OrganizationRoleResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({
    status: 403,
    description:
      'Acceso denegado. Códigos posibles: TENANT_REQUIRED, MEMBER_ACCESS_DENIED. Formato: { statusCode, code, message }',
  })
  @ApiResponse({ status: 404, description: 'ROLE_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'ROLE_IS_SYSTEM, ROLE_IN_USE' })
  async deleteRole(
    @CurrentTenant() organizationId: string,
    @Param('roleId') roleId: string,
  ): Promise<{ role: OrganizationRoleDto }> {
    return this.rolesService.deleteOrganizationRole(organizationId, roleId);
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
