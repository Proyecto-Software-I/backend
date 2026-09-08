import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionGuard } from './guards/permission.guard';
import { OrganizationPermissionResolver } from './services/organization-permission-resolver.service';

@Module({
  imports: [PrismaModule],
  providers: [PermissionGuard, OrganizationPermissionResolver],
  exports: [PermissionGuard, OrganizationPermissionResolver],
})
export class AccessControlModule {}
