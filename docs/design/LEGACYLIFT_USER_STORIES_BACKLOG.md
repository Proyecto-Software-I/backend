# LegacyLift AI — Backlog Maestro de Historias de Usuario

> **Understand first. Modernize safely.**

Este documento define el backlog funcional de LegacyLift AI en el orden recomendado de desarrollo. Sirve como guía de producto y desarrollo desde autenticación y multi-tenancy hasta discovery, understanding, planning, migration, verification y productización.

Las historias son **verticales de producto**: pueden producir issues separadas de frontend, backend, QA o infraestructura, pero se consideran completas solo cuando el comportamiento puede validarse de punta a punta.

## Fuentes de verdad

- `docs/product/LEGACYLIFT_PRODUCT_VISION.md`
- `docs/architecture/database.md`
- `docs/architecture/multi-tenancy.md`
- `prisma/schema/*.prisma`

Referencias:
- https://github.com/Proyecto-Software-I/backend/tree/main/docs
- https://github.com/Proyecto-Software-I/backend/tree/main/prisma/schema

---

# Reglas globales

## OpenSpec

Usar OpenSpec para cambios sustanciales de autenticación, autorización, multi-tenancy, base de datos, contratos HTTP, IA, migraciones, seguridad, billing y arquitectura.

```text
Issue
  ↓
OpenSpec
├── proposal
├── specs
├── design
└── tasks
  ↓
Implementation
  ↓
Pull Request
```

## Multi-tenancy

`Organization` es la frontera principal del tenant.

Toda funcionalidad tenant-scoped debe validar:

```text
Authenticated User
      ↓
UserSession
      ↓
Active Organization
      ↓
OrganizationMembership ACTIVE
      ↓
Role / Permission
```

Nunca debe asumirse que conocer un UUID concede acceso.

Pruebas mínimas para toda HU tenant-scoped:

1. Un miembro válido puede acceder a su recurso.
2. Un miembro de otra organización no puede leerlo.
3. Un miembro de otra organización no puede modificarlo.
4. IDs relacionados de otro tenant son rechazados.
5. Un usuario sin membership activa es rechazado.

`ProjectAccess` puede restringir adicionalmente acceso a proyectos, pero no sustituye tenant scope.

## No duplicar conceptos ya modelados

```text
Discovery
→ AnalysisRun(type = FULL_DISCOVERY / INVENTORY / ...)

Adquisición/scanning
→ ScanSession

Snapshot
→ SourceSnapshot

Assessment
→ Assessment

Approval
→ ApprovalRequest cuando corresponda

Migration Confidence Score
→ MigrationRun.confidenceScore / ValidationRun.confidenceScore

Plan comercial
→ BillingPlan
```

Antes de crear una nueva entidad debe revisarse el schema vigente.

## Pipeline técnico base

```text
Project
  ↓
LegacySystem
  ↓
SourceConnection / Repository
  ↓
ScanSession
  ↓
SourceSnapshot
  ↓
SourceFile / Technology / Dependency
  ↓
AnalysisRun
  ↓
AnalysisStage
  ↓
Finding / AnalysisMetric
```

`ScanSession` pertenece a adquisición. `AnalysisRun` pertenece al análisis.

## Procesos pesados

Scanning, parsing, dependency analysis, discovery, IA, migración, validación y reportes pesados deben evolucionar hacia jobs/workers cuando la historia lo requiera.

Modelos principales:
- `Job`
- `JobAttempt`
- `Worker`

---

# Fase 1 — Foundation

## HU-001 — Autenticarse y entrar al tenant correcto

**Como** usuario de LegacyLift,  
**quiero** registrarme, iniciar sesión, restaurar mi sesión y cerrar sesión,  
**para** acceder de forma segura al workspace de mi organización.

### Criterios de aceptación

- Registro crea usuario, organización y membership inicial.
- El usuario recibe el rol inicial acordado (`OWNER`).
- Registro entra directamente a la organización creada.
- Login con una sola membership activa entra directamente.
- Login con múltiples memberships activas requiere selección.
- Login con una sola organización nunca muestra selector.
- Refresh restaura la sesión.
- `/auth/me` refleja tenant y membership activos.
- Logout revoca la sesión.
- Password y refresh tokens no se almacenan en texto plano.

### Modelos Prisma relacionados
- `User`
- `UserCredential`
- `UserSession`
- `Organization`
- `OrganizationMembership`
- `Role`
- `MembershipRole`
- `Permission`
- `RolePermission`

### Dependencias
Ninguna.

