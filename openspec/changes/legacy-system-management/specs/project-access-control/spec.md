## MODIFIED Requirements

### Requirement: Tenant PROJECT roles are configurable
Projects SHALL expose `GET/POST /api/projects/roles` and `PATCH/DELETE /api/projects/roles/:roleId`. Listing SHALL require organization `members.read` and return `200`; mutations SHALL require organization `members.manage`, returning `201`, `200`, and `200`. Bodies SHALL accept a meaningful non-empty `name`, optional `description`, and `permissionKeys`; a non-empty name that normalizes to an empty deterministic role key SHALL return `400 PROJECT_ROLE_INVALID`. Only `projects.read`, `projects.manage`, `projects.delete`, `systems.read`, and `systems.manage` MAY be assigned. Duplicate permission keys SHALL return `400 PROJECT_ROLE_INVALID`; an empty permission array remains valid. Roles SHALL be active-tenant, `scope=PROJECT`, and custom-role keys SHALL be stable normalized lowercase slugs unique within tenant and scope. A deterministic-key collision SHALL return `409 PROJECT_ROLE_ALREADY_EXISTS`. Update SHALL preserve key; delete SHALL reject referenced roles.

#### Scenario: Create and update a custom role
- **GIVEN** an authorized caller requests only allowlisted permissions
- **WHEN** they create then update a PROJECT role
- **THEN** responses persist exactly those permissions and preserve its generated key

#### Scenario: Grant a system permission through ProjectAccess
- **GIVEN** an organization-level authorized role administrator delegates `systems.read` or `systems.manage` in a PROJECT role and assigns it through ProjectAccess
- **WHEN** the assigned ACTIVE member makes the corresponding operation on that Project
- **THEN** the permission is part of the existing effective Project permission union for the next request

#### Scenario: Reject invalid role content
- **GIVEN** permissions are duplicate, unknown, include `projects.create`, or exceed caller delegation authority
- **WHEN** a role mutation is requested
- **THEN** it returns `400 PROJECT_ROLE_INVALID` without partial changes
