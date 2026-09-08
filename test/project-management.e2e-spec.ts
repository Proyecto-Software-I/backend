import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import { randomUUID } from 'crypto';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import type { AuthResponse } from '../src/auth/auth.service';
import { TokenService } from '../src/auth/services/token.service';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { PrismaService } from '../src/prisma/prisma.service';

type ErrorBody = { statusCode: number; code: string; message: string };
type ProjectBody = {
  project: {
    id: string;
    key: string;
    status: string;
    tags: string[];
    archivedAt: string | null;
  };
};
type ProjectListBody = { projects: Array<{ id: string }> };
type ProjectAccessListBody = {
  accesses: Array<{ membership: { id: string } }>;
};
type RolesBody = { roles: unknown[] };

describe('Project management (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tokenService: TokenService;
  const prefix = `p-${randomUUID()}`;
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
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
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
    tokenService = app.get(TokenService);
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
    const roles = await prisma.role.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { id: true },
    });
    const roleIds = roles.map(({ id }) => id);
    const memberships = await prisma.organizationMembership.findMany({
      where: { organizationId: { in: organizationIds } },
      select: { id: true },
    });
    const membershipIds = memberships.map(({ id }) => id);
    await prisma.userSession.deleteMany({ where: { userId: { in: userIds } } });
    await prisma.projectAccess.deleteMany({
      where: { project: { organizationId: { in: organizationIds } } },
    });
    await prisma.project.deleteMany({
      where: { organizationId: { in: organizationIds } },
    });
    await prisma.membershipRole.deleteMany({
      where: {
        OR: [
          { membershipId: { in: membershipIds } },
          { roleId: { in: roleIds } },
        ],
      },
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

  async function registerOwner(label: string): Promise<AuthResponse> {
    const response = await request(server())
      .post('/api/auth/register')
      .send({
        email: `${prefix}+${label}@example.com`,
        password,
        firstName: 'Project',
        lastName: label,
        organizationName: `${prefix} ${label}`,
      })
      .expect(201);
    return response.body as AuthResponse;
  }

  function expectError(body: ErrorBody, statusCode: number, code: string) {
    expect(Object.keys(body).sort()).toEqual(['code', 'message', 'statusCode']);
    expect(body.statusCode).toBe(statusCode);
    expect(body.code).toBe(code);
    expect(typeof body.message).toBe('string');
  }

  function expectResponseCodes(responses: unknown, codes: string[]) {
    expect(Object.keys(responses as Record<string, unknown>)).toEqual(
      expect.arrayContaining(codes),
    );
  }

  async function createProject(token: string, key: string) {
    const response = await request(server())
      .post('/api/projects')
      .set(auth(token))
      .send({ key, name: `${key} project` })
      .expect(201);
    return (response.body as ProjectBody).project;
  }

  async function addProjectRole(
    organizationId: string,
    name: string,
    permissionKeys: string[],
  ) {
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    return prisma.role.create({
      data: {
        organizationId,
        scope: 'PROJECT',
        key: `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${randomUUID()}`,
        name,
        permissions: {
          create: permissions.map(({ id }) => ({ permissionId: id })),
        },
      },
    });
  }

  async function addOrganizationPermissionRole(
    organizationId: string,
    membershipId: string,
    permissionKeys: string[],
  ) {
    const permissions = await prisma.permission.findMany({
      where: { key: { in: permissionKeys } },
    });
    const role = await prisma.role.create({
      data: {
        organizationId,
        scope: 'ORGANIZATION',
        key: `e2e-org-${randomUUID()}`,
        name: 'E2E organization permission role',
        permissions: {
          create: permissions.map(({ id }) => ({ permissionId: id })),
        },
      },
    });
    await prisma.membershipRole.create({
      data: { membershipId, roleId: role.id },
    });
    return role;
  }

  async function selectOrganizationToken(
    account: AuthResponse,
    organizationId: string,
  ) {
    const response = await request(server())
      .post('/api/auth/select-organization')
      .set(auth(account.auth.accessToken))
      .send({ organizationId })
      .expect(200);
    return (response.body as AuthResponse).auth.accessToken;
  }

  it('creates, lists, updates through the workflow, archives, and isolates tenant projects', async () => {
    const owner = await registerOwner('owner');
    const foreignOwner = await registerOwner('foreign');
    const token = owner.auth.accessToken;
    const created = await request(server())
      .post('/api/projects')
      .set(auth(token))
      .send({ key: ' core-banking ', name: 'Core banking', tags: ['payments'] })
      .expect(201);
    const project = (created.body as ProjectBody).project;
    expect(project).toMatchObject({
      key: 'CORE-BANKING',
      status: 'DRAFT',
      tags: ['payments'],
    });

    await request(server())
      .get('/api/projects')
      .set(auth(token))
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(
          (body as ProjectListBody).projects.map(({ id }) => id),
        ).toContain(project.id),
      );
    await request(server())
      .get('/api/projects/roles')
      .set(auth(token))
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect(Array.isArray((body as RolesBody).roles)).toBe(true),
      );

    await request(server())
      .patch(`/api/projects/${project.id}/status`)
      .set(auth(token))
      .send({ status: 'PLANNING' })
      .expect(409)
      .expect(({ body }: { body: unknown }) =>
        expectError(
          body as ErrorBody,
          409,
          'PROJECT_STATUS_TRANSITION_INVALID',
        ),
      );
    await request(server())
      .patch(`/api/projects/${project.id}/status`)
      .set(auth(token))
      .send({ status: 'ON_HOLD' })
      .expect(400)
      .expect(({ body }: { body: unknown }) =>
        expectError(body as ErrorBody, 400, 'PROJECT_STATUS_INVALID'),
      );
    await request(server())
      .patch(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ name: 'Core banking modernization' })
      .expect(200);
    await request(server())
      .delete(`/api/projects/${project.id}`)
      .set(auth(token))
      .expect(200)
      .expect(({ body }: { body: unknown }) =>
        expect((body as ProjectBody).project).toMatchObject({
          status: 'ARCHIVED',
        }),
      );
    expect(
      typeof (
        await prisma.project.findUniqueOrThrow({ where: { id: project.id } })
      ).archivedAt?.toISOString(),
    ).toBe('string');
    await request(server())
      .patch(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ name: 'No update' })
      .expect(409)
      .expect(({ body }: { body: unknown }) =>
        expectError(body as ErrorBody, 409, 'PROJECT_ALREADY_ARCHIVED'),
      );
    await request(server())
      .get(`/api/projects/${project.id}`)
      .set(auth(foreignOwner.auth.accessToken))
      .expect(404)
      .expect(({ body }: { body: unknown }) =>
        expectError(body as ErrorBody, 404, 'PROJECT_NOT_FOUND'),
      );
  });

  it('validates every project, role, membership, and access UUID before resource lookup', async () => {
    const owner = await registerOwner('uuid');
    const token = owner.auth.accessToken;
    const invalid = 'not-a-uuid';
    const requests = [
      () => request(server()).get(`/api/projects/${invalid}`),
      () =>
        request(server())
          .patch(`/api/projects/${invalid}`)
          .send({ name: 'Blocked' }),
      () =>
        request(server())
          .patch(`/api/projects/${invalid}/status`)
          .send({ status: 'DISCOVERY' }),
      () => request(server()).delete(`/api/projects/${invalid}`),
      () =>
        request(server())
          .patch(`/api/projects/roles/${invalid}`)
          .send({ name: 'Blocked' }),
      () => request(server()).delete(`/api/projects/roles/${invalid}`),
      () => request(server()).get(`/api/projects/${invalid}/accesses`),
      () =>
        request(server())
          .put(`/api/projects/${invalid}/accesses/${invalid}`)
          .send({ roleId: invalid }),
      () =>
        request(server()).delete(
          `/api/projects/${invalid}/accesses/${invalid}`,
        ),
    ];
    for (const requestForInvalidId of requests) {
      await requestForInvalidId()
        .set(auth(token))
        .expect(400)
        .expect(({ body }: { body: unknown }) =>
          expectError(body as ErrorBody, 400, 'VALIDATION_ERROR'),
        );
    }
  });

  it('publishes project, role, and access contracts in Swagger', () => {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder().setTitle('E2E').addBearerAuth().build(),
    );
    const collectionPath = document.paths['/api/projects'];
    const rolesPath = document.paths['/api/projects/roles'];
    const accessCollectionPath =
      document.paths['/api/projects/{projectId}/accesses'];
    const projectPath = document.paths['/api/projects/{projectId}'];
    const rolePath = document.paths['/api/projects/roles/{roleId}'];
    const accessPath =
      document.paths['/api/projects/{projectId}/accesses/{membershipId}'];
    expectResponseCodes(projectPath?.delete?.responses, ['200', '404', '409']);
    expectResponseCodes(rolePath?.patch?.responses, [
      '200',
      '400',
      '403',
      '404',
      '409',
    ]);
    expectResponseCodes(accessPath?.put?.responses, [
      '200',
      '400',
      '403',
      '404',
    ]);
    expectResponseCodes(collectionPath?.post?.responses, [
      '201',
      '400',
      '403',
      '409',
    ]);
    expectResponseCodes(collectionPath?.get?.responses, ['200', '400']);
    expectResponseCodes(rolesPath?.post?.responses, ['201', '400', '403']);
    expectResponseCodes(accessCollectionPath?.get?.responses, [
      '200',
      '400',
      '403',
      '404',
    ]);
    for (const property of ['id', 'key', 'status', 'archivedAt'])
      expect(document.components?.schemas?.ProjectDto).toHaveProperty(
        `properties.${property}`,
      );
    for (const property of ['id', 'key', 'name', 'permissions'])
      expect(document.components?.schemas?.ProjectRoleDto).toHaveProperty(
        `properties.${property}`,
      );
    for (const property of ['projectId', 'membership', 'role'])
      expect(document.components?.schemas?.ProjectAccessDto).toHaveProperty(
        `properties.${property}`,
      );
  });

  it('requires a same-tenant read-grant role for restricted listings and honors archived=false', async () => {
    const owner = await registerOwner('ro');
    const limitedMember = await registerOwner('rm');
    const organizationId = owner.activeOrganization?.id;
    expect(organizationId).toBeDefined();
    const membership = await prisma.organizationMembership.create({
      data: { organizationId: organizationId!, userId: limitedMember.user.id },
    });
    const noReadRole = await prisma.role.create({
      data: {
        organizationId: organizationId!,
        scope: 'PROJECT',
        key: `no-read-${randomUUID()}`,
        name: 'No read role',
      },
    });
    const active = await request(server())
      .post('/api/projects')
      .set(auth(owner.auth.accessToken))
      .send({ key: 'visible', name: 'Visible project' })
      .expect(201);
    const archived = await request(server())
      .post('/api/projects')
      .set(auth(owner.auth.accessToken))
      .send({ key: 'archived', name: 'Archived project' })
      .expect(201);
    const activeId = (active.body as ProjectBody).project.id;
    const archivedId = (archived.body as ProjectBody).project.id;
    await prisma.projectAccess.create({
      data: {
        projectId: activeId,
        membershipId: membership.id,
        roleId: noReadRole.id,
      },
    });
    const selected = await request(server())
      .post('/api/auth/select-organization')
      .set(auth(limitedMember.auth.accessToken))
      .send({ organizationId })
      .expect(200);
    const limitedToken = (selected.body as AuthResponse).auth.accessToken;
    await request(server())
      .get('/api/projects')
      .set(auth(limitedToken))
      .expect(200)
      .expect(({ body }: { body: ProjectListBody }) =>
        expect(body.projects).toEqual([]),
      );

    await request(server())
      .delete(`/api/projects/${archivedId}`)
      .set(auth(owner.auth.accessToken))
      .expect(200);
    await request(server())
      .get('/api/projects?archived=false')
      .set(auth(owner.auth.accessToken))
      .expect(200)
      .expect(({ body }: { body: ProjectListBody }) => {
        const ids = body.projects.map(({ id }) => id);
        expect(ids).toContain(activeId);
        expect(ids).not.toContain(archivedId);
      });
    await request(server())
      .get('/api/projects?archived=true')
      .set(auth(owner.auth.accessToken))
      .expect(200)
      .expect(({ body }: { body: ProjectListBody }) =>
        expect(body.projects.map(({ id }) => id)).toContain(archivedId),
      );
  });

  it('returns TENANT_REQUIRED when an authenticated session has no active organization', async () => {
    const user = await prisma.user.create({
      data: { email: `${prefix}+tenantless@example.com` },
    });
    const sessionId = randomUUID();
    const token = tokenService.sign({
      sub: user.id,
      sid: sessionId,
      org: null,
    });
    await prisma.userSession.create({
      data: {
        id: sessionId,
        userId: user.id,
        tokenHash: tokenService.hashToken(token),
        expiresAt: new Date(Date.now() + 60_000),
      },
    });

    for (const requestWithoutTenant of [
      () => request(server()).get('/api/projects'),
      () => request(server()).get('/api/projects/roles'),
      () => request(server()).get(`/api/projects/${randomUUID()}/accesses`),
    ]) {
      await requestWithoutTenant()
        .set(auth(token))
        .expect(403)
        .expect(({ body }: { body: unknown }) =>
          expectError(body as ErrorBody, 403, 'TENANT_REQUIRED'),
        );
    }
  });

  it('returns validation errors instead of throwing for non-string project keys', async () => {
    const owner = await registerOwner('invalid-key-type');
    await request(server())
      .post('/api/projects')
      .set(auth(owner.auth.accessToken))
      .send({ key: { invalid: true }, name: 'Invalid key' })
      .expect(400)
      .expect(({ body }: { body: unknown }) =>
        expectError(body as ErrorBody, 400, 'VALIDATION_ERROR'),
      );
  });

  it('keeps normalized project-key uniqueness local to the active tenant', async () => {
    const first = await registerOwner('key-first');
    const second = await registerOwner('key-second');
    await createProject(first.auth.accessToken, ' core ');
    await request(server())
      .post('/api/projects')
      .set(auth(first.auth.accessToken))
      .send({ key: 'CORE', name: 'Duplicate' })
      .expect(409)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 409, 'PROJECT_ALREADY_EXISTS'),
      );
    await expect(
      createProject(second.auth.accessToken, 'core'),
    ).resolves.toMatchObject({
      key: 'CORE',
    });
  });

  it('lists only project-read grants for a restricted active membership', async () => {
    const owner = await registerOwner('restricted-owner');
    const reader = await registerOwner('restricted-reader');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: reader.user.id },
    });
    const visible = await createProject(owner.auth.accessToken, 'visible-only');
    await createProject(owner.auth.accessToken, 'hidden-project');
    const role = await addProjectRole(organizationId, 'Reader', [
      'projects.read',
    ]);
    await prisma.projectAccess.create({
      data: {
        projectId: visible.id,
        membershipId: membership.id,
        roleId: role.id,
      },
    });
    const readerToken = await selectOrganizationToken(reader, organizationId);
    const response = await request(server())
      .get('/api/projects')
      .set(auth(readerToken))
      .expect(200);
    expect(
      (response.body as ProjectListBody).projects.map(({ id }) => id),
    ).toEqual([visible.id]);
  });

  it('changes list visibility and hides old project IDs after organization selection', async () => {
    const user = await registerOwner('switch-user');
    const foreign = await registerOwner('switch-foreign');
    const oldProject = await createProject(user.auth.accessToken, 'old-tenant');
    const foreignOrganizationId = foreign.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId: foreignOrganizationId, userId: user.user.id },
    });
    await addOrganizationPermissionRole(foreignOrganizationId, membership.id, [
      'projects.read',
    ]);
    const foreignProject = await createProject(
      foreign.auth.accessToken,
      'new-tenant',
    );
    const switchedToken = await selectOrganizationToken(
      user,
      foreignOrganizationId,
    );
    await request(server())
      .get('/api/projects')
      .set(auth(switchedToken))
      .expect(200)
      .expect(({ body }) =>
        expect((body as ProjectListBody).projects.map(({ id }) => id)).toEqual([
          foreignProject.id,
        ]),
      );
    await request(server())
      .get(`/api/projects/${oldProject.id}`)
      .set(auth(switchedToken))
      .expect(404)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 404, 'PROJECT_NOT_FOUND'),
      );
  });

  it('updates only allowed metadata while preserving the project key', async () => {
    const owner = await registerOwner('metadata');
    const project = await createProject(owner.auth.accessToken, 'metadata-key');
    const response = await request(server())
      .patch(`/api/projects/${project.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ name: 'Renamed', description: 'Updated', tags: ['one', 'two'] })
      .expect(200);
    expect((response.body as ProjectBody).project).toMatchObject({
      key: 'METADATA-KEY',
      name: 'Renamed',
      tags: ['one', 'two'],
    });
  });

  it('archives once, preserves the row, and rejects the repeat archive', async () => {
    const owner = await registerOwner('archive-once');
    const project = await createProject(owner.auth.accessToken, 'archive-once');
    const archived = await request(server())
      .delete(`/api/projects/${project.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(200);
    expect((archived.body as ProjectBody).project).toMatchObject({
      status: 'ARCHIVED',
    });
    const persisted = await prisma.project.findUniqueOrThrow({
      where: { id: project.id },
    });
    expect(persisted.deletedAt).toBeNull();
    expect(persisted.archivedAt).not.toBeNull();
    await request(server())
      .delete(`/api/projects/${project.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(409)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 409, 'PROJECT_ALREADY_ARCHIVED'),
      );
  });

  it('returns PROJECT_NOT_FOUND for every foreign project mutation without disclosure', async () => {
    const owner = await registerOwner('not-found-owner');
    const foreign = await registerOwner('not-found-foreign');
    const project = await createProject(
      owner.auth.accessToken,
      'private-project',
    );
    const expectNotFound = ({ body }: { body: unknown }) =>
      expectError(body as ErrorBody, 404, 'PROJECT_NOT_FOUND');
    await request(server())
      .get(`/api/projects/${project.id}`)
      .set(auth(foreign.auth.accessToken))
      .expect(404)
      .expect(expectNotFound);
    await request(server())
      .patch(`/api/projects/${project.id}`)
      .set(auth(foreign.auth.accessToken))
      .send({ name: 'Blocked' })
      .expect(404)
      .expect(expectNotFound);
    await request(server())
      .patch(`/api/projects/${project.id}/status`)
      .set(auth(foreign.auth.accessToken))
      .send({ status: 'DISCOVERY' })
      .expect(404)
      .expect(expectNotFound);
    await request(server())
      .delete(`/api/projects/${project.id}`)
      .set(auth(foreign.auth.accessToken))
      .expect(404)
      .expect(expectNotFound);
  });

  it('unions organization read with matching project manage without granting delete', async () => {
    const owner = await registerOwner('union-owner');
    const member = await registerOwner('union-member');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: member.user.id },
    });
    await addOrganizationPermissionRole(organizationId, membership.id, [
      'projects.read',
    ]);
    const project = await createProject(
      owner.auth.accessToken,
      'union-project',
    );
    const role = await addProjectRole(organizationId, 'Manager', [
      'projects.manage',
    ]);
    await prisma.projectAccess.create({
      data: {
        projectId: project.id,
        membershipId: membership.id,
        roleId: role.id,
      },
    });
    const token = await selectOrganizationToken(member, organizationId);
    await request(server())
      .get(`/api/projects/${project.id}`)
      .set(auth(token))
      .expect(200);
    await request(server())
      .patch(`/api/projects/${project.id}`)
      .set(auth(token))
      .send({ name: 'Member update' })
      .expect(200);
    await request(server())
      .delete(`/api/projects/${project.id}`)
      .set(auth(token))
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'PROJECT_ACCESS_DENIED'),
      );
  });

  it('ignores persisted cross-tenant ProjectAccess role data', async () => {
    const owner = await registerOwner('malformed-access-owner');
    const member = await registerOwner('malformed-access-member');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: member.user.id },
    });
    const project = await createProject(
      owner.auth.accessToken,
      'malformed-access-project',
    );
    const foreignRole = await addProjectRole(
      member.activeOrganization!.id,
      'Foreign reader',
      ['projects.read'],
    );
    await prisma.projectAccess.create({
      data: {
        projectId: project.id,
        membershipId: membership.id,
        roleId: foreignRole.id,
      },
    });
    const token = await selectOrganizationToken(member, organizationId);
    await request(server())
      .get(`/api/projects/${project.id}`)
      .set(auth(token))
      .expect(403)
      .expect(({ body }: { body: unknown }) =>
        expectError(body as ErrorBody, 403, 'PROJECT_ACCESS_DENIED'),
      );
  });

  it('returns an empty restricted list and denied detail when no project grant exists', async () => {
    const owner = await registerOwner('no-grant-owner');
    const member = await registerOwner('no-grant-member');
    const organizationId = owner.activeOrganization!.id;
    await prisma.organizationMembership.create({
      data: { organizationId, userId: member.user.id },
    });
    const project = await createProject(
      owner.auth.accessToken,
      'no-grant-project',
    );
    const token = await selectOrganizationToken(member, organizationId);
    await request(server())
      .get('/api/projects')
      .set(auth(token))
      .expect(200)
      .expect(({ body }) =>
        expect((body as ProjectListBody).projects).toEqual([]),
      );
    await request(server())
      .get(`/api/projects/${project.id}`)
      .set(auth(token))
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'PROJECT_ACCESS_DENIED'),
      );
  });

  it('creates and updates a custom PROJECT role while preserving its key', async () => {
    const owner = await registerOwner('role-crud');
    const created = await request(server())
      .post('/api/projects/roles')
      .set(auth(owner.auth.accessToken))
      .send({ name: 'Release Manager', permissionKeys: ['projects.read'] })
      .expect(201);
    const role = (created.body as { role: { id: string; key: string } }).role;
    const updated = await request(server())
      .patch(`/api/projects/roles/${role.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ name: 'Release Owner', permissionKeys: ['projects.manage'] })
      .expect(200);
    expect(
      (
        updated.body as {
          role: { key: string; name: string; permissions: unknown[] };
        }
      ).role,
    ).toMatchObject({
      key: role.key,
      name: 'Release Owner',
    });
    expect(
      (updated.body as { role: { permissions: unknown[] } }).role.permissions,
    ).toHaveLength(1);
  });

  it('rejects duplicate, forbidden, and undelegated custom-role permissions without persisting a role', async () => {
    const owner = await registerOwner('role-invalid');
    const before = await prisma.role.count({
      where: { organizationId: owner.activeOrganization!.id, scope: 'PROJECT' },
    });
    for (const permissionKeys of [
      ['projects.read', 'projects.read'],
      ['projects.create'],
      ['members.manage'],
    ]) {
      await request(server())
        .post('/api/projects/roles')
        .set(auth(owner.auth.accessToken))
        .send({ name: `Invalid ${permissionKeys.join('-')}`, permissionKeys })
        .expect(400)
        .expect(({ body }: { body: unknown }) =>
          expectError(body as ErrorBody, 400, 'PROJECT_ROLE_INVALID'),
        );
    }
    await expect(
      prisma.role.count({
        where: {
          organizationId: owner.activeOrganization!.id,
          scope: 'PROJECT',
        },
      }),
    ).resolves.toBe(before);
  });

  it('rejects deterministic project-role key collisions predictably', async () => {
    const owner = await registerOwner('role-collision');
    await request(server())
      .post('/api/projects/roles')
      .set(auth(owner.auth.accessToken))
      .send({ name: 'Release Manager', permissionKeys: [] })
      .expect(201);
    await request(server())
      .post('/api/projects/roles')
      .set(auth(owner.auth.accessToken))
      .send({ name: 'release-manager', permissionKeys: [] })
      .expect(409)
      .expect(({ body }: { body: unknown }) =>
        expectError(body as ErrorBody, 409, 'PROJECT_ROLE_ALREADY_EXISTS'),
      );
  });

  it('gives a create-only member bootstrap project access through the protected creator role', async () => {
    const owner = await registerOwner('creator-owner');
    const creator = await registerOwner('creator-member');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: creator.user.id },
    });
    await addOrganizationPermissionRole(organizationId, membership.id, [
      'projects.create',
    ]);
    const token = await selectOrganizationToken(creator, organizationId);
    const project = await createProject(token, 'creator-bootstrap');
    const access = await prisma.projectAccess.findFirstOrThrow({
      where: { projectId: project.id, membershipId: membership.id },
      include: {
        role: { include: { permissions: { include: { permission: true } } } },
      },
    });
    expect(access.role.isSystem).toBe(true);
    expect(
      access.role.permissions.map(({ permission }) => permission.key).sort(),
    ).toEqual(['projects.delete', 'projects.manage', 'projects.read']);
    await request(server())
      .get(`/api/projects/${project.id}`)
      .set(auth(token))
      .expect(200);
  });

  it('keeps project creation bootstrap atomic when a duplicate normalized key aborts creation', async () => {
    const owner = await registerOwner('bootstrap-atomic');
    const original = await createProject(owner.auth.accessToken, 'atomic-key');
    const accessCount = await prisma.projectAccess.count({
      where: { projectId: original.id },
    });
    await request(server())
      .post('/api/projects')
      .set(auth(owner.auth.accessToken))
      .send({ key: ' atomic-key ', name: 'Must roll back' })
      .expect(409)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 409, 'PROJECT_ALREADY_EXISTS'),
      );
    expect(
      await prisma.project.count({
        where: {
          organizationId: owner.activeOrganization!.id,
          key: 'ATOMIC-KEY',
        },
      }),
    ).toBe(1);
    expect(
      await prisma.projectAccess.count({ where: { projectId: original.id } }),
    ).toBe(accessCount);
  });

  it('assigns, replaces, and revokes same-tenant project access idempotently', async () => {
    const owner = await registerOwner('access-owner');
    const member = await registerOwner('access-member');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: member.user.id },
    });
    const project = await createProject(
      owner.auth.accessToken,
      'access-project',
    );
    const reader = await addProjectRole(organizationId, 'Reader', [
      'projects.read',
    ]);
    const manager = await addProjectRole(organizationId, 'Manager', [
      'projects.manage',
    ]);
    await request(server())
      .put(`/api/projects/${project.id}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ roleId: reader.id })
      .expect(200);
    await request(server())
      .put(`/api/projects/${project.id}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .send({ roleId: manager.id })
      .expect(200);
    expect(
      await prisma.projectAccess.count({
        where: { projectId: project.id, membershipId: membership.id },
      }),
    ).toBe(1);
    await request(server())
      .delete(`/api/projects/${project.id}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(204);
    await request(server())
      .delete(`/api/projects/${project.id}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(204);
    expect(
      await prisma.projectAccess.count({
        where: { projectId: project.id, membershipId: membership.id },
      }),
    ).toBe(0);
  });

  it('excludes and preserves malformed foreign-membership project access', async () => {
    const owner = await registerOwner('access-list-owner');
    const foreignOwner = await registerOwner('access-list-foreign');
    const project = await createProject(
      owner.auth.accessToken,
      'access-list-project',
    );
    const foreignMembership =
      await prisma.organizationMembership.findFirstOrThrow({
        where: {
          organizationId: foreignOwner.activeOrganization!.id,
          userId: foreignOwner.user.id,
          status: 'ACTIVE',
        },
      });
    const foreignRole = await addProjectRole(
      foreignOwner.activeOrganization!.id,
      'Foreign reader',
      ['projects.read'],
    );
    await prisma.projectAccess.create({
      data: {
        projectId: project.id,
        membershipId: foreignMembership.id,
        roleId: foreignRole.id,
      },
    });

    await request(server())
      .get(`/api/projects/${project.id}/accesses`)
      .set(auth(owner.auth.accessToken))
      .expect(200)
      .expect(({ body }: { body: ProjectAccessListBody }) =>
        expect(
          body.accesses.map(({ membership }) => membership.id).sort(),
        ).not.toContain(foreignMembership.id),
      );
    await request(server())
      .delete(`/api/projects/${project.id}/accesses/${foreignMembership.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(204);
    await expect(
      prisma.projectAccess.findUnique({
        where: {
          projectId_membershipId: {
            projectId: project.id,
            membershipId: foreignMembership.id,
          },
        },
      }),
    ).resolves.toMatchObject({
      roleId: foreignRole.id,
    });
  });

  it('preserves malformed access with a same-tenant membership and foreign or ORGANIZATION role', async () => {
    const owner = await registerOwner('local-access-owner');
    const foreignOwner = await registerOwner('local-access-foreign');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: foreignOwner.user.id },
    });
    const project = await createProject(
      owner.auth.accessToken,
      'access-local-member-project',
    );
    const foreignRole = await addProjectRole(
      foreignOwner.activeOrganization!.id,
      'Foreign reader',
      ['projects.read'],
    );
    const organizationRole = await addOrganizationPermissionRole(
      organizationId,
      membership.id,
      [],
    );
    await prisma.projectAccess.create({
      data: {
        projectId: project.id,
        membershipId: membership.id,
        roleId: foreignRole.id,
      },
    });

    await request(server())
      .delete(`/api/projects/${project.id}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(204);
    await expect(
      prisma.projectAccess.findUnique({
        where: {
          projectId_membershipId: {
            projectId: project.id,
            membershipId: membership.id,
          },
        },
      }),
    ).resolves.toMatchObject({ roleId: foreignRole.id });

    await prisma.projectAccess.update({
      where: {
        projectId_membershipId: {
          projectId: project.id,
          membershipId: membership.id,
        },
      },
      data: { roleId: organizationRole.id },
    });
    await request(server())
      .delete(`/api/projects/${project.id}/accesses/${membership.id}`)
      .set(auth(owner.auth.accessToken))
      .expect(204);
    await expect(
      prisma.projectAccess.findUnique({
        where: {
          projectId_membershipId: {
            projectId: project.id,
            membershipId: membership.id,
          },
        },
      }),
    ).resolves.toMatchObject({ roleId: organizationRole.id });
  });

  it('rejects inactive, foreign, and ORGANIZATION-role access targets without changes', async () => {
    const owner = await registerOwner('access-invalid-owner');
    const inactive = await registerOwner('access-invalid-member');
    const foreign = await registerOwner('access-invalid-foreign');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: inactive.user.id, status: 'INVITED' },
    });
    const project = await createProject(
      owner.auth.accessToken,
      'access-invalid-project',
    );
    const organizationRole = await addOrganizationPermissionRole(
      organizationId,
      membership.id,
      [],
    );
    const foreignRole = await addProjectRole(
      foreign.activeOrganization!.id,
      'Foreign',
      ['projects.read'],
    );
    for (const roleId of [organizationRole.id, foreignRole.id]) {
      await request(server())
        .put(`/api/projects/${project.id}/accesses/${membership.id}`)
        .set(auth(owner.auth.accessToken))
        .send({ roleId })
        .expect(roleId === foreignRole.id ? 404 : 400);
    }
    expect(
      await prisma.projectAccess.count({
        where: { projectId: project.id, membershipId: membership.id },
      }),
    ).toBe(0);
  });

  it('denies role and access administration to a caller with only project-derived manage', async () => {
    const owner = await registerOwner('escalation-owner');
    const manager = await registerOwner('escalation-manager');
    const organizationId = owner.activeOrganization!.id;
    const membership = await prisma.organizationMembership.create({
      data: { organizationId, userId: manager.user.id },
    });
    const project = await createProject(
      owner.auth.accessToken,
      'escalation-project',
    );
    const role = await addProjectRole(organizationId, 'Project manager', [
      'projects.manage',
    ]);
    await prisma.projectAccess.create({
      data: {
        projectId: project.id,
        membershipId: membership.id,
        roleId: role.id,
      },
    });
    const token = await selectOrganizationToken(manager, organizationId);
    await request(server())
      .post('/api/projects/roles')
      .set(auth(token))
      .send({ name: 'Escalated', permissionKeys: ['projects.delete'] })
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'PROJECT_ACCESS_DENIED'),
      );
    await request(server())
      .put(`/api/projects/${project.id}/accesses/${membership.id}`)
      .set(auth(token))
      .send({ roleId: role.id })
      .expect(403)
      .expect(({ body }) =>
        expectError(body as ErrorBody, 403, 'PROJECT_ACCESS_DENIED'),
      );
  });
});
