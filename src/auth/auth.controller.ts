import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthError } from '../common/exceptions/auth-error';
import { AuthResponseDto } from './dto/auth-response.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { SelectOrganizationDto } from './dto/select-organization.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import type { AuthContext } from './decorators/current-user.decorator';

const REFRESH_COOKIE = 'legacylift_refresh';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  private readonly refreshMaxAgeMs: number;

  constructor(
    private readonly authService: AuthService,
    configService: ConfigService,
  ) {
    const days = configService.get<number>('AUTH_REFRESH_TOKEN_TTL_DAYS') ?? 30;
    this.refreshMaxAgeMs = days * 24 * 60 * 60 * 1000;
  }

  @Post('register')
  @ApiOperation({
    summary: 'Registrar usuario por modo normal o por invitación',
    description:
      'Acepta exactamente uno de dos modos: email + organizationName para registro normal, o invitationToken para registro por invitación.',
  })
  @ApiBody({
    schema: {
      oneOf: [
        {
          type: 'object',
          additionalProperties: false,
          required: [
            'email',
            'password',
            'firstName',
            'lastName',
            'organizationName',
          ],
          properties: {
            email: { type: 'string', format: 'email', example: 'a@b.com' },
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string', example: 'Orlando' },
            lastName: { type: 'string', example: 'Moreno' },
            organizationName: { type: 'string', example: 'Acme Corp' },
          },
        },
        {
          type: 'object',
          additionalProperties: false,
          required: ['password', 'firstName', 'lastName', 'invitationToken'],
          properties: {
            password: { type: 'string', minLength: 8 },
            firstName: { type: 'string', example: 'Orlando' },
            lastName: { type: 'string', example: 'Moreno' },
            invitationToken: {
              type: 'string',
              example: 'plain-invitation-token',
            },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Usuario registrado',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Payload inválido o mezcla de modos de registro',
  })
  @ApiResponse({
    status: 404,
    description: 'INVITATION_NOT_FOUND',
  })
  @ApiResponse({
    status: 409,
    description: 'EMAIL_ALREADY_REGISTERED o INVITATION_ALREADY_ACCEPTED',
  })
  @ApiResponse({
    status: 410,
    description: 'INVITATION_EXPIRED o INVITATION_REVOKED',
  })
  async register(
    @Body() dto: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, refreshToken } = await this.authService.register(dto);
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Post('login')
  @HttpCode(200)
  @ApiOperation({ summary: 'Iniciar sesión y resolver tenant activo' })
  @ApiResponse({
    status: 200,
    description: 'Sesión iniciada',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Credenciales inválidas' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { response, refreshToken } = await this.authService.login(dto);
    this.setRefreshCookie(res, refreshToken);
    return response;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obtener sesión actual' })
  @ApiResponse({
    status: 200,
    description: 'Sesión actual',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  async me(@CurrentUser() user: AuthContext) {
    return this.authService.me(user.userId, user.organizationId);
  }

  @Post('select-organization')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seleccionar organización activa' })
  @ApiResponse({
    status: 200,
    description: 'Organización seleccionada',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 403, description: 'Acceso denegado' })
  async selectOrganization(
    @Body() dto: SelectOrganizationDto,
    @CurrentUser() user: AuthContext,
  ) {
    const { response } = await this.authService.selectOrganization(
      user.userId,
      user.sessionId,
      dto.organizationId,
    );
    return response;
  }

  @Post('refresh')
  @HttpCode(200)
  @ApiOperation({ summary: 'Renovar access token vía cookie' })
  @ApiResponse({ status: 200, description: 'Nuevo access token' })
  @ApiResponse({
    status: 401,
    description: 'Sesión revocada, expirada o refresh token inválido',
  })
  async refresh(@Req() req: Request, @Res() res: Response): Promise<void> {
    const refreshToken = req.cookies?.[REFRESH_COOKIE] as string | undefined;
    if (!refreshToken) {
      throw new AuthError('SESSION_REVOKED', 401, 'Refresh token ausente');
    }
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    res.json({
      auth: {
        accessToken: result.accessToken,
        tokenType: result.tokenType,
        expiresIn: result.expiresIn,
      },
    });
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cerrar sesión' })
  @ApiResponse({ status: 204, description: 'Sesión cerrada' })
  async logout(@CurrentUser() user: AuthContext, @Res() res: Response) {
    await this.authService.logout(user.userId, user.sessionId);
    this.clearRefreshCookie(res);
    res.status(204).send();
  }

  private setRefreshCookie(res: Response, token: string): void {
    res.cookie(REFRESH_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
      maxAge: this.refreshMaxAgeMs,
    });
  }

  private clearRefreshCookie(res: Response): void {
    res.clearCookie(REFRESH_COOKIE, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/api/auth',
    });
  }
}
