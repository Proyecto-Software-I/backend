## Purpose

Provides tenant-scoped organization member administration, invitation lifecycle management, invitation acceptance, permission-based authorization, and session tenant invalidation for LegacyLift organizations.

## ADDED Requirements

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
