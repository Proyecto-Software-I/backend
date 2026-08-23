import { Injectable } from '@nestjs/common';
import { InvitationStatus } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import type { OrganizationInvitationsResponseDto } from '../dto/invitation-list.dto';

@Injectable()
export class InvitationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCurrentInvitations(
    organizationId: string,
  ): Promise<OrganizationInvitationsResponseDto> {
    const now = new Date();
    await this.prisma.organizationInvitation.updateMany({
      where: {
        organizationId,
        status: InvitationStatus.PENDING,
        expiresAt: { lt: now },
      },
      data: { status: InvitationStatus.EXPIRED },
    });

    const invitations = await this.prisma.organizationInvitation.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        status: true,
        expiresAt: true,
        createdAt: true,
        invitedBy: {
          select: {
            id: true,
            displayName: true,
          },
        },
        proposedRole: {
          select: {
            key: true,
            name: true,
          },
        },
      },
    });

    return { invitations };
  }
}
