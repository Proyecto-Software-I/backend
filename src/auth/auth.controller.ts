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
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { AuthError } from '../common/exceptions/auth-error';
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
  @ApiOperation({ summary: 'Registrar usuario, organización y sesión' })
  @ApiResponse({ status: 201, description: 'Usuario registrado' })
  @ApiResponse({ status: 409, description: 'Email ya registrado' })
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
  @ApiResponse({ status: 200, description: 'Sesión iniciada' })
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
  @ApiResponse({ status: 200, description: 'Sesión actual' })
  @ApiResponse({ status: 401, description: 'Sesión inválida' })
  async me(@CurrentUser() user: AuthContext) {
    return this.authService.me(user.userId, user.organizationId);
  }

  @Post('select-organization')
  @HttpCode(200)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Seleccionar organización activa' })
  @ApiResponse({ status: 200, description: 'Organización seleccionada' })
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
  @ApiResponse({ status: 401, description: 'Sesión revocada' })
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
