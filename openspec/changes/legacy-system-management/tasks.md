## 0. Approval Gate

- [ ] 0.1 Record explicit `PLAN APPROVED` for issue #18 before modifying application code, Prisma schema, migrations, tests, or implementation configuration.

## 1. Project Authorization Contract

- [ ] 1.1 Extend the existing configurable PROJECT-role permission allowlist and delegation validation to accept `systems.read` and `systems.manage` without changing the existing effective Project authorization mechanism.
- [ ] 1.2 Export the existing Project authorization service from `ProjectsModule` for the LegacySystems domain and add focused tests proving same-tenant ProjectAccess-derived `systems.*` grants, delegation restrictions, and invalid keys.

## 2. Legacy System Domain Contract

- [ ] 2.1 Create the `LegacySystemsModule` and register it in the application using the existing auth, tenant, Prisma, and Project authorization patterns.
- [ ] 2.2 Add create, update, public response, and list DTOs with UUID parameter validation, code trim/uppercase normalization, stable grammar, enum validation, model-aligned length limits, and whitelist-only mutable fields.
- [ ] 2.3 Implement the LegacySystems service with active-tenant Project lookup first, existing effective Project permission composition second, and Project-scoped non-deleted system lookup third; map stable not-found, access-denied, and duplicate outcomes.
- [ ] 2.4 Implement the nested controller routes for create, list, detail, and update with the documented wrappers, HTTP statuses, explicit public-field mapping, and no JSON metadata exposure.

## 3. Swagger and Tests

- [ ] 3.1 Document all LegacySystem routes, DTOs, `SystemCriticality`, permissions, ownership, immutable fields, no-metadata policy, response wrappers, and stable error responses in Swagger.
- [ ] 3.2 Add DTO/service unit tests for normalized code, allowed functional fields, immutable-field rejection, duplicate-conflict mapping, ordering, effective `systems.*` composition, tenant-scoped Project lookup, and Project/System mismatch.
- [ ] 3.3 Extend PostgreSQL E2E coverage for create/list/detail/update, project-local uniqueness, cross-Project code reuse, direct ProjectAccess-derived read/manage, missing permissions, foreign-tenant list/create/read/update, Project/System mismatch, stable errors, metadata exclusion, and Swagger; retain Projects/Auth/RBAC regression coverage.

## 4. Verification

- [ ] 4.1 Confirm no Prisma schema change, migration, seed change, dependency, source ingestion, Application CRUD, archive, or delete behavior was introduced; update OpenSpec before proceeding if any becomes necessary.
- [ ] 4.2 Run focused unit tests and E2E tests against local PostgreSQL after the approved implementation.
- [ ] 4.3 Run `npm run check` and resolve all failures before requesting implementation review.
