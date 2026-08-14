import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is required to seed the database.');
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

const permissions = [
  ['organization.read', 'Ver la organización activa y su configuración básica.'],
  ['organization.manage', 'Modificar la configuración de la organización.'],
  ['members.read', 'Ver miembros, roles y accesos de la organización.'],
  ['members.manage', 'Invitar, suspender y administrar miembros y roles.'],
  ['projects.read', 'Ver proyectos a los que el miembro tiene acceso.'],
  ['projects.create', 'Crear proyectos dentro de la organización activa.'],
  ['projects.manage', 'Modificar proyectos y su configuración.'],
  ['projects.delete', 'Archivar o eliminar lógicamente proyectos.'],
  ['systems.read', 'Ver sistemas legados y aplicaciones descubiertas.'],
  ['systems.manage', 'Crear y modificar sistemas, entornos y metadatos.'],
  ['source.read', 'Ver repositorios, snapshots y metadatos de código fuente.'],
  ['source.connect', 'Configurar conexiones Git, SFTP, mainframe u otras fuentes.'],
  ['source.import', 'Ejecutar importaciones, scans y creación de snapshots.'],
  ['analysis.read', 'Ver findings, métricas y assessments.'],
  ['analysis.run', 'Ejecutar análisis y discovery.'],
  ['knowledge.read', 'Consultar el knowledge graph, reglas y procesos de negocio.'],
  ['knowledge.review', 'Revisar y aprobar conocimiento extraído.'],
  ['modernization.read', 'Ver recomendaciones, arquitecturas y planes.'],
  ['modernization.manage', 'Crear y modificar planes y waves de modernización.'],
  ['modernization.approve', 'Aprobar planes y decisiones de modernización.'],
  ['migrations.read', 'Ver ejecuciones, unidades y cambios de migración.'],
  ['migrations.run', 'Ejecutar migraciones asistidas.'],
  ['migrations.approve', 'Aprobar o rechazar resultados de migración.'],
  ['migrations.rollback', 'Ejecutar rollback de una migración.'],
  ['validation.read', 'Ver baselines, pruebas y comparaciones de comportamiento.'],
  ['validation.run', 'Ejecutar pruebas y validaciones.'],
  ['reports.read', 'Consultar reportes generados.'],
  ['reports.generate', 'Generar reportes de análisis, migración y validación.'],
  ['billing.read', 'Ver plan, límites y consumo.'],
  ['billing.manage', 'Administrar suscripción y configuración de facturación.'],
  ['integrations.read', 'Ver integraciones configuradas.'],
  ['integrations.manage', 'Crear, actualizar o revocar integraciones.'],
  ['api_keys.manage', 'Crear y revocar API keys.'],
  ['audit.read', 'Consultar auditoría y eventos de seguridad.'],
] as const;

const features = [
  { key: 'projects.max', name: 'Máximo de proyectos', valueType: 'INTEGER' as const },
  { key: 'members.max', name: 'Máximo de miembros', valueType: 'INTEGER' as const },
  { key: 'source.loc.max', name: 'Máximo de líneas de código por proyecto', valueType: 'INTEGER' as const },
  { key: 'source.storage_gb.max', name: 'Almacenamiento incluido (GB)', valueType: 'DECIMAL' as const },
  { key: 'analysis.enabled', name: 'Discovery y análisis', valueType: 'BOOLEAN' as const },
  { key: 'modernization.enabled', name: 'Planificación de modernización', valueType: 'BOOLEAN' as const },
  { key: 'migration.enabled', name: 'Motor de migración', valueType: 'BOOLEAN' as const },
  { key: 'migration.node.enabled', name: 'Migration Pack Node.js', valueType: 'BOOLEAN' as const },
  { key: 'migration.cobol.enabled', name: 'Migration Pack COBOL', valueType: 'BOOLEAN' as const },
  { key: 'validation.dual_run.enabled', name: 'Validación Dual Run', valueType: 'BOOLEAN' as const },
  { key: 'git.integration.enabled', name: 'Integración Git', valueType: 'BOOLEAN' as const },
  { key: 'ai.local.enabled', name: 'IA privada/local', valueType: 'BOOLEAN' as const },
  { key: 'reports.advanced.enabled', name: 'Reportes avanzados', valueType: 'BOOLEAN' as const },
  { key: 'api_keys.enabled', name: 'API keys', valueType: 'BOOLEAN' as const },
  { key: 'audit.enabled', name: 'Auditoría avanzada', valueType: 'BOOLEAN' as const },
  { key: 'on_premise.enabled', name: 'Despliegue on-premise', valueType: 'BOOLEAN' as const },
] as const;

