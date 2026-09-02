# LegacyLift AI — Plan de Ejecución por Sprints Funcionales

> **Understand first. Modernize safely.**

Este documento establece el **plan de ejecución funcional de LegacyLift AI**. Las 15 fases del backlog maestro se desarrollarán agrupadas en **5 sprints funcionales**, definidos por capacidades de producto completas y demostrables de punta a punta.

Este plan se seguirá como guía de ejecución del proyecto junto con:

- `docs/design/LEGACYLIFT_USER_STORIES_BACKLOG.md`
- `docs/product/LEGACYLIFT_PRODUCT_VISION.md`
- `docs/architecture/database.md`
- `docs/architecture/multi-tenancy.md`
- `prisma/schema/*.prisma`

El backlog maestro continúa siendo la fuente de verdad para las Historias de Usuario, criterios de aceptación, modelos relacionados y dependencias. Este documento define **cómo se agrupan y ejecutan esas fases en incrementos funcionales**.

---

# Principios de ejecución

## 1. Cada sprint termina en una capacidad demostrable

Los sprints no se consideran completos por cantidad de issues cerradas, commits realizados o componentes implementados de forma aislada.

Un sprint termina cuando su flujo funcional principal puede validarse de punta a punta.

```text
Issue
  ↓
OpenSpec cuando corresponda
  ↓
Implementation
  ↓
Tests
  ↓
Pull Request
  ↓
Validación end-to-end
  ↓
Capacidad funcional demostrable
```

## 2. Las Historias de Usuario continúan siendo verticales

Una HU puede requerir trabajo separado de frontend, backend, QA, infraestructura o documentación, pero solo se considera completa cuando el comportamiento descrito en el backlog puede validarse de punta a punta.

## 3. Las dependencias del backlog son obligatorias

La agrupación por sprints no elimina ni relaja dependencias entre Historias de Usuario.

Dentro de cada sprint se seguirá el orden necesario para respetar el camino crítico y las dependencias definidas en `LEGACYLIFT_USER_STORIES_BACKLOG.md`.

## 4. OpenSpec continúa siendo obligatorio para cambios sustanciales

Se utilizará OpenSpec para cambios sustanciales de autenticación, autorización, multi-tenancy, base de datos, contratos HTTP, IA, migraciones, seguridad, billing y arquitectura.

## 5. El desarrollo se orienta al flujo completo de LegacyLift

La ejecución del proyecto seguirá esta progresión:

```text
Código legacy
    ↓
Ingesta reproducible
    ↓
Comprensión estructurada
    ↓
Assessment y decisión
    ↓
Plan de modernización
    ↓
Transformación
    ↓
Verificación basada en evidencia
    ↓
Operación como producto
```

---

# Vista general

| Sprint | Nombre | Fases | Resultado funcional |
|---|---|---|---|
| **Sprint 1** | **Ingest** | Fases 1, 2, 3 y 4 | Un usuario puede entrar, crear el contexto de modernización, conectar código, escanearlo y obtener un snapshot reproducible. |
| **Sprint 2** | **Understand** | Fases 5, 6, 7 y 9 | LegacyLift puede analizar un snapshot, explicar qué contiene y cómo funciona, construir conocimiento, evaluar el sistema y enriquecer el proceso con IA. |
| **Sprint 3** | **Plan & Prepare** | Fases 8 y 10 | LegacyLift convierte evidencia en un plan de modernización aprobado y prepara baseline, tests y Migration Packs antes de transformar código. |
| **Sprint 4** | **Modernize Safely** | Fases 11 y 12 | LegacyLift ejecuta una migración trazable y demuestra mediante validación y comparación de comportamiento que el resultado es confiable. |
| **Sprint 5** | **Productize** | Fases 13, 14 y 15 | El core se convierte en una plataforma operable y comercializable con reporting, auditoría, billing, integraciones y capacidades Enterprise. |

---

# Sprint 1 — Ingest

## Fases incluidas

- **Fase 1 — Foundation**
- **Fase 2 — Projects & Legacy Systems**
- **Fase 3 — Source Ingestion**
- **Fase 4 — Jobs**

## Objetivo

