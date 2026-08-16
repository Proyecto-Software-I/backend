import { PasswordService } from './password.service';

describe('PasswordService', () => {
  const service = new PasswordService();

  it('hashes and verifies a password (ida y vuelta)', async () => {
    const hash = await service.hash('SecurePassword123!');
    expect(hash).not.toEqual('SecurePassword123!');
    expect(await service.verify('SecurePassword123!', hash)).toBe(true);
    expect(await service.verify('wrong-password', hash)).toBe(false);
  });
});
