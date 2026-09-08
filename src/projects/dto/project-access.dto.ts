import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReplaceProjectAccessDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID('4')
  roleId!: string;
}

export class ProjectAccessMemberDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({ nullable: true })
  displayName!: string | null;
}

export class ProjectAccessRoleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;
}

export class ProjectAccessDto {
  @ApiProperty({ format: 'uuid' })
  projectId!: string;

  @ApiProperty({ type: ProjectAccessMemberDto })
  membership!: ProjectAccessMemberDto;

  @ApiProperty({ type: ProjectAccessRoleDto })
  role!: ProjectAccessRoleDto;
}

export class ProjectAccessResponseDto {
  @ApiProperty({ type: ProjectAccessDto })
  access!: ProjectAccessDto;
}

export class ProjectAccessesResponseDto {
  @ApiProperty({ type: [ProjectAccessDto] })
  accesses!: ProjectAccessDto[];
}
