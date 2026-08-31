# organization-memberships Specification

## Purpose
Provides tenant-scoped organization member administration, invitation lifecycle management, invitation acceptance, permission-based authorization, and session tenant invalidation for LegacyLift organizations.

## Requirements

### Requirement: Tenant-scoped permission authorization gates member administration
The system SHALL require authenticated requests to member and invitation administration endpoints to have an active tenant from `UserSession.organizationId`, an `ACTIVE` membership in that tenant, and the required current database permission. Permissions SHALL be resolved from `MembershipRole -> Role -> RolePermission -> Permission.key` for the active organization and SHALL NOT be read from JWT claims. If a request has no active tenant, the system SHALL respond `403` with code `TENANT_REQUIRED`.

#### Scenario: OWNER can administer members
- **GIVEN** an authenticated user has an active tenant and an active membership with a role that currently grants `members.manage`
- **WHEN** the user calls a member administration endpoint requiring `members.manage`
- **THEN** the system allows the request to reach the endpoint behavior

#### Scenario: MEMBER cannot administer members
- **GIVEN** an authenticated user has an active tenant and an active membership whose roles do not currently grant `members.manage`
- **WHEN** the user calls a member administration endpoint requiring `members.manage`
- **THEN** the system responds `403` with code `MEMBER_ACCESS_DENIED`

#### Scenario: Tenant selection is required for administration
- **GIVEN** an authenticated user has a valid session with `organizationId` equal to null
- **WHEN** the user calls an organization administration endpoint
- **THEN** the system responds `403` with code `TENANT_REQUIRED`

### Requirement: Member list exposes current tenant members
The system SHALL expose `GET /api/organizations/current/members` for authenticated users with `members.read`. The response SHALL include only memberships whose `organizationId` equals the active tenant from `UserSession.organizationId`; it SHALL include member `id`, `status`, `joinedAt`, `jobTitle`, nested `user`, and `roles`. Each member `user` object SHALL include `id`, `email`, `displayName`, `firstName`, `lastName`, and `avatarUrl`. `jobTitle` SHALL be the current organization membership job title and SHALL NOT be nested inside `user`. The response SHALL NOT include password hashes, session tokens, refresh tokens, invitation token hashes, or data from other tenants.

#### Scenario: List current organization members
- **GIVEN** an authenticated user has an active tenant and `members.read`
- **WHEN** the user sends `GET /api/organizations/current/members`
- **THEN** the system responds `200 OK` with only members of the active organization and includes member-level `jobTitle` plus `user.displayName`, `user.firstName`, `user.lastName`, and `user.avatarUrl`

#### Scenario: Member list denies missing permission
- **GIVEN** an authenticated user has an active tenant but lacks `members.read`
- **WHEN** the user sends `GET /api/organizations/current/members`
- **THEN** the system responds `403` with code `MEMBER_ACCESS_DENIED`

### Requirement: Invitation list exposes current tenant invitations without secrets
The system SHALL expose `GET /api/organizations/current/invitations` for authenticated users with `members.read`. The response SHALL include only invitations whose `organizationId` equals the active tenant and SHALL omit plaintext tokens, `tokenHash`, `invitedByUserId`, `proposedRoleId`, secrets, and unrelated tenant data. Each invitation item SHALL include `id`, `email`, `status`, `expiresAt`, `createdAt`, `invitedBy` safe fields (`id`, `displayName`) from the persisted `invitedByUserId` relation, and `proposedRole` safe fields (`key`, `name`) from the persisted `proposedRoleId` relation. A `PENDING` invitation whose `expiresAt` is in the past SHALL be treated as `EXPIRED` and SHALL be persisted as `EXPIRED` opportunistically when listed.

The successful response SHALL have this shape:

```json
{
  "invitations": [
    {
      "id": "...",
      "email": "...",
      "status": "PENDING",
      "expiresAt": "...",
      "createdAt": "...",
      "invitedBy": {
        "id": "...",
        "displayName": "..."
      },
      "proposedRole": {
        "key": "MEMBER",
        "name": "Member"
      }
    }
  ]
}
```

#### Scenario: List current organization invitations
- **GIVEN** an authenticated user has an active tenant and `members.read`
- **WHEN** the user sends `GET /api/organizations/current/invitations`
- **THEN** the system responds `200 OK` with invitations only for the active organization, including safe `invitedBy` and `proposedRole` objects, and without token hashes or internal relation IDs

#### Scenario: Invitation list returns persisted invitedBy and proposedRole
- **GIVEN** an invitation in the active organization has persisted `invitedByUserId` and `proposedRoleId`
- **WHEN** an authorized user lists current organization invitations
- **THEN** the response includes `invitedBy.id`, `invitedBy.displayName`, `proposedRole.key`, and `proposedRole.name` derived from those relations

#### Scenario: Expired pending invitations are surfaced as expired
- **GIVEN** an invitation in the active organization is `PENDING` and its `expiresAt` is earlier than now
- **WHEN** an authorized user lists current invitations
- **THEN** the response shows that invitation as `EXPIRED` and the system records that expired status