type EntitlementSeed = {
  enabled: boolean;
  integerLimit?: bigint;
  decimalLimit?: number;
};

const planDefinitions: Array<{
  code: string;
  name: string;
  description: string;
  sortOrder: number;
  entitlements: Record<string, EntitlementSeed>;
}> = [
  {
    code: 'DEVELOPER',
    name: 'Developer',
    description: 'Para desarrolladores individuales y evaluaciones técnicas pequeñas.',
    sortOrder: 10,
    entitlements: {
      'projects.max': { enabled: true, integerLimit: 3n },
      'members.max': { enabled: true, integerLimit: 1n },
      'source.loc.max': { enabled: true, integerLimit: 250_000n },
      'source.storage_gb.max': { enabled: true, decimalLimit: 5 },
      'analysis.enabled': { enabled: true },
      'modernization.enabled': { enabled: true },
      'migration.enabled': { enabled: true },
      'migration.node.enabled': { enabled: true },
      'migration.cobol.enabled': { enabled: false },
      'validation.dual_run.enabled': { enabled: false },
      'git.integration.enabled': { enabled: true },
      'ai.local.enabled': { enabled: true },
      'reports.advanced.enabled': { enabled: false },
      'api_keys.enabled': { enabled: false },
      'audit.enabled': { enabled: false },
      'on_premise.enabled': { enabled: false },
    },
  },
  {
    code: 'TEAM',
    name: 'Team',
    description: 'Para equipos que modernizan múltiples proyectos de forma colaborativa.',
    sortOrder: 20,
    entitlements: {
      'projects.max': { enabled: true, integerLimit: 20n },
      'members.max': { enabled: true, integerLimit: 15n },
      'source.loc.max': { enabled: true, integerLimit: 2_000_000n },
      'source.storage_gb.max': { enabled: true, decimalLimit: 50 },
      'analysis.enabled': { enabled: true },
      'modernization.enabled': { enabled: true },
      'migration.enabled': { enabled: true },
      'migration.node.enabled': { enabled: true },
      'migration.cobol.enabled': { enabled: false },
      'validation.dual_run.enabled': { enabled: true },
      'git.integration.enabled': { enabled: true },
      'ai.local.enabled': { enabled: true },
      'reports.advanced.enabled': { enabled: true },
      'api_keys.enabled': { enabled: true },
      'audit.enabled': { enabled: true },
      'on_premise.enabled': { enabled: false },
    },
  },
  {
    code: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'Para modernización de sistemas críticos, mainframe y despliegues privados.',
    sortOrder: 30,
    entitlements: {
      'projects.max': { enabled: true },
      'members.max': { enabled: true },
      'source.loc.max': { enabled: true },
      'source.storage_gb.max': { enabled: true },
      'analysis.enabled': { enabled: true },
      'modernization.enabled': { enabled: true },
      'migration.enabled': { enabled: true },
      'migration.node.enabled': { enabled: true },
      'migration.cobol.enabled': { enabled: true },
      'validation.dual_run.enabled': { enabled: true },
      'git.integration.enabled': { enabled: true },
      'ai.local.enabled': { enabled: true },
      'reports.advanced.enabled': { enabled: true },
      'api_keys.enabled': { enabled: true },
      'audit.enabled': { enabled: true },
      'on_premise.enabled': { enabled: true },
    },
  },
];

const technologies = [
  ['cobol', 'COBOL', 'LANGUAGE', 'IBM'],
  ['jcl', 'JCL', 'MAINFRAME', 'IBM'],
  ['cics', 'CICS', 'MAINFRAME', 'IBM'],
  ['db2', 'DB2', 'DATABASE', 'IBM'],
  ['vsam', 'VSAM', 'MAINFRAME', 'IBM'],
  ['java', 'Java', 'LANGUAGE', 'Oracle'],
  ['spring', 'Spring', 'FRAMEWORK', 'VMware'],
  ['javascript', 'JavaScript', 'LANGUAGE', null],
  ['typescript', 'TypeScript', 'LANGUAGE', 'Microsoft'],
  ['nodejs', 'Node.js', 'RUNTIME', 'OpenJS Foundation'],
  ['express', 'Express', 'FRAMEWORK', 'OpenJS Foundation'],
  ['nestjs', 'NestJS', 'FRAMEWORK', 'NestJS'],
  ['postgresql', 'PostgreSQL', 'DATABASE', 'PostgreSQL Global Development Group'],
  ['dotnet', '.NET', 'RUNTIME', 'Microsoft'],
  ['csharp', 'C#', 'LANGUAGE', 'Microsoft'],
] as const;

