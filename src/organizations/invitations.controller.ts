import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type AuthContext,
} from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  InvitationPreviewResponseDto,
  OrganizationInvitationResponseDto,
} from './dto/invitation-list.dto';
import { InvitationsService } from './services/invitations.service';

@ApiTags('invitations')
@Controller('invitations')
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Get(':token')
  @ApiOperation({ summary: 'Previsualizar invitación por token' })
  @ApiResponse({
    status: 200,
    description: 'Invitación válida',
    type: InvitationPreviewResponseDto,
  })
  @ApiResponse({ status: 404, description: 'INVITATION_NOT_FOUND' })
  @ApiResponse({ status: 409, description: 'INVITATION_ALREADY_ACCEPTED' })
  @ApiResponse({
    status: 410,
    description:
      'Invitación no usable. Códigos posibles: INVITATION_EXPIRED, INVITATION_REVOKED. Formato: { statusCode, code, message }',
  })
  async previewInvitation(
    @Param('token') token: string,
  ): Promise<InvitationPreviewResponseDto> {
    return this.invitationsService.previewInvitation(token);
  }

  @Post(':token/accept')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Aceptar invitación como usuario existente' })
  @ApiResponse({
    status: 200,
    description: 'Invitación aceptada',
    type: OrganizationInvitationResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  @ApiResponse({ status: 403, description: 'INVITATION_EMAIL_MISMATCH' })
  @ApiResponse({ status: 404, description: 'INVITATION_NOT_FOUND' })
  @ApiResponse({
    status: 409,
    description:
      'Conflicto. Códigos posibles: INVITATION_ALREADY_ACCEPTED, MEMBER_ALREADY_EXISTS. Formato: { statusCode, code, message }',
  })
  @ApiResponse({
    status: 410,
    description:
      'Invitación no usable. Códigos posibles: INVITATION_EXPIRED, INVITATION_REVOKED. Formato: { statusCode, code, message }',
  })
  async acceptInvitation(
    @Param('token') token: string,
    @CurrentUser() user: AuthContext,
  ): Promise<OrganizationInvitationResponseDto> {
    return this.invitationsService.acceptInvitation(token, user.userId);
  }
}