---

## HU-002 — Conocer LegacyLift antes de registrarse

**Como** visitante,  
**quiero** entender qué problema resuelve LegacyLift,  
**para** decidir si quiero utilizarlo.

### Criterios de aceptación
- Landing pública.
- Explica el problema legacy.
- Presenta Discover → Understand → Plan → Modernize → Verify.
- Comunica IA privada/local.
- Comunica Migration Packs y enfoque multi-tecnología.
- Distingue visión futura de funcionalidad disponible.
- CTA hacia registro/login.

### Modelos Prisma relacionados
Ninguno obligatorio.

---

## HU-003 — Acceder al workspace autenticado

**Como** usuario autenticado,  
**quiero** un workspace que conserve el contexto de mi organización,  
**para** trabajar siempre dentro del tenant correcto.

### Criterios de aceptación
- App Shell autenticado.
- Muestra usuario y organización activa.
- Rutas privadas requieren sesión.
- Sesión sin tenant resuelto envía al selector.
- Una única fuente de verdad para auth/tenant.
- No se reutilizan datos de otro tenant.

### Modelos Prisma relacionados
- `UserSession`
- `Organization`
- `OrganizationMembership`

### Dependencias
- HU-001

---

## HU-004 — Cambiar entre organizaciones

**Como** usuario con varias memberships,  
**quiero** cambiar mi organización activa,  
**para** trabajar con distintos clientes o equipos sin cerrar sesión.

### Criterios de aceptación
- Solo se muestran memberships activas.
- Cambio de tenant revalida membership.
- Se actualiza `UserSession.organizationId`.
- Se recargan recursos del nuevo tenant.
- UUID manual de organización ajena es rechazado.

### Modelos Prisma relacionados
- `UserSession`
- `OrganizationMembership`
- `Organization`

### Dependencias
- HU-003

---

## HU-005 — Invitar y administrar miembros

**Como** owner/administrador,  
**quiero** administrar miembros,  
**para** colaborar con mi equipo.

### Criterios de aceptación
- Listar miembros.
- Invitar por email.
- Aceptar/revocar invitación.
- Suspender/remover membership.
- Invitaciones expiran y pertenecen a una organización.

### Modelos Prisma relacionados
- `OrganizationMembership`
- `OrganizationInvitation`
- `User`
- `Organization`

### Dependencias
- HU-003

---

## HU-006 — Administrar roles y permisos

**Como** administrador,  
**quiero** controlar permisos de miembros,  
**para** aplicar mínimo privilegio.

### Criterios de aceptación
- Asignar/remover roles.
- Diferenciar scope ORGANIZATION/PROJECT.
- Backend valida permisos.
- UI oculta no sustituye autorización.
- Relaciones respetan tenant.

### Modelos Prisma relacionados
- `Role`
- `Permission`
- `RolePermission`
- `MembershipRole`
- `OrganizationMembership`
- `ProjectAccess`

### Dependencias
- HU-005

---

# Fase 2 — Projects & Legacy Systems

## HU-007 — Crear y administrar proyectos

**Como** miembro autorizado,  
**quiero** crear proyectos de modernización,  
**para** organizar sistemas y trabajo relacionado.

### Criterios de aceptación
- Crear/listar/consultar/editar proyecto.
- Cambiar estado y archivar cuando corresponda.
- Solo se muestran proyectos de la organización activa.
- Se respeta `ProjectAccess`.

### Modelos Prisma relacionados
- `Project`
- `ProjectAccess`
- `Organization`
- `User`

### Dependencias
- HU-003
- HU-006 para RBAC completo

---

## HU-008 — Registrar sistemas legacy

**Como** miembro de un proyecto,  
**quiero** registrar sistemas legacy,  
**para** modernizarlos de forma independiente.

### Criterios de aceptación
- Crear/listar/editar sistema.
- Mantener ownership `LegacySystem → Project → Organization`.
- No permitir relaciones cross-tenant.

### Modelos Prisma relacionados
- `LegacySystem`
- `Project`

### Dependencias
- HU-007

---

## HU-009 — Registrar entornos del sistema

**Como** equipo de ingeniería,  
**quiero** representar entornos relevantes,  
**para** distinguir desarrollo, validación y despliegue.

### Criterios de aceptación
- Registrar entornos soportados por el modelo.
- Asociarlos al sistema correcto.
- Validaciones/deployments futuros usan el entorno correcto.
- No mezclar entornos entre tenants.