const analysisRules = [
  {
    key: 'dependency.outdated',
    name: 'Dependencia desactualizada',
    category: 'DEPENDENCY' as const,
    severity: 'MEDIUM' as const,
    description: 'Detecta dependencias con una versión estable más reciente.',
  },
  {
    key: 'dependency.deprecated',
    name: 'Dependencia deprecada o sin soporte',
    category: 'DEPENDENCY' as const,
    severity: 'HIGH' as const,
    description: 'Detecta dependencias deprecadas o fuera de soporte.',
  },
  {
    key: 'security.known-vulnerability',
    name: 'Vulnerabilidad conocida',
    category: 'SECURITY' as const,
    severity: 'HIGH' as const,
    description: 'Detecta dependencias o componentes asociados a advisories conocidos.',
  },
  {
    key: 'complexity.high',
    name: 'Complejidad elevada',
    category: 'COMPLEXITY' as const,
    severity: 'MEDIUM' as const,
    description: 'Marca unidades de código cuya complejidad supera el umbral configurado.',
  },
  {
    key: 'testability.low-coverage',
    name: 'Cobertura de pruebas insuficiente',
    category: 'TESTABILITY' as const,
    severity: 'HIGH' as const,
    description: 'Detecta módulos críticos con cobertura insuficiente para una migración segura.',
  },
  {
    key: 'architecture.cyclic-dependency',
    name: 'Dependencia cíclica',
    category: 'ARCHITECTURE' as const,
    severity: 'HIGH' as const,
    description: 'Detecta ciclos relevantes entre módulos o componentes.',
  },
] as const;

async function seedPermissions(): Promise<void> {
  for (const [key, description] of permissions) {
    await prisma.permission.upsert({
      where: { key },
      update: { description },
      create: { key, description },
    });
  }
}

async function seedBilling(): Promise<void> {
  const featureByKey = new Map<string, string>();

  for (const feature of features) {
    const saved = await prisma.feature.upsert({
      where: { key: feature.key },
      update: {
        name: feature.name,
        valueType: feature.valueType,
      },
      create: feature,
    });
    featureByKey.set(feature.key, saved.id);
  }

  for (const definition of planDefinitions) {
    const plan = await prisma.billingPlan.upsert({
      where: { code: definition.code },
      update: {
        name: definition.name,
        description: definition.description,
        sortOrder: definition.sortOrder,
        isActive: true,
      },
      create: {
        code: definition.code,
        name: definition.name,
        description: definition.description,
        sortOrder: definition.sortOrder,
        isPublic: definition.code !== 'ENTERPRISE',
      },
    });

    for (const [featureKey, entitlement] of Object.entries(
      definition.entitlements,
    )) {
      const featureId = featureByKey.get(featureKey);
      if (!featureId) {
        throw new Error(`Feature ${featureKey} was not seeded.`);
      }

      await prisma.planEntitlement.upsert({
        where: {
          planId_featureId: {
            planId: plan.id,
            featureId,
          },
        },
        update: {
          enabled: entitlement.enabled,
          integerLimit: entitlement.integerLimit,
          decimalLimit: entitlement.decimalLimit,
        },
        create: {
          planId: plan.id,
          featureId,
          enabled: entitlement.enabled,
          integerLimit: entitlement.integerLimit,
          decimalLimit: entitlement.decimalLimit,
        },
      });
    }
  }
}

async function seedMethodology(): Promise<void> {
  await prisma.assessmentMethodology.upsert({
    where: {
      key_version: {
        key: 'legacy-modernization',
        version: '1.0.0',
      },
    },
    update: {
      name: 'LegacyLift Modernization Assessment',
      description:
        'Metodología base para deuda técnica, readiness, complejidad, riesgo y conocimiento recuperado.',
      weights: {
        dependencies: 0.2,
        maintainability: 0.2,
        architecture: 0.2,
        testability: 0.2,
        security: 0.1,
        knowledgeCoverage: 0.1,
      },
      isActive: true,
    },
    create: {
      key: 'legacy-modernization',
      version: '1.0.0',
      name: 'LegacyLift Modernization Assessment',
      description:
        'Metodología base para deuda técnica, readiness, complejidad, riesgo y conocimiento recuperado.',
      weights: {
        dependencies: 0.2,
        maintainability: 0.2,
        architecture: 0.2,
        testability: 0.2,
        security: 0.1,
        knowledgeCoverage: 0.1,
      },
      isActive: true,
    },
  });
}

