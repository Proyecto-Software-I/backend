# LegacyLift AI

> **Understand first. Modernize safely.**

LegacyLift AI es una plataforma de modernización de software legado asistida por inteligencia artificial, diseñada para ayudar a organizaciones y equipos de ingeniería a **comprender, planificar, transformar y verificar** sistemas existentes de forma progresiva y segura.

La idea central del producto no es simplemente convertir código de una tecnología a otra. LegacyLift busca reducir el riesgo de modernización reconstruyendo primero el conocimiento del sistema, proponiendo estrategias adecuadas para cada parte y validando que el comportamiento esperado se conserve durante la migración.

---

## 1. Problema

Muchas organizaciones dependen de sistemas legacy que siguen siendo críticos para el negocio, pero que presentan problemas como:

- documentación incompleta o desactualizada;
- arquitectura difícil de comprender;
- dependencias antiguas o poco visibles;
- reglas de negocio ocultas dentro del código;
- conocimiento concentrado en pocas personas;
- tecnologías con pocos especialistas disponibles;
- alto costo de mantenimiento;
- miedo a modificar componentes críticos;
- migraciones manuales costosas y difíciles de validar;
- dificultad para saber qué debe migrarse, qué debe mantenerse y qué debe retirarse.

Una reescritura completa suele ser demasiado arriesgada. Una conversión automática de código, por sí sola, tampoco resuelve el problema porque no garantiza que el nuevo sistema conserve el comportamiento, las reglas de negocio o las restricciones del sistema original.

LegacyLift parte de una premisa:

> **Antes de modernizar un sistema, hay que entenderlo.**

---

## 2. Visión

LegacyLift busca convertirse en una plataforma de modernización asistida que permita recorrer todo el ciclo:

```text
DISCOVER
   ↓
UNDERSTAND
   ↓
ASSESS
   ↓
PLAN
   ↓
MODERNIZE
   ↓
VERIFY
```

La plataforma debe ayudar a pasar de un sistema legacy difícil de comprender a una arquitectura moderna mediante cambios progresivos, trazables y verificables.

---

## 3. Principios del producto

### Understand first

No transformar código sin entender primero su estructura, dependencias y comportamiento.

### Progressive modernization

Evitar asumir que todo sistema debe ser reescrito. Diferentes componentes pueden necesitar estrategias distintas.

### Verification-driven modernization

Cada transformación debe poder validarse mediante evidencia: compilación, lint, tests, comparación de comportamiento, análisis de resultados y otras verificaciones.

### Human in the loop

La IA propone, analiza y transforma, pero las decisiones importantes deben poder ser revisadas y aprobadas por personas.

### Traceability

Las recomendaciones, cambios, validaciones y resultados deben quedar vinculados al sistema, snapshot, migración y organización correspondiente.

### Technology agnostic core

El núcleo de LegacyLift no debe depender de un único lenguaje o framework.

Las capacidades específicas deben ampliarse mediante **Migration Packs**.

### Private AI first

El producto debe poder trabajar con modelos privados o locales cuando el código y los datos sean sensibles.

---

# 4. Flujo principal de LegacyLift

## 4.1 Discover

La primera etapa inspecciona el sistema legado y construye un inventario técnico.

Puede descubrir:

- lenguajes;
- frameworks;
- estructura de carpetas;
- módulos;
- archivos;
- dependencias;
- librerías;
- bases de datos;
- servicios;
- APIs;
- jobs;
- configuraciones;
- tecnologías utilizadas;
- relaciones entre componentes.

El objetivo inicial es responder:

> **¿Qué existe realmente en este sistema?**

---

## 4.2 Understand

Una vez descubierto el sistema, LegacyLift intenta reconstruir su conocimiento.

Esto incluye:

- arquitectura;
- dependencias entre módulos;
- relaciones entre aplicaciones;
- procesos;
- reglas de negocio;
- flujos;
- entidades;
- datos;
- integraciones externas;
- responsabilidades de cada componente.

