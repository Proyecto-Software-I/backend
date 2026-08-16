import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { randomUUID } from 'crypto';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import type { AuthResponse, MeResponse } from '../src/auth/auth.service';

describe('Auth (e2e)', () => {
  let app: INestApplication;
  const email = `user+${randomUUID()}@example.com`;
  const server = (): import('http').Server =>
    app.getHttpServer() as import('http').Server;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const register = (overrides: Record<string, unknown> = {}) =>
    request(server())
      .post('/api/auth/register')
      .send({
        email,
        password: 'SecurePassword123!',
        firstName: 'Orlando',
        lastName: 'Moreno',
        organizationName: 'Acme Corp',
        ...overrides,
      });

  const login = () =>
    request(server())
      .post('/api/auth/login')
      .send({ email, password: 'SecurePassword123!' });

  it('POST /api/auth/register crea usuario y establece tenant (201)', async () => {
    const res = await register().expect(201);
    const body = res.body as AuthResponse;
    expect(body.requiresOrganizationSelection).toBe(false);
    expect(body.activeOrganization).not.toBeNull();
    const activeMembership = body.activeMembership;
    expect(activeMembership).not.toBeNull();
    if (activeMembership === null) {
      throw new Error('Expected an active membership');
    }
    expect(activeMembership.roles).toContain('OWNER');
    expect(body.auth.accessToken).toBeDefined();
  });

  it('POST /api/auth/register rechaza email duplicado (409)', async () => {
    await register().expect(409);
  });

  it('POST /api/auth/login con 1 tenant establece tenant automáticamente', async () => {
    const res = await login().expect(200);
    const body = res.body as AuthResponse;
    expect(body.requiresOrganizationSelection).toBe(false);
    expect(body.activeOrganization).not.toBeNull();
    expect(body.auth.accessToken).toBeDefined();
  });

  it('GET /api/auth/me refleja el tenant activo con Bearer token', async () => {
    const loginRes = await login().expect(200);
    const token = (loginRes.body as AuthResponse).auth.accessToken;

    const res = await request(server())
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const body = res.body as MeResponse;
    expect(body.activeOrganization).not.toBeNull();
    expect(body.requiresOrganizationSelection).toBe(false);
  });

  it('POST /api/auth/select-organization deniega una org ajena (403)', async () => {
    const loginRes = await login().expect(200);
    const token = (loginRes.body as AuthResponse).auth.accessToken;

    await request(server())
      .post('/api/auth/select-organization')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: randomUUID() })
      .expect(403);
  });

  it('POST /api/auth/select-organization con org propia del usuario devuelve 200', async () => {
    const loginRes = await login().expect(200);
    const token = (loginRes.body as AuthResponse).auth.accessToken;
    const orgId = (loginRes.body as AuthResponse).activeOrganization?.id;

    const res = await request(server())
      .post('/api/auth/select-organization')
      .set('Authorization', `Bearer ${token}`)
      .send({ organizationId: orgId })
      .expect(200);
    const body = res.body as AuthResponse;
    expect(body.requiresOrganizationSelection).toBe(false);
    expect(body.activeOrganization?.id).toBe(orgId);
  });

  it('POST /api/auth/refresh renueva el access token vía cookie', async () => {
    const loginRes = await login().expect(200);
    const rawCookies = loginRes.headers['set-cookie'] as unknown;
    const cookies =
      typeof rawCookies === 'string'
        ? [rawCookies]
        : Array.isArray(rawCookies)
          ? rawCookies.filter(
              (cookie): cookie is string => typeof cookie === 'string',
            )
          : [];
    const cookieHeader = cookies
      .map((cookie) => cookie.split(';')[0])
      .join('; ');

    const res = await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', cookieHeader)
      .expect(200);
    const body = res.body as {
      auth: { accessToken: string; tokenType: string };
    };
    expect(body.auth.accessToken).toBeDefined();
    expect(body.auth.tokenType).toBe('Bearer');
  });

  it('POST /api/auth/refresh con cookie inválida rechaza con 401', async () => {
    await request(server())
      .post('/api/auth/refresh')
      .set('Cookie', 'legacylift_refresh=invalid-token')
      .expect(401);
  });

  it('POST /api/auth/logout revoca la sesión (204)', async () => {
    const loginRes = await login().expect(200);
    const token = (loginRes.body as AuthResponse).auth.accessToken;

    await request(server())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .expect(204);
  });
});
