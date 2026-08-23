import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  Validate,
  ValidationArguments,
  ValidateIf,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'RegisterMode', async: false })
class RegisterModeConstraint implements ValidatorConstraintInterface {
  validate(_: unknown, args: ValidationArguments): boolean {
    const dto = args.object as RegisterDto;
    const hasEmail = dto.email !== undefined;
    const hasOrganizationName = dto.organizationName !== undefined;
    const hasInvitationToken = dto.invitationToken !== undefined;

    return (
      (hasEmail && hasOrganizationName && !hasInvitationToken) ||
      (hasInvitationToken && !hasEmail && !hasOrganizationName)
    );
  }

  defaultMessage(): string {
    return 'Register request must use exactly one mode: email + organizationName, or invitationToken';
  }
}

export class RegisterDto {
  @Validate(RegisterModeConstraint)
  private readonly registerMode?: never;

  @ApiPropertyOptional({ example: 'orlando@example.com' })
  @ValidateIf((dto: RegisterDto) => dto.invitationToken === undefined)
  @IsEmail()
  @IsNotEmpty()
  email?: string;

  @ApiProperty({ example: 'SecurePassword123!' })
  @IsString()
  @MinLength(8)
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'Orlando' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Moreno' })
  @IsString()
  @IsNotEmpty()
  lastName: string;

  @ApiPropertyOptional({ example: 'Acme Corp' })
  @ValidateIf((dto: RegisterDto) => dto.invitationToken === undefined)
  @IsString()
  @IsNotEmpty()
  organizationName?: string;

  @ApiPropertyOptional({ example: 'plain-invitation-token' })
  @ValidateIf(
    (dto: RegisterDto) =>
      dto.email === undefined && dto.organizationName === undefined,
  )
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  invitationToken?: string;
}