Construir el flujo completo necesario para que un usuario autenticado entregue un sistema legacy a LegacyLift dentro del tenant, proyecto y contexto correctos, y la plataforma produzca una representación reproducible del código fuente.

## Flujo funcional objetivo

```text
Register / Login
      ↓
Organization
      ↓
Workspace
      ↓
Team / RBAC
      ↓
Project
      ↓
Legacy System
      ↓
Source Connection
      ↓
Repository
      ↓
Scan Session
      ↓
Source Snapshot
      ↓
Inventory
```

## Historias de Usuario

### Foundation

- HU-001 — Autenticarse y entrar al tenant correcto
- HU-002 — Conocer LegacyLift antes de registrarse
- HU-003 — Acceder al workspace autenticado
- HU-004 — Cambiar entre organizaciones
- HU-005 — Invitar y administrar miembros
- HU-006 — Administrar roles y permisos

### Projects & Legacy Systems

- HU-007 — Crear y administrar proyectos
- HU-008 — Registrar sistemas legacy
- HU-009 — Registrar entornos del sistema

### Source Ingestion

- HU-010 — Conectar una fuente de código
- HU-011 — Registrar repositorios
- HU-012 — Ejecutar una sesión de scanning
- HU-013 — Crear un Source Snapshot
- HU-014 — Inventariar archivos, tecnologías y dependencias

### Jobs

- HU-015 — Consultar progreso de operaciones largas

## Resultado obligatorio del sprint

Al finalizar este sprint debe ser posible demostrar el siguiente recorrido:

```text
Usuario
→ inicia sesión
→ trabaja dentro de una organización
→ crea un proyecto
→ registra un sistema legacy
→ conecta una fuente de código
→ ejecuta scanning
→ consulta progreso
→ obtiene un Source Snapshot
→ consulta el inventario básico del snapshot
```

## Criterio funcional de cierre

El sprint está completo cuando un repositorio real puede ingresar a LegacyLift y convertirse en un snapshot histórico, tenant-scoped y apto para análisis posteriores.

`Jobs` forma parte de este sprint porque scanning es el primer proceso pesado que debe poder evolucionar a ejecución asíncrona sin mantener requests HTTP abiertas.

---

# Sprint 2 — Understand

## Fases incluidas

- **Fase 5 — Discover**
- **Fase 6 — Understand**
- **Fase 7 — Assess**
- **Fase 9 — AI Foundation**

La Fase 9 se ejecuta en este sprint aunque su numeración original sea posterior a Plan. Sus dependencias permiten utilizar IA donde comienza a aportar valor directo: análisis, conocimiento, explicación y extracción asistida de información.

## Objetivo

Convertir un Source Snapshot en conocimiento estructurado y evidencia suficiente para explicar qué contiene el sistema, cómo funciona, cuáles son sus riesgos y cuál es su nivel de preparación para modernización.

## Flujo funcional objetivo

```text
Source Snapshot
      ↓
Full Discovery
      ↓
Specialized Analysis
      ↓
Findings + Metrics
      ↓
Knowledge Graph
      ↓
Domains
      ↓
Business Rules
      ↓
Business Processes
      ↓
AI-assisted enrichment
      ↓
Assessment
```

## Historias de Usuario

### Discover

- HU-016 — Ejecutar Full Discovery
- HU-017 — Ejecutar análisis especializados
- HU-018 — Consultar Findings
- HU-019 — Consultar métricas

### Understand

- HU-020 — Construir el Knowledge Graph
- HU-021 — Organizar conocimiento por dominios
- HU-022 — Identificar reglas de negocio
- HU-023 — Identificar procesos de negocio

### Assess

- HU-024 — Generar Assessment
- HU-025 — Obtener recomendaciones de modernización

### AI Foundation

- HU-031 — Configurar proveedor de IA
- HU-032 — Ejecutar tareas asistidas por IA
- HU-033 — Enriquecer conocimiento con IA

## Preguntas que debe responder el sprint

### ¿Qué tengo?

```text
Source
→ Snapshot
→ Discovery
→ Inventory
→ Findings
→ Metrics
```

### ¿Cómo funciona?

