## Purpose

Define the tenant-safe Project-nested API for registering and maintaining a legacy system's initial functional metadata without exposing ingestion or discovery metadata.

## ADDED Requirements

### Requirement: Project-nested legacy-system routes and public representation
The system SHALL expose `GET /api/projects/:projectId/systems`, `POST /api/projects/:projectId/systems`, `GET /api/projects/:projectId/systems/:systemId`, and `PATCH /api/projects/:projectId/systems/:systemId` under the global `/api` prefix. Create SHALL return `201`; list and detail/update SHALL return `200`, with `{ systems: [...] }` and `{ system: ... }` wrappers respectively. A public system SHALL contain only `id`, `projectId`, `code`, `name`, `description`, `businessOwner`, `technicalOwner`, `criticality`, `businessDomain`, `createdAt`, and `updatedAt`; it SHALL never expose `deletedAt`, `currentArchitecture`, `runtimeMetadata`, or `slaMetadata`.

#### Scenario: Frontend receives the functional system contract
- **GIVEN** a caller can read an accessible Project system
- **WHEN** the caller requests its detail or its Project list
- **THEN** the response uses the documented wrapper and public fields and contains no JSON metadata or deletion field

### Requirement: System creation validates stable project-local code and functional metadata
`POST /api/projects/:projectId/systems` SHALL accept only `code`, `name`, optional `description`, optional `businessOwner`, optional `technicalOwner`, `criticality`, and optional `businessDomain`. It SHALL trim and uppercase `code`, require the resulting 1–80 character value to match `^[A-Z0-9]+(?:-[A-Z0-9]+)*$`, require a non-empty `name` of at most 200 characters, accept only `LOW`, `MEDIUM`, `HIGH`, or `MISSION_CRITICAL` for `criticality`, limit owners to 200 characters and business domain to 160 characters, and derive `projectId` and organization ownership from the validated route Project. The same normalized code SHALL be allowed in different Projects and SHALL return `409 SYSTEM_ALREADY_EXISTS` when it duplicates a non-deleted system in the same Project.

#### Scenario: Create a normalized system in an accessible Project
- **GIVEN** a caller has effective `systems.manage` on an active-tenant Project
- **WHEN** the caller posts code ` core-banking ` with valid functional metadata
- **THEN** `201` returns a system owned by that Project with code `CORE-BANKING`

#### Scenario: Enforce project-local normalized code uniqueness
- **GIVEN** Project A already has normalized code `CORE`
- **WHEN** a caller creates ` core ` in Project A and then creates `CORE` in Project B
- **THEN** Project A returns `409 SYSTEM_ALREADY_EXISTS` and Project B returns `201`

#### Scenario: Reject non-functional or invalid create input
- **GIVEN** a caller submits an invalid code, invalid criticality, or any ownership, timestamp, deletion, or JSON metadata field
- **WHEN** the create request is validated
- **THEN** it returns `400 VALIDATION_ERROR` and creates no system

### Requirement: System metadata updates preserve identity and ownership
`PATCH /api/projects/:projectId/systems/:systemId` SHALL accept only `name`, `description`, `businessOwner`, `technicalOwner`, `criticality`, and `businessDomain`, apply the same applicable field validation as creation, and preserve `id`, `projectId`, `code`, `createdAt`, and all JSON metadata. This capability SHALL not move systems between Projects, archive them, or hard-delete them.

#### Scenario: Update only mutable functional metadata
- **GIVEN** a caller has effective `systems.manage` on the Project
- **WHEN** the caller patches allowed functional metadata
- **THEN** `200` returns the updated metadata while `projectId` and `code` remain unchanged

#### Scenario: Reject manipulated immutable fields
- **GIVEN** a caller submits `code`, `projectId`, `id`, `createdAt`, or JSON metadata in an update payload
- **WHEN** the request is validated
- **THEN** it returns `400 VALIDATION_ERROR` and no system field changes

### Requirement: Effective Project permission composition and tenant-safe access order
Every route SHALL require an authenticated active tenant. It SHALL first resolve the route Project only where `Project.id = projectId`, `Project.organizationId = activeOrganizationId`, and `Project.deletedAt IS NULL`; missing or foreign Projects SHALL return `404 PROJECT_NOT_FOUND`. For an in-tenant Project, it SHALL resolve the caller's existing effective Project permissions as the deduplicated union of valid ORGANIZATION-role permissions and valid matching `ProjectAccess` PROJECT-role permissions, and then require `systems.read` for list/detail or `systems.manage` for create/update. A caller missing the operation's `systems.*` permission SHALL receive `403 SYSTEM_ACCESS_DENIED`. The authorization path SHALL not hardcode role names or introduce a parallel permission mechanism.

#### Scenario: ProjectAccess directly grants a system permission
- **GIVEN** an ACTIVE member has no organization-level `systems.read` but has a same-tenant PROJECT role assigned through `ProjectAccess` with only `systems.read`
- **WHEN** the member lists or reads systems for that assigned Project
- **THEN** the request succeeds without requiring `projects.read` or a hardcoded role name

#### Scenario: Inaccessible Project remains non-disclosing
- **GIVEN** a caller has an active tenant different from the route Project's organization
- **WHEN** the caller lists or creates systems with that Project UUID
- **THEN** the response is `404 PROJECT_NOT_FOUND` without confirming the Project or its systems

### Requirement: System lookup, listing, and failures are scoped to the route Project
List results SHALL include only non-deleted systems belonging to the validated route Project and SHALL order by `createdAt` descending then `id` ascending. Detail and update SHALL locate a non-deleted system by both `systemId` and the validated `projectId`; a missing system, a system from another Project, and a foreign system identifier SHALL all return `404 SYSTEM_NOT_FOUND` after route-Project authorization. The API SHALL use `{ statusCode, code, message }` errors, use `TENANT_REQUIRED` for a missing active tenant, and never expose Prisma errors or cross-tenant details.

#### Scenario: A system cannot be mixed with another Project route
- **GIVEN** System A belongs to Project A and the caller is authorized for Project B
- **WHEN** the caller requests Project B with System A's UUID
- **THEN** detail and update return `404 SYSTEM_NOT_FOUND` and do not reveal System A ownership

#### Scenario: Unauthorized system operation is denied before system existence is revealed
- **GIVEN** a caller reaches an in-tenant Project but lacks the operation's required `systems.*` permission
- **WHEN** the caller lists, creates, reads, or updates a system
- **THEN** the response is `403 SYSTEM_ACCESS_DENIED` without revealing whether the referenced system exists

### Requirement: Swagger and verification define the consumable system contract
Swagger SHALL document all four routes, UUID parameters, request and response DTOs, `SystemCriticality`, mutable versus immutable fields, `systems.read`/`systems.manage`, Project ownership, tenant behavior, and every documented success or stable error status. Unit tests SHALL cover normalization, permission composition, duplicate mapping, immutable updates, and service-scoped lookup. PostgreSQL E2E tests SHALL cover create/list/detail/update, same-Project duplicate rejection and cross-Project acceptance, PROJECT-role-derived `systems.*` permissions, missing permissions, cross-tenant list/create/read/update, Project/System mismatch, no metadata exposure, Swagger, and regression of Projects/Auth/RBAC.

#### Scenario: Swagger allows frontend implementation without inferred fields
- **GIVEN** the OpenAPI document is generated
- **WHEN** a frontend client inspects the LegacySystem operations and schemas
- **THEN** its documented routes, permissions, fields, enum values, ownership, and errors match this specification
