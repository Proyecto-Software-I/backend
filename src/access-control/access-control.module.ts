import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionGuard } from './guards/permission.guard';

@Module({
  imports: [PrismaModule],
  providers: [PermissionGuard],
  exports: [PermissionGuard],
})
export class AccessControlModule {}