### Requirement: Invitation creation issues a single-use hashed token
The system SHALL expose `POST /api/organizations/current/invitations` for authenticated users with `members.manage`. The request body SHALL require a valid `email`, normalized with trim and lowercase. The system SHALL reject the request with `409 MEMBER_ALREADY_EXISTS` if the target user already has an `ACTIVE`, `SUSPENDED`, or `REMOVED` membership in the active organization. The only path for `SUSPENDED -> ACTIVE` is administrative membership reactivation, not invitation. If no membership exists, the system SHALL reject a non-expired `PENDING` invitation duplicate for that normalized email with `409 INVITATION_ALREADY_PENDING`. Successful creation SHALL create a `PENDING` invitation expiring in 7 days, store only a cryptographic hash of the token, persist `invitedByUserId` as the authenticated user ID, persist `proposedRoleId` as the active organization's MEMBER role ID, and return an `acceptanceUrl` containing the plaintext token exactly once in the creation response.

#### Scenario: Create invitation
- **GIVEN** an authenticated user has an active tenant and `members.manage`
- **WHEN** the user sends `POST /api/organizations/current/invitations` with a valid email that is not already an active member and has no pending invitation
- **THEN** the system responds `201 Created` with safe invitation metadata and an `acceptanceUrl`, stores only `tokenHash`, persists `invitedByUserId` and MEMBER `proposedRoleId`, and sets `expiresAt` to 7 days after creation

#### Scenario: Active member cannot be invited again
- **GIVEN** an active user is already an `ACTIVE` member of the active organization
- **WHEN** an authorized user sends an invitation for that email
- **THEN** the system responds `409` with code `MEMBER_ALREADY_EXISTS` and does not create an OrganizationInvitation

#### Scenario: Suspended member cannot be invited again
- **GIVEN** a user already has a `SUSPENDED` membership in the active organization
- **WHEN** an authorized user sends an invitation for that user's email
- **THEN** the system responds `409` with code `MEMBER_ALREADY_EXISTS` and does not create an OrganizationInvitation

#### Scenario: Removed member cannot be invited again
- **GIVEN** a user already has a `REMOVED` membership in the active organization
- **WHEN** an authorized user sends an invitation for that user's email
- **THEN** the system responds `409` with code `MEMBER_ALREADY_EXISTS` and does not create an OrganizationInvitation

#### Scenario: Invitation stores inviter and proposed role
- **GIVEN** an authenticated user creates an invitation in the active organization
- **WHEN** invitation creation succeeds
- **THEN** the invitation stores `invitedByUserId` equal to the authenticated user ID and `proposedRoleId` equal to the organization's MEMBER role ID

#### Scenario: Duplicate pending invitation is rejected
- **GIVEN** a non-expired `PENDING` invitation already exists for the normalized email in the active organization
- **WHEN** an authorized user sends another invitation for that email
- **THEN** the system responds `409` with code `INVITATION_ALREADY_PENDING`

#### Scenario: Expired invitation does not block a new invitation
- **GIVEN** only expired invitations exist for the normalized email in the active organization
- **WHEN** an authorized user sends a new invitation for that email
- **THEN** the system creates a new `PENDING` invitation

### Requirement: Invitation revocation is tenant-scoped
The system SHALL expose `DELETE /api/organizations/current/invitations/:invitationId` for authenticated users with `members.manage`. The system SHALL locate the invitation by both `invitationId` and the active tenant organization ID. Only a currently valid `PENDING` invitation SHALL become `REVOKED`. Missing invitations and invitations from another tenant SHALL both respond `404` with code `INVITATION_NOT_FOUND` without revealing cross-tenant existence. Invitations already `ACCEPTED`, `EXPIRED`, or `REVOKED` SHALL keep their status and return their corresponding functional error.

#### Scenario: Revoke pending invitation
- **GIVEN** an authenticated user has `members.manage` and a `PENDING` invitation exists in the active organization
- **WHEN** the user sends `DELETE /api/organizations/current/invitations/:invitationId`
- **THEN** the system responds with a successful result and the invitation status becomes `REVOKED`

#### Scenario: Cross-tenant invitation ID is not accessible
- **GIVEN** an invitation ID belongs to a different organization
- **WHEN** an authenticated user sends `DELETE /api/organizations/current/invitations/:invitationId` from another active tenant
- **THEN** the system responds `404` with code `INVITATION_NOT_FOUND`

#### Scenario: Missing invitation ID is not found
- **GIVEN** no invitation exists in the active organization for the provided invitationId
- **WHEN** an authenticated user sends `DELETE /api/organizations/current/invitations/:invitationId`
- **THEN** the system responds `404` with code `INVITATION_NOT_FOUND`

