import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationProvisioningModule } from '../organization-provisioning/organization-provisioning.module';
import { PrismaModule } from '../prisma/prisma.module';
import { ProjectAccessController } from './project-access.controller';
import { ProjectRolesController } from './project-roles.controller';
import { ProjectsController } from './projects.controller';
import { ProjectAccessService } from './services/project-access.service';
import { ProjectAuthorizationService } from './services/project-authorization.service';
import { ProjectRolesService } from './services/project-roles.service';
import { ProjectsService } from './services/projects.service';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    AccessControlModule,
    OrganizationProvisioningModule,
  ],
  controllers: [
    ProjectRolesController,
    ProjectAccessController,
    ProjectsController,
  ],
  providers: [
    ProjectsService,
    ProjectAuthorizationService,
    ProjectRolesService,
    ProjectAccessService,
  ],
})
export class ProjectsModule {}
