# Multi-tenancy de LegacyLift AI

## Decisión

LegacyLift utiliza un modelo **shared database / shared schema** en SaaS. `Organization` es la frontera lógica de tenant.

No se depende únicamente de una FK para seguridad: la aplicación debe aplicar tenant scoping en cada operación. En una fase posterior puede añadirse PostgreSQL Row-Level Security como defensa adicional, sin reemplazar estas reglas.

## Obtención del tenant activo

Un request autenticado debe producir un contexto similar a:

```ts
interface RequestContext {
  userId: string;
  organizationId: string;
  membershipId: string;
}
```

El `organizationId` se obtiene a partir de una sesión/selector de organización verificado y una `OrganizationMembership` `ACTIVE`.

Nunca se autoriza una operación solamente porque el cliente envió un `organizationId`.

## Ownership

### Directo

Entidades con `organizationId` propio se filtran directamente, por ejemplo:

- Project
- Subscription
- UsageEvent
- StorageObject
- IntegrationConnection
- AIProvider
- Report
- Job

### Heredado

Muchas entidades pertenecen al tenant por la cadena de ownership:

```text
LegacySystem
  -> Project
  -> Organization
```

```text
SourceFile
  -> SourceSnapshot
  -> Project
  -> Organization
```

```text
Finding
  -> AnalysisRun
  -> Project
  -> Organization
```

```text
MigrationRun
  -> MigrationWave
  -> ModernizationPlan
  -> Project
  -> Organization
```

Los services deben verificar esta cadena antes de devolver o modificar datos.

## Anti-patrones prohibidos

### Buscar por ID sin tenant

```ts
await prisma.project.findUnique({ where: { id } });
```

si `id` proviene del request y el recurso es tenant-scoped.

### Confiar en IDs de relaciones

```ts
await prisma.sourceConnection.create({
  data: {
    projectId: dto.projectId,
    secretRefId: dto.secretRefId,
  },
});
```

sin comprobar que Project y SecretReference pertenecen a la organización activa.

### Cambiar ownership

No se permite actualizar `organizationId` para trasladar datos entre tenants. Cualquier proceso de transferencia futura requiere un flujo administrativo específico y auditado.

## Patrón de service recomendado

1. recuperar tenant desde RequestContext;
2. verificar membership/permission;
3. cargar el padre con tenant scope;
4. validar todos los IDs relacionados;
5. ejecutar la mutación;
6. registrar audit event si es sensible.

## Respuestas cross-tenant

Una petición a un UUID válido de otra empresa no debe confirmar que dicho UUID existe. La capa HTTP debe comportarse como recurso no accesible/no encontrado según el contrato definido para la feature.

## ProjectAccess y roles

`ProjectAccess` es una restricción adicional, no una sustitución del tenant scope.

Siempre debe cumplirse:

```text
Project.organizationId
=
Membership.organizationId
=
Role.organizationId
=
activeOrganizationId
```

## Object storage y secretos

Antes de asociar un `StorageObject` o `SecretReference`, validar:

```text
resource.organizationId === activeOrganizationId
```

La posesión de un UUID nunca concede acceso.

## Jobs y procesos asíncronos

Todo job tenant-scoped debe transportar y persistir `organizationId`. El worker debe volver a aplicar el scope al leer/escribir datos; no debe asumir que el job es seguro porque fue creado por la API.

## Pruebas mínimas

Cada feature tenant-scoped debe probar al menos:

1. miembro válido accede a recurso de su organización;
2. miembro de otra organización no puede leerlo;
3. miembro de otra organización no puede modificarlo;
4. IDs relacionados de otro tenant son rechazados;
5. usuario sin membership activa es rechazado.