#### Scenario: Accepted invitation cannot be revoked
- **GIVEN** an invitation in the active organization has status `ACCEPTED`
- **WHEN** an authorized user sends `DELETE /api/organizations/current/invitations/:invitationId`
- **THEN** the system responds `409` with code `INVITATION_ALREADY_ACCEPTED` and leaves the invitation unchanged

#### Scenario: Expired invitation cannot be revoked
- **GIVEN** an invitation in the active organization is `EXPIRED` or is `PENDING` with `expiresAt` earlier than now
- **WHEN** an authorized user sends `DELETE /api/organizations/current/invitations/:invitationId`
- **THEN** the system responds `410` with code `INVITATION_EXPIRED` and leaves the invitation unusable

#### Scenario: Revoked invitation cannot be revoked again
- **GIVEN** an invitation in the active organization has status `REVOKED`
- **WHEN** an authorized user sends `DELETE /api/organizations/current/invitations/:invitationId`
- **THEN** the system responds `410` with code `INVITATION_REVOKED` and leaves the invitation unchanged

### Requirement: Public invitation preview validates token state
The system SHALL expose `GET /api/invitations/:token` without authentication. The endpoint SHALL hash the received token for lookup and SHALL never return `tokenHash`, `invitedByUserId`, `proposedRoleId`, plaintext token fields, membership data, role IDs, or private invitation internals. A valid non-expired `PENDING` invitation SHALL return only the normalized invitation email, organization name and slug, and `expiresAt`. Missing, expired, revoked, or accepted invitations SHALL return the corresponding functional error.

#### Scenario: Preview valid invitation
- **GIVEN** a valid token maps to a non-expired `PENDING` invitation
- **WHEN** a client sends `GET /api/invitations/:token`
- **THEN** the system responds `200 OK` with `email`, `organization.name`, `organization.slug`, and `expiresAt`

#### Scenario: Preview invalid token
- **GIVEN** no invitation exists for the provided token hash
- **WHEN** a client sends `GET /api/invitations/:token`
- **THEN** the system responds `404` with code `INVITATION_NOT_FOUND`

#### Scenario: Preview expired invitation
- **GIVEN** a token maps to a `PENDING` invitation whose `expiresAt` is earlier than now
- **WHEN** a client sends `GET /api/invitations/:token`
- **THEN** the system responds `410` with code `INVITATION_EXPIRED` and records the invitation as `EXPIRED`

#### Scenario: Preview stored expired invitation
- **GIVEN** a token maps to an invitation with status `EXPIRED`
- **WHEN** a client sends `GET /api/invitations/:token`
- **THEN** the system responds `410` with code `INVITATION_EXPIRED`

#### Scenario: Preview revoked invitation
- **GIVEN** a token maps to an invitation with status `REVOKED`
- **WHEN** a client sends `GET /api/invitations/:token`
- **THEN** the system responds `410` with code `INVITATION_REVOKED`

#### Scenario: Preview accepted invitation
- **GIVEN** a token maps to an invitation with status `ACCEPTED`
- **WHEN** a client sends `GET /api/invitations/:token`
- **THEN** the system responds `409` with code `INVITATION_ALREADY_ACCEPTED`

### Requirement: Existing users can accept invitations addressed to their email
The system SHALL expose `POST /api/invitations/:token/accept` for authenticated users. The endpoint SHALL validate that the token maps to a non-expired `PENDING` invitation and that the authenticated user's normalized email equals the invitation email. Acceptance SHALL be atomic: create an `ACTIVE` membership with `joinedAt`, assign the system `MEMBER` role, mark the invitation `ACCEPTED`, and set `acceptedAt`. If the user already has an `ACTIVE`, `SUSPENDED`, or `REMOVED` membership in the invitation organization, the system SHALL respond `409` with code `MEMBER_ALREADY_EXISTS`, SHALL NOT change the existing membership, and SHALL NOT mark the invitation `ACCEPTED`. The endpoint SHALL NOT automatically select the accepted organization in the existing user's current session.

#### Scenario: Existing user accepts invitation
- **GIVEN** an authenticated user has the same normalized email as a valid non-expired `PENDING` invitation
- **WHEN** the user sends `POST /api/invitations/:token/accept`
- **THEN** the system responds successfully, creates an `ACTIVE` membership with the `MEMBER` role, and marks the invitation `ACCEPTED`

#### Scenario: Email mismatch is denied
- **GIVEN** an authenticated user's normalized email differs from the invitation email
- **WHEN** the user sends `POST /api/invitations/:token/accept`
- **THEN** the system responds `403` with code `INVITATION_EMAIL_MISMATCH`

#### Scenario: Accepted invitation cannot be replayed
- **GIVEN** an invitation was already accepted
- **WHEN** a client attempts to accept the same token again
- **THEN** the system responds `409` with code `INVITATION_ALREADY_ACCEPTED`

#### Scenario: Existing active membership blocks acceptance
- **GIVEN** the invited user already has an `ACTIVE` membership in the invitation organization
- **WHEN** the user attempts to accept the invitation
- **THEN** the system responds `409` with code `MEMBER_ALREADY_EXISTS`, leaves the membership unchanged, and does not mark the invitation `ACCEPTED`

