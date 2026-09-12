## Exploration: Legacy System Management

### Evidence reviewed

- Issue #18 and the merged Project Management / Project Access Control contracts.
- `src/projects/`, `src/access-control/`, `src/auth/`, `prisma/schema/projects-source.prisma`, `prisma/seed.ts`, and `docs/architecture/multi-tenancy.md`.

### Current state

`LegacySystem` already belongs to `Project`, inherits organization ownership through that parent, has `SystemCriticality`, and enforces `@@unique([projectId, code])`. The existing permission seed already defines `systems.read` and `systems.manage`. No LegacySystem API module exists.

Effective Project authorization already unions valid organization-role permissions with a matching active-membership `ProjectAccess` PROJECT-role permission set. The current configurable PROJECT-role allowlist contains only `projects.read`, `projects.manage`, and `projects.delete`, so it must be expanded for the issue's required direct `ProjectAccess` system grants.

### Resolved decisions and rationale

| Topic | Decision | Rationale |
| --- | --- | --- |
| Route shape | Use the four Project-nested routes proposed by issue #18. | The parent makes ownership explicit and avoids ambiguous parallel system routes. |
| Code | Trim, uppercase, validate `^[A-Z0-9]+(?:-[A-Z0-9]+)*$`, limit to the existing 80-character column, and keep immutable. | It gives the frontend a stable Project-local human identifier without schema work. |
| Permissions | Require only the operation-specific effective `systems.read` or `systems.manage` after validating the tenant-scoped Project. | The confirmed product decision requires PROJECT roles to grant these permissions directly; requiring `projects.read` would defeat that scenario. |
| Non-disclosure | Foreign/missing Project is `404 PROJECT_NOT_FOUND`; after Project authorization, missing/mismatched System is `404 SYSTEM_NOT_FOUND`; missing `systems.*` is `403 SYSTEM_ACCESS_DENIED`. | This follows existing Project error semantics while preventing system-ID probing. |
| Public data | Whitelist functional metadata plus identity/ownership and timestamps; omit all JSON metadata and `deletedAt`. | JSON fields are reserved for later Discovery/Analysis work. |
| List order | `createdAt` descending, then `id` ascending. | It matches the current Project list convention and is deterministic. |
| Database | No schema, migration, or seed change. | Existing schema, uniqueness, enum, field lengths, and permission catalog cover the approved first version. |

### Assumptions

- The implementation will target the merged Project Management authorization contract; if its exported-module shape changes before apply, the OpenSpec must be updated rather than introducing a second resolver.
- Existing global validation remains configured with whitelist and `forbidNonWhitelisted`, so unsupported request fields receive `VALIDATION_ERROR` instead of being silently dropped.
- Soft-deleted systems are excluded from all routes. This does not add an archive/delete operation.

### Boundaries

HU-009 environments, HU-010 source connections, repositories, Git/ZIP/filesystem work, scanning, snapshots, discovery/analysis, AI, Application CRUD, system moves, and system archive/hard-delete remain out of scope.
