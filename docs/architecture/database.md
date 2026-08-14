# Base de datos de LegacyLift AI

## Objetivo actual

El schema inicial contiene la infraestructura de datos necesaria para comenzar el desarrollo del flujo principal de LegacyLift sin implementar todavía capacidades empresariales futuras que no tienen requerimientos definidos.

## Módulos Prisma

```text
prisma/schema/
├── schema.prisma                  # generator + datasource
├── auth-tenancy.prisma            # auth base, organizaciones, RBAC, API keys e integraciones
├── billing.prisma                 # planes, precios, entitlements, suscripción y usage
├── storage.prisma                 # metadata/referencias de object storage
├── projects-source.prisma         # proyectos, sistemas, repos, snapshots y scanner
├── analysis.prisma                # análisis, findings, métricas y assessments
├── knowledge.prisma               # knowledge graph, reglas y procesos
├── modernization.prisma           # planes, arquitecturas y waves
├── migration-validation.prisma    # tests, baseline, migración, validación y deployment
├── ai.prisma                      # proveedores/modelos/prompts/runs de IA
├── jobs.prisma                    # jobs y workers
└── reporting-audit.prisma         # reportes, notificaciones y auditoría/seguridad
```

## Qué se eliminó de la fundación

Se postergaron hasta que tengan requisitos concretos:

- MFA/OAuth/SAML/OIDC;
- dominios corporativos/SSO;
- webhooks;
- facturas/pagos/refunds propios;
- licencias Enterprise offline;
- preferencias avanzadas de notificación;
- comentarios colaborativos;
- data requests/retention configurables;
- support cases.

Agregar alguno de estos componentes requerirá nueva migración y OpenSpec; no se reservan tablas vacías de antemano.

## Relaciones

Todo UUID que referencia una entidad conocida tiene FK Prisma/PostgreSQL. Solamente existen IDs deliberadamente polimórficos cuando una misma columna puede apuntar a diferentes tipos de objeto.

Excepciones actuales:

```text
AnalysisMetric.scopeType + scopeId
ModernizationRecommendation.targetType + targetId
WaveTarget.targetType + targetId
Job.subjectType + subjectId
AuditLog.entityType + entityId
TestCase.targetType + targetId
ApprovalRequest.subjectType + subjectId
```

## Storage

PostgreSQL no debe convertirse en repositorio de archivos pesados. `StorageObject` representa metadata y ubicación de:

- snapshots;
- archivos fuente;
- artefactos generados;
- diffs;
- logs grandes;
- reportes;
- evidencia de pruebas/validación.

El proveedor real de object storage se implementará cuando la feature de ingestion/storage lo requiera.

## Secrets

`SecretReference` nunca contiene el secreto. Guarda únicamente el identificador externo de un Vault/KMS/Secrets Manager futuro.

## Migraciones

Durante esta fase fundacional existe un único `init` que debe corresponder al schema actual. Después de que este baseline sea compartido por el equipo, no debe reescribirse.

Todo cambio posterior:

```bash
npm run db:migrate -- --name descripcion
```

## Catálogos y seed

El seed es idempotente y mantiene catálogos que son parte del comportamiento del producto, no datos de usuario:

- permisos;
- planes/features/entitlements;
- metodología de assessment;
- reglas base;
- tecnologías;
- Migration Packs iniciales;
- prompts base.