#### Scenario: Existing suspended membership blocks acceptance
- **GIVEN** the invited user already has a `SUSPENDED` membership in the invitation organization
- **WHEN** the user attempts to accept the invitation
- **THEN** the system responds `409` with code `MEMBER_ALREADY_EXISTS`, leaves the membership unchanged, and does not mark the invitation `ACCEPTED`

#### Scenario: Removed membership is not restored by invitation acceptance
- **GIVEN** the invited user has a `REMOVED` membership in the invitation organization
- **WHEN** the user attempts to accept the invitation
- **THEN** the system responds `409` with code `MEMBER_ALREADY_EXISTS`, leaves the membership unchanged, and does not mark the invitation `ACCEPTED`

### Requirement: Membership status updates use soft state and protect tenant boundaries
The system SHALL expose `PATCH /api/organizations/current/members/:membershipId` for authenticated users with `members.manage`. The request SHALL support `SUSPENDED` and `ACTIVE` target status transitions: `ACTIVE -> SUSPENDED` and `SUSPENDED -> ACTIVE`. `REMOVED` memberships SHALL NOT be restored. The system SHALL locate the target membership by both `membershipId` and the active tenant organization ID.

#### Scenario: Suspend active member
- **GIVEN** an authenticated user has `members.manage` and targets an `ACTIVE` member in the active organization who is not the last active owner
- **WHEN** the user sends `PATCH /api/organizations/current/members/:membershipId` with status `SUSPENDED`
- **THEN** the system sets the target membership status to `SUSPENDED`

#### Scenario: Reactivate suspended member
- **GIVEN** an authenticated user has `members.manage` and targets a `SUSPENDED` member in the active organization
- **WHEN** the user sends `PATCH /api/organizations/current/members/:membershipId` with status `ACTIVE`
- **THEN** the system sets the target membership status to `ACTIVE`

#### Scenario: Removed member cannot be restored
- **GIVEN** a membership in the active organization has status `REMOVED`
- **WHEN** an authorized user sends `PATCH /api/organizations/current/members/:membershipId` with status `ACTIVE`
- **THEN** the system responds `404` with code `MEMBERSHIP_NOT_FOUND` and does not change the membership

#### Scenario: Cross-tenant membership ID is not accessible
- **GIVEN** a membership ID belongs to a different organization
- **WHEN** an authenticated user sends `PATCH /api/organizations/current/members/:membershipId` from another active tenant
- **THEN** the system responds `404` with code `MEMBERSHIP_NOT_FOUND`

### Requirement: Membership removal uses soft state
The system SHALL expose `DELETE /api/organizations/current/members/:membershipId` for authenticated users with `members.manage`. The system SHALL locate the target membership by both `membershipId` and active tenant organization ID and SHALL set `ACTIVE` or `SUSPENDED` memberships to `REMOVED` without deleting the row. The endpoint SHALL NOT restore or physically delete memberships.

#### Scenario: Remove active member
- **GIVEN** an authenticated user has `members.manage` and targets an `ACTIVE` member who is not the last active owner
- **WHEN** the user sends `DELETE /api/organizations/current/members/:membershipId`
- **THEN** the system sets the membership status to `REMOVED`

#### Scenario: Remove suspended member
- **GIVEN** an authenticated user has `members.manage` and targets a `SUSPENDED` member
- **WHEN** the user sends `DELETE /api/organizations/current/members/:membershipId`
- **THEN** the system sets the membership status to `REMOVED`

### Requirement: Last active owner cannot be suspended or removed
The system SHALL reject any suspend or remove operation when the target membership is `ACTIVE`, has an `OWNER` organization role, and is the last `ACTIVE` owner membership in the organization. This SHALL include self-suspension and self-removal.

#### Scenario: Last owner removal is rejected
- **GIVEN** the target membership is the only `ACTIVE` membership with the `OWNER` role in the active organization
- **WHEN** an authorized user sends `DELETE /api/organizations/current/members/:membershipId`
- **THEN** the system responds `409` with code `LAST_OWNER_REQUIRED` and does not change the membership

#### Scenario: Last owner suspension is rejected
- **GIVEN** the target membership is the only `ACTIVE` membership with the `OWNER` role in the active organization
- **WHEN** an authorized user sends `PATCH /api/organizations/current/members/:membershipId` with status `SUSPENDED`
- **THEN** the system responds `409` with code `LAST_OWNER_REQUIRED` and does not change the membership

### Requirement: Suspending or removing a member clears only that tenant from active sessions
When a membership transitions to `SUSPENDED` or `REMOVED`, the system SHALL update non-revoked sessions where `userId` equals the target user and `organizationId` equals the active tenant so `organizationId` becomes null. The system SHALL NOT revoke the full session and SHALL NOT modify sessions for other organizations.

