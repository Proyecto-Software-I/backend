import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import {
  CreateProjectDto,
  normalizeProjectKey,
  ProjectListQueryDto,
} from './project.dto';

describe('CreateProjectDto', () => {
  it('accepts supported project metadata and normalizes a valid key', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      key: ' core-banking ',
      name: 'Core banking',
      tags: ['payments'],
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(normalizeProjectKey(dto.key)).toBe('CORE-BANKING');
  });

  it('rejects invalid project keys and ownership fields', async () => {
    const dto = plainToInstance(CreateProjectDto, {
      key: 'not allowed',
      name: 'Unsafe project',
      organizationId: 'foreign-org',
      settings: { hidden: true },
    });

    const errors = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['key', 'organizationId', 'settings']),
    );
  });

  it('parses archived=false as false and archived=true as true', async () => {
    const falseFilter = plainToInstance(ProjectListQueryDto, {
      archived: 'false',
    });
    const trueFilter = plainToInstance(ProjectListQueryDto, {
      archived: 'true',
    });

    await expect(validate(falseFilter)).resolves.toHaveLength(0);
    await expect(validate(trueFilter)).resolves.toHaveLength(0);
    expect(falseFilter.archived).toBe(false);
    expect(trueFilter.archived).toBe(true);
  });
});
