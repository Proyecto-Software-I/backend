import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';
import { InvitationStatus } from '../../generated/prisma/client';

export class CreateOrganizationInvitationDto {
  @ApiProperty({ example: 'new.member@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email!: string;
}

export class InvitationInvitedByDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class InvitationProposedRoleDto {
  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;
}

export class OrganizationInvitationDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ enum: InvitationStatus })
  status!: InvitationStatus;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: InvitationInvitedByDto, nullable: true })
  invitedBy!: InvitationInvitedByDto | null;

  @ApiProperty({ type: InvitationProposedRoleDto, nullable: true })
  proposedRole!: InvitationProposedRoleDto | null;
}

export class OrganizationInvitationsResponseDto {
  @ApiProperty({ type: [OrganizationInvitationDto] })
  invitations!: OrganizationInvitationDto[];
}

export class OrganizationInvitationResponseDto {
  @ApiProperty({ type: OrganizationInvitationDto })
  invitation!: OrganizationInvitationDto;
}

export class CreateOrganizationInvitationResponseDto extends OrganizationInvitationResponseDto {
  @ApiProperty({ example: '/invite/<token>' })
  acceptanceUrl!: string;
}