#### Scenario: Suspended member loses active tenant only
- **GIVEN** a target user has active sessions for the current organization and another organization
- **WHEN** an authorized user suspends the target membership in the current organization
- **THEN** only sessions for the current organization have `organizationId` cleared and sessions for other organizations are unchanged

#### Scenario: Old access token no longer matches session tenant
- **GIVEN** a target user's session had an access token with the old organization ID
- **WHEN** the membership is suspended or removed and the session organization is cleared
- **THEN** subsequent use of the old access token is rejected because it no longer matches the database session

### Requirement: System MEMBER role is available for invitations
The system SHALL ensure each organization can have a system `MEMBER` role with `scope = ORGANIZATION`, `key = MEMBER`, `name = Member`, `isSystem = true`, and permissions `organization.read` and `members.read` only. The system SHALL ensure this role idempotently when creating invitations and when creating new organizations through normal registration.

#### Scenario: MEMBER role has read permissions only
- **GIVEN** the system creates or ensures the `MEMBER` role for an organization
- **WHEN** the role permissions are inspected
- **THEN** the role has `organization.read` and `members.read` and does not have `members.manage`

#### Scenario: Ensuring MEMBER is idempotent
- **GIVEN** an organization already has a `MEMBER` role
- **WHEN** the system ensures the role while creating an invitation
- **THEN** it reuses or updates the existing organization-scoped role without creating duplicates

### Requirement: Functional errors follow the standard error contract
The system SHALL return errors using the existing `{ statusCode, code, message }` contract. Organization membership and invitation operations SHALL use `TENANT_REQUIRED` as `403`, `MEMBER_ALREADY_EXISTS` as `409`, `INVITATION_ALREADY_PENDING` as `409`, `INVITATION_NOT_FOUND` as `404`, `INVITATION_EXPIRED` as `410`, `INVITATION_REVOKED` as `410`, `INVITATION_ALREADY_ACCEPTED` as `409`, `INVITATION_EMAIL_MISMATCH` as `403`, `MEMBERSHIP_NOT_FOUND` as `404`, `LAST_OWNER_REQUIRED` as `409`, and `MEMBER_ACCESS_DENIED` as `403`.

#### Scenario: Functional error shape
- **GIVEN** an organization membership or invitation request violates a functional rule
- **WHEN** the system rejects the request
- **THEN** the response body contains `statusCode`, `code`, and `message` using the defined code and HTTP status

### Requirement: Organization membership endpoints are documented in Swagger
The system SHALL document the organization membership, invitation administration, public invitation preview, and invitation acceptance endpoints in Swagger/OpenAPI, including DTOs, authentication requirements, permission requirements, success responses, and functional errors.

#### Scenario: Swagger documents Issue 10 endpoints
- **GIVEN** the backend is running
- **WHEN** a developer opens `/docs`
- **THEN** Swagger shows all new organization and invitation endpoints with request bodies, responses, auth requirements, and error contracts

### Requirement: Organization roles can be listed for the active tenant
The system SHALL expose `GET /api/organizations/current/roles` for authenticated users with `members.read`. The response SHALL include only roles whose `organizationId` equals the active tenant and whose `scope` is `ORGANIZATION`. Each role item SHALL include `id`, `key`, `name`, `description`, `scope`, `isSystem`, and `permissions` as an array of permission keys. The response SHALL use a stable order: system roles first, then custom roles, each group ordered by `name` ascending and then `key` ascending.

#### Scenario: List current organization roles
- **GIVEN** an authenticated user has an active tenant and `members.read`
- **WHEN** the user sends `GET /api/organizations/current/roles`
- **THEN** the system responds `200 OK` with only `ORGANIZATION` roles from the active organization, including system and custom roles with permission keys

#### Scenario: Role list excludes other tenants and project roles
- **GIVEN** roles exist for another organization and roles with `scope = PROJECT` exist
- **WHEN** an authorized user lists roles for the active organization
- **THEN** the response does not include roles from another tenant and does not include `PROJECT` roles

#### Scenario: Role listing requires read permission
- **GIVEN** an authenticated user has an active tenant but lacks `members.read`
- **WHEN** the user sends `GET /api/organizations/current/roles`
- **THEN** the system responds `403` with code `MEMBER_ACCESS_DENIED`

### Requirement: Permission catalog can be listed
The system SHALL expose `GET /api/organizations/current/permissions` for authenticated users with `members.read`. The response SHALL include the LegacyLift global permission catalog as `permissions`, where each item has `key` and `description`. The endpoint SHALL NOT expose any mechanism to create tenant-defined permissions. The response SHALL be ordered by `key` ascending.

#### Scenario: List permission catalog
- **GIVEN** an authenticated user has an active tenant and `members.read`
- **WHEN** the user sends `GET /api/organizations/current/permissions`
- **THEN** the system responds `200 OK` with permission catalog items containing `key` and `description` ordered by key