### Modelos Prisma relacionados
- Modelos de entorno de `projects-source.prisma`
- `LegacySystem`

### Dependencias
- HU-008

---

# Fase 3 — Source Ingestion

## HU-010 — Conectar una fuente de código

**Como** miembro del proyecto,  
**quiero** conectar una fuente de código,  
**para** permitir que LegacyLift la obtenga.

### Criterios de aceptación
- Crear `SourceConnection`.
- Asociarla al sistema.
- Secrets mediante referencias seguras.
- Probar conectividad cuando sea posible.
- Errores útiles.

### Modelos Prisma relacionados
- `SourceConnection`
- `SecretReference`
- `LegacySystem`

### Dependencias
- HU-008

---

## HU-011 — Registrar repositorios

**Como** usuario,  
**quiero** asociar repositorios con el sistema,  
**para** identificar el origen del código.

### Criterios de aceptación
- Provider, nombre y metadata.
- Asociación a proyecto/sistema.
- Asociación a `SourceConnection` cuando aplique.
- Read-only por defecto cuando corresponda.
- No permitir cross-tenant.

### Modelos Prisma relacionados
- `Repository`
- `SourceConnection`
- `Project`
- `LegacySystem`
- `SecretReference`

### Dependencias
- HU-010

---

## HU-012 — Ejecutar una sesión de scanning

**Como** usuario,  
**quiero** adquirir/escanear el código,  
**para** capturar una versión reproducible.

### Criterios de aceptación
- Crear `ScanSession`.
- Asociarla a sistema y source connection.
- Registrar scanner agent.
- Estado, error y timestamps trazables.
- Uso asíncrono cuando corresponda.

### Modelos Prisma relacionados
- `ScanSession`
- `ScannerAgent`
- `SourceConnection`
- `LegacySystem`

### Dependencias
- HU-010

---

## HU-013 — Crear un Source Snapshot

**Como** usuario,  
**quiero** conservar la versión exacta analizada,  
**para** repetir análisis y comparar resultados.

### Criterios de aceptación
- Crear `SourceSnapshot`.
- Asociar proyecto/sistema.
- Relacionar repository/source connection.
- Registrar branch, commit, tag o equivalente.
- Snapshot histórico inmutable a cambios posteriores.
- Artefactos pesados referenciables mediante storage.

### Modelos Prisma relacionados
- `SourceSnapshot`
- `Repository`
- `SourceConnection`
- `Project`
- `LegacySystem`
- `StorageObject`

### Dependencias
- HU-012

---

## HU-014 — Inventariar archivos, tecnologías y dependencias

**Como** ingeniero,  
**quiero** conocer qué contiene el snapshot,  
**para** preparar análisis posteriores.

### Criterios de aceptación
- Persistir archivos.
- Registrar tecnologías detectadas.
- Registrar dependencias.
- Todo resultado pertenece al snapshot.

### Modelos Prisma relacionados
- `SourceFile`
- `SystemTechnology`
- `SoftwareDependency`
- `TechnologyCatalog`
- `SourceSnapshot`

### Dependencias
- HU-013

---

# Fase 4 — Jobs

## HU-015 — Consultar progreso de operaciones largas

**Como** usuario,  
**quiero** consultar estado y progreso,  
**para** saber qué ocurre sin mantener una request abierta.

### Criterios de aceptación
- Job persistido.
- Estados pendiente/ejecutando/completado/fallido.
- Progreso cuando sea posible.
- Error útil.
- Reintentos controlados.
- Tenant scope en job y worker.

### Modelos Prisma relacionados
- `Job`
- `JobAttempt`
- `Worker`

### Dependencias
- Primer proceso asíncrono real

---

# Fase 5 — Discover

## HU-016 — Ejecutar Full Discovery

**Como** ingeniero,  
**quiero** ejecutar Discovery sobre un snapshot,  
**para** comprender qué existe antes de modernizar.

### Criterios de aceptación
- Crear `AnalysisRun`.
- Tipo `FULL_DISCOVERY`.
- Asociar proyecto, sistema y snapshot.
- Registrar configuración/engine versions.
- Ejecutar stages.
- Persistir progreso/error.
- No crear una entidad nueva llamada Discovery.

### Modelos Prisma relacionados
- `AnalysisRun`
- `AnalysisStage`
- `SourceSnapshot`
- `Project`
- `LegacySystem`
- `Job`

### Dependencias
- HU-013
- HU-015

---

## HU-017 — Ejecutar análisis especializados