Este conocimiento puede representarse mediante un **Knowledge Graph**.

La plataforma debe normalizar información proveniente de diferentes tecnologías mediante una representación intermedia común.

Esto permite que un sistema COBOL, Java, .NET o Node.js pueda analizarse bajo conceptos equivalentes.

---

## 4.3 Assess

LegacyLift analiza el estado del sistema y genera una evaluación de modernización.

Algunos aspectos:

- deuda técnica;
- complejidad;
- dependencias obsoletas;
- criticidad;
- riesgos;
- mantenibilidad;
- testabilidad;
- acoplamiento;
- readiness para modernización.

El objetivo no es generar únicamente un score, sino producir evidencia que ayude a decidir qué estrategia aplicar.

---

## 4.4 Plan

La plataforma genera un **Modernization Blueprint**.

Cada parte del sistema puede recibir una estrategia diferente.

Estrategias posibles:

```text
Keep
Stabilize
Encapsulate
Rehost
Replatform
Refactor
Rearchitect
Rewrite
Replace
Retire
```

LegacyLift debe ayudar a organizar esas decisiones en **Migration Waves**.

Ejemplo:

```text
Wave 1
├── estabilizar módulo de autenticación
├── encapsular API legacy
└── crear baseline de comportamiento

Wave 2
├── migrar servicio A
├── refactorizar servicio B
└── mantener módulo C

Wave 3
└── retirar componente legacy
```

La planificación debe considerar dependencias y riesgos para evitar migraciones tipo "big bang".

---

## 4.5 Modernize

Una vez aprobado el plan, LegacyLift puede ejecutar transformaciones asistidas por IA.

Estas transformaciones estarán encapsuladas principalmente mediante **Migration Packs**.

Ejemplos futuros:

```text
COBOL → Java
Express.js → NestJS
Java legacy → arquitectura moderna
.NET legacy → .NET moderno
```

Un Migration Pack puede incluir:

- detectores;
- analizadores;
- reglas;
- prompts;
- transformaciones;
- validadores;
- recomendaciones;
- tests específicos para una tecnología.

El core de LegacyLift se mantiene independiente de cada lenguaje.

---

## 4.6 Verify

La migración no termina cuando el nuevo código compila.

LegacyLift debe verificar que el sistema modernizado conserve el comportamiento requerido.

Algunas verificaciones:

- compilación;
- lint;
- tests;
- tests generados;
- comparación de respuestas;
- comparación de outputs;
- behavioral baseline;
- dual run;
- análisis de divergencias;
- revisión humana.

La plataforma puede consolidar estas señales en un:

## Migration Confidence Score

Este score representa el nivel de confianza alcanzado para una migración basándose en evidencia disponible.

No debe considerarse una garantía automática, sino una herramienta de decisión.

---

# 5. Behavioral Baseline

Antes de transformar una unidad de software, LegacyLift puede capturar una línea base de comportamiento.

Ejemplos:

- entradas y salidas;
- respuestas HTTP;
- transformaciones de datos;
- resultados de procesos;
- queries;
- side effects;
- reglas observadas;
- tests existentes.

Después de la migración, el sistema moderno puede compararse contra esa línea base.

```text
Legacy System
      ↓
Behavioral Baseline
      ↓
Migration
      ↓
Modern System
      ↓
Behavior Comparison
```

Esto ayuda a detectar cambios inesperados incluso cuando el código nuevo parece correcto.

---

# 6. Knowledge Graph e Intermediate Representation

LegacyLift debe construir una representación tecnológica neutral del sistema.

Ejemplo conceptual:

```text
System
├── Applications
├── Modules
├── Services
├── Programs
├── APIs
├── Databases
├── Tables
├── Jobs
├── Business Rules
└── Dependencies
```

Relaciones posibles:

```text
CALLS
DEPENDS_ON
READS
WRITES
IMPLEMENTS
USES
TRIGGERS
BELONGS_TO
```

Esta capa es fundamental para que las funcionalidades superiores puedan trabajar con diferentes stacks sin depender directamente del código fuente original.