#### Scenario: Permission listing requires read permission
- **GIVEN** an authenticated user has an active tenant but lacks `members.read`
- **WHEN** the user sends `GET /api/organizations/current/permissions`
- **THEN** the system responds `403` with code `MEMBER_ACCESS_DENIED`

### Requirement: Custom organization roles can be created
The system SHALL expose `POST /api/organizations/current/roles` for authenticated users with `members.manage`. The request body SHALL require `name` and `permissionKeys`, MAY include `description`, and SHALL NOT accept `organizationId`, `scope`, `key`, `isSystem`, timestamps, or relation fields from the client. The system SHALL create roles with `organizationId` equal to the active tenant, `scope = ORGANIZATION`, `isSystem = false`, and a stable backend-generated lowercase slug key derived from `name`. The generated key SHALL NOT be regenerated by later role name updates. If the slug collides within `(organizationId, ORGANIZATION, key)`, the system SHALL append an incremental numeric suffix until the key is unique within the active organization. If a concurrent creation causes Prisma unique constraint `P2002` for `(organizationId, scope, key)`, the system SHALL retry custom role creation with a newly calculated key candidate using current database state and a bounded number of attempts. If no unique key can be created within the bounded attempts or within the `Role.key` length limit, the system SHALL respond `409` with code `ROLE_ALREADY_EXISTS`. The system SHALL reject duplicate `permissionKeys` and unknown permission keys. An empty `permissionKeys` array SHALL be valid and SHALL create a custom role with no permissions. Creating the role and its role-permission rows SHALL be atomic.

#### Scenario: Create custom role
- **GIVEN** an authenticated user has an active tenant and `members.manage`
- **WHEN** the user sends `POST /api/organizations/current/roles` with a valid name, optional description, and existing unique permission keys
- **THEN** the system responds `201 Created` with the created role, `scope` is `ORGANIZATION`, `isSystem` is false, `key` is backend-generated, and the role has exactly the requested permissions

#### Scenario: Create custom role without permissions
- **GIVEN** an authenticated user has `members.manage`
- **WHEN** the user creates a custom role with `permissionKeys: []`
- **THEN** the system creates the custom role with no permissions

#### Scenario: Duplicate permission keys are rejected
- **GIVEN** an authenticated user has `members.manage`
- **WHEN** the user sends duplicate values in `permissionKeys`
- **THEN** the system responds `400` with code `VALIDATION_ERROR` and does not create a role

#### Scenario: Unknown permission key is rejected
- **GIVEN** an authenticated user has `members.manage`
- **WHEN** the user sends a permission key that is not present in the global permission catalog
- **THEN** the system responds `400` with code `PERMISSION_NOT_FOUND` and does not create a role

#### Scenario: Role key collision is rejected when no unique key can be generated
- **GIVEN** generated key candidates for the requested role name cannot fit a unique value within the `Role.key` limit
- **WHEN** an authenticated user attempts to create the role
- **THEN** the system responds `409` with code `ROLE_ALREADY_EXISTS` and does not create a role

#### Scenario: Concurrent custom role creation handles key collision without server error
- **GIVEN** two authenticated requests in the same organization concurrently create a custom role with the same name
- **WHEN** both requests calculate the same initial role key candidate and one creation wins the unique constraint
- **THEN** the losing creation retries with current database state and either succeeds with a suffixed unique key or responds `409` with code `ROLE_ALREADY_EXISTS` after bounded attempts, without returning an unhandled Prisma error or `500`

#### Scenario: Create role requires manage permission
- **GIVEN** an authenticated user has an active tenant but lacks `members.manage`
- **WHEN** the user sends `POST /api/organizations/current/roles`
- **THEN** the system responds `403` with code `MEMBER_ACCESS_DENIED`

### Requirement: Custom organization roles can be updated
The system SHALL expose `PATCH /api/organizations/current/roles/:roleId` for authenticated users with `members.manage`. The endpoint SHALL allow updates only to custom roles where `organizationId` equals the active tenant, `scope = ORGANIZATION`, and `isSystem = false`. The request body MAY include `name`, `description`, and `permissionKeys`, and SHALL NOT accept `organizationId`, `scope`, `key`, `isSystem`, timestamps, or relation fields. `description: null` SHALL clear the description. When `permissionKeys` is present, it SHALL replace the role's full permission set; when it is absent, existing permissions SHALL be preserved. The role key SHALL remain unchanged. Metadata changes and permission replacement SHALL be atomic.

#### Scenario: Update custom role metadata
- **GIVEN** a custom organization role exists in the active tenant and the user has `members.manage`
- **WHEN** the user sends `PATCH /api/organizations/current/roles/:roleId` with a new name or description
- **THEN** the system responds `200 OK`, updates the requested metadata, preserves the role key, and preserves permissions when `permissionKeys` is absent

#### Scenario: Clear custom role description
- **GIVEN** a custom organization role has a description
- **WHEN** an authorized user sends `PATCH /api/organizations/current/roles/:roleId` with `description: null`
- **THEN** the system clears the role description and leaves the role custom and organization-scoped

