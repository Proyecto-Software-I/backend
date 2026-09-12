## Why

[GitHub issue #18 — Implement legacy-system registration and management](https://github.com/Proyecto-Software-I/backend/issues/18) delivers HU-008 after Project Management: a project member needs a stable, tenant-safe way to register and maintain the functional metadata of each legacy system independently before ingestion and discovery begin.

## What Changes

- Add nested Project-owned LegacySystem create, list, detail, and metadata-update API contracts.
- Establish an immutable, normalized, project-local system `code` and safe public representation limited to functional metadata.
- Reuse the existing active-tenant and effective Project authorization path. `systems.read` controls list/detail; `systems.manage` controls create/update.
- Extend configurable PROJECT-role delegation so an authorized organization-level role administrator can assign `systems.read` and `systems.manage` through existing `ProjectAccess`; no parallel authorization mechanism is introduced.
- Define stable validation, conflict, not-found, and authorization behavior that does not disclose cross-tenant or project-mismatched resources.
- Document Swagger and unit/E2E coverage needed for the frontend API contract.
- Require a visible `PLAN APPROVED` gate before any implementation task begins.

## Capabilities

### New Capabilities
- `legacy-system-management`: Project-nested lifecycle and public API behavior for LegacySystem functional metadata.

### Modified Capabilities
- `project-access-control`: Permit `systems.read` and `systems.manage` in delegable PROJECT roles and therefore in existing effective Project permissions.

## Impact

- **API/frontend:** the frontend gains four `/api/projects/:projectId/systems` routes and Swagger schemas; frontend coordination is required because issue #18 is labeled `api-contract`.
- **Authorization/security:** implementation will compose `ProjectAuthorizationService` with the active organization, existing `ProjectAccess`, and the two catalogued `systems.*` permissions; resource IDs alone never authorize access.
- **Database:** `LegacySystem`, `SystemCriticality`, its `projectId + code` uniqueness, and current field lengths already satisfy the requested initial contract. No Prisma schema change or migration is planned unless implementation proves a requirement the current model cannot satisfy.
- **Compatibility:** current PROJECT-role delegation is intentionally expanded from `projects.*` to the two existing `systems.*` permissions. Existing Project role/access behavior remains unchanged.
- **Deployment:** no dependency or infrastructure change is planned. The existing idempotent permission seed already contains both `systems.*` keys; deployment risk is limited to applying the approved application release and verifying its database-compatible tests.
- **Risk:** incorrect ordering of tenant lookup and permission checks could disclose a foreign Project/System, and an incomplete Project-role allowlist would make the required ProjectAccess-derived `systems.*` grants impossible. The design and tests make both boundaries explicit.
