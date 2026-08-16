import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokenService,
    SessionService,
    JwtAuthGuard,
  ],
  exports: [JwtAuthGuard, TokenService],
})
export class AuthModule {}