#### Scenario: Replace custom role permissions
- **GIVEN** a custom organization role exists in the active tenant
- **WHEN** an authorized user sends `PATCH /api/organizations/current/roles/:roleId` with valid unique `permissionKeys`
- **THEN** the role's permission set is replaced atomically with exactly those permissions

#### Scenario: System role update is rejected
- **GIVEN** the target role is `OWNER` or `MEMBER`, or any other role with `isSystem = true`
- **WHEN** an authorized user sends `PATCH /api/organizations/current/roles/:roleId`
- **THEN** the system responds `409` with code `ROLE_IS_SYSTEM` and does not change the role

#### Scenario: Cross-tenant role update is not found
- **GIVEN** a role ID belongs to another organization
- **WHEN** an authenticated user sends `PATCH /api/organizations/current/roles/:roleId` from the active organization
- **THEN** the system responds `404` with code `ROLE_NOT_FOUND`

### Requirement: Custom organization roles can be deleted only when unused
The system SHALL expose `DELETE /api/organizations/current/roles/:roleId` for authenticated users with `members.manage`. The endpoint SHALL allow deletion only for roles where `organizationId` equals the active tenant, `scope = ORGANIZATION`, and `isSystem = false`. If any `MembershipRole` row references the role, the system SHALL respond `409` with code `ROLE_IN_USE` and SHALL NOT delete the role or silently cascade membership assignments. A successful delete SHALL respond `200 OK` with the deleted role representation.

#### Scenario: Delete unused custom role
- **GIVEN** a custom organization role in the active tenant is not assigned to any membership and the user has `members.manage`
- **WHEN** the user sends `DELETE /api/organizations/current/roles/:roleId`
- **THEN** the system responds `200 OK` with the deleted role representation and the role is deleted

#### Scenario: Delete assigned custom role is rejected
- **GIVEN** a custom organization role is referenced by at least one `MembershipRole`
- **WHEN** an authorized user sends `DELETE /api/organizations/current/roles/:roleId`
- **THEN** the system responds `409` with code `ROLE_IN_USE` and keeps the role and assignments unchanged

#### Scenario: System role delete is rejected
- **GIVEN** the target role is `OWNER` or `MEMBER`, or any other role with `isSystem = true`
- **WHEN** an authorized user sends `DELETE /api/organizations/current/roles/:roleId`
- **THEN** the system responds `409` with code `ROLE_IS_SYSTEM` and does not delete the role

#### Scenario: Cross-tenant role delete is not found
- **GIVEN** a role ID belongs to another organization
- **WHEN** an authenticated user sends `DELETE /api/organizations/current/roles/:roleId` from the active organization
- **THEN** the system responds `404` with code `ROLE_NOT_FOUND`

### Requirement: Membership custom organization roles can be replaced
The system SHALL expose `PUT /api/organizations/current/members/:membershipId/roles` for authenticated users with `members.manage`. The request body SHALL contain `roleIds`, an array representing the complete desired set of additional custom `ORGANIZATION` roles for that membership. The target membership SHALL belong to the active tenant and SHALL NOT be `REMOVED`. Each role ID SHALL belong to the active tenant, have `scope = ORGANIZATION`, and have `isSystem = false`. The operation SHALL atomically replace only custom organization `MembershipRole` rows for the active tenant and target membership. It SHALL preserve all existing system role assignments, including `OWNER` and `MEMBER` when present, and SHALL NOT create or remove `ProjectAccess`, project-role assignments, `OWNER`, `MEMBER`, or any `MembershipRole` row for a role with `scope = PROJECT`. If `roleIds` is empty, the system SHALL remove all custom organization roles managed by this API for the membership and preserve system roles.

#### Scenario: Replace custom membership roles
- **GIVEN** a target membership belongs to the active tenant and requested role IDs are custom organization roles from that tenant
- **WHEN** an authorized user sends `PUT /api/organizations/current/members/:membershipId/roles`
- **THEN** the system responds `200 OK` with the updated member representation and the membership has exactly the requested custom organization roles plus its preserved system roles

#### Scenario: Assign and remove custom role is reflected in member listing
- **GIVEN** a target membership in the active tenant already has the system `MEMBER` role and a custom organization role exists in the active tenant
- **WHEN** an authorized user assigns the custom role with `PUT /api/organizations/current/members/:membershipId/roles` and then lists members with `GET /api/organizations/current/members`
- **THEN** the `PUT` responds successfully and the member list shows both `MEMBER` and the custom role in that membership's `roles`
- **WHEN** the authorized user removes custom roles by sending `PUT /api/organizations/current/members/:membershipId/roles` with `roleIds: []` and lists members again
- **THEN** the member list no longer shows the custom role and still shows `MEMBER` because the preexisting system role was preserved

#### Scenario: Empty role list removes custom roles only
- **GIVEN** a target membership has system roles and custom organization roles
- **WHEN** an authorized user sends `PUT /api/organizations/current/members/:membershipId/roles` with `roleIds: []`
- **THEN** the system removes the custom organization roles and preserves all system roles