```text
Knowledge Graph
→ Domains
→ Business Rules
→ Business Processes
→ Evidence
```

### ¿Cuál es su estado?

```text
Findings + Metrics + Knowledge
              ↓
          Assessment
              ↓
Modernization Recommendations
```

## Uso de IA

La IA se utiliza como capacidad asistida y trazable, no como sustituto de la evidencia.

```text
Evidence
   ↓
AIRun
   ↓
Propuesta / explicación / enriquecimiento
   ↓
Revisión humana
   ↓
Conocimiento persistido
```

Toda ejecución relevante debe conservar provider, modelo, purpose, contexto y métricas de uso según los modelos definidos en el backlog.

## Resultado obligatorio del sprint

Al finalizar este sprint debe ser posible seleccionar un snapshot y obtener una explicación estructurada del sistema que incluya inventario, findings, métricas, relaciones, reglas o procesos identificados, assessment y recomendaciones respaldadas por evidencia.

## Criterio funcional de cierre

LegacyLift debe poder pasar de **código capturado** a **conocimiento útil para tomar decisiones de modernización**.

---

# Sprint 3 — Plan & Prepare

## Fases incluidas

- **Fase 8 — Plan**
- **Fase 10 — Migration Packs & Preparation**

## Objetivo

Transformar assessment y recomendaciones en un plan de modernización explícito, revisable y aprobado, y preparar los mecanismos necesarios para medir el comportamiento antes de modificar el sistema.

## Flujo funcional objetivo

```text
Assessment
    ↓
Recommendations
    ↓
Modernization Plan
    ↓
Current / Target Architecture
    ↓
Migration Waves
    ↓
Milestones
    ↓
Human Approval
    ↓
Migration Pack
    ↓
Behavioral Baseline
    ↓
Behavior Tests
```

## Historias de Usuario

### Plan

- HU-026 — Crear un Modernization Plan
- HU-027 — Definir arquitectura actual y objetivo
- HU-028 — Organizar Migration Waves
- HU-029 — Definir milestones
- HU-030 — Revisar y aprobar el plan

### Migration Packs & Preparation

- HU-034 — Consultar y seleccionar Migration Packs
- HU-035 — Crear Behavioral Baseline
- HU-036 — Administrar tests de comportamiento

## Regla de ejecución

Hasta completar este sprint, LegacyLift puede descubrir, analizar, recomendar y planificar, pero el flujo principal **no modifica el source original**.

La frontera entre preparación y transformación es explícita:

```text
Sprint 1 → Ingest
Sprint 2 → Understand
Sprint 3 → Decide + Prepare
────────────────────────────
Sprint 4 → Execute + Verify
```

## Resultado obligatorio del sprint

Al finalizar este sprint debe existir un plan de modernización trazable y aprobado que incluya, cuando corresponda:

- assessment de origen;
- recomendaciones;
- arquitectura actual y target;
- migration waves;
- milestones;
- dependencias y bloqueos;
- aprobación humana;
- Migration Pack seleccionado;
- Behavioral Baseline;
- suites/casos de prueba necesarios para validar la transformación.

## Criterio funcional de cierre

La plataforma debe estar preparada para iniciar una migración sin depender de decisiones implícitas y con una base objetiva para comparar el comportamiento antes y después de la transformación.

---

# Sprint 4 — Modernize Safely

## Fases incluidas

- **Fase 11 — Modernize**
- **Fase 12 — Verify**

## Objetivo

Ejecutar una transformación trazable sobre una versión controlada del sistema y demostrar, mediante evidencia técnica y funcional, que el resultado modernizado conserva el comportamiento esperado antes de aprobarlo o desplegarlo.

## Flujo funcional objetivo

```text
Approved Modernization Plan
          ↓
Migration Run
          ↓
Migration Units
          ↓
Generated Changes
          ↓
Diff Review
          ↓
Validation Run
          ↓
Build / Lint / Tests
          ↓
Behavior Comparison
          ↓
Dual Run cuando corresponda
          ↓
Migration Confidence Score
          ↓
Human Approval
       ↙       ↘
   Rollback   Deployment
```

## Historias de Usuario

### Modernize