**Como** ingeniero,  
**quiero** ejecutar análisis específicos,  
**para** profundizar en diferentes aspectos.

### Tipos esperados
- INVENTORY
- STATIC_ANALYSIS
- DEPENDENCY_ANALYSIS
- ARCHITECTURE_DISCOVERY
- BUSINESS_RULE_EXTRACTION
- TECHNICAL_DEBT
- MODERNIZATION_READINESS
- otros definidos por `AnalysisType`

### Modelos Prisma relacionados
- `AnalysisRun`
- `AnalysisStage`

### Dependencias
- HU-016

---

## HU-018 — Consultar Findings

**Como** ingeniero,  
**quiero** revisar problemas encontrados,  
**para** comprender riesgos técnicos.

### Criterios de aceptación
- Filtrar por categoría/severidad.
- Mostrar archivo/evidencia.
- Mantener fingerprint cuando aplique.
- Conservar historial de ejecuciones.

### Modelos Prisma relacionados
- `Finding`
- `AnalysisRun`
- `AnalysisRule`
- `SourceFile`
- `User`

### Dependencias
- HU-017

---

## HU-019 — Consultar métricas

**Como** arquitecto,  
**quiero** consultar métricas calculadas,  
**para** apoyar evaluaciones cuantitativas.

### Criterios de aceptación
- Métricas asociadas al `AnalysisRun`.
- Unidad/contexto claros.
- Disponibles para Assessment.

### Modelos Prisma relacionados
- `AnalysisMetric`
- `AnalysisRun`

### Dependencias
- HU-017

---

# Fase 6 — Understand

## HU-020 — Construir el Knowledge Graph

**Como** arquitecto,  
**quiero** representar entidades y relaciones,  
**para** comprender el sistema de forma tecnológica-neutral.

### Criterios de aceptación
- Crear nodos.
- Crear edges.
- Relacionarlos con snapshot/source.
- Representar módulos, servicios, programas, APIs, datos, jobs y conceptos específicos cuando apliquen.
- Soportar relaciones CALLS, DEPENDS_ON, READS, WRITES, USES, TRIGGERS, BELONGS_TO u otras modeladas.

### Modelos Prisma relacionados
- `KnowledgeNode`
- `KnowledgeEdge`
- `SourceSnapshot`
- `SourceFile`

### Dependencias
- HU-016
- HU-017

---

## HU-021 — Organizar conocimiento por dominios

**Como** analista,  
**quiero** agrupar conocimiento en dominios,  
**para** entender mejor la estructura funcional.

### Modelos Prisma relacionados
- `SystemDomain`
- `DomainNode`
- `KnowledgeNode`
- `LegacySystem`

### Dependencias
- HU-020

---

## HU-022 — Identificar reglas de negocio

**Como** analista,  
**quiero** registrar reglas de negocio con evidencia,  
**para** evitar perder comportamiento crítico.

### Criterios de aceptación
- Regla + evidencia.
- Asociación con source/nodos.
- Diferenciar inferencia y evidencia.
- Revisión humana.

### Modelos Prisma relacionados
- `BusinessRule`
- `BusinessRuleEvidence`
- `KnowledgeNode`
- `SourceFile`

### Dependencias
- HU-020

---

## HU-023 — Identificar procesos de negocio

**Como** analista,  
**quiero** reconstruir procesos,  
**para** comprender flujos de negocio implementados.

### Modelos Prisma relacionados
- `BusinessProcess`
- `BusinessProcessStep`
- `KnowledgeNode`

### Dependencias
- HU-020

---

# Fase 7 — Assess

## HU-024 — Generar Assessment

**Como** arquitecto,  
**quiero** evaluar el estado del sistema,  
**para** decidir con evidencia.

### Señales esperadas
- technical debt;
- readiness;
- complexity;
- risk;
- knowledge coverage;
- test coverage.

### Criterios de aceptación
- Scores explicables.
- Evidencia asociada.
- No presentar números aislados sin contexto.

### Modelos Prisma relacionados
- `Assessment`
- `AssessmentMethodology`
- `AnalysisRun`
- `Finding`
- `AnalysisMetric`

### Dependencias
- HU-018
- HU-019
- HU-020

---

## HU-025 — Obtener recomendaciones de modernización

**Como** arquitecto,  
**quiero** recibir estrategias recomendadas,  
**para** decidir qué hacer con cada parte del sistema.

### Estrategias
Keep, Stabilize, Encapsulate, Rehost, Replatform, Refactor, Rearchitect, Rewrite, Replace, Retire.

