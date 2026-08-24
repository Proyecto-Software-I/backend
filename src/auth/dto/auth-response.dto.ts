import { ApiProperty } from '@nestjs/swagger';

export class AuthUserResponseDto {
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
}

export class AuthTokensResponseDto {
  @ApiProperty()
  accessToken!: string;

  @ApiProperty({ example: 'Bearer' })
  tokenType!: string;

  @ApiProperty({ example: 900 })
  expiresIn!: number;
}

export class AuthOrganizationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  slug!: string;
}

export class AuthActiveMembershipResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'ACTIVE' })
  status!: string;

  @ApiProperty({ type: [String], example: ['OWNER'] })
  roles!: string[];

  @ApiProperty({
    type: [String],
    example: ['organization.read', 'members.read', 'members.manage'],
  })
  permissions!: string[];
}

export class AuthMembershipResponseDto extends AuthActiveMembershipResponseDto {
  @ApiProperty({ type: AuthOrganizationResponseDto })
  organization!: AuthOrganizationResponseDto;
}

export class AuthResponseDto {
  @ApiProperty({ type: AuthUserResponseDto })
  user!: AuthUserResponseDto;

  @ApiProperty({ type: AuthTokensResponseDto })
  auth!: AuthTokensResponseDto;

  @ApiProperty({ type: AuthOrganizationResponseDto, nullable: true })
  activeOrganization!: AuthOrganizationResponseDto | null;

  @ApiProperty({ type: AuthActiveMembershipResponseDto, nullable: true })
  activeMembership!: AuthActiveMembershipResponseDto | null;

  @ApiProperty({ type: [AuthMembershipResponseDto] })
  memberships!: AuthMembershipResponseDto[];

  @ApiProperty()
  requiresOrganizationSelection!: boolean;
}
