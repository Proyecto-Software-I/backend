## 0. Approval Gate

- [x] 0.1 Record explicit `PLAN APPROVED` for issue #18 before modifying application code, Prisma schema, migrations, tests, or implementation configuration.

## 1. Project Authorization Contract

- [x] 1.1 Extend the existing configurable PROJECT-role permission allowlist and delegation validation to accept `systems.read` and `systems.manage` without changing the existing effective Project authorization mechanism.
- [x] 1.2 Export the existing Project authorization service from `ProjectsModule` for the LegacySystems domain and add focused tests proving same-tenant ProjectAccess-derived `projects.read` plus `systems.*` grants, rejection of `systems.*` without `projects.read`, delegation restrictions, and invalid keys.

## 2. Legacy System Domain Contract

- [x] 2.1 Create the `LegacySystemsModule` and register it in the application using the existing auth, tenant, Prisma, and Project authorization patterns.
- [x] 2.2 Add create, update, public response, and list DTOs with UUID parameter validation, code trim/uppercase normalization, stable grammar, `SYSTEM_CRITICALITY_INVALID` for well-formed unsupported criticality values, `VALIDATION_ERROR` for malformed type/shape or forbidden fields, model-aligned length limits, and whitelist-only mutable fields.
- [x] 2.3 Implement the LegacySystems service with active-tenant Project lookup first, effective `projects.read` authorization second, operation-specific `systems.*` authorization third, and Project-scoped non-deleted system lookup fourth; map `PROJECT_ACCESS_DENIED`, `SYSTEM_ACCESS_DENIED`, stable not-found, and duplicate outcomes. Map any `(projectId, code)` unique conflict to `SYSTEM_ALREADY_EXISTS` without a `deletedAt` qualification.
- [x] 2.4 Implement the nested controller routes for create, list, detail, and update with the documented wrappers, HTTP statuses, explicit public-field mapping, and no JSON metadata exposure.

## 3. Swagger and Tests

- [x] 3.1 Document all LegacySystem routes, DTOs, `SystemCriticality`, ordered `projects.read` then `systems.*` permissions, ownership, immutable fields, no-metadata policy, response wrappers, and stable error responses including `SYSTEM_CRITICALITY_INVALID`, `VALIDATION_ERROR`, `PROJECT_ACCESS_DENIED`, and `SYSTEM_ACCESS_DENIED` in Swagger.
- [x] 3.2 Add DTO/service unit tests for normalized code, unsupported-criticality mapping, malformed/forbidden-field validation, allowed functional fields, immutable-field rejection, duplicate-conflict mapping without a `deletedAt` qualifier, ordering, effective `projects.read` plus `systems.*` composition, `systems.*`-only denial, tenant-scoped Project lookup, and Project/System mismatch.
- [x] 3.3 Extend PostgreSQL E2E coverage for create/list/detail/update, project-local uniqueness, cross-Project code reuse, unsupported criticality, malformed/forbidden input, direct ProjectAccess-derived `projects.read` plus read/manage, `systems.*` without `projects.read`, missing system permissions, foreign-tenant list/create/read/update, Project/System mismatch, stable errors, metadata exclusion, and Swagger; retain Projects/Auth/RBAC regression coverage.

## 4. Verification

- [x] 4.1 Confirm no Prisma schema change, migration, seed change, dependency, source ingestion, Application CRUD, archive, or delete behavior was introduced; update OpenSpec before proceeding if any becomes necessary.
- [x] 4.2 Run focused unit tests and E2E tests against local PostgreSQL after the approved implementation.
- [x] 4.3 Run `npm run check` and resolve all failures before requesting implementation review.
