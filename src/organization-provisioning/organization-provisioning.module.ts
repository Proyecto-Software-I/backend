import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrganizationRolesService } from './services/organization-roles.service';
import { SerializableTransactionService } from './services/serializable-transaction.service';

@Module({
  imports: [PrismaModule],
  providers: [OrganizationRolesService, SerializableTransactionService],
  exports: [OrganizationRolesService, SerializableTransactionService],
})
export class OrganizationProvisioningModule {}
