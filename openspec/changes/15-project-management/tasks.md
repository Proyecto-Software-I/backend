# Tasks: Project Management

## Mandatory Plan Approval Gate

Complete these steps in order before starting any implementation, testing, or OpenSpec archiving task:

- [ ] Validate the OpenSpec plan.
- [ ] Commit and push only the planning artifacts.
- [ ] Open a Draft PR for the plan.
- [ ] Receive explicit `PLAN APPROVED` approval.

**Blocked until `PLAN APPROVED`:** every task in Phases 1–4, including RED/GREEN work, test execution, verification, and archiving.

## Review Workload Forecast

| Field | Value |
|---|---|
| Estimated changed lines | 900–1,200 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 foundation → PR 2 project CRUD → PR 3 roles/access and E2E |
| Delivery strategy | exception-ok |
| Chain strategy | none |

Decision needed before apply: No — maintainer approved `size:exception`
Chained PRs recommended: Yes
Chain strategy: none
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Focused test command | Runtime harness | Rollback boundary |
|---|---|---|---|---|---|
| 1 | Shared resolver and project CRUD | PR 1–2 | `npm test -- --runInBand src/projects src/access-control` | `npm run test:e2e -- project-management` create/list scenario | Resolver, Projects module, CRUD routes/tests |
| 2 | Project roles and access grants | PR 3 | `npm test -- --runInBand src/projects` | E2E role/access assignment scenario | Role/access routes, services, DTOs/tests |
| 3 | Contract/security proof | PR 3 | `npm run test:e2e -- project-management` | PostgreSQL tenant-switch, IDOR, concurrency scenarios | `test/project-management.e2e-spec.ts` |

## Phase 1: Authorization Foundation

- [ ] 1.1 RED: add resolver/guard tests in `src/access-control/{guards,services}/*.spec.ts` for fresh ORGANIZATION permissions and unchanged legacy denial codes.
- [ ] 1.2 GREEN: create `src/access-control/services/organization-permission-resolver.service.ts`; update `src/access-control/guards/permission.guard.ts` and `src/access-control/access-control.module.ts`.
- [ ] 1.3 RED: add DTO and authorization tests under `src/projects/**/*.spec.ts` for rejected ownership/settings fields, key normalization, permission union, and tenant-qualified predicates.
- [ ] 1.4 GREEN: create `src/projects/dto/*.dto.ts` and `src/projects/services/project-authorization.service.ts` with allowlisted inputs and safe error mapping.

## Phase 2: Project CRUD and Lifecycle

- [ ] 2.1 RED: add `src/projects/services/projects.service.spec.ts` cases for normalized tenant-local keys/P2002, bootstrap rollback, status steps, archive repeat, and archived-update denial.
- [ ] 2.2 GREEN: create `src/projects/services/projects.service.ts` using retrying serializable transactions for creation, metadata, status, and atomic archive.
- [ ] 2.3 RED: add `src/projects/**/*.spec.ts` and `test/project-management.e2e-spec.ts` cases for static `/projects/roles` precedence and malformed UUID `400 VALIDATION_ERROR`.
- [ ] 2.4 GREEN: create `src/projects/projects.controller.ts` and `src/projects/projects.module.ts`, import it in `src/app.module.ts`, and document Swagger contracts.

## Phase 3: Roles and Access Administration

- [ ] 3.1 RED: add `src/projects/**/*.spec.ts` tests for slug/key immutability, allowlists, delegation denial, protected/in-use roles, and atomic PUT/repeatable DELETE.
- [ ] 3.2 GREEN: create `src/projects/services/project-roles.service.ts` and `src/projects/project-roles.controller.ts` with tenant/scope validation and Swagger responses.
- [ ] 3.3 RED: extend `test/project-management.e2e-spec.ts` for union access, restricted lists, tenant switch/IDOR, inactive/foreign inputs, and project-only admin denial.
- [ ] 3.4 GREEN: create `src/projects/services/project-access.service.ts` and `src/projects/project-access.controller.ts`; re-run focused tests after policy refactoring.

## Phase 4: Verification

- [ ] 4.1 Run `npm run prisma:validate`, `npm run prisma:generate`, `npm run lint`, `npm test`, `npm run test:e2e`, and `npm run build`.
- [ ] 4.2 Run `npm run check`; verify all 19 scenarios, OpenAPI schemas, tenant denial codes, and no migration/dependency changes.
