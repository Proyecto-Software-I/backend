import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TenantRequiredGuard } from '../projects/guards/tenant-required.guard';
import { ProjectsModule } from '../projects/projects.module';
import { LegacySystemsController } from './legacy-systems.controller';
import { LegacySystemsService } from './legacy-systems.service';

@Module({
  imports: [PrismaModule, AuthModule, ProjectsModule],
  controllers: [LegacySystemsController],
  providers: [LegacySystemsService, TenantRequiredGuard],
})
export class LegacySystemsModule {}