---

# 7. Migration Packs

Los Migration Packs son la principal extensión tecnológica de LegacyLift.

El core se encarga de:

- proyectos;
- sistemas;
- snapshots;
- análisis;
- conocimiento;
- planificación;
- IA;
- ejecución;
- validación;
- auditoría.

Los Migration Packs incorporan conocimiento especializado.

Ejemplo:

```text
Migration Pack
└── Express.js → NestJS
    ├── detection rules
    ├── architecture mapping
    ├── transformation rules
    ├── prompts
    ├── validators
    └── recommended tests
```

Esto permite ampliar LegacyLift sin convertir el núcleo en una colección rígida de migradores.

---

# 8. Inteligencia artificial

La IA es un componente importante, pero no debe ser el sistema completo.

LegacyLift debe utilizar IA para tareas donde aporte valor, por ejemplo:

- explicar código;
- detectar intención;
- extraer reglas de negocio;
- generar documentación;
- recomendar estrategias;
- generar tests;
- apoyar transformaciones;
- analizar diferencias;
- producir resúmenes ejecutivos.

El backend debe trabajar contra una abstracción de proveedor de IA.

Proveedor inicial:

```text
Ollama
```

El diseño debe permitir incorporar posteriormente:

- vLLM;
- proveedores privados;
- modelos alojados;
- proveedores externos autorizados.

El sistema debe registrar ejecuciones de IA, modelos, prompts, resultados y contexto relevante para mantener trazabilidad.

---

# 9. Seguridad y privacidad

LegacyLift está pensado para trabajar potencialmente con código crítico y propiedad intelectual sensible.

Principios:

- aislamiento por organización;
- procesamiento privado cuando sea necesario;
- posibilidad de IA local;
- almacenamiento controlado;
- secretos protegidos;
- trazabilidad;
- auditoría;
- autorización estricta;
- posibilidad futura de despliegues privados/on-premise.

No se deben afirmar certificaciones o cumplimiento normativo hasta que realmente existan.

---

# 10. Multi-tenancy

LegacyLift es multi-tenant.

La frontera principal del tenant es:

```text
Organization
```

Un usuario puede pertenecer a varias organizaciones mediante:

```text
User
  ↓
OrganizationMembership
  ↓
Organization
```

Los roles organizacionales se asignan a memberships.

Regla fundamental:

> **Nunca autorizar un recurso tenant-scoped únicamente porque el cliente conoce su UUID.**

Toda operación debe validar que el usuario autenticado tenga una membership activa en la organización correspondiente.

Flujo conceptual:

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

---

# 11. Autenticación inicial

La primera versión de Auth incluye:

- registro;
- login;
- logout;
- refresh;
- sesión actual;
- selección de organización cuando exista ambigüedad.

Posteriormente podrán agregarse:

- verificación de email;
- recuperación de contraseña;
- invitaciones;
- MFA;
- OAuth;
- SAML/OIDC;
- SSO empresarial.

---

## Registro

Durante el registro:

```text
User
  ↓
Organization
  ↓
OrganizationMembership
  ↓
OWNER
```

El usuario crea su primera organización y queda automáticamente dentro de ella.

Flujo:

```text
Register
   ↓
Organization creada
   ↓
Tenant activo
   ↓
Aplicación
```

No existe selector de organización después del registro.

---

## Login

### Usuario con una organización

```text
Login
  ↓
1 organización activa
  ↓
Backend selecciona el tenant
  ↓
Aplicación
```

No debe existir una pantalla intermedia.

### Usuario con múltiples organizaciones

```text
Login
  ↓
2+ organizaciones
  ↓
Selector de organización
  ↓
Tenant activo
  ↓
Aplicación
```

El selector solo existe para resolver ambigüedad.

En una etapa posterior puede guardarse la última organización utilizada y añadir un Organization Switcher dentro de la aplicación.

---

# 12. Arquitectura general

Arquitectura prevista:

