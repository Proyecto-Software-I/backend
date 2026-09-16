import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AuthError } from '../../common/exceptions/auth-error';
import {
  CreateLegacySystemDto,
  normalizeSystemCode,
  UpdateLegacySystemDto,
} from './legacy-system.dto';

describe('Legacy system DTOs', () => {
  it('normalizes a project-local system code', async () => {
    const dto = plainToInstance(CreateLegacySystemDto, {
      code: ' core-banking ',
      name: 'Core banking',
      criticality: 'HIGH',
    });

    expect(dto.code).toBe('CORE-BANKING');
    expect(await validate(dto)).toEqual([]);
    expect(normalizeSystemCode({ invalid: true })).toEqual({ invalid: true });
  });

  it('maps well-formed unsupported criticality values to a stable error', () => {
    expect(() =>
      plainToInstance(CreateLegacySystemDto, {
        code: 'CORE',
        name: 'Core',
        criticality: 'URGENT',
      }),
    ).toThrow(AuthError);
    try {
      plainToInstance(CreateLegacySystemDto, {
        code: 'CORE',
        name: 'Core',
        criticality: 'URGENT',
      });
    } catch (error) {
      expect((error as AuthError).code).toBe('SYSTEM_CRITICALITY_INVALID');
    }
  });

  it('leaves malformed criticality for structural validation', async () => {
    const dto = plainToInstance(CreateLegacySystemDto, {
      code: 'CORE',
      name: 'Core',
      criticality: { invalid: true },
    });

    expect(await validate(dto)).not.toEqual([]);
  });

  it('allows only mutable update fields', async () => {
    const dto = plainToInstance(UpdateLegacySystemDto, {
      name: 'Renamed',
      businessOwner: 'Business owner',
      criticality: 'LOW',
    });

    expect(await validate(dto)).toEqual([]);
  });
});
