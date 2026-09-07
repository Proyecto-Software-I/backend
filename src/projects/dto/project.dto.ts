import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { ProjectStatus } from '../../generated/prisma/client';

const PROJECT_KEY_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;

export function normalizeProjectKey(key: string): string {
  return key.trim().toUpperCase();
}

export class CreateProjectDto {
  @ApiProperty({ example: 'CORE-BANKING' })
  @Transform(({ value }: { value: string }) => normalizeProjectKey(value))
  @IsString()
  @Matches(PROJECT_KEY_PATTERN)
  @MaxLength(50)
  key!: string;

  @ApiProperty({ example: 'Core banking' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(150)
  clientReference?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateProjectDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  clientReference?: string | null;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];
}

export class UpdateProjectStatusDto {
  @ApiProperty({ enum: ProjectStatus })
  @IsEnum(ProjectStatus)
  status!: ProjectStatus;
}

export class ProjectListQueryDto {
  @ApiPropertyOptional({ type: Boolean })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  @IsBoolean()
  archived?: boolean;
}

export class ProjectDto {
  id!: string;
  key!: string;
  name!: string;
  description!: string | null;
  status!: ProjectStatus;
  clientReference!: string | null;
  tags!: string[];
  createdAt!: Date;
  updatedAt!: Date;
  archivedAt!: Date | null;
}

export class ProjectResponseDto {
  project!: ProjectDto;
}

export class ProjectsResponseDto {
  projects!: ProjectDto[];
}
