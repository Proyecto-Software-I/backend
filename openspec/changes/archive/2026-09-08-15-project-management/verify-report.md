```yaml
schema: gentle-ai.verify-result/v1
evidence_revision: sha256:76a3e45d02517c452b80c1fe6c5cd342669e85fe77446690ced471da9927edd3
verdict: pass_with_warnings
blockers: 0
critical_findings: 0
requirements: 11/11
scenarios: 19/19
test_command: npm test && npm run test:e2e
test_exit_code: 0
test_output_hash: sha256:76a3e45d02517c452b80c1fe6c5cd342669e85fe77446690ced471da9927edd3
build_command: npm run build
build_exit_code: 0
build_output_hash: sha256:e5f678bd9b1bb52ede9712159160bdd766b8727375e02ef46cb7019bbe312e92
```

## Verification Report

**Change**: 15-project-management  
**Mode**: Strict TDD / OpenSpec  
**Verdict**: PASS WITH WARNINGS

### Completeness
| Metric | Value |
|---|---:|
| Tasks total | 21 |
| Tasks complete | 21 |
| Tasks incomplete | 0 |
| Requirements | 11/11 |
| Spec scenarios | 19/19 |

### Runtime Evidence
- `npm test && npm run test:e2e`: exit 0; 24 unit suites / 263 tests and 4 PostgreSQL E2E suites / 60 tests passed. Output hash: `sha256:76a3e45d02517c452b80c1fe6c5cd342669e85fe77446690ced471da9927edd3`.
- `npm test -- --runInBand projects/services/projects.service.spec.ts && npm run test:e2e -- --runInBand project-management`: exit 0; 5 focused unit tests and 20 PostgreSQL project-management E2E tests passed. This includes the authenticated tenantless list regression and all 19 named OpenSpec scenarios. Output hash: `sha256:7c59fabaeed4865480cdfa4e06f65e69b4fd774405e70e30758a513bb9f2df6b`.
- `npm run build`: exit 0. Output hash: `sha256:e5f678bd9b1bb52ede9712159160bdd766b8727375e02ef46cb7019bbe312e92`.
- `npm run prisma:validate`: exit 0. Output hash: `sha256:8643b309f73e950c06ecb97d3abb0eb92eeaa3020c51e9ce0e7c4319d7e90830`.
- `npm run lint`: exit 0 with 46 warnings and 0 errors. Output hash: `sha256:d6b3e8c048f08dbdc069d689b2bb1c63ad64d9eb6df23047ba62aab8098d0009`.

### Tenantless GET Regression
Authenticated `GET /api/projects` with a valid session whose active organization is `null` passed at runtime with `403` and `{ statusCode: 403, code: "TENANT_REQUIRED", message }`. `ProjectsService.list` rejects a missing organization before permission resolution; it only maps the expected `PROJECT_ACCESS_DENIED` to restricted-list behavior and rethrows all other resolver failures.

### Spec Compliance Matrix
| Requirement | Scenario | Passing runtime evidence | Result |
|---|---|---|---|
| Tenant-derived creation and stable keys | Create in the active tenant | Project-management E2E creation/workflow test | COMPLIANT |
| Tenant-derived creation and stable keys | Key uniqueness is tenant-local | `keeps normalized project-key uniqueness local to the active tenant` | COMPLIANT |
| Accessible listing and detail | Restricted list remains non-disclosing | `lists only project-read grants for a restricted active membership` | COMPLIANT |
| Accessible listing and detail | Organization switch changes visibility | `changes list visibility and hides old project IDs after organization selection` | COMPLIANT |
| Metadata and strict workflow | Update allowed metadata | `updates only allowed metadata while preserving the project key` | COMPLIANT |
| Metadata and strict workflow | Reject unsupported or skipped status | Project-management E2E workflow test | COMPLIANT |
| Archive is consistent and non-destructive | Archive once | `archives once, preserves the row, and rejects the repeat archive` | COMPLIANT |
| Stable errors and Swagger contracts | Deny without disclosing existence | `returns PROJECT_NOT_FOUND for every foreign project mutation without disclosure` | COMPLIANT |
| Stable errors and Swagger contracts | Contract is Swagger-visible | `publishes project, role, and access contracts in Swagger` | COMPLIANT |
| Effective permissions are a tenant-safe union | Union grants complementary access | `unions organization read with matching project manage without granting delete` | COMPLIANT |
| Effective permissions are a tenant-safe union | Missing project grant is unambiguous | `returns an empty restricted list and denied detail when no project grant exists` | COMPLIANT |
| Tenant PROJECT roles are configurable | Create and update a custom role | `creates and updates a custom PROJECT role while preserving its key` | COMPLIANT |
| Tenant PROJECT roles are configurable | Reject invalid role content | `rejects duplicate, forbidden, and undelegated custom-role permissions without persisting a role` | COMPLIANT |
| Creator receives atomic safe access | Creator can administer the new project | `gives a create-only member bootstrap project access through the protected creator role` | COMPLIANT |
| Creator receives atomic safe access | Bootstrap is atomic | `keeps project creation bootstrap atomic when a duplicate normalized key aborts creation` | COMPLIANT |
| Access can be listed, assigned, replaced, and revoked | Assign then revoke access | `assigns, replaces, and revokes same-tenant project access idempotently` | COMPLIANT |
| Access can be listed, assigned, replaced, and revoked | Reject tenant or scope mismatch | `rejects inactive, foreign, and ORGANIZATION-role access targets without changes` | COMPLIANT |
| Delegation cannot escalate privileges | Project manager cannot self-escalate | `denies role and access administration to a caller with only project-derived manage` | COMPLIANT |
| Access contracts are Swagger-visible | Frontend can derive access behavior | Swagger E2E contract test | COMPLIANT |

### Correctness and Design Coherence
| Area | Result | Evidence |
|---|---|---|
| Tenant isolation | COMPLIANT | Tenant-qualified project, membership, role, and access predicates; foreign project operations return `PROJECT_NOT_FOUND`. |
| Tenantless list | COMPLIANT | Null active organization fails closed with `403 TENANT_REQUIRED`; it cannot query across tenants. |
| Restricted listing | COMPLIANT | Only active same-tenant PROJECT roles with `projects.read` satisfy the restricted predicate. |
| Permission union | COMPLIANT | Current ORGANIZATION permissions union with a matching same-tenant PROJECT-role grant; creation is organization-only. |
| Atomic writes | COMPLIANT | Creator bootstrap and role/access writes use serializable transactions with permission revalidation. |
| Design alignment | COMPLIANT | Thin guarded controllers, shared organization resolver, tenant-qualified loads, strict lifecycle, and non-destructive archival align with the design. |

### Issues
**CRITICAL**: None.

**WARNING**:
1. ESLint reports 46 warnings (mostly unsafe test-double arguments) and no errors.
2. Strict-TDD lineage groups historical remediation evidence rather than retaining one individual RED/GREEN record per checkbox.

**SUGGESTION**: Reduce test-double `any` warnings and retain per-task TDD evidence in future changes.

### Final Verdict
PASS WITH WARNINGS — all 21 tasks are complete; all 11 requirements and all 19 specified scenarios have current passing runtime coverage; the tenantless authenticated list fails closed with `403 TENANT_REQUIRED`.
