import { Module } from '@nestjs/common';
import { AccessControlModule } from '../access-control/access-control.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationsController } from './organizations.controller';
import { InvitationsService } from './services/invitations.service';
import { MembershipsService } from './services/memberships.service';

@Module({
  imports: [AuthModule, AccessControlModule, PrismaModule],
  controllers: [OrganizationsController],
  providers: [MembershipsService, InvitationsService],
})
export class OrganizationsModule {}
