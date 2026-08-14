-- LegacyLift AI initial database migration
-- Generated from prisma/schema/*.prisma after the pre-development schema cleanup.
-- Do not edit this migration after it has been shared/applied by the team.

CREATE TYPE "AIProviderType" AS ENUM ('OLLAMA', 'VLLM', 'OPENAI_COMPATIBLE', 'AZURE_OPENAI', 'ANTHROPIC', 'GOOGLE', 'CUSTOM');

CREATE TYPE "AIProviderStatus" AS ENUM ('ACTIVE', 'DISABLED', 'ERROR');

CREATE TYPE "DataPrivacyMode" AS ENUM ('LOCAL_ONLY', 'PRIVATE_TENANT', 'EXTERNAL_ALLOWED');

CREATE TYPE "AIRunPurpose" AS ENUM ('CODE_UNDERSTANDING', 'BUSINESS_RULE_EXTRACTION', 'TEST_GENERATION', 'MIGRATION', 'REFACTOR', 'EXPLANATION', 'MODERNIZATION_PLAN', 'REPORT_GENERATION', 'EMBEDDING', 'OTHER');

CREATE TYPE "AIRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELED');

CREATE TYPE "AnalysisType" AS ENUM ('FULL_DISCOVERY', 'INVENTORY', 'STATIC_ANALYSIS', 'DEPENDENCY_ANALYSIS', 'ARCHITECTURE_DISCOVERY', 'BUSINESS_RULE_EXTRACTION', 'TEST_COVERAGE', 'TECHNICAL_DEBT', 'SECURITY', 'MODERNIZATION_READINESS', 'CUSTOM');

CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'PARTIAL', 'FAILED', 'CANCELED');

CREATE TYPE "FindingCategory" AS ENUM ('TECHNICAL_DEBT', 'SECURITY', 'DEPENDENCY', 'MAINTAINABILITY', 'COMPLEXITY', 'ARCHITECTURE', 'TESTABILITY', 'PERFORMANCE', 'DATA', 'COMPLIANCE', 'MIGRATION_RISK', 'OTHER');

CREATE TYPE "FindingSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "FindingStatus" AS ENUM ('OPEN', 'ACKNOWLEDGED', 'ACCEPTED_RISK', 'RESOLVED', 'FALSE_POSITIVE');

CREATE TYPE "RecommendationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "AssessmentStatus" AS ENUM ('DRAFT', 'COMPLETED', 'SUPERSEDED');

CREATE TYPE "ModernizationStrategy" AS ENUM ('KEEP', 'STABILIZE', 'ENCAPSULATE', 'REHOST', 'REPLATFORM', 'REFACTOR', 'REARCHITECT', 'REWRITE', 'REPLACE', 'RETIRE');

CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DISABLED');

CREATE TYPE "OrganizationStatus" AS ENUM ('TRIAL', 'ACTIVE', 'PAST_DUE', 'SUSPENDED', 'CLOSED');

CREATE TYPE "DeploymentMode" AS ENUM ('SAAS', 'PRIVATE_CLOUD', 'ON_PREMISE', 'HYBRID');

CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');

CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED');

CREATE TYPE "RoleScope" AS ENUM ('ORGANIZATION', 'PROJECT');

CREATE TYPE "ApiKeyStatus" AS ENUM ('ACTIVE', 'REVOKED', 'EXPIRED');

CREATE TYPE "IntegrationProvider" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE_DEVOPS', 'CUSTOM');

CREATE TYPE "IntegrationStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISABLED');

CREATE TYPE "InstanceStatus" AS ENUM ('PROVISIONING', 'ACTIVE', 'DEGRADED', 'OFFLINE', 'RETIRED');

CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');

CREATE TYPE "FeatureValueType" AS ENUM ('BOOLEAN', 'INTEGER', 'DECIMAL', 'STRING');

CREATE TYPE "JobStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'RETRYING', 'CANCELED', 'DEAD_LETTER');

CREATE TYPE "WorkerStatus" AS ENUM ('ONLINE', 'BUSY', 'DEGRADED', 'OFFLINE', 'DRAINING');

CREATE TYPE "JobLogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

CREATE TYPE "KnowledgeNodeKind" AS ENUM ('SYSTEM', 'APPLICATION', 'MODULE', 'PROGRAM', 'CLASS', 'INTERFACE', 'FUNCTION', 'METHOD', 'PARAGRAPH', 'ENDPOINT', 'JOB', 'QUEUE', 'TOPIC', 'DATABASE', 'TABLE', 'VIEW', 'PROCEDURE', 'FILE', 'COPYBOOK', 'JCL_JOB', 'CICS_TRANSACTION', 'SCREEN', 'EXTERNAL_SYSTEM', 'API', 'BUSINESS_RULE', 'OTHER');

CREATE TYPE "KnowledgeEdgeKind" AS ENUM ('CONTAINS', 'CALLS', 'IMPORTS', 'DEPENDS_ON', 'READS', 'WRITES', 'EXECUTES', 'TRIGGERS', 'PRODUCES', 'CONSUMES', 'EXPOSES', 'IMPLEMENTS', 'INHERITS', 'USES', 'REFERENCES', 'FLOWS_TO', 'MAPS_TO', 'OTHER');

CREATE TYPE "RuleCriticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "RuleReviewStatus" AS ENUM ('DETECTED', 'REVIEWED', 'APPROVED', 'REJECTED');

CREATE TYPE "ProcessStepType" AS ENUM ('START', 'ACTION', 'DECISION', 'DATA_ACCESS', 'EXTERNAL_CALL', 'END');

CREATE TYPE "TestSuiteType" AS ENUM ('BASELINE', 'UNIT', 'INTEGRATION', 'API', 'CONTRACT', 'REGRESSION', 'BATCH', 'DATABASE', 'PERFORMANCE', 'SECURITY', 'CUSTOM');

CREATE TYPE "TestOrigin" AS ENUM ('EXISTING', 'AI_GENERATED', 'RECORDED', 'MANUAL');

CREATE TYPE "TestCaseStatus" AS ENUM ('ACTIVE', 'DISABLED', 'QUARANTINED');

CREATE TYPE "BaselineStatus" AS ENUM ('CAPTURING', 'READY', 'PARTIAL', 'FAILED', 'SUPERSEDED');

CREATE TYPE "MigrationStatus" AS ENUM ('QUEUED', 'PREPARING', 'GENERATING_TESTS', 'TRANSFORMING', 'COMPILING', 'TESTING', 'COMPARING', 'REVIEW_REQUIRED', 'APPROVED', 'REJECTED', 'FAILED', 'ROLLED_BACK', 'CANCELED');

CREATE TYPE "MigrationUnitStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'GENERATED', 'VALIDATED', 'FAILED', 'SKIPPED');

CREATE TYPE "ChangeType" AS ENUM ('CREATE', 'MODIFY', 'DELETE', 'RENAME', 'MOVE');

CREATE TYPE "ValidationType" AS ENUM ('PRE_MIGRATION', 'POST_MIGRATION', 'FULL', 'DUAL_RUN', 'MANUAL_REVIEW');

CREATE TYPE "ValidationCheckType" AS ENUM ('COMPILE', 'TYPECHECK', 'LINT', 'UNIT_TEST', 'INTEGRATION_TEST', 'API_CONTRACT', 'BUSINESS_RULE', 'DATABASE_DIFF', 'FILE_DIFF', 'BATCH_OUTPUT', 'PERFORMANCE', 'SECURITY', 'DEPENDENCY', 'MANUAL', 'CUSTOM');

CREATE TYPE "CheckStatus" AS ENUM ('PENDING', 'PASS', 'WARN', 'FAIL', 'SKIPPED');

CREATE TYPE "TestRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'PASSED', 'FAILED', 'PARTIAL', 'CANCELED');

CREATE TYPE "TestResultStatus" AS ENUM ('PASS', 'FAIL', 'ERROR', 'SKIPPED');

CREATE TYPE "ComparisonStatus" AS ENUM ('EQUIVALENT', 'WITHIN_TOLERANCE', 'DIFFERENT', 'ERROR', 'NOT_COMPARABLE');

CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELED');

CREATE TYPE "RollbackStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

CREATE TYPE "DeploymentStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'ROLLED_BACK');

CREATE TYPE "MigrationPackStatus" AS ENUM ('DRAFT', 'ACTIVE', 'DEPRECATED', 'RETIRED');

CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'ACTIVE', 'COMPLETED', 'ARCHIVED');

CREATE TYPE "ArchitectureKind" AS ENUM ('CURRENT', 'INTERMEDIATE', 'TARGET');

CREATE TYPE "ArchitectureComponentKind" AS ENUM ('APPLICATION', 'SERVICE', 'MODULE', 'DATABASE', 'QUEUE', 'MAINFRAME', 'API_GATEWAY', 'EXTERNAL_SYSTEM', 'USER_INTERFACE', 'JOB', 'OTHER');

CREATE TYPE "ArchitectureRelationKind" AS ENUM ('CALLS', 'READS', 'WRITES', 'PUBLISHES', 'CONSUMES', 'AUTHENTICATES', 'ROUTES_TO', 'DEPENDS_ON', 'SYNCHRONIZES', 'OTHER');

CREATE TYPE "WaveStatus" AS ENUM ('DRAFT', 'READY', 'IN_PROGRESS', 'VALIDATING', 'BLOCKED', 'COMPLETED', 'CANCELED');

CREATE TYPE "MilestoneStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED');

CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'DISCOVERY', 'PLANNING', 'MIGRATING', 'VALIDATING', 'COMPLETED', 'ON_HOLD', 'ARCHIVED');

CREATE TYPE "SystemCriticality" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'MISSION_CRITICAL');

CREATE TYPE "ApplicationType" AS ENUM ('WEB', 'API', 'BATCH', 'DESKTOP', 'MAINFRAME', 'SERVICE', 'LIBRARY', 'DATABASE', 'OTHER');

CREATE TYPE "EnvironmentType" AS ENUM ('DEVELOPMENT', 'TEST', 'QA', 'STAGING', 'UAT', 'PRODUCTION', 'DR');

CREATE TYPE "SourceConnectionType" AS ENUM ('GIT', 'ZIP_UPLOAD', 'FILESYSTEM', 'SFTP', 'MAINFRAME', 'OBJECT_STORAGE', 'API');

CREATE TYPE "SourceConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'ERROR', 'DISABLED');

CREATE TYPE "RepositoryProvider" AS ENUM ('GITHUB', 'GITLAB', 'BITBUCKET', 'AZURE_DEVOPS', 'GENERIC_GIT', 'LOCAL');

CREATE TYPE "SnapshotStatus" AS ENUM ('QUEUED', 'IMPORTING', 'READY', 'PARTIAL', 'FAILED');

CREATE TYPE "SourceArtifactType" AS ENUM ('SOURCE', 'TEST', 'CONFIG', 'SCRIPT', 'SQL', 'COPYBOOK', 'JCL', 'BMS', 'DATA_DEFINITION', 'DOCUMENTATION', 'BINARY', 'UNKNOWN');

CREATE TYPE "TechnologyKind" AS ENUM ('LANGUAGE', 'FRAMEWORK', 'RUNTIME', 'DATABASE', 'MAINFRAME', 'MESSAGING', 'BUILD_TOOL', 'PACKAGE_MANAGER', 'OPERATING_SYSTEM', 'PROTOCOL', 'OTHER');

CREATE TYPE "TechnologyLifecycle" AS ENUM ('CURRENT', 'LEGACY', 'DEPRECATED', 'END_OF_SUPPORT', 'UNKNOWN');

CREATE TYPE "DependencyScope" AS ENUM ('RUNTIME', 'DEVELOPMENT', 'TEST', 'BUILD', 'OPTIONAL', 'UNKNOWN');

CREATE TYPE "DependencyStatus" AS ENUM ('CURRENT', 'OUTDATED', 'DEPRECATED', 'VULNERABLE', 'UNSUPPORTED', 'UNKNOWN');

CREATE TYPE "AgentStatus" AS ENUM ('REGISTERING', 'ONLINE', 'BUSY', 'DEGRADED', 'OFFLINE', 'REVOKED');

CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'PARTIAL', 'FAILED', 'CANCELED');

CREATE TYPE "ReportType" AS ENUM ('DISCOVERY', 'TECHNICAL_DEBT', 'MODERNIZATION_ASSESSMENT', 'MODERNIZATION_PLAN', 'MIGRATION', 'VALIDATION', 'EXECUTIVE', 'COMPLIANCE', 'CUSTOM');

CREATE TYPE "ReportStatus" AS ENUM ('QUEUED', 'GENERATING', 'READY', 'FAILED', 'EXPIRED');

CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'HTML', 'JSON', 'CSV', 'DOCX');

CREATE TYPE "NotificationType" AS ENUM ('INFO', 'SUCCESS', 'WARNING', 'ERROR', 'ACTION_REQUIRED');

CREATE TYPE "SecurityEventSeverity" AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

CREATE TYPE "StorageProvider" AS ENUM ('S3', 'MINIO', 'AZURE_BLOB', 'GCS', 'LOCAL');

CREATE TYPE "DataClassification" AS ENUM ('PUBLIC', 'INTERNAL', 'CONFIDENTIAL', 'RESTRICTED');

CREATE TABLE "AIProvider" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "type" "AIProviderType" NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "status" "AIProviderStatus" NOT NULL DEFAULT 'ACTIVE',
    "baseUrl" TEXT,
    "secretRefId" UUID,
    "privacyMode" "DataPrivacyMode" NOT NULL DEFAULT 'LOCAL_ONLY',
    "configuration" JSONB,
    "lastHealthCheckAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "AIProvider_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIModel" (
    "id" UUID NOT NULL,
    "providerId" UUID NOT NULL,
    "modelKey" VARCHAR(200) NOT NULL,
    "displayName" VARCHAR(180) NOT NULL,
    "version" VARCHAR(100) NOT NULL DEFAULT 'default',
    "contextWindow" INTEGER,
    "maxOutputTokens" INTEGER,
    "capabilities" JSONB,
    "inputCostPerMillionTokens" DECIMAL(20, 8),
    "outputCostPerMillionTokens" DECIMAL(20, 8),
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "AIModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PromptTemplate" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "scopeKey" VARCHAR(80) NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "purpose" "AIRunPurpose" NOT NULL,
    "systemPrompt" TEXT,
    "userTemplate" TEXT,
    "schema" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PromptTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AIRun" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "modelId" UUID NOT NULL,
    "promptTemplateId" UUID,
    "purpose" "AIRunPurpose" NOT NULL,
    "status" "AIRunStatus" NOT NULL DEFAULT 'QUEUED',
    "projectId" UUID,
    "systemId" UUID,
    "analysisRunId" UUID,
    "migrationRunId" UUID,
    "jobId" UUID,
    "privacyMode" "DataPrivacyMode" NOT NULL,
    "requestHash" VARCHAR(128),
    "responseHash" VARCHAR(128),
    "requestStorageObjectId" UUID,
    "responseStorageObjectId" UUID,
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cost" DECIMAL(20, 8),
    "currency" VARCHAR(3),
    "temperature" DECIMAL(4, 3),
    "seed" INTEGER,
    "latencyMs" INTEGER,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AIRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisRule" (
    "id" UUID NOT NULL,
    "key" VARCHAR(160) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "category" "FindingCategory" NOT NULL,
    "defaultSeverity" "FindingSeverity" NOT NULL,
    "description" TEXT,
    "parameters" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentMethodology" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "weights" JSONB NOT NULL,
    "formula" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AssessmentMethodology_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisRun" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID,
    "type" "AnalysisType" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedByUserId" UUID,
    "configuration" JSONB,
    "engineVersions" JSONB,
    "progress" DECIMAL(5, 2),
    "summary" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisStage" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "sequence" INTEGER NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" DECIMAL(5, 2),
    "result" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    CONSTRAINT "AnalysisStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Finding" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "sourceFileId" UUID,
    "ruleId" UUID,
    "ruleKey" VARCHAR(160),
    "fingerprint" VARCHAR(128),
    "category" "FindingCategory" NOT NULL,
    "severity" "FindingSeverity" NOT NULL,
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "title" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "remediation" TEXT,
    "evidence" JSONB,
    "confidence" DECIMAL(5, 2),
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "assignedToUserId" UUID,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Finding_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AnalysisMetric" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "scopeType" VARCHAR(80) NOT NULL,
    "scopeId" UUID,
    "key" VARCHAR(160) NOT NULL,
    "numericValue" DECIMAL(30, 8),
    "textValue" TEXT,
    "jsonValue" JSONB,
    "unit" VARCHAR(50),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisMetric_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Assessment" (
    "id" UUID NOT NULL,
    "analysisRunId" UUID NOT NULL,
    "methodologyId" UUID NOT NULL,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'DRAFT',
    "technicalDebtScore" DECIMAL(5, 2),
    "readinessScore" DECIMAL(5, 2),
    "complexityScore" DECIMAL(5, 2),
    "riskScore" DECIMAL(5, 2),
    "knowledgeCoverage" DECIMAL(5, 2),
    "testCoverage" DECIMAL(5, 2),
    "recommendedStrategy" "ModernizationStrategy",
    "executiveSummary" TEXT,
    "generatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AssessmentScore" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "label" VARCHAR(180) NOT NULL,
    "score" DECIMAL(5, 2) NOT NULL,
    "weight" DECIMAL(8, 4),
    "explanation" TEXT,
    "evidence" JSONB,
    CONSTRAINT "AssessmentScore_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModernizationRecommendation" (
    "id" UUID NOT NULL,
    "assessmentId" UUID NOT NULL,
    "targetType" VARCHAR(80) NOT NULL,
    "targetId" UUID,
    "title" VARCHAR(220) NOT NULL,
    "strategy" "ModernizationStrategy" NOT NULL,
    "priority" "RecommendationPriority" NOT NULL,
    "rationale" TEXT NOT NULL,
    "sourceStack" JSONB,
    "targetStack" JSONB,
    "expectedBenefits" JSONB,
    "dependencies" JSONB,
    "estimatedEffort" JSONB,
    "estimatedCost" DECIMAL(20, 4),
    "currency" VARCHAR(3),
    "riskScore" DECIMAL(5, 2),
    "migrationPackId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModernizationRecommendation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "displayName" VARCHAR(160),
    "firstName" VARCHAR(100),
    "lastName" VARCHAR(100),
    "avatarUrl" TEXT,
    "locale" VARCHAR(20),
    "timezone" VARCHAR(80),
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "emailVerifiedAt" TIMESTAMPTZ(6),
    "lastLoginAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserCredential" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "passwordChangedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "UserCredential_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserSession" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "organizationId" UUID,
    "tokenHash" TEXT NOT NULL,
    "refreshTokenHash" TEXT,
    "ipAddress" INET,
    "userAgent" TEXT,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "lastSeenAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "EmailVerificationToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PasswordResetToken" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "usedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Organization" (
    "id" UUID NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "legalName" VARCHAR(250),
    "taxId" VARCHAR(100),
    "status" "OrganizationStatus" NOT NULL DEFAULT 'TRIAL',
    "deploymentMode" "DeploymentMode" NOT NULL DEFAULT 'SAAS',
    "dataResidencyRegion" VARCHAR(80),
    "defaultTimezone" VARCHAR(80),
    "logoUrl" TEXT,
    "settings" JSONB,
    "securitySettings" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationMembership" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "jobTitle" VARCHAR(160),
    "joinedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "OrganizationMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OrganizationInvitation" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
    "invitedByUserId" UUID,
    "proposedRoleId" UUID,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "acceptedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationInvitation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Role" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "scope" "RoleScope" NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Permission" (
    "id" UUID NOT NULL,
    "key" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RolePermission" (
    "roleId" UUID NOT NULL,
    "permissionId" UUID NOT NULL,
    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("roleId", "permissionId")
);

CREATE TABLE "MembershipRole" (
    "membershipId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    CONSTRAINT "MembershipRole_pkey" PRIMARY KEY ("membershipId", "roleId")
);

CREATE TABLE "ProjectAccess" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "membershipId" UUID NOT NULL,
    "roleId" UUID NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProjectAccess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApiKey" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "prefix" VARCHAR(32) NOT NULL,
    "keyHash" TEXT NOT NULL,
    "status" "ApiKeyStatus" NOT NULL DEFAULT 'ACTIVE',
    "scopes" JSONB,
    "projectId" UUID,
    "createdByUserId" UUID,
    "lastUsedAt" TIMESTAMPTZ(6),
    "expiresAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiKey_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecretReference" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "provider" VARCHAR(80) NOT NULL,
    "externalRef" TEXT NOT NULL,
    "metadata" JSONB,
    "rotatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "SecretReference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IntegrationConnection" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "IntegrationStatus" NOT NULL DEFAULT 'PENDING',
    "externalAccountId" TEXT,
    "secretRefId" UUID,
    "config" JSONB,
    "lastSyncAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "IntegrationConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeploymentInstance" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "mode" "DeploymentMode" NOT NULL,
    "status" "InstanceStatus" NOT NULL DEFAULT 'PROVISIONING',
    "region" VARCHAR(100),
    "version" VARCHAR(80),
    "instanceKey" VARCHAR(150) NOT NULL,
    "metadata" JSONB,
    "lastHeartbeatAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "DeploymentInstance_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPlan" (
    "id" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "BillingPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BillingPrice" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "externalPriceId" TEXT,
    "currency" VARCHAR(3) NOT NULL,
    "interval" "BillingInterval" NOT NULL,
    "unitAmount" DECIMAL(20, 4) NOT NULL,
    "includedSeats" INTEGER NOT NULL DEFAULT 1,
    "seatUnitAmount" DECIMAL(20, 4),
    "usagePricing" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BillingPrice_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Feature" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "description" TEXT,
    "valueType" "FeatureValueType" NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PlanEntitlement" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "featureId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "integerLimit" BIGINT,
    "decimalLimit" DECIMAL(24, 6),
    "stringValue" TEXT,
    "metadata" JSONB,
    CONSTRAINT "PlanEntitlement_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Subscription" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "priceId" UUID,
    "provider" VARCHAR(50),
    "externalCustomerId" TEXT,
    "externalSubscriptionId" TEXT,
    "status" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
    "seatQuantity" INTEGER NOT NULL DEFAULT 1,
    "currentPeriodStart" TIMESTAMPTZ(6),
    "currentPeriodEnd" TIMESTAMPTZ(6),
    "trialEndsAt" TIMESTAMPTZ(6),
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "canceledAt" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UsageEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "metricKey" VARCHAR(120) NOT NULL,
    "quantity" DECIMAL(24, 6) NOT NULL,
    "unit" VARCHAR(50),
    "projectId" UUID,
    "systemId" UUID,
    "idempotencyKey" TEXT,
    "dimensions" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UsageEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WorkerNode" (
    "id" UUID NOT NULL,
    "organizationId" UUID,
    "deploymentInstanceId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "workerKey" VARCHAR(160) NOT NULL,
    "status" "WorkerStatus" NOT NULL DEFAULT 'OFFLINE',
    "version" VARCHAR(80),
    "capabilities" JSONB,
    "concurrency" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "lastHeartbeatAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "WorkerNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Job" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "workerId" UUID,
    "queue" VARCHAR(120) NOT NULL,
    "type" VARCHAR(160) NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'QUEUED',
    "priority" INTEGER NOT NULL DEFAULT 0,
    "projectId" UUID,
    "systemId" UUID,
    "subjectType" VARCHAR(80),
    "subjectId" UUID,
    "idempotencyKey" TEXT,
    "payload" JSONB,
    "result" JSONB,
    "progress" DECIMAL(5, 2),
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledAt" TIMESTAMPTZ(6),
    "lockedAt" TIMESTAMPTZ(6),
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "error" TEXT,
    "traceId" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Job_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "JobLog" (
    "id" UUID NOT NULL,
    "jobId" UUID NOT NULL,
    "level" "JobLogLevel" NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "JobLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemDomain" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "parentId" UUID,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "riskScore" DECIMAL(5, 2),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemDomain_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DomainNode" (
    "domainId" UUID NOT NULL,
    "nodeId" UUID NOT NULL,
    "weight" DECIMAL(8, 4),
    "metadata" JSONB,
    CONSTRAINT "DomainNode_pkey" PRIMARY KEY ("domainId", "nodeId")
);

CREATE TABLE "KnowledgeNode" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "sourceFileId" UUID,
    "kind" "KnowledgeNodeKind" NOT NULL,
    "stableKey" VARCHAR(500) NOT NULL,
    "name" VARCHAR(300) NOT NULL,
    "qualifiedName" TEXT,
    "signature" TEXT,
    "language" VARCHAR(100),
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "checksum" VARCHAR(128),
    "attributes" JSONB,
    "confidence" DECIMAL(5, 2),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeNode_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnowledgeEdge" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "fromNodeId" UUID NOT NULL,
    "toNodeId" UUID NOT NULL,
    "kind" "KnowledgeEdgeKind" NOT NULL,
    "label" VARCHAR(200),
    "attributes" JSONB,
    "confidence" DECIMAL(5, 2),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KnowledgeEdge_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessRule" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "stableKey" VARCHAR(300) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "description" TEXT NOT NULL,
    "category" VARCHAR(120),
    "criticality" "RuleCriticality" NOT NULL DEFAULT 'MEDIUM',
    "reviewStatus" "RuleReviewStatus" NOT NULL DEFAULT 'DETECTED',
    "expression" JSONB,
    "inputs" JSONB,
    "outputs" JSONB,
    "confidence" DECIMAL(5, 2),
    "reviewedByUserId" UUID,
    "reviewedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "BusinessRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessRuleEvidence" (
    "id" UUID NOT NULL,
    "businessRuleId" UUID NOT NULL,
    "sourceFileId" UUID,
    "knowledgeNodeId" UUID,
    "lineStart" INTEGER,
    "lineEnd" INTEGER,
    "excerptHash" VARCHAR(128),
    "evidence" JSONB,
    "confidence" DECIMAL(5, 2),
    CONSTRAINT "BusinessRuleEvidence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessProcess" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "stableKey" VARCHAR(300) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "description" TEXT,
    "criticality" "RuleCriticality" NOT NULL DEFAULT 'MEDIUM',
    "entryNodeId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BusinessProcess_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BusinessProcessStep" (
    "id" UUID NOT NULL,
    "businessProcessId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "type" "ProcessStepType" NOT NULL,
    "name" VARCHAR(220) NOT NULL,
    "knowledgeNodeId" UUID,
    "businessRuleId" UUID,
    "description" TEXT,
    "metadata" JSONB,
    CONSTRAINT "BusinessProcessStep_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestSuite" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "type" "TestSuiteType" NOT NULL,
    "description" TEXT,
    "framework" VARCHAR(120),
    "configuration" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "TestSuite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestCase" (
    "id" UUID NOT NULL,
    "suiteId" UUID NOT NULL,
    "stableKey" VARCHAR(300) NOT NULL,
    "name" VARCHAR(250) NOT NULL,
    "origin" "TestOrigin" NOT NULL,
    "status" "TestCaseStatus" NOT NULL DEFAULT 'ACTIVE',
    "targetType" VARCHAR(80),
    "targetId" UUID,
    "inputDefinition" JSONB,
    "expectedDefinition" JSONB,
    "testCodeStorageObjectId" UUID,
    "testCodeHash" VARCHAR(128),
    "tags" JSONB,
    "createdByAiRunId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "TestCase_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BehaviorBaseline" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "testSuiteId" UUID,
    "name" VARCHAR(200) NOT NULL,
    "status" "BaselineStatus" NOT NULL DEFAULT 'CAPTURING',
    "coverageScore" DECIMAL(5, 2),
    "environmentId" UUID,
    "captureConfig" JSONB,
    "summary" JSONB,
    "createdByUserId" UUID,
    "capturedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehaviorBaseline_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BaselineObservation" (
    "id" UUID NOT NULL,
    "baselineId" UUID NOT NULL,
    "testCaseId" UUID,
    "sequence" INTEGER NOT NULL,
    "observationType" VARCHAR(100) NOT NULL,
    "input" JSONB,
    "expectedOutput" JSONB,
    "expectedStatus" VARCHAR(80),
    "stateBeforeHash" VARCHAR(128),
    "stateAfterHash" VARCHAR(128),
    "artifactStorageObjectId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BaselineObservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MigrationRun" (
    "id" UUID NOT NULL,
    "waveId" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "sourceSnapshotId" UUID NOT NULL,
    "repositoryId" UUID,
    "migrationPackVersionId" UUID,
    "status" "MigrationStatus" NOT NULL DEFAULT 'QUEUED',
    "sourceBranch" VARCHAR(255),
    "targetBranch" VARCHAR(255),
    "sourceRevision" VARCHAR(120),
    "targetRevision" VARCHAR(120),
    "targetStack" JSONB,
    "configuration" JSONB,
    "confidenceScore" DECIMAL(5, 2),
    "requestedByUserId" UUID,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMPTZ(6),
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MigrationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MigrationUnit" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "sourceFileId" UUID,
    "sourceNodeId" UUID,
    "unitType" VARCHAR(100) NOT NULL,
    "stableKey" VARCHAR(300) NOT NULL,
    "name" VARCHAR(220) NOT NULL,
    "status" "MigrationUnitStatus" NOT NULL DEFAULT 'PENDING',
    "strategy" "ModernizationStrategy" NOT NULL,
    "targetLanguage" VARCHAR(100),
    "targetFramework" VARCHAR(120),
    "outputStorageObjectId" UUID,
    "summary" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    CONSTRAINT "MigrationUnit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CodeChange" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "migrationUnitId" UUID,
    "sourceFileId" UUID,
    "changeType" "ChangeType" NOT NULL,
    "originalPath" TEXT,
    "targetPath" TEXT,
    "originalStorageObjectId" UUID,
    "migratedStorageObjectId" UUID,
    "diffStorageObjectId" UUID,
    "originalChecksum" VARCHAR(128),
    "migratedChecksum" VARCHAR(128),
    "additions" INTEGER,
    "deletions" INTEGER,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CodeChange_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PullRequest" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "repositoryId" UUID NOT NULL,
    "externalId" VARCHAR(150) NOT NULL,
    "number" INTEGER,
    "title" VARCHAR(250) NOT NULL,
    "url" TEXT,
    "sourceBranch" VARCHAR(255),
    "targetBranch" VARCHAR(255),
    "status" VARCHAR(60),
    "mergedAt" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "PullRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValidationRun" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "type" "ValidationType" NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "environmentId" UUID,
    "confidenceScore" DECIMAL(5, 2),
    "summary" JSONB,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ValidationCheck" (
    "id" UUID NOT NULL,
    "validationRunId" UUID NOT NULL,
    "type" "ValidationCheckType" NOT NULL,
    "name" VARCHAR(220) NOT NULL,
    "status" "CheckStatus" NOT NULL DEFAULT 'PENDING',
    "score" DECIMAL(5, 2),
    "threshold" JSONB,
    "details" JSONB,
    "evidenceStorageObjectId" UUID,
    "durationMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ValidationCheck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestRun" (
    "id" UUID NOT NULL,
    "testSuiteId" UUID NOT NULL,
    "baselineId" UUID,
    "migrationRunId" UUID,
    "validationRunId" UUID,
    "status" "TestRunStatus" NOT NULL DEFAULT 'QUEUED',
    "environmentId" UUID,
    "total" INTEGER NOT NULL DEFAULT 0,
    "passed" INTEGER NOT NULL DEFAULT 0,
    "failed" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "logsStorageObjectId" UUID,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TestResult" (
    "id" UUID NOT NULL,
    "testRunId" UUID NOT NULL,
    "testCaseId" UUID NOT NULL,
    "status" "TestResultStatus" NOT NULL,
    "durationMs" INTEGER,
    "expected" JSONB,
    "actual" JSONB,
    "error" TEXT,
    "artifactStorageObjectId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TestResult_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BehaviorComparison" (
    "id" UUID NOT NULL,
    "validationRunId" UUID NOT NULL,
    "testCaseId" UUID,
    "category" VARCHAR(100) NOT NULL,
    "status" "ComparisonStatus" NOT NULL,
    "similarityScore" DECIMAL(5, 2),
    "tolerance" JSONB,
    "original" JSONB,
    "modernized" JSONB,
    "difference" JSONB,
    "artifactStorageObjectId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BehaviorComparison_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ApprovalRequest" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "subjectType" VARCHAR(80) NOT NULL,
    "subjectId" UUID NOT NULL,
    "status" "ApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "requestedByUserId" UUID,
    "assignedToMembershipId" UUID,
    "decisionByUserId" UUID,
    "requestMessage" TEXT,
    "decisionComment" TEXT,
    "decidedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApprovalRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RollbackRun" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "status" "RollbackStatus" NOT NULL DEFAULT 'QUEUED',
    "strategy" VARCHAR(100),
    "requestedByUserId" UUID,
    "fromRevision" TEXT,
    "toRevision" TEXT,
    "reason" TEXT,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RollbackRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DeploymentRun" (
    "id" UUID NOT NULL,
    "migrationRunId" UUID NOT NULL,
    "environmentId" UUID NOT NULL,
    "status" "DeploymentStatus" NOT NULL DEFAULT 'QUEUED',
    "version" VARCHAR(100),
    "commitSha" VARCHAR(120),
    "artifactStorageObjectId" UUID,
    "requestedByUserId" UUID,
    "logsStorageObjectId" UUID,
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DeploymentRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MigrationPack" (
    "id" UUID NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "description" TEXT,
    "sourceSelectors" JSONB NOT NULL,
    "targetOptions" JSONB NOT NULL,
    "status" "MigrationPackStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "MigrationPack_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MigrationPackVersion" (
    "id" UUID NOT NULL,
    "migrationPackId" UUID NOT NULL,
    "version" VARCHAR(50) NOT NULL,
    "status" "MigrationPackStatus" NOT NULL DEFAULT 'DRAFT',
    "engineVersion" VARCHAR(100),
    "configurationSchema" JSONB,
    "ruleSetStorageObjectId" UUID,
    "releaseNotes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MigrationPackVersion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ModernizationPlan" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "systemId" UUID,
    "name" VARCHAR(220) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "objective" TEXT,
    "assumptions" JSONB,
    "constraints" JSONB,
    "targetSummary" JSONB,
    "estimatedCost" DECIMAL(20, 4),
    "currency" VARCHAR(3),
    "estimatedDurationDays" INTEGER,
    "assessmentId" UUID,
    "createdByUserId" UUID,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ModernizationPlan_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArchitectureModel" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "systemId" UUID,
    "planId" UUID,
    "kind" "ArchitectureKind" NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchitectureModel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArchitectureComponent" (
    "id" UUID NOT NULL,
    "architectureId" UUID NOT NULL,
    "stableKey" VARCHAR(300) NOT NULL,
    "name" VARCHAR(220) NOT NULL,
    "kind" "ArchitectureComponentKind" NOT NULL,
    "technology" JSONB,
    "properties" JSONB,
    "position" JSONB,
    "sourceNodeId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ArchitectureComponent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ArchitectureRelation" (
    "id" UUID NOT NULL,
    "architectureId" UUID NOT NULL,
    "fromComponentId" UUID NOT NULL,
    "toComponentId" UUID NOT NULL,
    "kind" "ArchitectureRelationKind" NOT NULL,
    "label" VARCHAR(180),
    "properties" JSONB,
    CONSTRAINT "ArchitectureRelation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MigrationWave" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "objective" TEXT,
    "strategy" "ModernizationStrategy" NOT NULL,
    "status" "WaveStatus" NOT NULL DEFAULT 'DRAFT',
    "riskScore" DECIMAL(5, 2),
    "priority" "RecommendationPriority" NOT NULL DEFAULT 'MEDIUM',
    "plannedStart" TIMESTAMPTZ(6),
    "plannedEnd" TIMESTAMPTZ(6),
    "actualStart" TIMESTAMPTZ(6),
    "actualEnd" TIMESTAMPTZ(6),
    "entryCriteria" JSONB,
    "exitCriteria" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "MigrationWave_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaveTarget" (
    "id" UUID NOT NULL,
    "waveId" UUID NOT NULL,
    "targetType" VARCHAR(80) NOT NULL,
    "targetId" UUID,
    "label" VARCHAR(220),
    "strategyOverride" "ModernizationStrategy",
    "targetStack" JSONB,
    "metadata" JSONB,
    CONSTRAINT "WaveTarget_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WaveDependency" (
    "fromWaveId" UUID NOT NULL,
    "toWaveId" UUID NOT NULL,
    "reason" TEXT,
    CONSTRAINT "WaveDependency_pkey" PRIMARY KEY ("fromWaveId", "toWaveId")
);

CREATE TABLE "PlanMilestone" (
    "id" UUID NOT NULL,
    "planId" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "sequence" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "dueAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    CONSTRAINT "PlanMilestone_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Project" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "key" VARCHAR(50) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "clientReference" VARCHAR(150),
    "tags" JSONB,
    "settings" JSONB,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "archivedAt" TIMESTAMPTZ(6),
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "LegacySystem" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "code" VARCHAR(80) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "businessOwner" VARCHAR(200),
    "technicalOwner" VARCHAR(200),
    "criticality" "SystemCriticality" NOT NULL DEFAULT 'MEDIUM',
    "businessDomain" VARCHAR(160),
    "currentArchitecture" JSONB,
    "runtimeMetadata" JSONB,
    "slaMetadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "LegacySystem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Application" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "code" VARCHAR(100) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "type" "ApplicationType" NOT NULL,
    "description" TEXT,
    "entryPoint" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "Application_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemEnvironment" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "type" "EnvironmentType" NOT NULL,
    "endpoint" TEXT,
    "runtime" JSONB,
    "secretRefId" UUID,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "SystemEnvironment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceConnection" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "systemId" UUID,
    "scannerAgentId" UUID,
    "type" "SourceConnectionType" NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "status" "SourceConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "endpoint" TEXT,
    "secretRefId" UUID,
    "config" JSONB,
    "lastCheckedAt" TIMESTAMPTZ(6),
    "lastError" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "SourceConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Repository" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "systemId" UUID,
    "sourceConnectionId" UUID,
    "provider" "RepositoryProvider" NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "externalId" TEXT,
    "cloneUrl" TEXT,
    "webUrl" TEXT,
    "defaultBranch" VARCHAR(255),
    "secretRefId" UUID,
    "isReadOnly" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "Repository_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceSnapshot" (
    "id" UUID NOT NULL,
    "projectId" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "repositoryId" UUID,
    "sourceConnectionId" UUID,
    "status" "SnapshotStatus" NOT NULL DEFAULT 'QUEUED',
    "label" VARCHAR(180),
    "branch" VARCHAR(255),
    "commitSha" VARCHAR(100),
    "tag" VARCHAR(255),
    "packageStorageObjectId" UUID,
    "manifestStorageObjectId" UUID,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "totalLines" BIGINT NOT NULL DEFAULT 0,
    "totalBytes" BIGINT NOT NULL DEFAULT 0,
    "languageSummary" JSONB,
    "importedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SourceFile" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "path" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "extension" VARCHAR(40),
    "language" VARCHAR(100),
    "artifactType" "SourceArtifactType" NOT NULL DEFAULT 'UNKNOWN',
    "encoding" VARCHAR(50),
    "checksumSha256" VARCHAR(64) NOT NULL,
    "sizeBytes" BIGINT NOT NULL,
    "linesOfCode" INTEGER,
    "isGenerated" BOOLEAN NOT NULL DEFAULT false,
    "isBinary" BOOLEAN NOT NULL DEFAULT false,
    "storageObjectId" UUID,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SourceFile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Technology" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "name" VARCHAR(150) NOT NULL,
    "kind" "TechnologyKind" NOT NULL,
    "vendor" VARCHAR(150),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Technology_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SystemTechnology" (
    "id" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "technologyId" UUID NOT NULL,
    "version" VARCHAR(100) NOT NULL DEFAULT 'unknown',
    "lifecycle" "TechnologyLifecycle" NOT NULL DEFAULT 'UNKNOWN',
    "confidence" DECIMAL(5, 2),
    "evidence" JSONB,
    "detectedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SystemTechnology_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SoftwareDependency" (
    "id" UUID NOT NULL,
    "snapshotId" UUID NOT NULL,
    "sourceFileId" UUID,
    "ecosystem" VARCHAR(80),
    "packageManager" VARCHAR(80),
    "name" VARCHAR(300) NOT NULL,
    "version" VARCHAR(120),
    "latestVersion" VARCHAR(120),
    "purl" TEXT,
    "scope" "DependencyScope" NOT NULL DEFAULT 'UNKNOWN',
    "status" "DependencyStatus" NOT NULL DEFAULT 'UNKNOWN',
    "isDirect" BOOLEAN NOT NULL DEFAULT true,
    "licenseSpdx" VARCHAR(100),
    "endOfSupportAt" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SoftwareDependency_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DependencyVulnerability" (
    "id" UUID NOT NULL,
    "dependencyId" UUID NOT NULL,
    "advisoryId" VARCHAR(120) NOT NULL,
    "cve" VARCHAR(40),
    "severity" VARCHAR(30),
    "cvssScore" DECIMAL(4, 2),
    "fixedVersion" VARCHAR(120),
    "source" VARCHAR(100),
    "url" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DependencyVulnerability_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScannerAgent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "deploymentInstanceId" UUID,
    "name" VARCHAR(150) NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "AgentStatus" NOT NULL DEFAULT 'REGISTERING',
    "version" VARCHAR(80),
    "capabilities" JSONB,
    "hostFingerprint" TEXT,
    "metadata" JSONB,
    "lastSeenAt" TIMESTAMPTZ(6),
    "revokedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    CONSTRAINT "ScannerAgent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScanSession" (
    "id" UUID NOT NULL,
    "scannerAgentId" UUID NOT NULL,
    "systemId" UUID NOT NULL,
    "sourceConnectionId" UUID NOT NULL,
    "snapshotId" UUID,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "requestedByUserId" UUID,
    "manifest" JSONB,
    "progress" DECIMAL(5, 2),
    "error" TEXT,
    "startedAt" TIMESTAMPTZ(6),
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ScanSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Report" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "projectId" UUID,
    "systemId" UUID,
    "type" "ReportType" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'QUEUED',
    "format" "ReportFormat" NOT NULL,
    "name" VARCHAR(220) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parameters" JSONB,
    "summary" JSONB,
    "storageObjectId" UUID,
    "generatedByUserId" UUID,
    "generatedByAiRunId" UUID,
    "expiresAt" TIMESTAMPTZ(6),
    "generatedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" VARCHAR(220) NOT NULL,
    "body" TEXT NOT NULL,
    "actionUrl" TEXT,
    "data" JSONB,
    "readAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "actorUserId" UUID,
    "actorType" VARCHAR(50) NOT NULL,
    "action" VARCHAR(180) NOT NULL,
    "entityType" VARCHAR(100) NOT NULL,
    "entityId" UUID,
    "requestId" VARCHAR(100),
    "ipAddress" INET,
    "userAgent" TEXT,
    "before" JSONB,
    "after" JSONB,
    "metadata" JSONB,
    "occurredAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SecurityEvent" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "type" VARCHAR(150) NOT NULL,
    "severity" "SecurityEventSeverity" NOT NULL,
    "ipAddress" INET,
    "userAgent" TEXT,
    "details" JSONB,
    "resolvedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SecurityEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StorageObject" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "provider" "StorageProvider" NOT NULL,
    "bucket" VARCHAR(255),
    "objectKey" TEXT NOT NULL,
    "versionId" VARCHAR(255),
    "contentType" VARCHAR(150),
    "sizeBytes" BIGINT NOT NULL,
    "checksumSha256" VARCHAR(64),
    "classification" "DataClassification" NOT NULL DEFAULT 'CONFIDENTIAL',
    "encrypted" BOOLEAN NOT NULL DEFAULT true,
    "encryptionKeyRefId" UUID,
    "retentionUntil" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMPTZ(6),
    CONSTRAINT "StorageObject_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AIProvider_organizationId_name_key" ON "AIProvider"("organizationId", "name");
CREATE INDEX "AIProvider_organizationId_status_idx" ON "AIProvider"("organizationId", "status");

CREATE UNIQUE INDEX "AIModel_providerId_modelKey_version_key" ON "AIModel"("providerId", "modelKey", "version");
CREATE INDEX "AIModel_providerId_isActive_idx" ON "AIModel"("providerId", "isActive");

CREATE UNIQUE INDEX "PromptTemplate_scopeKey_key_version_key" ON "PromptTemplate"("scopeKey", "key", "version");
CREATE INDEX "PromptTemplate_purpose_isActive_idx" ON "PromptTemplate"("purpose", "isActive");

CREATE INDEX "AIRun_organizationId_purpose_createdAt_idx" ON "AIRun"("organizationId", "purpose", "createdAt");
CREATE INDEX "AIRun_projectId_idx" ON "AIRun"("projectId");
CREATE INDEX "AIRun_systemId_idx" ON "AIRun"("systemId");
CREATE INDEX "AIRun_analysisRunId_idx" ON "AIRun"("analysisRunId");
CREATE INDEX "AIRun_migrationRunId_idx" ON "AIRun"("migrationRunId");

CREATE UNIQUE INDEX "AnalysisRule_key_version_key" ON "AnalysisRule"("key", "version");
CREATE INDEX "AnalysisRule_category_isActive_idx" ON "AnalysisRule"("category", "isActive");

CREATE UNIQUE INDEX "AssessmentMethodology_key_version_key" ON "AssessmentMethodology"("key", "version");

CREATE INDEX "AnalysisRun_projectId_status_createdAt_idx" ON "AnalysisRun"("projectId", "status", "createdAt");
CREATE INDEX "AnalysisRun_systemId_type_createdAt_idx" ON "AnalysisRun"("systemId", "type", "createdAt");
CREATE INDEX "AnalysisRun_snapshotId_idx" ON "AnalysisRun"("snapshotId");

CREATE UNIQUE INDEX "AnalysisStage_analysisRunId_key_key" ON "AnalysisStage"("analysisRunId", "key");
CREATE INDEX "AnalysisStage_analysisRunId_sequence_idx" ON "AnalysisStage"("analysisRunId", "sequence");

CREATE INDEX "Finding_analysisRunId_severity_status_idx" ON "Finding"("analysisRunId", "severity", "status");
CREATE INDEX "Finding_sourceFileId_idx" ON "Finding"("sourceFileId");
CREATE INDEX "Finding_ruleId_idx" ON "Finding"("ruleId");
CREATE INDEX "Finding_fingerprint_idx" ON "Finding"("fingerprint");

CREATE INDEX "AnalysisMetric_analysisRunId_key_idx" ON "AnalysisMetric"("analysisRunId", "key");
CREATE INDEX "AnalysisMetric_scopeType_scopeId_idx" ON "AnalysisMetric"("scopeType", "scopeId");

CREATE UNIQUE INDEX "Assessment_analysisRunId_key" ON "Assessment"("analysisRunId");
CREATE INDEX "Assessment_methodologyId_status_idx" ON "Assessment"("methodologyId", "status");

CREATE UNIQUE INDEX "AssessmentScore_assessmentId_key_key" ON "AssessmentScore"("assessmentId", "key");

CREATE INDEX "ModernizationRecommendation_assessmentId_priority_idx" ON "ModernizationRecommendation"("assessmentId", "priority");
CREATE INDEX "ModernizationRecommendation_migrationPackId_idx" ON "ModernizationRecommendation"("migrationPackId");

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE INDEX "User_status_idx" ON "User"("status");
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

CREATE UNIQUE INDEX "UserCredential_userId_key" ON "UserCredential"("userId");

CREATE UNIQUE INDEX "UserSession_tokenHash_key" ON "UserSession"("tokenHash");
CREATE UNIQUE INDEX "UserSession_refreshTokenHash_key" ON "UserSession"("refreshTokenHash");
CREATE INDEX "UserSession_userId_expiresAt_idx" ON "UserSession"("userId", "expiresAt");
CREATE INDEX "UserSession_organizationId_idx" ON "UserSession"("organizationId");

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key" ON "EmailVerificationToken"("tokenHash");
CREATE INDEX "EmailVerificationToken_userId_expiresAt_idx" ON "EmailVerificationToken"("userId", "expiresAt");

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");
CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE INDEX "Organization_status_idx" ON "Organization"("status");
CREATE INDEX "Organization_deploymentMode_idx" ON "Organization"("deploymentMode");
CREATE INDEX "Organization_deletedAt_idx" ON "Organization"("deletedAt");

CREATE UNIQUE INDEX "OrganizationMembership_organizationId_userId_key" ON "OrganizationMembership"("organizationId", "userId");
CREATE INDEX "OrganizationMembership_userId_status_idx" ON "OrganizationMembership"("userId", "status");

CREATE UNIQUE INDEX "OrganizationInvitation_tokenHash_key" ON "OrganizationInvitation"("tokenHash");
CREATE INDEX "OrganizationInvitation_organizationId_email_idx" ON "OrganizationInvitation"("organizationId", "email");
CREATE INDEX "OrganizationInvitation_status_expiresAt_idx" ON "OrganizationInvitation"("status", "expiresAt");

CREATE UNIQUE INDEX "Role_organizationId_scope_key_key" ON "Role"("organizationId", "scope", "key");
CREATE INDEX "Role_organizationId_scope_idx" ON "Role"("organizationId", "scope");

CREATE UNIQUE INDEX "Permission_key_key" ON "Permission"("key");



CREATE UNIQUE INDEX "ProjectAccess_projectId_membershipId_key" ON "ProjectAccess"("projectId", "membershipId");
CREATE INDEX "ProjectAccess_membershipId_idx" ON "ProjectAccess"("membershipId");

CREATE UNIQUE INDEX "ApiKey_keyHash_key" ON "ApiKey"("keyHash");
CREATE INDEX "ApiKey_organizationId_status_idx" ON "ApiKey"("organizationId", "status");
CREATE INDEX "ApiKey_projectId_idx" ON "ApiKey"("projectId");

CREATE UNIQUE INDEX "SecretReference_organizationId_name_key" ON "SecretReference"("organizationId", "name");

CREATE INDEX "IntegrationConnection_organizationId_provider_status_idx" ON "IntegrationConnection"("organizationId", "provider", "status");

CREATE UNIQUE INDEX "DeploymentInstance_instanceKey_key" ON "DeploymentInstance"("instanceKey");
CREATE INDEX "DeploymentInstance_organizationId_status_idx" ON "DeploymentInstance"("organizationId", "status");

CREATE UNIQUE INDEX "BillingPlan_code_key" ON "BillingPlan"("code");

CREATE UNIQUE INDEX "BillingPrice_externalPriceId_key" ON "BillingPrice"("externalPriceId");
CREATE INDEX "BillingPrice_planId_interval_idx" ON "BillingPrice"("planId", "interval");

CREATE UNIQUE INDEX "Feature_key_key" ON "Feature"("key");

CREATE UNIQUE INDEX "PlanEntitlement_planId_featureId_key" ON "PlanEntitlement"("planId", "featureId");

CREATE UNIQUE INDEX "Subscription_externalSubscriptionId_key" ON "Subscription"("externalSubscriptionId");
CREATE INDEX "Subscription_organizationId_status_idx" ON "Subscription"("organizationId", "status");
CREATE INDEX "Subscription_planId_idx" ON "Subscription"("planId");

CREATE UNIQUE INDEX "UsageEvent_idempotencyKey_key" ON "UsageEvent"("idempotencyKey");
CREATE INDEX "UsageEvent_organizationId_metricKey_occurredAt_idx" ON "UsageEvent"("organizationId", "metricKey", "occurredAt");
CREATE INDEX "UsageEvent_projectId_idx" ON "UsageEvent"("projectId");
CREATE INDEX "UsageEvent_systemId_idx" ON "UsageEvent"("systemId");

CREATE UNIQUE INDEX "WorkerNode_workerKey_key" ON "WorkerNode"("workerKey");
CREATE INDEX "WorkerNode_status_idx" ON "WorkerNode"("status");
CREATE INDEX "WorkerNode_organizationId_idx" ON "WorkerNode"("organizationId");

CREATE UNIQUE INDEX "Job_idempotencyKey_key" ON "Job"("idempotencyKey");
CREATE INDEX "Job_queue_status_priority_idx" ON "Job"("queue", "status", "priority");
CREATE INDEX "Job_organizationId_status_createdAt_idx" ON "Job"("organizationId", "status", "createdAt");
CREATE INDEX "Job_projectId_idx" ON "Job"("projectId");
CREATE INDEX "Job_systemId_idx" ON "Job"("systemId");
CREATE INDEX "Job_subjectType_subjectId_idx" ON "Job"("subjectType", "subjectId");

CREATE INDEX "JobLog_jobId_createdAt_idx" ON "JobLog"("jobId", "createdAt");

CREATE UNIQUE INDEX "SystemDomain_systemId_snapshotId_code_key" ON "SystemDomain"("systemId", "snapshotId", "code");
CREATE INDEX "SystemDomain_systemId_parentId_idx" ON "SystemDomain"("systemId", "parentId");


CREATE UNIQUE INDEX "KnowledgeNode_snapshotId_stableKey_key" ON "KnowledgeNode"("snapshotId", "stableKey");
CREATE INDEX "KnowledgeNode_systemId_kind_idx" ON "KnowledgeNode"("systemId", "kind");
CREATE INDEX "KnowledgeNode_snapshotId_kind_idx" ON "KnowledgeNode"("snapshotId", "kind");
CREATE INDEX "KnowledgeNode_sourceFileId_idx" ON "KnowledgeNode"("sourceFileId");

CREATE UNIQUE INDEX "KnowledgeEdge_snapshotId_fromNodeId_toNodeId_kind_key" ON "KnowledgeEdge"("snapshotId", "fromNodeId", "toNodeId", "kind");
CREATE INDEX "KnowledgeEdge_fromNodeId_kind_idx" ON "KnowledgeEdge"("fromNodeId", "kind");
CREATE INDEX "KnowledgeEdge_toNodeId_kind_idx" ON "KnowledgeEdge"("toNodeId", "kind");

CREATE UNIQUE INDEX "BusinessRule_snapshotId_stableKey_key" ON "BusinessRule"("snapshotId", "stableKey");
CREATE INDEX "BusinessRule_systemId_criticality_idx" ON "BusinessRule"("systemId", "criticality");

CREATE INDEX "BusinessRuleEvidence_businessRuleId_idx" ON "BusinessRuleEvidence"("businessRuleId");
CREATE INDEX "BusinessRuleEvidence_sourceFileId_idx" ON "BusinessRuleEvidence"("sourceFileId");

CREATE UNIQUE INDEX "BusinessProcess_snapshotId_stableKey_key" ON "BusinessProcess"("snapshotId", "stableKey");
CREATE INDEX "BusinessProcess_systemId_criticality_idx" ON "BusinessProcess"("systemId", "criticality");

CREATE UNIQUE INDEX "BusinessProcessStep_businessProcessId_sequence_key" ON "BusinessProcessStep"("businessProcessId", "sequence");

CREATE INDEX "TestSuite_systemId_type_idx" ON "TestSuite"("systemId", "type");
CREATE INDEX "TestSuite_snapshotId_idx" ON "TestSuite"("snapshotId");

CREATE UNIQUE INDEX "TestCase_suiteId_stableKey_key" ON "TestCase"("suiteId", "stableKey");
CREATE INDEX "TestCase_suiteId_status_idx" ON "TestCase"("suiteId", "status");

CREATE INDEX "BehaviorBaseline_systemId_status_idx" ON "BehaviorBaseline"("systemId", "status");
CREATE INDEX "BehaviorBaseline_snapshotId_idx" ON "BehaviorBaseline"("snapshotId");

CREATE UNIQUE INDEX "BaselineObservation_baselineId_sequence_key" ON "BaselineObservation"("baselineId", "sequence");
CREATE INDEX "BaselineObservation_testCaseId_idx" ON "BaselineObservation"("testCaseId");

CREATE INDEX "MigrationRun_waveId_status_idx" ON "MigrationRun"("waveId", "status");
CREATE INDEX "MigrationRun_systemId_createdAt_idx" ON "MigrationRun"("systemId", "createdAt");
CREATE INDEX "MigrationRun_sourceSnapshotId_idx" ON "MigrationRun"("sourceSnapshotId");

CREATE UNIQUE INDEX "MigrationUnit_migrationRunId_stableKey_key" ON "MigrationUnit"("migrationRunId", "stableKey");
CREATE INDEX "MigrationUnit_migrationRunId_status_idx" ON "MigrationUnit"("migrationRunId", "status");

CREATE INDEX "CodeChange_migrationRunId_changeType_idx" ON "CodeChange"("migrationRunId", "changeType");
CREATE INDEX "CodeChange_sourceFileId_idx" ON "CodeChange"("sourceFileId");

CREATE UNIQUE INDEX "PullRequest_migrationRunId_key" ON "PullRequest"("migrationRunId");
CREATE UNIQUE INDEX "PullRequest_repositoryId_externalId_key" ON "PullRequest"("repositoryId", "externalId");

CREATE INDEX "ValidationRun_migrationRunId_type_status_idx" ON "ValidationRun"("migrationRunId", "type", "status");

CREATE INDEX "ValidationCheck_validationRunId_status_idx" ON "ValidationCheck"("validationRunId", "status");
CREATE INDEX "ValidationCheck_type_idx" ON "ValidationCheck"("type");

CREATE INDEX "TestRun_testSuiteId_status_idx" ON "TestRun"("testSuiteId", "status");
CREATE INDEX "TestRun_migrationRunId_idx" ON "TestRun"("migrationRunId");
CREATE INDEX "TestRun_validationRunId_idx" ON "TestRun"("validationRunId");

CREATE UNIQUE INDEX "TestResult_testRunId_testCaseId_key" ON "TestResult"("testRunId", "testCaseId");
CREATE INDEX "TestResult_testCaseId_status_idx" ON "TestResult"("testCaseId", "status");

CREATE INDEX "BehaviorComparison_validationRunId_status_idx" ON "BehaviorComparison"("validationRunId", "status");

CREATE INDEX "ApprovalRequest_organizationId_status_idx" ON "ApprovalRequest"("organizationId", "status");
CREATE INDEX "ApprovalRequest_subjectType_subjectId_idx" ON "ApprovalRequest"("subjectType", "subjectId");
CREATE INDEX "ApprovalRequest_projectId_idx" ON "ApprovalRequest"("projectId");

CREATE INDEX "RollbackRun_migrationRunId_status_idx" ON "RollbackRun"("migrationRunId", "status");

CREATE INDEX "DeploymentRun_migrationRunId_status_idx" ON "DeploymentRun"("migrationRunId", "status");
CREATE INDEX "DeploymentRun_environmentId_createdAt_idx" ON "DeploymentRun"("environmentId", "createdAt");

CREATE UNIQUE INDEX "MigrationPack_code_key" ON "MigrationPack"("code");

CREATE UNIQUE INDEX "MigrationPackVersion_migrationPackId_version_key" ON "MigrationPackVersion"("migrationPackId", "version");

CREATE INDEX "ModernizationPlan_projectId_status_idx" ON "ModernizationPlan"("projectId", "status");
CREATE INDEX "ModernizationPlan_systemId_idx" ON "ModernizationPlan"("systemId");

CREATE INDEX "ArchitectureModel_projectId_kind_idx" ON "ArchitectureModel"("projectId", "kind");
CREATE INDEX "ArchitectureModel_planId_idx" ON "ArchitectureModel"("planId");

CREATE UNIQUE INDEX "ArchitectureComponent_architectureId_stableKey_key" ON "ArchitectureComponent"("architectureId", "stableKey");

CREATE UNIQUE INDEX "ArchitectureRelation_architectureId_fromComponentId_toCompo_key" ON "ArchitectureRelation"("architectureId", "fromComponentId", "toComponentId", "kind");
CREATE INDEX "ArchitectureRelation_fromComponentId_idx" ON "ArchitectureRelation"("fromComponentId");
CREATE INDEX "ArchitectureRelation_toComponentId_idx" ON "ArchitectureRelation"("toComponentId");

CREATE UNIQUE INDEX "MigrationWave_planId_sequence_key" ON "MigrationWave"("planId", "sequence");
CREATE INDEX "MigrationWave_planId_status_idx" ON "MigrationWave"("planId", "status");

CREATE INDEX "WaveTarget_waveId_targetType_idx" ON "WaveTarget"("waveId", "targetType");
CREATE INDEX "WaveTarget_targetId_idx" ON "WaveTarget"("targetId");


CREATE UNIQUE INDEX "PlanMilestone_planId_sequence_key" ON "PlanMilestone"("planId", "sequence");

CREATE UNIQUE INDEX "Project_organizationId_key_key" ON "Project"("organizationId", "key");
CREATE INDEX "Project_organizationId_status_idx" ON "Project"("organizationId", "status");
CREATE INDEX "Project_deletedAt_idx" ON "Project"("deletedAt");

CREATE UNIQUE INDEX "LegacySystem_projectId_code_key" ON "LegacySystem"("projectId", "code");
CREATE INDEX "LegacySystem_projectId_criticality_idx" ON "LegacySystem"("projectId", "criticality");
CREATE INDEX "LegacySystem_deletedAt_idx" ON "LegacySystem"("deletedAt");

CREATE UNIQUE INDEX "Application_systemId_code_key" ON "Application"("systemId", "code");
CREATE INDEX "Application_systemId_type_idx" ON "Application"("systemId", "type");

CREATE UNIQUE INDEX "SystemEnvironment_systemId_name_key" ON "SystemEnvironment"("systemId", "name");

CREATE INDEX "SourceConnection_projectId_status_idx" ON "SourceConnection"("projectId", "status");
CREATE INDEX "SourceConnection_systemId_idx" ON "SourceConnection"("systemId");

CREATE INDEX "Repository_projectId_provider_idx" ON "Repository"("projectId", "provider");
CREATE INDEX "Repository_systemId_idx" ON "Repository"("systemId");
CREATE INDEX "Repository_projectId_provider_externalId_idx" ON "Repository"("projectId", "provider", "externalId");

CREATE INDEX "SourceSnapshot_projectId_createdAt_idx" ON "SourceSnapshot"("projectId", "createdAt");
CREATE INDEX "SourceSnapshot_systemId_createdAt_idx" ON "SourceSnapshot"("systemId", "createdAt");
CREATE INDEX "SourceSnapshot_repositoryId_commitSha_idx" ON "SourceSnapshot"("repositoryId", "commitSha");

CREATE UNIQUE INDEX "SourceFile_snapshotId_path_key" ON "SourceFile"("snapshotId", "path");
CREATE INDEX "SourceFile_snapshotId_artifactType_idx" ON "SourceFile"("snapshotId", "artifactType");
CREATE INDEX "SourceFile_language_idx" ON "SourceFile"("language");
CREATE INDEX "SourceFile_checksumSha256_idx" ON "SourceFile"("checksumSha256");

CREATE UNIQUE INDEX "Technology_key_key" ON "Technology"("key");
CREATE INDEX "Technology_kind_idx" ON "Technology"("kind");

CREATE UNIQUE INDEX "SystemTechnology_systemId_technologyId_version_key" ON "SystemTechnology"("systemId", "technologyId", "version");
CREATE INDEX "SystemTechnology_systemId_lifecycle_idx" ON "SystemTechnology"("systemId", "lifecycle");

CREATE INDEX "SoftwareDependency_snapshotId_status_idx" ON "SoftwareDependency"("snapshotId", "status");
CREATE INDEX "SoftwareDependency_name_version_idx" ON "SoftwareDependency"("name", "version");

CREATE UNIQUE INDEX "DependencyVulnerability_dependencyId_advisoryId_key" ON "DependencyVulnerability"("dependencyId", "advisoryId");
CREATE INDEX "DependencyVulnerability_cve_idx" ON "DependencyVulnerability"("cve");

CREATE UNIQUE INDEX "ScannerAgent_tokenHash_key" ON "ScannerAgent"("tokenHash");
CREATE INDEX "ScannerAgent_organizationId_status_idx" ON "ScannerAgent"("organizationId", "status");

CREATE UNIQUE INDEX "ScanSession_snapshotId_key" ON "ScanSession"("snapshotId");
CREATE INDEX "ScanSession_scannerAgentId_status_idx" ON "ScanSession"("scannerAgentId", "status");
CREATE INDEX "ScanSession_systemId_createdAt_idx" ON "ScanSession"("systemId", "createdAt");

CREATE INDEX "Report_organizationId_type_createdAt_idx" ON "Report"("organizationId", "type", "createdAt");
CREATE INDEX "Report_projectId_idx" ON "Report"("projectId");
CREATE INDEX "Report_systemId_idx" ON "Report"("systemId");

CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");
CREATE INDEX "Notification_organizationId_createdAt_idx" ON "Notification"("organizationId", "createdAt");

CREATE INDEX "AuditLog_organizationId_occurredAt_idx" ON "AuditLog"("organizationId", "occurredAt");
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX "AuditLog_actorUserId_occurredAt_idx" ON "AuditLog"("actorUserId", "occurredAt");

CREATE INDEX "SecurityEvent_organizationId_severity_createdAt_idx" ON "SecurityEvent"("organizationId", "severity", "createdAt");
CREATE INDEX "SecurityEvent_userId_createdAt_idx" ON "SecurityEvent"("userId", "createdAt");

CREATE INDEX "StorageObject_organizationId_provider_objectKey_versionId_idx" ON "StorageObject"("organizationId", "provider", "objectKey", "versionId");
CREATE INDEX "StorageObject_organizationId_classification_idx" ON "StorageObject"("organizationId", "classification");
CREATE INDEX "StorageObject_checksumSha256_idx" ON "StorageObject"("checksumSha256");

ALTER TABLE "AIProvider" ADD CONSTRAINT "AIProvider_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIProvider" ADD CONSTRAINT "AIProvider_secretRefId_fkey" FOREIGN KEY ("secretRefId") REFERENCES "SecretReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIModel" ADD CONSTRAINT "AIModel_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "AIProvider"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PromptTemplate" ADD CONSTRAINT "PromptTemplate_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "AIModel"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_promptTemplateId_fkey" FOREIGN KEY ("promptTemplateId") REFERENCES "PromptTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_requestStorageObjectId_fkey" FOREIGN KEY ("requestStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AIRun" ADD CONSTRAINT "AIRun_responseStorageObjectId_fkey" FOREIGN KEY ("responseStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisRun" ADD CONSTRAINT "AnalysisRun_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisStage" ADD CONSTRAINT "AnalysisStage_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "AnalysisRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Finding" ADD CONSTRAINT "Finding_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AnalysisMetric" ADD CONSTRAINT "AnalysisMetric_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Assessment" ADD CONSTRAINT "Assessment_methodologyId_fkey" FOREIGN KEY ("methodologyId") REFERENCES "AssessmentMethodology"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AssessmentScore" ADD CONSTRAINT "AssessmentScore_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModernizationRecommendation" ADD CONSTRAINT "ModernizationRecommendation_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModernizationRecommendation" ADD CONSTRAINT "ModernizationRecommendation_migrationPackId_fkey" FOREIGN KEY ("migrationPackId") REFERENCES "MigrationPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UserCredential" ADD CONSTRAINT "UserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserSession" ADD CONSTRAINT "UserSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "EmailVerificationToken" ADD CONSTRAINT "EmailVerificationToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationMembership" ADD CONSTRAINT "OrganizationMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrganizationInvitation" ADD CONSTRAINT "OrganizationInvitation_proposedRoleId_fkey" FOREIGN KEY ("proposedRoleId") REFERENCES "Role"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Role" ADD CONSTRAINT "Role_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_permissionId_fkey" FOREIGN KEY ("permissionId") REFERENCES "Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MembershipRole" ADD CONSTRAINT "MembershipRole_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAccess" ADD CONSTRAINT "ProjectAccess_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAccess" ADD CONSTRAINT "ProjectAccess_membershipId_fkey" FOREIGN KEY ("membershipId") REFERENCES "OrganizationMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProjectAccess" ADD CONSTRAINT "ProjectAccess_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ApiKey" ADD CONSTRAINT "ApiKey_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecretReference" ADD CONSTRAINT "SecretReference_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IntegrationConnection" ADD CONSTRAINT "IntegrationConnection_secretRefId_fkey" FOREIGN KEY ("secretRefId") REFERENCES "SecretReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeploymentInstance" ADD CONSTRAINT "DeploymentInstance_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "BillingPrice" ADD CONSTRAINT "BillingPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanEntitlement" ADD CONSTRAINT "PlanEntitlement_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "BillingPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_priceId_fkey" FOREIGN KEY ("priceId") REFERENCES "BillingPrice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "UsageEvent" ADD CONSTRAINT "UsageEvent_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkerNode" ADD CONSTRAINT "WorkerNode_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WorkerNode" ADD CONSTRAINT "WorkerNode_deploymentInstanceId_fkey" FOREIGN KEY ("deploymentInstanceId") REFERENCES "DeploymentInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_workerId_fkey" FOREIGN KEY ("workerId") REFERENCES "WorkerNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Job" ADD CONSTRAINT "Job_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "JobLog" ADD CONSTRAINT "JobLog_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "Job"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemDomain" ADD CONSTRAINT "SystemDomain_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemDomain" ADD CONSTRAINT "SystemDomain_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemDomain" ADD CONSTRAINT "SystemDomain_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "SystemDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DomainNode" ADD CONSTRAINT "DomainNode_domainId_fkey" FOREIGN KEY ("domainId") REFERENCES "SystemDomain"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DomainNode" ADD CONSTRAINT "DomainNode_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeNode" ADD CONSTRAINT "KnowledgeNode_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_fromNodeId_fkey" FOREIGN KEY ("fromNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnowledgeEdge" ADD CONSTRAINT "KnowledgeEdge_toNodeId_fkey" FOREIGN KEY ("toNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRule" ADD CONSTRAINT "BusinessRule_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessRuleEvidence" ADD CONSTRAINT "BusinessRuleEvidence_businessRuleId_fkey" FOREIGN KEY ("businessRuleId") REFERENCES "BusinessRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessRuleEvidence" ADD CONSTRAINT "BusinessRuleEvidence_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessRuleEvidence" ADD CONSTRAINT "BusinessRuleEvidence_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessProcess" ADD CONSTRAINT "BusinessProcess_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessProcess" ADD CONSTRAINT "BusinessProcess_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessProcess" ADD CONSTRAINT "BusinessProcess_entryNodeId_fkey" FOREIGN KEY ("entryNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessProcessStep" ADD CONSTRAINT "BusinessProcessStep_businessProcessId_fkey" FOREIGN KEY ("businessProcessId") REFERENCES "BusinessProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BusinessProcessStep" ADD CONSTRAINT "BusinessProcessStep_knowledgeNodeId_fkey" FOREIGN KEY ("knowledgeNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BusinessProcessStep" ADD CONSTRAINT "BusinessProcessStep_businessRuleId_fkey" FOREIGN KEY ("businessRuleId") REFERENCES "BusinessRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestSuite" ADD CONSTRAINT "TestSuite_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_suiteId_fkey" FOREIGN KEY ("suiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_testCodeStorageObjectId_fkey" FOREIGN KEY ("testCodeStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestCase" ADD CONSTRAINT "TestCase_createdByAiRunId_fkey" FOREIGN KEY ("createdByAiRunId") REFERENCES "AIRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehaviorBaseline" ADD CONSTRAINT "BehaviorBaseline_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehaviorBaseline" ADD CONSTRAINT "BehaviorBaseline_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehaviorBaseline" ADD CONSTRAINT "BehaviorBaseline_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehaviorBaseline" ADD CONSTRAINT "BehaviorBaseline_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "SystemEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehaviorBaseline" ADD CONSTRAINT "BehaviorBaseline_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BaselineObservation" ADD CONSTRAINT "BaselineObservation_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "BehaviorBaseline"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BaselineObservation" ADD CONSTRAINT "BaselineObservation_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BaselineObservation" ADD CONSTRAINT "BaselineObservation_artifactStorageObjectId_fkey" FOREIGN KEY ("artifactStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "MigrationWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_sourceSnapshotId_fkey" FOREIGN KEY ("sourceSnapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_migrationPackVersionId_fkey" FOREIGN KEY ("migrationPackVersionId") REFERENCES "MigrationPackVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationUnit" ADD CONSTRAINT "MigrationUnit_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MigrationUnit" ADD CONSTRAINT "MigrationUnit_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationUnit" ADD CONSTRAINT "MigrationUnit_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationUnit" ADD CONSTRAINT "MigrationUnit_outputStorageObjectId_fkey" FOREIGN KEY ("outputStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodeChange" ADD CONSTRAINT "CodeChange_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CodeChange" ADD CONSTRAINT "CodeChange_migrationUnitId_fkey" FOREIGN KEY ("migrationUnitId") REFERENCES "MigrationUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodeChange" ADD CONSTRAINT "CodeChange_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodeChange" ADD CONSTRAINT "CodeChange_originalStorageObjectId_fkey" FOREIGN KEY ("originalStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodeChange" ADD CONSTRAINT "CodeChange_migratedStorageObjectId_fkey" FOREIGN KEY ("migratedStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CodeChange" ADD CONSTRAINT "CodeChange_diffStorageObjectId_fkey" FOREIGN KEY ("diffStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PullRequest" ADD CONSTRAINT "PullRequest_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValidationRun" ADD CONSTRAINT "ValidationRun_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValidationRun" ADD CONSTRAINT "ValidationRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "SystemEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ValidationCheck" ADD CONSTRAINT "ValidationCheck_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "ValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ValidationCheck" ADD CONSTRAINT "ValidationCheck_evidenceStorageObjectId_fkey" FOREIGN KEY ("evidenceStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_testSuiteId_fkey" FOREIGN KEY ("testSuiteId") REFERENCES "TestSuite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_baselineId_fkey" FOREIGN KEY ("baselineId") REFERENCES "BehaviorBaseline"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "ValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "SystemEnvironment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestRun" ADD CONSTRAINT "TestRun_logsStorageObjectId_fkey" FOREIGN KEY ("logsStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testRunId_fkey" FOREIGN KEY ("testRunId") REFERENCES "TestRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TestResult" ADD CONSTRAINT "TestResult_artifactStorageObjectId_fkey" FOREIGN KEY ("artifactStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehaviorComparison" ADD CONSTRAINT "BehaviorComparison_validationRunId_fkey" FOREIGN KEY ("validationRunId") REFERENCES "ValidationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BehaviorComparison" ADD CONSTRAINT "BehaviorComparison_testCaseId_fkey" FOREIGN KEY ("testCaseId") REFERENCES "TestCase"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "BehaviorComparison" ADD CONSTRAINT "BehaviorComparison_artifactStorageObjectId_fkey" FOREIGN KEY ("artifactStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_assignedToMembershipId_fkey" FOREIGN KEY ("assignedToMembershipId") REFERENCES "OrganizationMembership"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ApprovalRequest" ADD CONSTRAINT "ApprovalRequest_decisionByUserId_fkey" FOREIGN KEY ("decisionByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RollbackRun" ADD CONSTRAINT "RollbackRun_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RollbackRun" ADD CONSTRAINT "RollbackRun_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_migrationRunId_fkey" FOREIGN KEY ("migrationRunId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_environmentId_fkey" FOREIGN KEY ("environmentId") REFERENCES "SystemEnvironment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_artifactStorageObjectId_fkey" FOREIGN KEY ("artifactStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_logsStorageObjectId_fkey" FOREIGN KEY ("logsStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DeploymentRun" ADD CONSTRAINT "DeploymentRun_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MigrationPackVersion" ADD CONSTRAINT "MigrationPackVersion_migrationPackId_fkey" FOREIGN KEY ("migrationPackId") REFERENCES "MigrationPack"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MigrationPackVersion" ADD CONSTRAINT "MigrationPackVersion_ruleSetStorageObjectId_fkey" FOREIGN KEY ("ruleSetStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModernizationPlan" ADD CONSTRAINT "ModernizationPlan_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ModernizationPlan" ADD CONSTRAINT "ModernizationPlan_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModernizationPlan" ADD CONSTRAINT "ModernizationPlan_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "Assessment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModernizationPlan" ADD CONSTRAINT "ModernizationPlan_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ModernizationPlan" ADD CONSTRAINT "ModernizationPlan_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArchitectureModel" ADD CONSTRAINT "ArchitectureModel_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchitectureModel" ADD CONSTRAINT "ArchitectureModel_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArchitectureModel" ADD CONSTRAINT "ArchitectureModel_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ModernizationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchitectureComponent" ADD CONSTRAINT "ArchitectureComponent_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "ArchitectureModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchitectureComponent" ADD CONSTRAINT "ArchitectureComponent_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "KnowledgeNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ArchitectureRelation" ADD CONSTRAINT "ArchitectureRelation_architectureId_fkey" FOREIGN KEY ("architectureId") REFERENCES "ArchitectureModel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchitectureRelation" ADD CONSTRAINT "ArchitectureRelation_fromComponentId_fkey" FOREIGN KEY ("fromComponentId") REFERENCES "ArchitectureComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ArchitectureRelation" ADD CONSTRAINT "ArchitectureRelation_toComponentId_fkey" FOREIGN KEY ("toComponentId") REFERENCES "ArchitectureComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MigrationWave" ADD CONSTRAINT "MigrationWave_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ModernizationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaveTarget" ADD CONSTRAINT "WaveTarget_waveId_fkey" FOREIGN KEY ("waveId") REFERENCES "MigrationWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaveDependency" ADD CONSTRAINT "WaveDependency_fromWaveId_fkey" FOREIGN KEY ("fromWaveId") REFERENCES "MigrationWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WaveDependency" ADD CONSTRAINT "WaveDependency_toWaveId_fkey" FOREIGN KEY ("toWaveId") REFERENCES "MigrationWave"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PlanMilestone" ADD CONSTRAINT "PlanMilestone_planId_fkey" FOREIGN KEY ("planId") REFERENCES "ModernizationPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "LegacySystem" ADD CONSTRAINT "LegacySystem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Application" ADD CONSTRAINT "Application_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemEnvironment" ADD CONSTRAINT "SystemEnvironment_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemEnvironment" ADD CONSTRAINT "SystemEnvironment_secretRefId_fkey" FOREIGN KEY ("secretRefId") REFERENCES "SecretReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceConnection" ADD CONSTRAINT "SourceConnection_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceConnection" ADD CONSTRAINT "SourceConnection_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceConnection" ADD CONSTRAINT "SourceConnection_scannerAgentId_fkey" FOREIGN KEY ("scannerAgentId") REFERENCES "ScannerAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceConnection" ADD CONSTRAINT "SourceConnection_secretRefId_fkey" FOREIGN KEY ("secretRefId") REFERENCES "SecretReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES "SourceConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Repository" ADD CONSTRAINT "Repository_secretRefId_fkey" FOREIGN KEY ("secretRefId") REFERENCES "SecretReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_repositoryId_fkey" FOREIGN KEY ("repositoryId") REFERENCES "Repository"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES "SourceConnection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_packageStorageObjectId_fkey" FOREIGN KEY ("packageStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceSnapshot" ADD CONSTRAINT "SourceSnapshot_manifestStorageObjectId_fkey" FOREIGN KEY ("manifestStorageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_storageObjectId_fkey" FOREIGN KEY ("storageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SystemTechnology" ADD CONSTRAINT "SystemTechnology_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SystemTechnology" ADD CONSTRAINT "SystemTechnology_technologyId_fkey" FOREIGN KEY ("technologyId") REFERENCES "Technology"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SoftwareDependency" ADD CONSTRAINT "SoftwareDependency_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SoftwareDependency" ADD CONSTRAINT "SoftwareDependency_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "DependencyVulnerability" ADD CONSTRAINT "DependencyVulnerability_dependencyId_fkey" FOREIGN KEY ("dependencyId") REFERENCES "SoftwareDependency"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScannerAgent" ADD CONSTRAINT "ScannerAgent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScannerAgent" ADD CONSTRAINT "ScannerAgent_deploymentInstanceId_fkey" FOREIGN KEY ("deploymentInstanceId") REFERENCES "DeploymentInstance"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScanSession" ADD CONSTRAINT "ScanSession_scannerAgentId_fkey" FOREIGN KEY ("scannerAgentId") REFERENCES "ScannerAgent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanSession" ADD CONSTRAINT "ScanSession_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanSession" ADD CONSTRAINT "ScanSession_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES "SourceConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScanSession" ADD CONSTRAINT "ScanSession_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "SourceSnapshot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScanSession" ADD CONSTRAINT "ScanSession_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_systemId_fkey" FOREIGN KEY ("systemId") REFERENCES "LegacySystem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_storageObjectId_fkey" FOREIGN KEY ("storageObjectId") REFERENCES "StorageObject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedByUserId_fkey" FOREIGN KEY ("generatedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Report" ADD CONSTRAINT "Report_generatedByAiRunId_fkey" FOREIGN KEY ("generatedByAiRunId") REFERENCES "AIRun"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "SecurityEvent" ADD CONSTRAINT "SecurityEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StorageObject" ADD CONSTRAINT "StorageObject_encryptionKeyRefId_fkey" FOREIGN KEY ("encryptionKeyRefId") REFERENCES "SecretReference"("id") ON DELETE SET NULL ON UPDATE CASCADE;
