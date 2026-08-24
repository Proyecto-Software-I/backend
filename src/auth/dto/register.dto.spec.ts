import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RegisterDto } from './register.dto';

async function validateDto(payload: Record<string, unknown>) {
  return validate(plainToInstance(RegisterDto, payload));
}

describe('RegisterDto', () => {
  it('accepts normal mode', async () => {
    await expect(
      validateDto({
        email: 'a@b.com',
        password: 'SecurePassword123!',
        firstName: 'Orlando',
        lastName: 'Moreno',
        organizationName: 'Acme',
      }),
    ).resolves.toHaveLength(0);
  });

  it('accepts invitation mode with a non-empty string token', async () => {
    await expect(
      validateDto({
        password: 'SecurePassword123!',
        firstName: 'Orlando',
        lastName: 'Moreno',
        invitationToken: 'valid-token',
      }),
    ).resolves.toHaveLength(0);
  });

  it.each([
    ['null invitationToken', null],
    ['empty invitationToken', ''],
    ['numeric invitationToken', 123],
  ])('rejects invitation mode with %s', async (_name, invitationToken) => {
    const errors = await validateDto({
      password: 'SecurePassword123!',
      firstName: 'Orlando',
      lastName: 'Moreno',
      invitationToken,
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it.each([
    [
      'both modes',
      { email: 'a@b.com', organizationName: 'Acme', invitationToken: 'token' },
    ],
    ['none', {}],
    ['invitationToken + email', { email: 'a@b.com', invitationToken: 'token' }],
    [
      'invitationToken + organizationName',
      { organizationName: 'Acme', invitationToken: 'token' },
    ],
    ['normal without organizationName', { email: 'a@b.com' }],
    ['organizationName without email', { organizationName: 'Acme' }],
    ['invalid normal email', { email: 'bad', organizationName: 'Acme' }],
    [
      'invitation with empty email',
      { invitationToken: 'valid-token', email: '' },
    ],
    [
      'invitation with null email',
      { invitationToken: 'valid-token', email: null },
    ],
    [
      'invitation with empty organizationName',
      { invitationToken: 'valid-token', organizationName: '' },
    ],
    [
      'invitation with null organizationName',
      { invitationToken: 'valid-token', organizationName: null },
    ],
    [
      'invitation with empty email and organizationName',
      { invitationToken: 'valid-token', email: '', organizationName: '' },
    ],
    [
      'normal with empty invitationToken',
      { email: 'a@b.com', organizationName: 'Acme', invitationToken: '' },
    ],
    [
      'normal with null invitationToken',
      { email: 'a@b.com', organizationName: 'Acme', invitationToken: null },
    ],
  ])('rejects invalid mode: %s', async (_name, partialPayload) => {
    const errors = await validateDto({
      password: 'SecurePassword123!',
      firstName: 'Orlando',
      lastName: 'Moreno',
      ...partialPayload,
    });

    expect(errors.length).toBeGreaterThan(0);
  });

  it.each([
    ['short password', { password: 'short' }],
    ['missing firstName', { firstName: '' }],
    ['missing lastName', { lastName: '' }],
  ])('keeps base validation: %s', async (_name, override) => {
    const errors = await validateDto({
      email: 'a@b.com',
      password: 'SecurePassword123!',
      firstName: 'Orlando',
      lastName: 'Moreno',
      organizationName: 'Acme',
      ...override,
    });

    expect(errors.length).toBeGreaterThan(0);
  });
});