### Modelos Prisma relacionados
- `ModernizationRecommendation`
- `Assessment`

### Dependencias
- HU-024

---

# Fase 8 — Plan

## HU-026 — Crear un Modernization Plan

**Como** responsable del proyecto,  
**quiero** consolidar decisiones en un plan,  
**para** definir la modernización antes de ejecutar cambios.

### Modelos Prisma relacionados
- `ModernizationPlan`
- `Assessment`
- `Project`
- `LegacySystem`

### Dependencias
- HU-025

---

## HU-027 — Definir arquitectura actual y objetivo

**Como** arquitecto,  
**quiero** documentar arquitectura,  
**para** comparar el estado actual y target.

### Modelos Prisma relacionados
- `ArchitectureModel`
- `ModernizationPlan`

### Dependencias
- HU-026

---

## HU-028 — Organizar Migration Waves

**Como** responsable de modernización,  
**quiero** dividir el plan en waves,  
**para** evitar una migración big-bang.

### Criterios de aceptación
- Crear waves.
- Asociar targets.
- Registrar dependencias.
- Orden/prioridad.
- Mostrar bloqueos.

### Modelos Prisma relacionados
- `MigrationWave`
- `WaveTarget`
- `WaveDependency`
- `ModernizationPlan`

### Dependencias
- HU-026

---

## HU-029 — Definir milestones

**Como** responsable de proyecto,  
**quiero** definir hitos,  
**para** controlar avance.

### Modelos Prisma relacionados
- `PlanMilestone`
- `ModernizationPlan`

### Dependencias
- HU-026

---

## HU-030 — Revisar y aprobar el plan

**Como** reviewer autorizado,  
**quiero** aprobar o rechazar el plan,  
**para** mantener control humano.

### Criterios de aceptación
- Solicitud/decisión trazable.
- Actor, fecha y comentario.
- Auditoría.

### Modelos Prisma relacionados
- `ModernizationPlan`
- `ApprovalRequest`
- `OrganizationMembership`
- `AuditLog`

### Dependencias
- HU-026
- HU-028

---

# Fase 9 — AI Foundation

## HU-031 — Configurar proveedor de IA

**Como** administrador,  
**quiero** configurar proveedor/modelo,  
**para** controlar privacidad y capacidad.

### Criterios de aceptación
- Provider tenant-scoped.
- Modelos configurables.
- Secrets mediante referencias.
- Ollama como provider inicial.
- Abstracción para proveedores futuros.

### Modelos Prisma relacionados
- `AIProvider`
- `AIModel`
- `SecretReference`
- `Organization`

### Dependencias
- HU-003

---

## HU-032 — Ejecutar tareas asistidas por IA

**Como** ingeniero,  
**quiero** ejecutar tareas de IA,  
**para** acelerar understanding, tests, planning y migration.

### Criterios de aceptación
- Registrar ejecución.
- Provider/model/purpose.
- Prompt template/version cuando corresponda.
- Tenant scope.
- Métricas de uso disponibles.

### Modelos Prisma relacionados
- `AIRun`
- `AIProvider`
- `AIModel`
- `PromptTemplate`

### Dependencias
- HU-031

---

## HU-033 — Enriquecer conocimiento con IA

**Como** analista,  
**quiero** recibir propuestas de reglas/explicaciones,  
**para** acelerar comprensión sin perder revisión humana.

### Modelos Prisma relacionados
- `AIRun`
- `BusinessRule`
- `BusinessRuleEvidence`
- `KnowledgeNode`

### Dependencias
- HU-022
- HU-032

---

# Fase 10 — Migration Packs & Preparation

## HU-034 — Consultar y seleccionar Migration Packs

**Como** ingeniero,  
**quiero** seleccionar capacidades especializadas,  
**para** usar reglas adecuadas a mi tecnología.

### Criterios de aceptación
- Listar packs/versiones.
- Mostrar compatibilidad.
- Mostrar tecnología/escenario.
- No afirmar packs no implementados.

### Modelos Prisma relacionados
- `MigrationPack`
- `MigrationPackVersion`

### Dependencias
- HU-026

---

## HU-035 — Crear Behavioral Baseline

**Como** ingeniero,  
**quiero** capturar comportamiento previo,  
**para** comparar el sistema después de la migración.

### Criterios de aceptación
- Inputs/outputs/responses/side effects cuando apliquen.
- Observaciones trazables.
- Asociación al snapshot/target correcto.

### Modelos Prisma relacionados
- `BehaviorBaseline`
- `BaselineObservation`
- `SourceSnapshot`
- `LegacySystem`