#### Scenario: OWNER cannot be assigned through custom role replacement
- **GIVEN** the `OWNER` role ID is included in `roleIds`
- **WHEN** an authorized user sends the replacement request
- **THEN** the system responds `409` with code `ROLE_IS_SYSTEM` and does not change membership role assignments

#### Scenario: MEMBER cannot be assigned through custom role replacement
- **GIVEN** the `MEMBER` role ID is included in `roleIds`
- **WHEN** an authorized user sends the replacement request
- **THEN** the system responds `409` with code `ROLE_IS_SYSTEM` and does not change membership role assignments

#### Scenario: Missing or cross-tenant membership is not found
- **GIVEN** the membership ID does not exist in the active tenant
- **WHEN** an authenticated user sends `PUT /api/organizations/current/members/:membershipId/roles`
- **THEN** the system responds `404` with code `MEMBERSHIP_NOT_FOUND`

#### Scenario: Cross-tenant role cannot be assigned
- **GIVEN** a requested role ID belongs to another organization
- **WHEN** an authenticated user sends `PUT /api/organizations/current/members/:membershipId/roles` in the active organization
- **THEN** the system responds `404` with code `ROLE_NOT_FOUND` and does not change membership role assignments

#### Scenario: Project role cannot be assigned through MembershipRole
- **GIVEN** a requested role ID exists but has `scope = PROJECT`
- **WHEN** an authenticated user sends `PUT /api/organizations/current/members/:membershipId/roles`
- **THEN** the system responds `404` with code `ROLE_NOT_FOUND` and does not create a `MembershipRole` for the project role

#### Scenario: Duplicate role IDs are rejected
- **GIVEN** duplicate role IDs appear in `roleIds`
- **WHEN** an authorized user sends the replacement request
- **THEN** the system responds `400` with code `VALIDATION_ERROR` and does not change membership role assignments

### Requirement: Role administration changes affect effective permissions immediately
The system SHALL continue resolving effective permissions as the union of permission keys from all valid `ORGANIZATION` roles assigned through `MembershipRole` in the active tenant. Duplicate permissions SHALL appear only once in effective permission outputs. Changes to `RolePermission` or custom `MembershipRole` assignments SHALL be reflected in `GET /api/auth/me` and in the next protected request using the same JWT, without logout, refresh, or token regeneration. JWT payloads SHALL continue to omit roles and permissions.

#### Scenario: Multiple custom roles produce union permissions
- **GIVEN** a membership has multiple organization roles with overlapping permissions
- **WHEN** the user calls `GET /api/auth/me`
- **THEN** `activeMembership.permissions` contains the union of permission keys without duplicates

#### Scenario: Removing custom manage permission affects next request
- **GIVEN** a user currently has `members.manage` only through a custom organization role
- **WHEN** an authorized administrator removes that custom role assignment or removes `members.manage` from the custom role
- **THEN** the user's next request to an endpoint requiring `members.manage` with the same JWT responds `403` with code `MEMBER_ACCESS_DENIED`

#### Scenario: JWT still omits roles and permissions
- **GIVEN** custom role administration changes have been applied
- **WHEN** the system emits or accepts access tokens
- **THEN** JWT payloads contain subject, session and tenant data but do not contain roles or permissions

### Requirement: Role administration errors follow the standard error contract
The system SHALL return role administration errors using `{ statusCode, code, message }`. The system SHALL use `VALIDATION_ERROR` as `400`, `PERMISSION_NOT_FOUND` as `400`, `MEMBER_ACCESS_DENIED` as `403`, `TENANT_REQUIRED` as `403`, `ROLE_NOT_FOUND` as `404`, `MEMBERSHIP_NOT_FOUND` as `404`, `ROLE_ALREADY_EXISTS` as `409`, `ROLE_IS_SYSTEM` as `409`, and `ROLE_IN_USE` as `409`. Cross-tenant role IDs and project role IDs supplied to organization-role endpoints SHALL use `ROLE_NOT_FOUND` instead of exposing cross-tenant or out-of-scope resource details.

#### Scenario: Functional error shape for role administration
- **GIVEN** a role administration request violates validation, authorization, tenant ownership, system role, or in-use rules
- **WHEN** the system rejects the request
- **THEN** the response body contains `statusCode`, `code`, and `message` using the defined code and HTTP status

### Requirement: Organization role administration endpoints are documented in Swagger
The system SHALL document organization role administration endpoints in Swagger/OpenAPI, including auth requirements, permission requirements, request DTOs, response DTOs, success status codes, and relevant functional errors.

#### Scenario: Swagger documents organization role administration
- **GIVEN** the backend is running
- **WHEN** a developer opens `/docs`
- **THEN** Swagger shows the role list, permission list, custom role create, custom role update, custom role delete, and membership role replacement endpoints with their contracts and errors
