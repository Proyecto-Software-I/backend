## Context

See [proposal.md](proposal.md) for motivation. `LegacySystem` already has the required Project relation, project-local unique code, criticality enum, functional fields, and JSON fields that are deliberately excluded. `ProjectsModule` already establishes active-tenant guards and `ProjectAuthorizationService`, which calculates the valid ORGANIZATION plus matching `ProjectAccess` PROJECT-role permission union. However, configurable PROJECT roles currently allow only `projects.*`, so they cannot grant the required `systems.*` permissions.

## Goals / Non-Goals

**Goals:**
- Add a focused domain module and nested Project-owned REST contract.
- Use the existing effective Project authorization service and expand its configurable-role input allowlist for `systems.read` and `systems.manage`.
- Preserve tenant non-disclosure, stable errors, Swagger quality, and the existing no-metadata boundary.

**Non-Goals:**
- Redesign RBAC, add a new guard/resolver, change the permission catalog, or expose JSON metadata.
- Add any schema field, migration, ingestion, environment, source-connection, Application, archive, or delete behavior.

## Decisions

### Separate LegacySystems module, reuse Project authorization

Create `src/legacy-systems/` with controller, service, DTOs, response mappers, unit tests, and a module imported by `AppModule`. Export `ProjectAuthorizationService` from `ProjectsModule` and import that module into `LegacySystemsModule`; the system service will call its existing effective-permission method rather than copy queries or use `PermissionGuard`, whose organization-only permissions cannot evaluate a route Project.

This keeps controllers limited to HTTP/Swagger/DTO responsibilities and keeps resource authorization and Prisma ownership checks in the service. Embedding systems in `ProjectsService` would couple an independently growing ingestion domain to project lifecycle. A new authorization mechanism would violate issue #18 and risk semantic drift, so it is rejected.

### Permission composition and operation order

For each operation, `JwtAuthGuard` plus the existing tenant guard establishes an authenticated active organization. The service then performs this order:

1. Load the route Project using `id`, active `organizationId`, and `deletedAt: null`; return `PROJECT_NOT_FOUND` when absent or foreign.
2. Resolve existing effective Project permissions for the authenticated user, tenant, and Project. Valid ORGANIZATION permissions and the matching ACTIVE membership/PROJECT-role `ProjectAccess` permissions are deduplicated.
3. Require `systems.read` for list/detail or `systems.manage` for create/update; return `SYSTEM_ACCESS_DENIED` if absent.
4. For detail/update only, load the non-deleted LegacySystem constrained by both `id` and the already validated `projectId`; return `SYSTEM_NOT_FOUND` for missing, foreign, or mismatched rows.

The order prevents foreign Project disclosure and ensures an unauthorized caller cannot probe system IDs in an in-tenant Project. It also deliberately permits a PROJECT role containing only `systems.read` or `systems.manage`, as confirmed by the product decision; `projects.read` is not an additional requirement. The existing `ProjectRolesService` allowlist and delegation check will be extended, not bypassed, so `members.manage` plus the caller's organization-level delegated permission remains required to grant either key.

### Contract, validation, and persistence boundaries

DTO transformation will trim/uppercase `code` on create and validate the same hyphenated uppercase grammar used by Project keys, with the model's 80-character limit. Update DTOs omit `code` and all ownership/metadata fields. The global whitelist plus `forbidNonWhitelisted` behavior makes manipulated fields a `VALIDATION_ERROR` rather than ignored input.

The service will create and select only functional columns; response mapping will whitelist public fields rather than serialize Prisma rows. It will filter `deletedAt: null`, order lists by `createdAt desc, id asc`, and translate the `(projectId, code)` unique conflict to `SYSTEM_ALREADY_EXISTS`. No transaction is needed for the single-row system mutation; an implementation-time multi-row change must update this plan first.

### Database, Swagger, and testing approach

No schema change, migration, seed change, dependency, or generated-client edit is planned: the schema and permission seed already provide every needed column, enum, uniqueness rule, and permission key. Swagger DTOs will explicitly show the enum, allowed requests, wrappers, UUID parameters, response statuses, errors, permissions, ownership, and immutable/no-metadata rules.

Add focused service/DTO/role-allowlist unit tests. Extend the real PostgreSQL E2E suite using its existing authenticated tenants, role helpers, active-organization switching, stable-error assertions, cleanup, and Swagger document checks. Include the direct ProjectAccess-derived `systems.*` scenario, not just organization-role access.

## Risks / Trade-offs

- **A role allowlist expansion can enable unexpected grants** → retain the existing `members.manage` authorization and organization-level delegated-permission rule; test rejected undelegated/unknown keys.
- **Checking a system before authorization can disclose it** → enforce Project lookup, effective permission, then system lookup in service methods and negative E2E tests.
- **Prisma unique errors can leak implementation details** → map only the known duplicate case to `SYSTEM_ALREADY_EXISTS`; let the common exception filter preserve controlled errors.
- **The existing `LegacySystem` relation uses cascade deletion** → this change does not delete or archive either resource; no migration alters historic deletion behavior.
- **Issue #15 may evolve before merge** → integrate against its merged `ProjectsModule`/authorization contract; if its exported service or error semantics differ, update this plan before applying.

## Migration Plan

1. Wait for `PLAN APPROVED`; do not start implementation before that gate.
2. Implement the approved module, Project-role allowlist update, Swagger, and tests without Prisma migration or seed work.
3. Validate with the focused unit/E2E suite and `npm run check`; deploy as a backward-compatible application release.
4. Roll back by reverting the application release. Because no migration or persisted-data transformation is introduced, existing systems and permission records need no rollback migration.
