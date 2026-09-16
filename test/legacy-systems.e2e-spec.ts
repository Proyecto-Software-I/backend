import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import type { AuthResponse } from '../src/auth/auth.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

type ErrorBody = { statusCode: number; code: string; message: string };
type ProjectBody = { project: { id: string } };
type SystemBody = {
  system: { id: string; projectId: string; code: string; name: string };
};

describe('Legacy system management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const prefix = `systems-${randomUUID()}`;
  const password = 'SecurePassword123!';
  const server = (): import('http').Server =>
    app.getHttpServer() as import('http').Server;
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

  beforeAll(async () => {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is required for real PostgreSQL E2E tests');
    }
    process.env.NODE_ENV = 'test';
    process.env.AUTH_JWT_SECRET ??= 'e2e-test-secret-with-enough-length';
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.useGlobalFilters(new HttpExceptionFilter());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
    prisma = app.get(PrismaService);
    await prisma.$queryRaw`SELECT 1`;
  });

  afterAll(async () => {
    const organizations = await prisma.organization.findMany({
      where: { name: { startsWith: prefix } },
      select: { id: true },
    });
    const organizationIds = organizations.map(({ id }) => id);
    const users = await prisma.user.findMany({
      where: { email: { contains: prefix } },
      select: { id: true },
    });
    const userIds = users.map(({ id }) => id);
    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { id: true },
    });
    const membershipIds = memberships.map(({ id }) => id);
    const roles = await prisma.role.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { id: true },
    });
    const roleIds = roles.map(({ id }) => id);
    await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.projectAccess.deleteMany({
      where: { project: { organizationId: { in: organizationIds } } },
    });
    await prisma.project.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.membershipRole.deleteMany({
      where: { membershipId: { in: membershipIds } },
    });
    await prisma.rolePermission.deleteMany({
      where: { roleId: { in: roleIds } },
    });
    await prisma.organizationMembership.deleteMany({
      where: { id: { in: membershipIds } },
    });
    await prisma.role.deleteMany({ where: { id: { in: roleIds } } });
    await prisma.organization.deleteMany({
      where: { id: { in: organizationIds } },
    });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    await app.close();
  });

  async function register(label: string): Promise<AuthResponse> {
    const response = await request(server())
      .post('/api/auth/register')
      .send({
        email: `${prefix}+${label}@example.com`,
        password,
        firstName: 'Legacy',
        lastName: label,
        organizationName: `${prefix} ${label}`,
      })
      .expect(201);
    return response.body as AuthResponse;
  }

  function expectError(body: ErrorBody, status: number, code: string): void {
    expect(body).toMatchObject({ statusCode: status, code });
    expect(Object.keys(body).sort()).toEqual(['code', 'message', 'statusCode']);
  }

  async function createProject(token: string, key: string): Promise<string> {
    const response = await request(server())
      .post('/api/projects')
      .set(auth(token))
      .send({ key, name: `${key} project` })
      .expect(201);
    return (response.body as ProjectBody).project.id;
  }

  async function addMember(owner: AuthResponse, member: AuthResponse) {
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: member.user.id },
    });
    const selected = await request(server())
      .post('/api/auth/select-organization')
      .set(auth(member.auth.accessToken))
      .send({ organizationId })
      .expect(200);
    return {
      membership,
      token: (selected.body as AuthResponse).auth.accessToken,
    };
  }

  async function createRole(token: string, permissionKeys: string[]) {
    const response = await request(server())
      .post('/api/projects/roles')
      .set(auth(token))
      .send({ name: `Legacy role ${randomUUID()}`, permissionKeys })
      .expect(201);
    return (response.body as { role: { id: string } }).role;
  }

  it('creates, lists, reads, and updates project-local functional metadata only', async () => {
    const owner = await register('owner');
    const projectId = await createProject(owner.auth.accessToken, 'legacy-one');
    const create = await request(server())
      .post(`/api/projects/${projectId}/systems`)
      .set(auth(owner.auth.accessToken))
      .send({
        code: ' core-banking ',
        name: 'Core banking',
        description: 'Main ledger',
        businessOwner: 'Finance',
        technicalOwner: 'Platform',
        criticality: 'HIGH',
        businessDomain: 'Payments',
      })
      .expect(201);
    const system = (create.body as SystemBody).system;
    expect(system).toMatchObject({
      projectId,
      code: 'CORE-BANKING',
      name: 'Core banking',
    });
    expect(Object.keys(system).sort()).toEqual([
      'businessDomain',
      'businessOwner',
      'code',
      'createdAt',
      'criticality',
      'description',
      'id',
      'name',
      'projectId',
      'technicalOwner',
      'updatedAt',
    ]);
    await request(server())
      .get(`/api/projects/${projectId}/systems`)
      .set(auth(owner.auth.accessToken))
      .expect(200)
      .expect(({ body }: { body: { systems: Array<{ id: string }> } }) =>
        expect(body.systems.map(({ id }) => id)).toContain(system.id),
      );
    await request(server())
      .get(`/api/projects/${projectId}/systems/${system.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(200);
    await request(server())
      .patch(`/api/projects/${projectId}/systems/${system.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ name: 'Renamed core', criticality: 'MISSION_CRITICAL' })
      .expect(200)
      .expect(({ body }) =>
        expect((body as SystemBody).system).toMatchObject({
          id: system.id,
          projectId,
          code: 'CORE-BANKING',
          name: 'Renamed core',
          criticality: 'MISSION_CRITICAL',
        }),
      );
  });

  it('enforces normalized project-local uniqueness while allowing code reuse in another project', async () => {
    const owner = await register('uniqueness');
    const firstProject = await createProject(owner.auth.accessToken, 'first');
    const secondProject = await createProject(owner.auth.accessToken, 'second');
    const payload = { code: 'core', name: 'Core', criticality: 'MEDIUM' };
    await request(server())
      .post(`/api/projects/${firstProject}/systems`)
      .set(auth(owner.auth.accessToken))
      .send(payload)
      .expect(201);
    await request(server())
      .post(`/api/projects/${firstProject}/systems`)
      .set(auth(owner.auth.accessToken))
      .send({ ...payload, code: ' CORE ' })
      .expect(409)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 409, 'SYSTEM_ALREADY_EXISTS'),
      );
    await request(server())
      .post(`/api/projects/${secondProject}/systems`)
      .set(auth(owner.auth.accessToken))
      .send(payload)
      .expect(201);
  });

  it('uses stable validation errors for unsupported, malformed, and forbidden input', async () => {
    const owner = await register('validation');
    const projectId = await createProject(owner.auth.accessToken, 'validation');
    for (const payload of [
      { code: 'CORE', name: 'Core', criticality: 'URGENT' },
      { code: 'CORE', name: 'Core', criticality: { invalid: true } },
      {
        code: 'CORE',
        name: 'Core',
        criticality: 'LOW',
        currentArchitecture: {},
      },
    ]) {
      await request(server())
        .post(`/api/projects/${projectId}/systems`)
        .set(auth(owner.auth.accessToken))
        .send(payload)
        .expect(400)
        .expect(({ body }) =>
          expectError(
            body as ErrorBody,
            400,
            payload.criticality === 'URGENT'
              ? 'SYSTEM_CRITICALITY_INVALID'
              : 'VALIDATION_ERROR',
          ),
        );
    }
    const created = await request(server())
      .post(`/api/projects/${projectId}/systems`)
      .set(auth(owner.auth.accessToken))
      .send({ code: 'UPDATE', name: 'Update', criticality: 'LOW' })
      .expect(201);
    const systemId = (created.body as SystemBody).system.id;
    await request(server())
      .patch(`/api/projects/${projectId}/systems/${systemId}`)
      .set(auth(owner.auth.accessToken))
      .send({ projectId: randomUUID(), code: 'MOVED' })
      .expect(400)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 400, 'VALIDATION_ERROR'),
      );
    await request(server())
      .get(`/api/projects/${projectId}/systems/${systemId}`)
      .set(auth(owner.auth.accessToken))
      .expect(200)
      .expect(({ body }) =>
        expect((body as SystemBody).system).toMatchObject({
          id: systemId,
          projectId,
          code: 'UPDATE',
        }),
      );
  });

  it('composes direct ProjectAccess grants and enforces ordered permission denial', async () => {
    const owner = await register('delegation-owner');
    const reader = await register('delegation-reader');
    const noAccessMember = await register('noaccess');
    const projectId = await createProject(owner.auth.accessToken, 'delegation');
    const { membership, token } = await addMember(owner, reader);
    const { token: noAccessToken } = await addMember(owner, noAccessMember);
    const readManageRole = await createRole(owner.auth.accessToken, [
      'projects.read',
      'systems.read',
      'systems.manage',
    ]);
    await request(server())
      .put(`/api/projects/${projectId}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ roleId: readManageRole.id })
      .expect(200);
    await request(server())
      .post(`/api/projects/${projectId}/systems`)
      .set(auth(token))
      .send({ code: 'DELEGATED', name: 'Delegated', criticality: 'LOW' })
      .expect(201);
    await request(server())
      .get(`/api/projects/${projectId}/systems`)
      .set(auth(token))
      .expect(200);

    const systemsOnly = await createRole(owner.auth.accessToken, [
      'systems.read',
    ]);
    await request(server())
      .put(`/api/projects/${projectId}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ roleId: systemsOnly.id })
      .expect(200);
    await request(server())
      .get(`/api/projects/${projectId}/systems`)
      .set(auth(token))
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'PROJECT_ACCESS_DENIED'),
      );

    const projectReadOnly = await createRole(owner.auth.accessToken, [
      'projects.read',
    ]);
    await request(server())
      .put(`/api/projects/${projectId}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ roleId: projectReadOnly.id })
      .expect(200);
    await request(server())
      .get(`/api/projects/${projectId}/systems`)
      .set(auth(token))
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'SYSTEM_ACCESS_DENIED'),
      );
    await request(server())
      .post(`/api/projects/${projectId}/systems`)
      .set(auth(token))
      .send({ code: 'READONLY', name: 'Read only', criticality: 'LOW' })
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'SYSTEM_ACCESS_DENIED'),
      );
    await request(server())
      .get(`/api/projects/${projectId}/systems`)
      .set(auth(noAccessToken))
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'PROJECT_ACCESS_DENIED'),
      );
  });

  it('does not disclose foreign projects or mismatched systems and publishes Swagger contracts', async () => {
    const owner = await register('security-owner');
    const foreign = await register('security-foreign');
    const firstProject = await createProject(
      owner.auth.accessToken,
      'security-one',
    );
    const secondProject = await createProject(
      owner.auth.accessToken,
      'security-two',
    );
    const created = await request(server())
      .post(`/api/projects/${firstProject}/systems`)
      .set(auth(owner.auth.accessToken))
      .send({ code: 'SECURE', name: 'Secure', criticality: 'LOW' })
      .expect(201);
    const systemId = (created.body as SystemBody).system.id;
    for (const call of [
      () => request(server()).get(`/api/projects/${firstProject}/systems`),
      () =>
        request(server())
          .post(`/api/projects/${firstProject}/systems`)
          .send({ code: 'FOREIGN', name: 'Foreign', criticality: 'LOW' }),
      () =>
        request(server()).get(
          `/api/projects/${firstProject}/systems/${systemId}`,
        ),
      () =>
        request(server())
          .patch(`/api/projects/${firstProject}/systems/${systemId}`)
          .send({ name: 'Foreign' }),
    ]) {
      await call()
        .set(auth(foreign.auth.accessToken))
        .expect(404)
        .expect(({ body }) =>
          expectError(body as ErrorBody, 404, 'PROJECT_NOT_FOUND'),
        );
    }
    for (const call of [
      () =>
        request(server()).get(
          `/api/projects/${secondProject}/systems/${systemId}`,
        ),
      () =>
        request(server())
          .patch(`/api/projects/${secondProject}/systems/${systemId}`)
          .send({ name: 'Mismatch' }),
    ]) {
      await call()
        .set(auth(owner.auth.accessToken))
        .expect(404)
        .expect(({ body }) =>
          expectError(body as ErrorBody, 404, 'SYSTEM_NOT_FOUND'),
        );
    }
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('E2E').addBearerAuth().build(),
    );
    const collection = document.paths['/api/projects/{projectId}/systems'];
    const detail =
      document.paths['/api/projects/{projectId}/systems/{systemId}'];
    expect(Object.keys(collection?.post?.responses ?? {})).toEqual(
      expect.arrayContaining(['201', '400', '403', '404', '409']),
    );
    expect(Object.keys(detail?.patch?.responses ?? {})).toEqual(
      expect.arrayContaining(['200', '400', '403', '404']),
    );
    const operations = [
      collection?.get,
      collection?.post,
      detail?.get,
      detail?.patch,
    ];
    for (const operation of operations) {
      const description = operation?.description ?? '';
      expect(description).toContain('Project-to-System ownership');
      expect(description).toContain('route-ID mismatch');
      expect(description).toContain('PROJECT_NOT_FOUND');
      expect(description).toContain('mutable fields');
      expect(description).toContain('immutable fields');
    }
    expect(collection?.get?.description).toMatch(
      /projects\.read[\s\S]*systems\.read/,
    );
    expect(detail?.get?.description).toMatch(
      /projects\.read[\s\S]*systems\.read/,
    );
    expect(collection?.post?.description).toMatch(
      /projects\.read[\s\S]*systems\.manage/,
    );
    expect(detail?.patch?.description).toMatch(
      /projects\.read[\s\S]*systems\.manage/,
    );
    const properties = document.components?.schemas?.LegacySystemDto
      .properties as Record<string, unknown>;
    for (const property of [
      'deletedAt',
      'currentArchitecture',
      'runtimeMetadata',
      'slaMetadata',
    ]) {
      expect(properties).not.toHaveProperty(property);
    }
  });
});
