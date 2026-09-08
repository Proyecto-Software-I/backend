# Project Access Control Specification

## Purpose

Define project permission resolution, configurable tenant roles, safe bootstrap access, and access administration.

## ADDED Requirements

### Requirement: Effective permissions are a tenant-safe union

For an `ACTIVE` membership, effective permissions on a project SHALL be the deduplicated union of current ORGANIZATION-role permissions and permissions from its matching `ProjectAccess` PROJECT role, only when project, membership, role, and active organization share the tenant. Organization `projects.read|manage|delete` applies to every tenant project; PROJECT permissions apply only to the assigned project. Permission changes SHALL affect the next request. `projects.create` MUST remain organization-only.

#### Scenario: Union grants complementary access
- **GIVEN** organization permissions grant read and valid ProjectAccess grants manage
- **WHEN** the member reads and updates that project
- **THEN** both operations succeed, while ungranted archive remains `403 PROJECT_ACCESS_DENIED`

#### Scenario: Missing project grant is unambiguous
- **GIVEN** a member lacks organization read and has no matching ProjectAccess
- **WHEN** they list projects or request a same-tenant project
- **THEN** list returns `200 { projects: [] }` and detail returns `403 PROJECT_ACCESS_DENIED`

### Requirement: Tenant PROJECT roles are configurable

Projects SHALL expose `GET/POST /api/projects/roles` and `PATCH/DELETE /api/projects/roles/:roleId`. Listing SHALL require organization `members.read` and return `200`; mutations SHALL require organization `members.manage`, returning `201`, `200`, and `200`. Bodies SHALL accept `name`, optional `description`, and unique `permissionKeys`; only `projects.read`, `projects.manage`, and `projects.delete` MAY be assigned. Roles SHALL be active-tenant, `scope=PROJECT`, and custom-role keys SHALL be stable normalized lowercase slugs unique within tenant and scope. Update SHALL preserve key; delete SHALL reject referenced roles.

#### Scenario: Create and update a custom role
- **GIVEN** an authorized caller requests only allowlisted permissions
- **WHEN** they create then update a PROJECT role
- **THEN** responses persist exactly those permissions and preserve its generated key

#### Scenario: Reject invalid role content
- **GIVEN** permissions are duplicate, unknown, include `projects.create`, or exceed caller delegation authority
- **WHEN** a role mutation is requested
- **THEN** it returns `400 PROJECT_ROLE_INVALID` without partial changes

### Requirement: Creator receives atomic safe access

Project creation SHALL idempotently ensure a protected tenant system PROJECT role with exactly `projects.read`, `projects.manage`, and `projects.delete`, then atomically create a `ProjectAccess` from the creator’s active membership to that role. The system role MUST NOT be editable or deletable, and failure to create either record SHALL create neither.

#### Scenario: Creator can administer the new project
- **GIVEN** a member has organization `projects.create` only
- **WHEN** they create a project
- **THEN** creation returns `201` and their bootstrap access permits read, manage, and archive

#### Scenario: Bootstrap is atomic
- **GIVEN** safe access cannot be established
- **WHEN** project creation is attempted
- **THEN** the request fails and neither project nor ProjectAccess remains

### Requirement: Access can be listed, assigned, replaced, and revoked

`GET /api/projects/:projectId/accesses`, `PUT /api/projects/:projectId/accesses/:membershipId` with `{ roleId }`, and `DELETE` on the same target SHALL require organization `members.manage`. They SHALL return respectively `200 { accesses: [...] }`, `200`, and `204`. PUT SHALL create or replace the single membership-project access atomically; DELETE SHALL revoke it. Returned accesses SHALL contain safe membership identity and role metadata, never unrelated tenant data.

#### Scenario: Assign then revoke access
- **GIVEN** project, ACTIVE membership, and PROJECT role share the active tenant
- **WHEN** an authorized caller assigns and then revokes the role
- **THEN** permissions apply after PUT and disappear after `204` DELETE

#### Scenario: Reject tenant or scope mismatch
- **GIVEN** membership or role is foreign, membership is inactive, or role scope is ORGANIZATION
- **WHEN** PUT is requested
- **THEN** `400 PROJECT_ACCESS_INVALID` is returned without changing access

### Requirement: Delegation cannot escalate privileges

Role creation/update and access assignment SHALL require every delegated project permission to be present in the caller’s current ORGANIZATION permissions; PROJECT-derived permissions MUST NOT authorize role or access administration. Self-assignment SHALL obey the same rule. Foreign or missing project IDs SHALL be `404 PROJECT_NOT_FOUND`; foreign or missing role IDs SHALL be `404 ROLE_NOT_FOUND`; foreign or missing membership IDs SHALL be `404 MEMBERSHIP_NOT_FOUND`. Used roles SHALL return `409 ROLE_IN_USE`, and protected system roles `409 ROLE_IS_SYSTEM`. All errors SHALL use `{ statusCode, code, message }` without disclosing foreign resources.

#### Scenario: Project manager cannot self-escalate
- **GIVEN** a caller has project-derived manage but lacks organization `members.manage`
- **WHEN** they mutate roles or accesses
- **THEN** `403 PROJECT_ACCESS_DENIED` is returned and no state changes

### Requirement: Access contracts are Swagger-visible

Swagger SHALL document all role/access routes, DTOs, permissions, allowlist, response statuses, stable errors, union semantics, and tenant/scope restrictions.

#### Scenario: Frontend can derive access behavior
- **GIVEN** the OpenAPI document is generated
- **WHEN** role and access operations are inspected
- **THEN** their schemas and responses match this specification
