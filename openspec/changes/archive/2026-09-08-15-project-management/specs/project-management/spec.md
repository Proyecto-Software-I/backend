# Project Management Specification

## Purpose

Define tenant-safe project CRUD, visibility, workflow, archive, and public HTTP contracts.

## ADDED Requirements

### Requirement: Tenant-derived project creation and stable keys

`POST /api/projects` SHALL require organization-level `projects.create` and return `201`. The body SHALL accept `key`, `name`, optional `description`, `clientReference`, and string-array `tags`; it MUST NOT accept tenant, creator, status, archive, deletion, or settings fields. The system SHALL derive the active organization and user, create `DRAFT`, normalize key by trim then uppercase, require `^[A-Z0-9]+(?:-[A-Z0-9]+)*$` and 1–50 characters, and enforce normalized-key uniqueness per organization.

#### Scenario: Create in the active tenant
- **GIVEN** an active member has organization-level `projects.create`
- **WHEN** they post key ` core-banking ` and valid metadata
- **THEN** `201` returns `CORE-BANKING`, `DRAFT`, and tenant-derived ownership

#### Scenario: Key uniqueness is tenant-local
- **GIVEN** normalized key `CORE` exists in organization A
- **WHEN** A creates it again, then organization B creates it
- **THEN** A receives `409 PROJECT_ALREADY_EXISTS` and B receives `201`

### Requirement: Accessible project listing and detail

`GET /api/projects` SHALL return `200 { projects: [...] }`, default to non-archived projects, and accept only boolean `archived`; `true` SHALL return archived projects only. Organization-level `projects.read` SHALL reveal all matching non-deleted tenant projects; otherwise only projects granting effective `projects.read` SHALL appear. `GET /api/projects/:projectId` SHALL return `200` only with effective read. Results SHALL order by `createdAt` descending then `id`, expose `id,key,name,description,status,clientReference,tags,createdAt,updatedAt,archivedAt`, normalize absent tags to `[]`, and omit `settings`.

#### Scenario: Restricted list remains non-disclosing
- **GIVEN** a member has read access to one of several active tenant projects
- **WHEN** they request `GET /api/projects`
- **THEN** `200` contains only that project and no foreign or archived project

#### Scenario: Organization switch changes visibility
- **GIVEN** a user selects another active organization and uses its new token
- **WHEN** they request the list or an old-tenant project ID
- **THEN** only new-tenant projects are listed and the old ID returns `404 PROJECT_NOT_FOUND`

### Requirement: Metadata and strict workflow updates

`PATCH /api/projects/:projectId` SHALL require effective `projects.manage`, accept only `name`, `description`, `clientReference`, and `tags`, and return `200`; the key SHALL remain immutable. `PATCH /api/projects/:projectId/status` SHALL accept only `{ status }`, return `200`, and permit exactly `DRAFT -> DISCOVERY -> PLANNING -> MIGRATING -> VALIDATING -> COMPLETED`. It MUST reject `ON_HOLD` and `ARCHIVED` through this route.

#### Scenario: Update allowed metadata
- **GIVEN** a member has effective `projects.manage`
- **WHEN** they patch allowed metadata
- **THEN** `200` returns the update without changing key or ownership fields

#### Scenario: Reject unsupported or skipped status
- **GIVEN** a project is `DRAFT`
- **WHEN** status is `ON_HOLD` or `PLANNING`
- **THEN** the response is respectively `400 PROJECT_STATUS_INVALID` or `409 PROJECT_STATUS_TRANSITION_INVALID`

### Requirement: Archive is consistent and non-destructive

`DELETE /api/projects/:projectId` SHALL require effective `projects.delete`, atomically set `status=ARCHIVED` and `archivedAt` to the same operation time, leave `deletedAt` null, preserve the record, and return `200` with the project representation. No later workflow or metadata update SHALL be allowed.

#### Scenario: Archive once
- **GIVEN** an accessible non-archived project
- **WHEN** an authorized member deletes it twice
- **THEN** the first call archives it and the second returns `409 PROJECT_ALREADY_ARCHIVED`

### Requirement: Stable errors and Swagger contracts

Errors SHALL use `{ statusCode, code, message }`: `TENANT_REQUIRED` and `PROJECT_ACCESS_DENIED` are `403`; `PROJECT_NOT_FOUND` is `404`; validation and `PROJECT_STATUS_INVALID` are `400`; duplicate, invalid transition, and already archived errors are `409`. Missing and cross-tenant IDs MUST both use `PROJECT_NOT_FOUND`. Swagger SHALL describe every route, DTO, filter, permission, response, status, error, workflow, and archive semantics above.

#### Scenario: Deny without disclosing existence
- **GIVEN** a caller uses a missing or foreign project ID
- **WHEN** they read, update, change status, or archive it
- **THEN** every operation returns `404 PROJECT_NOT_FOUND`

#### Scenario: Contract is Swagger-visible
- **GIVEN** the OpenAPI document is generated
- **WHEN** a client inspects project operations
- **THEN** documented inputs, outputs, statuses, permissions, filters, and errors match this specification