### Dependencias
- HU-013
- HU-026

---

## HU-036 — Administrar tests de comportamiento

**Como** ingeniero,  
**quiero** disponer de suites y casos de prueba,  
**para** detectar regresiones.

### Modelos Prisma relacionados
- `TestSuite`
- `TestCase`
- `TestRun`
- modelos de resultados definidos en `migration-validation.prisma`

### Dependencias
- HU-035
- HU-032 si existe generación asistida

---

# Fase 11 — Modernize

## HU-037 — Ejecutar Migration Run

**Como** ingeniero,  
**quiero** ejecutar una migración trazable,  
**para** producir una versión modernizada.

### Criterios de aceptación
- Crear `MigrationRun`.
- Relacionar project/system/snapshot.
- Relacionar plan/wave cuando aplique.
- Relacionar Migration Pack/version.
- Ejecutar como job.
- No sobrescribir source original.
- Mantener error/output trazables.

### Modelos Prisma relacionados
- `MigrationRun`
- `MigrationUnit`
- `MigrationPack`
- `MigrationPackVersion`
- `ModernizationPlan`
- `MigrationWave`
- `SourceSnapshot`
- `Job`

### Dependencias
- HU-030
- HU-034
- HU-035

---

## HU-038 — Revisar diff de la transformación

**Como** ingeniero,  
**quiero** comparar cambios generados,  
**para** entender exactamente qué cambió.

### Modelos Prisma relacionados
- `CodeChange`
- `MigrationUnit`
- `MigrationRun`
- `SourceFile`

### Dependencias
- HU-037

---

## HU-039 — Consultar logs y artefactos

**Como** ingeniero,  
**quiero** entender qué ocurrió durante la migración,  
**para** diagnosticar fallos.

### Modelos Prisma relacionados
- `MigrationRun`
- `MigrationUnit`
- `Job`
- `JobAttempt`
- `StorageObject`

### Dependencias
- HU-037

---

# Fase 12 — Verify

## HU-040 — Ejecutar Validation Run

**Como** ingeniero,  
**quiero** validar técnicamente la migración,  
**para** detectar errores antes de aprobar.

### Checks
- compile/build;
- lint;
- tests;
- validators del pack.

### Modelos Prisma relacionados
- `ValidationRun`
- `ValidationCheck`
- `MigrationRun`
- `TestRun`

### Dependencias
- HU-036
- HU-037

---

## HU-041 — Comparar comportamiento legacy vs moderno

**Como** ingeniero,  
**quiero** comparar el resultado con el baseline,  
**para** detectar divergencias funcionales.

### Modelos Prisma relacionados
- `BehaviorComparison`
- `BehaviorBaseline`
- `BaselineObservation`
- `ValidationRun`
- `MigrationRun`

### Dependencias
- HU-035
- HU-040

---

## HU-042 — Ejecutar Dual Run

**Como** equipo de modernización,  
**quiero** ejecutar legacy y moderno con inputs equivalentes,  
**para** comparar comportamiento realista.

### Criterios de aceptación
- Inputs equivalentes.
- Outputs comparados.
- Divergencias registradas.
- Entorno explícito.
- Sin impacto accidental en producción.

### Modelos Prisma relacionados
- Modelos de dual run definidos en `migration-validation.prisma`
- `BehaviorComparison`
- `ValidationRun`

### Dependencias
- HU-041

---

## HU-043 — Calcular Migration Confidence Score

**Como** responsable de modernización,  
**quiero** un score basado en evidencia,  
**para** apoyar decisiones.

### Señales
- build;
- lint;
- tests;
- behavior comparison;
- divergencias;
- dual run.

### Regla de persistencia

No crear un modelo `MigrationConfidenceScore`.

Usar:
- `MigrationRun.confidenceScore`
- `ValidationRun.confidenceScore`

### Modelos Prisma relacionados
- `MigrationRun`
- `ValidationRun`
- `ValidationCheck`
- `BehaviorComparison`
- `TestRun`

### Dependencias
- HU-040
- HU-041

---

## HU-044 — Aprobar o rechazar una migración

**Como** reviewer autorizado,  
**quiero** revisar evidencia y decidir,  
**para** conservar control humano.

### Criterios de aceptación
- Diff.
- Validations.
- Confidence Score.
- Divergencias.
- Actor/fecha/comentario.
- Auditoría.

### Modelos Prisma relacionados
- `ApprovalRequest`
- `MigrationRun`
- `ValidationRun`
- `OrganizationMembership`
- `AuditLog`

