import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateProjectRoleDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name!: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  permissionKeys!: string[];
}

export class UpdateProjectRoleDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  name?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() description?: string | null;
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  permissionKeys?: string[];
}

export class ProjectRolePermissionDto {
  @ApiProperty()
  key!: string;
}

export class ProjectRoleDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty()
  key!: string;

  @ApiProperty()
  name!: string;

  @ApiProperty({ nullable: true })
  description!: string | null;

  @ApiProperty({ type: [ProjectRolePermissionDto] })
  permissions!: ProjectRolePermissionDto[];
}

export class ProjectRoleResponseDto {
  @ApiProperty({ type: ProjectRoleDto })
  role!: ProjectRoleDto;
}

export class ProjectRolesResponseDto {
  @ApiProperty({ type: [ProjectRoleDto] })
  roles!: ProjectRoleDto[];
}
