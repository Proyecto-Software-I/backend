import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { OrganizationMembersResponseDto } from '../dto/member-list.dto';

@Injectable()
export class MembershipsService {
  constructor(private readonly prisma: PrismaService) {}

  async listCurrentMembers(
    organizationId: string,
  ): Promise<OrganizationMembersResponseDto> {
    const memberships = await this.prisma.organizationMembership.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'asc' },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
        roles: {
          include: {
            role: { select: { key: true } },
          },
        },
      },
    });

    return {
      members: memberships.map((membership) => ({
        id: membership.id,
        status: membership.status,
        joinedAt: membership.joinedAt,
        user: membership.user,
        roles: membership.roles.map(
          (membershipRole) => membershipRole.role.key,
        ),
      })),
    };
  }
}