async function seedAnalysisRules(): Promise<void> {
  for (const rule of analysisRules) {
    await prisma.analysisRule.upsert({
      where: {
        key_version: {
          key: rule.key,
          version: '1.0.0',
        },
      },
      update: {
        name: rule.name,
        category: rule.category,
        defaultSeverity: rule.severity,
        description: rule.description,
        isActive: true,
      },
      create: {
        key: rule.key,
        version: '1.0.0',
        name: rule.name,
        category: rule.category,
        defaultSeverity: rule.severity,
        description: rule.description,
      },
    });
  }
}

async function seedTechnologies(): Promise<void> {
  for (const [key, name, kind, vendor] of technologies) {
    await prisma.technology.upsert({
      where: { key },
      update: { name, kind, vendor },
      create: { key, name, kind, vendor },
    });
  }
}

async function seedMigrationPacks(): Promise<void> {
  const packs = [
    {
      code: 'NODE_EXPRESS_TO_NESTJS',
      name: 'Express JavaScript → NestJS TypeScript',
      description:
        'Pack para analizar y modernizar APIs Express/JavaScript hacia NestJS/TypeScript de forma progresiva.',
      sourceSelectors: {
        languages: ['javascript'],
        frameworks: ['express'],
      },
      targetOptions: {
        language: 'typescript',
        framework: 'nestjs',
        strict: true,
      },
    },
    {
      code: 'COBOL_TO_JAVA',
      name: 'COBOL → Java',
      description:
        'Pack de modernización mainframe orientado a discovery, extracción de reglas y transformación progresiva hacia Java.',
      sourceSelectors: {
        languages: ['cobol'],
        relatedArtifacts: ['jcl', 'copybook', 'cics', 'db2'],
      },
      targetOptions: {
        language: 'java',
        framework: 'spring',
      },
    },
  ];

  for (const pack of packs) {
    await prisma.migrationPack.upsert({
      where: { code: pack.code },
      update: {
        name: pack.name,
        description: pack.description,
        sourceSelectors: pack.sourceSelectors,
        targetOptions: pack.targetOptions,
      },
      create: {
        ...pack,
        status: 'DRAFT',
      },
    });
  }
}

async function seedPromptTemplates(): Promise<void> {
  const prompts = [
    {
      scopeKey: 'SYSTEM',
      key: 'code-understanding',
      version: '1.0.0',
      name: 'Comprensión de código legado',
      purpose: 'CODE_UNDERSTANDING' as const,
      systemPrompt:
        'Analiza el contexto suministrado sin inventar dependencias ni reglas. Distingue evidencia estática, inferencias y aspectos que requieren revisión humana.',
      userTemplate:
        'Explica la responsabilidad del artefacto, sus dependencias relevantes, entradas, salidas y riesgos de modificación usando únicamente el contexto suministrado.',
    },
    {
      scopeKey: 'SYSTEM',
      key: 'modernization-plan',
      version: '1.0.0',
      name: 'Plan de modernización',
      purpose: 'MODERNIZATION_PLAN' as const,
      systemPrompt:
        'Propón modernización progresiva priorizando reducción de riesgo, preservación de comportamiento y evidencia verificable.',
      userTemplate:
        'Genera una propuesta de modernización a partir del assessment, dependencias, reglas de negocio y restricciones suministradas.',
    },
  ];

  for (const prompt of prompts) {
    await prisma.promptTemplate.upsert({
      where: {
        scopeKey_key_version: {
          scopeKey: prompt.scopeKey,
          key: prompt.key,
          version: prompt.version,
        },
      },
      update: {
        name: prompt.name,
        purpose: prompt.purpose,
        systemPrompt: prompt.systemPrompt,
        userTemplate: prompt.userTemplate,
        isActive: true,
      },
      create: {
        organizationId: null,
        ...prompt,
      },
    });
  }
}

async function main(): Promise<void> {
  await seedPermissions();
  await seedBilling();
  await seedMethodology();
  await seedAnalysisRules();
  await seedTechnologies();
  await seedMigrationPacks();
  await seedPromptTemplates();

  console.log('LegacyLift seed completed successfully.');
}

main()
  .catch((error: unknown) => {
    console.error('LegacyLift seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
