import { ApiProperty } from '@nestjs/swagger';
import { MembershipStatus } from '../../generated/prisma/client';

export class OrganizationMemberUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;
}

export class OrganizationMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: MembershipStatus })
  status!: MembershipStatus;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  joinedAt!: Date | null;

  @ApiProperty({ type: OrganizationMemberUserDto })
  user!: OrganizationMemberUserDto;

  @ApiProperty({ type: [String], example: ['OWNER'] })
  roles!: string[];
}

export class OrganizationMembersResponseDto {
  @ApiProperty({ type: [OrganizationMemberDto] })
  members!: OrganizationMemberDto[];
}
