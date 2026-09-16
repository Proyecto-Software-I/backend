import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
} from 'class-validator';
import { AuthError } from '../../common/exceptions/auth-error';
import { SystemCriticality } from '../../generated/prisma/client';

const SYSTEM_CODE_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const CRITICALITIES = new Set<string>(Object.values(SystemCriticality));

export function normalizeSystemCode(code: string): string;
export function normalizeSystemCode(code: unknown): unknown;
export function normalizeSystemCode(code: unknown): unknown {
  return typeof code === 'string' ? code.trim().toUpperCase() : code;
}

function validateCriticality(value: unknown): unknown {
  if (typeof value === 'string' && !CRITICALITIES.has(value)) {
    throw new AuthError(
      'SYSTEM_CRITICALITY_INVALID',
      400,
      'Invalid system criticality',
    );
  }
  return value;
}

export class CreateLegacySystemDto {
  @ApiProperty({
    example: 'CORE-BANKING',
    description:
      'Immutable system code. Trimmed and normalized to uppercase on create; rejected in update payloads.',
  })
  @Transform(({ value }: { value: unknown }) => normalizeSystemCode(value))
  @IsString()
  @Matches(SYSTEM_CODE_PATTERN)
  @MaxLength(80)
  code!: string;

  @ApiProperty({
    example: 'Core banking',
    description: 'Mutable display name.',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({ nullable: true, description: 'Mutable description.' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Mutable business owner label.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessOwner?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Mutable technical owner label.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  technicalOwner?: string | null;

  @ApiProperty({
    enum: SystemCriticality,
    description: 'Mutable criticality classification.',
  })
  @Transform(({ value }: { value: unknown }) => validateCriticality(value))
  @IsString()
  criticality!: SystemCriticality;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Mutable business domain label.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  businessDomain?: string | null;
}

export class UpdateLegacySystemDto {
  @ApiPropertyOptional({ description: 'Mutable display name.' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ nullable: true, description: 'Mutable description.' })
  @IsOptional()
  @IsString()
  description?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Mutable business owner label.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  businessOwner?: string | null;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Mutable technical owner label.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  technicalOwner?: string | null;

  @ApiPropertyOptional({
    enum: SystemCriticality,
    description: 'Mutable criticality classification.',
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => validateCriticality(value))
  @IsString()
  criticality?: SystemCriticality;

  @ApiPropertyOptional({
    nullable: true,
    description: 'Mutable business domain label.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  businessDomain?: string | null;
}

export class LegacySystemDto {
  @ApiProperty({ format: 'uuid', description: 'Immutable system ID.' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description:
      'Immutable owning Project ID. Project-to-System ownership is enforced by route projectId.',
  })
  projectId!: string;

  @ApiProperty({ description: 'Immutable normalized system code.' })
  code!: string;

  @ApiProperty({ description: 'Mutable display name.' })
  name!: string;

  @ApiProperty({ nullable: true, description: 'Mutable description.' })
  description!: string | null;

  @ApiProperty({ nullable: true, description: 'Mutable business owner label.' })
  businessOwner!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Mutable technical owner label.',
  })
  technicalOwner!: string | null;

  @ApiProperty({
    enum: SystemCriticality,
    description: 'Mutable criticality classification.',
  })
  criticality!: SystemCriticality;

  @ApiProperty({
    nullable: true,
    description: 'Mutable business domain label.',
  })
  businessDomain!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Immutable creation timestamp.',
  })
  createdAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Immutable last-update timestamp.',
  })
  updatedAt!: Date;
}

export class LegacySystemResponseDto {
  @ApiProperty({ type: LegacySystemDto })
  system!: LegacySystemDto;
}

export class LegacySystemsResponseDto {
  @ApiProperty({ type: [LegacySystemDto] })
  systems!: LegacySystemDto[];
}

export class LegacySystemErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode!: number;

  @ApiProperty({ example: 'VALIDATION_ERROR' })
  code!: string;

  @ApiProperty({ example: 'Validation failed' })
  message!: string;
}
