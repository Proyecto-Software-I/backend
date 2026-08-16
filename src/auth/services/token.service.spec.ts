import { ConfigService } from '@nestjs/config';
import { TokenService } from './token.service';

function configService(): ConfigService {
  return {
    getOrThrow: (key: string) =>
      key === 'AUTH_JWT_SECRET' ? 'test-secret' : undefined,
    get: (key: string) => (key === 'AUTH_ACCESS_TOKEN_TTL' ? '15m' : undefined),
  } as unknown as ConfigService;
}

describe('TokenService', () => {
  const service = new TokenService(configService());

  it('signs and verifies a payload roundtrip', () => {
    const payload = { sub: 'u1', sid: 's1', org: 'o1' };
    const token = service.sign(payload);
    expect(service.verify(token)).toMatchObject(payload);
  });

  it('supports null org (selección pendiente)', () => {
    const token = service.sign({ sub: 'u1', sid: 's1', org: null });
    expect(service.verify(token).org).toBeNull();
  });

  it('hashes tokens deterministically and generates random refresh tokens', () => {
    expect(service.hashToken('abc')).toEqual(service.hashToken('abc'));
    expect(service.hashToken('abc')).not.toEqual(service.hashToken('abd'));
    expect(service.generateRefreshToken()).not.toEqual(
      service.generateRefreshToken(),
    );
  });

  it('exposes expiresIn derived from the TTL', () => {
    expect(service.expiresIn).toBe(900);
  });
});