### Dependencias
- HU-038
- HU-043

---

## HU-045 — Revertir una migración

**Como** responsable autorizado,  
**quiero** ejecutar rollback,  
**para** volver a un estado seguro.

### Modelos Prisma relacionados
- `RollbackRun`
- `MigrationRun`
- `ApprovalRequest`
- `AuditLog`

### Dependencias
- HU-044

---

## HU-046 — Desplegar una migración aprobada

**Como** responsable de entrega,  
**quiero** desplegar un resultado aprobado,  
**para** completar el ciclo.

### Modelos Prisma relacionados
- `DeploymentRun`
- `MigrationRun`
- `StorageObject`
- modelos de entorno
- `AuditLog`

### Dependencias
- HU-044

---

# Fase 13 — Reporting & Audit

## HU-047 — Generar reportes

**Como** stakeholder,  
**quiero** reportes consolidados,  
**para** comprender estado, decisiones y resultados.

### Tipos previstos
- Discovery
- Technical Debt
- Modernization Assessment
- Modernization Plan
- Migration
- Validation
- Executive

### Modelos Prisma relacionados
- `Report`
- `StorageObject`
- `Project`
- `LegacySystem`

---

## HU-048 — Consultar auditoría

**Como** administrador/auditor,  
**quiero** consultar operaciones sensibles,  
**para** mantener trazabilidad.

### Modelos Prisma relacionados
- `AuditLog`
- `SecurityEvent`

### Dependencias
Transversal.

---

## HU-049 — Recibir notificaciones

**Como** usuario,  
**quiero** recibir notificaciones sobre eventos relevantes,  
**para** reaccionar a resultados y acciones pendientes.

### Modelos Prisma relacionados
- `Notification`

### Dependencias
- HU-015
- workflows relevantes

---

# Fase 14 — Billing & Entitlements

## HU-050 — Consultar planes

**Como** potencial cliente,  
**quiero** conocer los planes,  
**para** elegir uno.

Planes previstos:
- Developer
- Team
- Enterprise

### Modelos Prisma relacionados
- `BillingPlan`
- `BillingPrice`
- `Feature`
- `PlanEntitlement`

### Dependencias
Flujo central estable.

---

## HU-051 — Gestionar suscripción

**Como** owner,  
**quiero** asociar una suscripción a mi organización,  
**para** activar un plan.

### Modelos Prisma relacionados
- `Subscription`
- `BillingPlan`
- `BillingPrice`
- `Organization`

### Dependencias
- HU-050

---

## HU-052 — Aplicar entitlements

**Como** organización suscrita,  
**quiero** que se habiliten únicamente las features permitidas,  
**para** respetar las reglas comerciales.

### Regla
Backend es fuente de verdad; ocultar UI no es autorización.

### Modelos Prisma relacionados
- `Feature`
- `PlanEntitlement`
- `BillingPlan`
- `Subscription`

### Dependencias
- HU-051

---

## HU-053 — Registrar usage

**Como** owner,  
**quiero** conocer el consumo,  
**para** controlar límites.

### Modelos Prisma relacionados
- `UsageEvent`
- `Subscription`
- `PlanEntitlement`

### Dependencias
- HU-052

---

# Fase 15 — Integrations & Enterprise

## HU-054 — Integrar proveedores Git

**Como** equipo de ingeniería,  
**quiero** conectar GitHub/GitLab/Bitbucket/Azure DevOps/Custom,  
**para** automatizar adquisición del código.

### Modelos Prisma relacionados
- modelos de integración de `projects-source.prisma`
- `SourceConnection`
- `Repository`
- `SecretReference`

### Dependencias
- HU-010

---

## HU-055 — Gestionar API Keys

**Como** administrador,  
**quiero** emitir/revocar API keys,  
**para** permitir integraciones controladas.

### Modelos Prisma relacionados
- `ApiKey`
- `Organization`
- `Project`

### Dependencias
- HU-006

---

## HU-056 — Verificar email y recuperar contraseña

**Como** usuario,  
**quiero** verificar mi email y recuperar acceso,  
**para** mantener una cuenta segura.

### Modelos Prisma relacionados
- modelos de verification/reset de `auth-tenancy.prisma`
- `User`
- `UserCredential`
- `UserSession`

### Dependencias
- HU-001

---

## HU-057 — Autenticación Enterprise

**Como** administrador Enterprise,  
**quiero** integrar identidad corporativa,  
**para** usar políticas existentes.