```text
┌─────────────────────────┐
│       Next.js UI        │
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│      NestJS Backend     │
│  API + Orchestration    │
└──────┬──────────┬───────┘
       │          │
       ▼          ▼
 PostgreSQL     Workers
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
      Analysis    AI    Validation
          │
          ▼
     Object Storage
```

---

## Frontend

Tecnología principal:

```text
Next.js
TypeScript
shadcn/ui
```

Responsabilidades:

- experiencia de usuario;
- visualización de resultados;
- dashboards;
- mapas;
- diff;
- navegación;
- interacción con planes y migraciones.

---

## Backend

Tecnología principal:

```text
NestJS
TypeScript
Prisma
PostgreSQL
```

Responsabilidades:

- API;
- autenticación;
- autorización;
- multi-tenancy;
- proyectos;
- metadata;
- orquestación;
- planificación;
- IA;
- jobs;
- reporting;
- auditoría.

NestJS debe **orquestar** trabajos pesados, no ejecutarlos todos dentro del proceso HTTP.

---

## Workers

Los análisis pesados y transformaciones deben ejecutarse fuera del request HTTP.

Ejemplos:

- parsing;
- dependency analysis;
- static analysis;
- generación IA;
- migraciones;
- validaciones;
- comparación de comportamiento.

Tecnologías específicas podrán utilizar workers especializados, incluyendo Python cuando resulte conveniente.

---

## Base de datos

PostgreSQL almacena principalmente:

- usuarios;
- organizaciones;
- roles;
- permisos;
- proyectos;
- sistemas;
- repositorios;
- metadata de archivos;
- análisis;
- findings;
- knowledge graph;
- planes;
- migraciones;
- validaciones;
- ejecuciones de IA;
- jobs;
- auditoría.

Los archivos de código y artefactos pesados no deben depender exclusivamente de PostgreSQL.

---

## Object Storage

En una etapa posterior se utilizará almacenamiento compatible con S3, por ejemplo:

```text
S3
MinIO
```

para:

- snapshots;
- código;
- archivos;
- reportes;
- resultados;
- artefactos de migración.

---

## Jobs

Cuando las funcionalidades lo requieran, se prevé incorporar:

```text
BullMQ
Redis
```

No deben agregarse antes de que exista una necesidad funcional concreta.

---

# 13. Entidades principales del dominio

El esquema actual contempla áreas como:

## Identity & tenancy

- User
- UserCredential
- UserSession
- Organization
- OrganizationMembership
- Role
- Permission
- ProjectAccess

## Billing

- Plan
- Feature
- PlanEntitlement
- Subscription
- Usage

## Projects & source

- Project
- LegacySystem
- Repository
- SourceSnapshot
- SourceFile
- Scanner

## Analysis

- Analysis
- Finding
- Assessment
- Technical metrics

## Knowledge

- Knowledge Graph
- Domains
- Business Rules
- Processes
- Relationships

## Modernization

- Modernization Plan
- Architecture
- Migration Wave
- Migration Pack

## Migration & validation

- Baselines
- Tests
- Migrations
- Validation
- Dual Run
- Approvals
- Rollback
- Deployment

## AI

- Providers
- Models
- Runs
- Prompt Templates

## Operations

- Jobs
- Workers
- Reports
- Notifications
- Audit
- Security

---

# 14. Flujo de usuario inicial

El primer recorrido vertical que debe existir antes de profundizar en IA o billing es:

```text
Landing
   ↓
Register / Login
   ↓
Organization
   ↓
Dashboard
   ↓
Create Project
   ↓
Register Legacy System
   ↓
Add Source
   ↓
Discovery
   ↓
Results
```

Después se extiende hacia:

```text
Discovery
   ↓
Knowledge
   ↓
Assessment
   ↓
Modernization Plan
   ↓
Migration
   ↓
Validation
```

---

# 15. Roadmap funcional

Orden recomendado de implementación.

## Fase 1 — Foundation

1. Auth + Organizations + RBAC.
2. Landing Page.
3. Frontend Auth.
4. App Shell + Organization Context.