- HU-037 — Ejecutar Migration Run
- HU-038 — Revisar diff de la transformación
- HU-039 — Consultar logs y artefactos

### Verify

- HU-040 — Ejecutar Validation Run
- HU-041 — Comparar comportamiento legacy vs moderno
- HU-042 — Ejecutar Dual Run
- HU-043 — Calcular Migration Confidence Score
- HU-044 — Aprobar o rechazar una migración
- HU-045 — Revertir una migración
- HU-046 — Desplegar una migración aprobada

## Regla de ejecución

Modernize y Verify se desarrollan como un único incremento funcional.

Una migración no se considera completa únicamente porque `MigrationRun` haya generado código o alcanzado estado `COMPLETED`.

El resultado debe contar con evidencia suficiente para evaluar confianza.

```text
Migration generated
AND
build/validators ejecutados
AND
tests ejecutados
AND
behavior comparado cuando corresponda
AND
evidencia disponible
AND
reviewer puede aprobar o rechazar
```

## Resultado obligatorio del sprint

Al finalizar este sprint LegacyLift debe poder demostrar el ciclo central:

```text
Plan aprobado
→ transformación
→ diff
→ validación
→ comparación de comportamiento
→ confidence score
→ aprobación humana
→ deployment o rollback
```

## Criterio funcional de cierre

La modernización debe ser **verification-driven**. El producto no debe limitarse a generar una versión transformada; debe proporcionar evidencia suficiente para decidir si esa versión es confiable.

Este sprint implementa el principal diferenciador de LegacyLift:

> **AI-assisted, verification-driven software modernization.**

---

# Sprint 5 — Productize

## Fases incluidas

- **Fase 13 — Reporting & Audit**
- **Fase 14 — Billing & Entitlements**
- **Fase 15 — Integrations & Enterprise**

## Objetivo

Convertir el flujo central ya validado en una plataforma operable, auditable, integrable y comercializable para distintos tipos de organizaciones y despliegues.

## Flujo funcional objetivo

```text
LegacyLift Core
   │
   ├── Reports
   ├── Audit
   ├── Notifications
   │
   ├── Billing Plans
   ├── Subscriptions
   ├── Entitlements
   ├── Usage
   │
   ├── Git Providers
   ├── API Keys
   ├── Account Recovery
   ├── Enterprise Authentication
   └── Private / On-prem / Hybrid Deployment
```

## Historias de Usuario

### Reporting & Audit

- HU-047 — Generar reportes
- HU-048 — Consultar auditoría
- HU-049 — Recibir notificaciones

### Billing & Entitlements

- HU-050 — Consultar planes
- HU-051 — Gestionar suscripción
- HU-052 — Aplicar entitlements
- HU-053 — Registrar usage

### Integrations & Enterprise

- HU-054 — Integrar proveedores Git
- HU-055 — Gestionar API Keys
- HU-056 — Verificar email y recuperar contraseña
- HU-057 — Autenticación Enterprise
- HU-058 — Ejecutar LegacyLift en infraestructura privada

## Resultado obligatorio del sprint

Al finalizar este sprint el core de LegacyLift debe poder operar como plataforma con capacidades de observabilidad de producto, control comercial, integraciones y opciones Enterprise.

## Criterio funcional de cierre

Las capacidades de productización deben apoyarse en un core estable. Billing, entitlements, integraciones y Enterprise no sustituyen el flujo central de modernización; lo extienden y permiten operarlo a escala.

---

# Secuencia obligatoria de capacidades

El orden de los sprints establece el camino de madurez del producto:

```text
SPRINT 1 — INGEST
Código → Snapshot reproducible

SPRINT 2 — UNDERSTAND
Snapshot → Conocimiento + Assessment

SPRINT 3 — PLAN & PREPARE
Conocimiento → Decisión + Baseline

SPRINT 4 — MODERNIZE SAFELY
Decisión → Software modernizado + Evidencia

SPRINT 5 — PRODUCTIZE
Core validado → Plataforma operable
```

No se utilizarán capacidades de sprints posteriores como sustituto de capacidades fundamentales pendientes de sprints anteriores.