Capacidades futuras:
- MFA
- SAML
- OIDC
- SSO

### Regla
No implementar sin requisitos concretos. Si faltan modelos, agregarlos mediante OpenSpec + migración.

### Dependencias
- HU-001
- alcance Enterprise

---

## HU-058 — Ejecutar LegacyLift en infraestructura privada

**Como** cliente Enterprise,  
**quiero** ejecutar componentes en infraestructura controlada,  
**para** proteger código y propiedad intelectual.

Modalidades:
- private cloud
- on-premise
- hybrid

### Modelos Prisma relacionados
- `Organization`
- `DeploymentInstance`
- `AIProvider`
- `SourceConnection`
- `SecretReference`

### Dependencias
Producto central estable.

---

# Milestones recomendados

## Milestone A — Foundation usable

```text
HU-001 → HU-008
```

Resultado:

```text
Landing
→ Register/Login
→ Organization
→ Workspace
→ Team/RBAC
→ Project
→ Legacy System
```

## Milestone B — Primer flujo técnico completo

```text
HU-010 → HU-024
```

Resultado:

```text
Project
→ Legacy System
→ Source
→ Scan
→ Snapshot
→ Discovery
→ Findings
→ Knowledge Graph
→ Business Rules
→ Assessment
```

Este es un corte fuerte para un MVP académico funcional.

## Milestone C — Planning

```text
HU-025 → HU-030
```

Resultado:

```text
Assessment
→ Recommendation
→ Modernization Plan
→ Target Architecture
→ Migration Waves
→ Approval
```

## Milestone D — AI-assisted product

```text
HU-031 → HU-033
```

Resultado:

```text
Private/local AI
→ AI Runs
→ Assisted understanding/planning
```

## Milestone E — Modernize & Verify

```text
HU-034 → HU-046
```

Resultado:

```text
Migration Pack
→ Baseline
→ Tests
→ Migration
→ Diff
→ Validation
→ Behavior Comparison
→ Confidence
→ Approval
→ Rollback / Deployment
```

Este milestone representa el diferenciador central de LegacyLift.

## Milestone F — Productization

```text
HU-047 → HU-058
```

Resultado:

```text
Reports
Audit
Notifications
Billing
Entitlements
Usage
Integrations
Enterprise
```

---

# Camino crítico

```text
HU-001 Auth
  ↓
HU-003 Workspace
  ↓
HU-007 Project
  ↓
HU-008 Legacy System
  ↓
HU-010 Source Connection
  ↓
HU-012 Scan Session
  ↓
HU-013 Source Snapshot
  ↓
HU-016 Full Discovery
  ↓
HU-018 Findings
  ↓
HU-020 Knowledge Graph
  ↓
HU-022 Business Rules
  ↓
HU-024 Assessment
  ↓
HU-025 Recommendations
  ↓
HU-026 Modernization Plan
  ↓
HU-028 Migration Waves
  ↓
HU-030 Plan Approval
  ↓
HU-034 Migration Pack
  ↓
HU-035 Behavioral Baseline
  ↓
HU-036 Tests
  ↓
HU-037 Migration Run
  ↓
HU-038 Diff
  ↓
HU-040 Validation Run
  ↓
HU-041 Behavior Comparison
  ↓
HU-043 Confidence Score
  ↓
HU-044 Approval
  ↓
HU-045 Rollback
      o
HU-046 Deployment
```

---

# Las cuatro preguntas de LegacyLift

## ¿Qué tengo?

```text
Source
→ Snapshot
→ Discovery
→ Inventory
```

## ¿Cómo funciona?

```text
Findings
→ Knowledge Graph
→ Business Rules
→ Processes
```

## ¿Cómo debería modernizarlo?

```text
Assessment
→ Recommendations
→ Modernization Plan
→ Architecture
→ Migration Waves
```

## ¿Cómo sé que la modernización es confiable?

```text
Behavior Baseline
→ Tests
→ Migration
→ Validation
→ Behavior Comparison
→ Migration Confidence
→ Human Approval
```

---

# Principio final

LegacyLift no debe evolucionar como una colección de conversores aislados.

Debe evolucionar como una:

> **AI-assisted, verification-driven software modernization platform.**

Los Migration Packs aportan conocimiento especializado.

El core aporta identidad, multi-tenancy, proyectos, source, snapshots, análisis, knowledge, assessment, planning, IA, jobs, migration, validation, approvals, audit y reporting.

> **Understand first. Modernize safely.**