## Fase 2 — Systems

5. Projects.
6. Legacy Systems.
7. Source Ingestion.

## Fase 3 — Understanding

8. Discovery Engine.
9. Analysis + Findings.
10. Knowledge Graph.
11. Assessment + Technical Debt.

## Fase 4 — Planning

12. Modernization Planning.
13. Migration Waves.
14. Architecture recommendations.

## Fase 5 — AI

15. AI provider abstraction.
16. Local/private AI integration.
17. AI-assisted understanding and planning.

## Fase 6 — Migration

18. Migration Engine.
19. Migration Packs.
20. Generated transformations.

## Fase 7 — Verification

21. Behavioral Baseline.
22. Validation.
23. Dual Run.
24. Migration Confidence Score.
25. Approval / rollback / deployment.

## Fase 8 — Commercial capabilities

26. Billing.
27. Entitlements.
28. Usage limits.
29. Enterprise capabilities.

---

# 16. Primer alcance comercial

Aunque LegacyLift puede llegar a organizaciones como:

- bancos;
- aseguradoras;
- gobierno;
- telecomunicaciones;
- industria;
- retail;
- logística;
- grandes empresas con Java/.NET/PHP/Node legacy;

un posible primer segmento comercial son:

> **consultoras y system integrators que ya realizan proyectos de modernización para terceros.**

Esto puede reducir la barrera inicial frente a intentar que una organización altamente regulada entregue directamente su core a una plataforma nueva.

---

# 17. Planes previstos

El modelo contempla inicialmente:

```text
Developer
Team
Enterprise
```

Los planes pueden limitar o habilitar capacidades mediante features y entitlements.

Billing no es parte del primer flujo funcional y debe implementarse después de validar el núcleo del producto.

---

# 18. Desarrollo mediante OpenSpec

Las funcionalidades sustanciales deben diseñarse mediante OpenSpec antes de implementarse.

Flujo esperado:

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

OpenSpec es especialmente importante para cambios relacionados con:

- autenticación;
- base de datos;
- multi-tenancy;
- seguridad;
- arquitectura;
- contratos API;
- IA;
- billing;
- funcionalidades grandes.

Cambios pequeños no deberían convertirse en burocracia innecesaria.

---

# 19. Principios de desarrollo

## No sobreconstruir

Implementar únicamente la infraestructura necesaria para la siguiente capacidad real.

Ejemplos:

- no añadir Redis hasta necesitar jobs distribuidos;
- no añadir object storage hasta manejar artefactos reales;
- no implementar SAML antes del Auth básico;
- no implementar billing antes del flujo central.

## Expandir mediante migraciones

La base de datos debe crecer mediante migraciones conforme aparezcan necesidades reales.

## Contratos coordinados

Frontend y backend deben compartir contratos explícitos para evitar implementaciones incompatibles.

## Tenant safety

Toda nueva feature debe considerar el tenant desde el diseño inicial.

## Generated code is generated

Código generado por herramientas como Prisma no debe tratarse como código de negocio ni editarse manualmente.

---

# 20. Posicionamiento

LegacyLift no debe posicionarse únicamente como:

> "un convertidor de COBOL a Java"

ni como:

> "un migrador de Express a NestJS"

Es una plataforma más amplia:

> **AI-assisted, verification-driven software modernization platform.**

Los migradores específicos son capacidades conectadas al producto mediante Migration Packs.

---

# 21. Resumen

LegacyLift busca responder cuatro preguntas fundamentales durante una modernización:

### 1. ¿Qué tengo?

Discovery.

### 2. ¿Cómo funciona?

Knowledge + Analysis.

### 3. ¿Cómo debería modernizarlo?

Assessment + Modernization Planning.

### 4. ¿Cómo sé que la migración es segura?

Behavioral Baseline + Validation + Migration Confidence.

El objetivo final es permitir que organizaciones modernicen software crítico de forma progresiva, informada, trazable y verificable.

---

## LegacyLift

> **Understand first. Modernize safely.**