Trabajo preparatorio o técnico puede adelantarse cuando sea necesario para desbloquear dependencias, pero una capacidad funcional solo se considera incorporada al producto cuando cumple los criterios del backlog y del sprint correspondiente.

---

# Camino crítico entre sprints

```text
SPRINT 1
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

SPRINT 2
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

SPRINT 3
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

SPRINT 4
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
  ↓

SPRINT 5
Reporting / Audit / Notifications
  ↓
Billing / Entitlements / Usage
  ↓
Integrations / Enterprise
```

---

# Definition of Done por sprint

Un sprint funcional se considera completado únicamente cuando:

1. Las Historias de Usuario necesarias para su flujo principal cumplen sus criterios de aceptación.
2. Frontend y backend están integrados cuando la HU requiere ambos.
3. El tenant scope y RBAC se validan en toda funcionalidad tenant-scoped.
4. Existen pruebas automatizadas en los puntos críticos definidos por cada HU.
5. Los procesos pesados utilizan o están correctamente integrados con Jobs cuando corresponde.
6. OpenSpec está implementado, actualizado y archivado cuando el cambio lo requiere.
7. Los contratos HTTP y la documentación relevante coinciden con la implementación real.
8. No se depende de UUIDs conocidos como mecanismo de autorización.
9. Los errores relevantes son trazables y útiles para el usuario o desarrollador.
10. El flujo principal del sprint puede demostrarse de punta a punta.

---

# Demos funcionales obligatorias

Cada sprint debe cerrar con una demo que demuestre su capacidad principal.

## Demo Sprint 1 — Ingest

> **“Dame tu sistema legacy.”**

Un usuario crea el contexto de trabajo, conecta código y LegacyLift obtiene un snapshot reproducible.

## Demo Sprint 2 — Understand

> **“Te explico qué tienes y cómo funciona.”**

LegacyLift analiza el snapshot y produce conocimiento, evidencia, assessment y recomendaciones.

## Demo Sprint 3 — Plan & Prepare

> **“Definimos cómo modernizarlo antes de tocarlo.”**

LegacyLift convierte evidencia en un plan aprobado, waves, target architecture, baseline y tests.

## Demo Sprint 4 — Modernize Safely

> **“Lo transformo y demuestro que sigue siendo confiable.”**

LegacyLift ejecuta la migración, muestra el diff, valida el resultado, compara comportamiento y permite aprobar, desplegar o revertir.

## Demo Sprint 5 — Productize

> **“Operamos LegacyLift como una plataforma real.”**

El producto incorpora reporting, auditoría, notificaciones, billing, entitlements, integraciones y capacidades Enterprise.

---

# Relación con las cuatro preguntas de LegacyLift

Los sprints mantienen la estructura conceptual del producto.

## ¿Qué tengo?

Principalmente Sprint 1 y Sprint 2.

```text
Source
→ Snapshot
→ Discovery
→ Inventory
```

## ¿Cómo funciona?

Principalmente Sprint 2.

```text
Findings
→ Knowledge Graph
→ Business Rules
→ Processes
```

## ¿Cómo debería modernizarlo?

Principalmente Sprint 2 y Sprint 3.

```text
Assessment
→ Recommendations
→ Modernization Plan
→ Architecture
→ Migration Waves
```

## ¿Cómo sé que la modernización es confiable?

Principalmente Sprint 3 y Sprint 4.

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

# Regla final

LegacyLift se desarrollará siguiendo estos cinco incrementos funcionales:

```text
1. INGEST
2. UNDERSTAND
3. PLAN & PREPARE
4. MODERNIZE SAFELY
5. PRODUCTIZE
```

Cada incremento debe preservar la arquitectura multi-tenant, la trazabilidad, la evidencia y el control humano definidos por el backlog maestro.

LegacyLift no evolucionará como una colección de conversores aislados.

Debe evolucionar como una:

> **AI-assisted, verification-driven software modernization platform.**

Los Migration Packs aportan conocimiento especializado.

El core aporta identidad, multi-tenancy, proyectos, source, snapshots, análisis, knowledge, assessment, planning, IA, jobs, migration, validation, approvals, audit y reporting.

> **Understand first. Modernize safely.**
