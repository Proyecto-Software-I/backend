import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { MembershipStatus } from '../../generated/prisma/client';

export const MEMBERSHIP_PATCH_STATUSES = [
  MembershipStatus.ACTIVE,
  MembershipStatus.SUSPENDED,
] as const;

export class UpdateMembershipStatusDto {
  @ApiProperty({ enum: MEMBERSHIP_PATCH_STATUSES })
  @IsIn(MEMBERSHIP_PATCH_STATUSES)
  status!: MembershipStatus;
}

export class OrganizationMemberUserDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;

  @ApiProperty({ nullable: true })
  firstName!: string | null;

  @ApiProperty({ nullable: true })
  lastName!: string | null;

  @ApiProperty({ nullable: true })
  avatarUrl!: string | null;
}

export class OrganizationMemberDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: MembershipStatus })
  status!: MembershipStatus;

  @ApiProperty({ nullable: true, type: String, format: 'date-time' })
  joinedAt!: Date | null;

  @ApiProperty({ nullable: true })
  jobTitle!: string | null;

  @ApiProperty({ type: OrganizationMemberUserDto })
  user!: OrganizationMemberUserDto;

  @ApiProperty({ type: [String], example: ['OWNER'] })
  roles!: string[];
}

export class OrganizationMembersResponseDto {
  @ApiProperty({ type: [OrganizationMemberDto] })
  members!: OrganizationMemberDto[];
}

export class OrganizationMemberResponseDto {
  @ApiProperty({ type: OrganizationMemberDto })
  member!: OrganizationMemberDto;
}
