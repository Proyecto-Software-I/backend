import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { OrganizationProvisioningModule } from '../organization-provisioning/organization-provisioning.module';
import { PrismaModule } from '../prisma/prisma.module';
import { InvitationsController } from './invitations.controller';
import { OrganizationsController } from './organizations.controller';
import { InvitationsService } from './services/invitations.service';
import { MembershipsService } from './services/memberships.service';
import { OrganizationRolesManagementService } from './services/organization-roles-management.service';

@Module({
  imports: [
    AuthModule,
    AccessControlModule,
    PrismaModule,
    OrganizationProvisioningModule,
  ],
  controllers: [OrganizationsController, InvitationsController],
  providers: [
    MembershipsService,
    InvitationsService,
    OrganizationRolesManagementService,
  ],
})
export class OrganizationsModule {}
