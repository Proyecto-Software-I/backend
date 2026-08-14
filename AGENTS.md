# AGENTS.md — LegacyLift AI Backend

Este archivo contiene las reglas técnicas permanentes para desarrolladores y agentes de IA que trabajen en este repositorio. El flujo humano de GitHub/OpenSpec está en [`.github/CONTRIBUTING.md`](.github/CONTRIBUTING.md).

## 1. Producto y stack

LegacyLift AI es una plataforma B2B multi-tenant para descubrir, analizar, planificar y ejecutar modernizaciones verificables de sistemas legados.

Stack base actual:

- Node.js 24
- NestJS + TypeScript strict
- PostgreSQL
- Prisma ORM
- REST bajo prefijo `/api`
- Swagger/OpenAPI
- Joi para configuración
- `class-validator` / `class-transformer` para DTOs
- PostgreSQL local instalado directamente en Windows durante desarrollo
- OpenSpec para cambios funcionales/arquitectónicos

No introducir Redis, colas, object-storage SDKs, proveedores de IA, auth providers u otras dependencias hasta que una issue/OpenSpec concreta las necesite.

## 2. Arquitectura NestJS

- Organizar el código por dominio/feature, no por tipo global de archivo.
- Controllers: HTTP, DTOs, status codes y delegación. Sin reglas de negocio.
- Services: reglas de negocio, autorización de recursos y orquestación.
- Prisma: acceso persistente mediante `PrismaService`; no crear conexiones PostgreSQL ad hoc.
- DTOs: todo input externo debe validarse.
- Swagger: documentar endpoints públicos y DTOs.
- Errores: usar excepciones HTTP de NestJS en el límite HTTP; no filtrar información interna.
- No crear un módulo NestJS solamente porque exista una tabla. El módulo se crea cuando una feature entra en alcance.

## 3. Prisma y datos

### Fuente de verdad

La única fuente de verdad del modelo es:

```text
prisma/schema/*.prisma
```

No crear schemas paralelos ni un `schema.full.prisma`.

`src/generated/prisma/` es generado y no se versiona.

### Relaciones obligatorias

Todo campo UUID que representa una referencia concreta a otra entidad debe tener una relación Prisma y una FK de PostgreSQL.

Únicas excepciones actuales deliberadamente polimórficas:

- `AnalysisMetric.scopeId`
- `ModernizationRecommendation.targetId`
- `WaveTarget.targetId`
- `Job.subjectId`
- `AuditLog.entityId`
- `TestCase.targetId`
- `ApprovalRequest.subjectId`

Estos campos siempre se acompañan por su discriminador (`scopeType`, `targetType`, `subjectType`, `entityType`, etc.). No convertirlos en FK sin rediseñar primero el modelo polimórfico mediante OpenSpec.

### Borrado

- Preferir soft delete para entidades de negocio que ya lo soportan (`deletedAt`).
- Datos históricos, auditoría, consumo y suscripciones no deben desaparecer por cascadas accidentales.
- Usar `Restrict` cuando borrar un padre invalidaría historia que debe conservarse.
- Usar `SetNull` únicamente para referencias opcionales y no críticas para conservar el registro histórico.
- No agregar `Cascade` a datos históricos sin justificación explícita.

### Migraciones

- Nunca editar/eliminar una migración que ya haya sido compartida o aplicada.
- Todo cambio de modelo debe generar una migración nueva y revisarse el SQL.
- No usar `prisma db push` como sustituto de migraciones del proyecto.
- El seed debe ser idempotente y no contener datos personales/credenciales.
- Desarrollo local: cada integrante usa su propia base PostgreSQL mediante `DATABASE_URL`; no se requiere Docker.
- `db:fresh` es exclusivamente destructivo/local y nunca se ejecuta sobre una BD compartida, staging o producción.
- `prisma migrate dev` se usa únicamente para crear nuevas migraciones desde la BD local del autor del cambio.
- BDs compartidas/hosteadas reciben migraciones existentes mediante `prisma migrate deploy`.

## 4. Multi-tenancy — REGLAS OBLIGATORIAS

`Organization` es la frontera de tenant de LegacyLift.

### Contexto del tenant

- El `organizationId` activo se deriva de la sesión/autenticación y la membresía activa del usuario.
- Nunca confiar en un `organizationId` enviado libremente por body, query o params para autorizar acceso.
- Un usuario puede pertenecer a varias organizaciones; cada request opera dentro de una organización activa explícita.

### Lecturas

Está prohibido acceder a recursos tenant-scoped solamente por UUID:

```ts
// PROHIBIDO
prisma.project.findUnique({ where: { id: projectId } });
```

La consulta/autorización debe verificar pertenencia al tenant, directamente o a través de su padre:

```ts
// EJEMPLO CONCEPTUAL
prisma.project.findFirst({
  where: {
    id: projectId,
    organizationId: activeOrganizationId,
  },
});
```

Para entidades sin `organizationId` directo, verificar la cadena de propiedad, por ejemplo:

```text
SourceFile -> SourceSnapshot -> Project -> Organization
MigrationRun -> MigrationWave -> ModernizationPlan -> Project -> Organization
```

### Escrituras

Antes de crear/conectar/actualizar una relación:

- comprobar que todos los padres pertenecen a la organización activa;
- impedir `connect`, `upsert` o IDs provenientes de otra organización;
- usar transacciones para operaciones que modifican múltiples registros dependientes;
- nunca permitir transferencias entre tenants mediante cambios directos de `organizationId`.

### Membership y RBAC

- La membresía debe ser `ACTIVE`.
- Un `Role` asignado a una membresía debe pertenecer a la misma organización.
- `MembershipRole` solo usa roles con `scope = ORGANIZATION`.
- `ProjectAccess` solo usa roles con `scope = PROJECT`.
- `OrganizationInvitation.proposedRoleId` solo puede apuntar a un rol `ORGANIZATION` de la misma organización.
- `ProjectAccess` nunca puede vincular membresías/roles de otra organización.
- Los permisos se evalúan antes de ejecutar la lógica de negocio protegida.
- Para recursos inexistentes o de otro tenant, preferir una respuesta que no revele la existencia del recurso de otra empresa.

### Recursos de infraestructura

Los siguientes recursos deben pertenecer al mismo tenant que la operación que los usa:

- `SecretReference`
- `StorageObject`
- `IntegrationConnection`
- `ApiKey`
- `AIProvider`
- `ScannerAgent`
- `DeploymentInstance`
- `WorkerNode` cuando sea tenant-specific

### Billing/entitlements

- Las capacidades se determinan mediante `Feature` + `PlanEntitlement` + `Subscription`.
- No hardcodear reglas como `if (plan === 'ENTERPRISE')` dentro de features.
- Un límite `null` en un entitlement habilitado significa sin límite configurado para esa métrica; no significa cero.
- La capa de billing debe impedir más de una suscripción corriente efectiva por organización según los estados que defina la feature.
- Todo uso medible se registra con `UsageEvent` bajo la organización correcta.

### Auditoría

Las operaciones sensibles deben dejar trazabilidad con el `organizationId` correspondiente, especialmente:

- cambios de membresías/roles;
- creación/revocación de API keys;
- conexiones/integraciones;
- análisis y migraciones;
- aprobaciones/rollback/deployment;
- cambios de configuración o seguridad.

Más detalle: [`docs/architecture/multi-tenancy.md`](docs/architecture/multi-tenancy.md).

## 5. Código fuente, archivos y secretos

PostgreSQL almacena metadatos, relaciones, hashes y estados. El contenido grande se representa mediante `StorageObject` y, cuando se implemente el storage real, vivirá en S3/MinIO/compatible.

No guardar en columnas normales:

- ZIP/repo completo;
- código fuente masivo;
- reportes/binarios grandes;
- logs extensos;
- secretos.

`SecretReference` almacena una referencia externa, nunca el secreto en claro.

## 6. Auth actual

Alcance inicial de persistencia:

- email/password;
- sesiones/refresh token hash;
- verificación de email;
- recuperación de contraseña;
- organizaciones;
- memberships;
- RBAC;
- API keys cuando entre en desarrollo.

OAuth/OIDC/SAML/MFA/WebAuthn se agregarán cuando tengan una issue/OpenSpec específica. No implementarlos anticipadamente.

Nunca persistir password, session token, reset token o API key en texto plano; solo hashes seguros.

Los correos usados para identidad/autenticación deben normalizarse de forma consistente (trim + lowercase) antes de consultar o persistir para que la unicidad no dependa de mayúsculas/minúsculas.

## 7. Billing actual

El modelo actual cubre:

- `BillingPlan`
- `BillingPrice`
- `Feature`
- `PlanEntitlement`
- `Subscription`
- `UsageEvent`

Facturación fiscal, cobros, refunds y licenciamiento offline no se implementan hasta definir proveedor/modelo comercial.

## 8. LegacyLift core

Mantener separadas estas responsabilidades:

1. **Ingestion:** repositorios/conexiones/snapshots.
2. **Discovery/Analysis:** estructura, dependencias, métricas y findings.
3. **Knowledge:** grafo, dominios, reglas y procesos de negocio.
4. **Assessment:** scores y recomendaciones.
5. **Modernization:** planes, arquitecturas objetivo y waves.
6. **Migration:** transformación versionada mediante Migration Packs.
7. **Validation:** baseline, tests, comparaciones y confidence.
8. **AI:** proveedor/modelo/prompt/run como infraestructura transversal.
9. **Jobs:** ejecución asíncrona cuando sea implementada.

No mezclar transformación generativa con validación determinista. Una migración no se considera correcta únicamente porque la IA generó código o porque compila.

## 9. Seguridad

- No exponer stack traces, secrets o contenido de otros tenants.
- Validar toda entrada externa.
- Mantener `helmet`, CORS explícito y `ValidationPipe` global.
- No interpolar input del usuario en SQL/commands/shell.
- Escanear/aislar archivos no confiables antes de ejecutarlos cuando se implemente el pipeline de análisis.
- El código legado del cliente se considera confidencial/restringido por defecto.

## 10. Testing

Para cada feature:

- unit tests para lógica relevante;
- integration/e2e para contratos y acceso a datos crítico;
- pruebas negativas de autorización/multi-tenancy cuando aplique;
- para endpoints tenant-scoped, incluir al menos un caso que confirme que un tenant no puede acceder al recurso de otro.

No escribir tests que solo verifiquen `toBeDefined()` sin comportamiento útil.

## 11. Cambios con OpenSpec

Seguir el flujo definido en `.github/CONTRIBUTING.md` y `openspec/config.yaml`.

Si la implementación requiere:

- nueva dependencia;
- cambio de schema fuera del plan;
- cambio de contrato;
- nueva integración;
- ampliación del alcance;

no improvisar: actualizar la issue/OpenSpec antes de continuar.

## 12. Definition of Done técnica

Antes de considerar una tarea terminada:

```bash
npm run prisma:validate
npm run prisma:generate
npm run lint
npm test
npm run build
```

Y ejecutar e2e/migraciones cuando la feature las afecte.
