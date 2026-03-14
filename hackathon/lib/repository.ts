import type {
  Application as PrismaApplication,
  ApplicationDataSource as PrismaApplicationDataSource,
  ApplicationDocument as PrismaApplicationDocument,
  AuditLog as PrismaAuditLog,
  DataSourceConnection as PrismaDataSourceConnection,
  FraudAlert as PrismaFraudAlert,
  FraudCase as PrismaFraudCase,
  IngestionRun as PrismaIngestionRun,
  ModelEvaluation as PrismaModelEvaluation,
  ModelVersion as PrismaModelVersion,
  PortfolioMetric as PrismaPortfolioMetric,
  Prisma,
  RiskScore as PrismaRiskScore,
  Workflow as PrismaWorkflow,
} from "@prisma/client";
import { assessApplication } from "@/lib/risk-engine";
import {
  mockApplicationDataSources,
  mockApplicationDocuments,
  mockApplications,
  mockAuditEvents,
  buildDashboardSnapshot,
  mockDataSourceConnections,
  mockFraudAlerts,
  mockFraudCases,
  mockIngestionRuns,
  mockModelEvaluations,
  mockModelVersions,
  mockPortfolioConcentrations,
  mockPortfolioMetrics,
  mockRiskScores,
  mockWorkflows,
} from "@/lib/mock-data";
import { getCurrentProfile } from "@/lib/auth";
import { evaluateModels } from "@/lib/model-lab";
import { getPrismaClient, hasDatabaseUrl } from "@/lib/prisma";
import { createSupabaseStorageAdminClient, hasSupabaseStorageEnv } from "@/lib/supabase/storage-admin";
import { buildApplicationDataSources, buildFraudCases } from "@/lib/underwriting-intelligence";
import { evaluateWorkflow, normalizeWorkflowConfig } from "@/lib/workflow-engine";
import type {
  Application,
  ApplicationDataSource,
  ApplicationDocument,
  AuditEvent,
  DashboardSnapshot,
  DataSourceConnection,
  DecisionAction,
  DecisionPayload,
  FraudAlert,
  FraudCase,
  IngestionRun,
  ModelEvaluation,
  ModelVersion,
  PortfolioConcentration,
  PortfolioMetric,
  RiskAssessment,
  SourceIngestionInput,
  WorkflowDefinition,
} from "@/lib/types";

function sortByNewest<T extends { submittedAt: string }>(items: T[]) {
  return [...items].sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
}

function scalarToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "string") return Number(value);
  if (value && typeof value === "object" && "toNumber" in value && typeof value.toNumber === "function") {
    return value.toNumber();
  }
  return 0;
}

function jsonRecord(value: unknown): Record<string, string | number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, string | number] => {
      const item = entry[1];
      return typeof item === "string" || typeof item === "number";
    }),
  );
}

function jsonArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return value as Prisma.InputJsonValue;
}

function mapApplicationRow(row: PrismaApplication): Application {
  return {
    id: row.id,
    organizationId: row.organizationId ?? undefined,
    externalRef: row.externalRef,
    customerName: row.customerName,
    email: row.email,
    productLine: row.productLine as Application["productLine"],
    amountRequested: scalarToNumber(row.amountRequested),
    annualIncome: scalarToNumber(row.annualIncome),
    creditScore: row.creditScore,
    debtToIncome: scalarToNumber(row.debtToIncome),
    claimsCount: row.claimsCount,
    fraudSignals: row.fraudSignals,
    documentConfidence: scalarToNumber(row.documentConfidence),
    geospatialRisk: scalarToNumber(row.geospatialRisk),
    state: row.state,
    status: row.status as Application["status"],
    workflowStage: row.workflowStage,
    submittedAt: row.submittedAt.toISOString(),
  };
}

function mapRiskRow(row: PrismaRiskScore): RiskAssessment {
  return {
    applicationId: row.applicationId,
    score: Math.round(scalarToNumber(row.score)),
    band: row.band as RiskAssessment["band"],
    fraudProbability: Math.round(scalarToNumber(row.fraudProbability)),
    documentConfidence: scalarToNumber(row.documentConfidence),
    recommendation: row.recommendation as RiskAssessment["recommendation"],
    reasons: row.reasons,
    factors: jsonArray<RiskAssessment["factors"][number]>(row.factors),
    modelVersion: row.modelVersion,
    generatedAt: row.generatedAt.toISOString(),
  };
}

function mapAuditRow(row: PrismaAuditLog): AuditEvent {
  return {
    id: row.id,
    applicationId: row.applicationId,
    actor: row.actor,
    action: row.action,
    details: row.details,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapModelRow(row: PrismaModelVersion): ModelVersion {
  return {
    id: row.id,
    name: row.name,
    version: row.version,
    status: row.status as ModelVersion["status"],
    auc: scalarToNumber(row.auc),
    precision: scalarToNumber(row.precision),
    recall: scalarToNumber(row.recall),
    drift: scalarToNumber(row.drift),
    trafficShare: scalarToNumber(row.trafficShare),
    approvalThreshold: scalarToNumber(row.approvalThreshold),
    deployedAt: row.deployedAt.toISOString().slice(0, 10),
    notes: row.notes,
  };
}

function mapFraudAlertRow(row: PrismaFraudAlert): FraudAlert {
  return {
    id: row.id,
    applicationId: row.applicationId,
    customerName: row.customerName,
    severity: row.severity as FraudAlert["severity"],
    reason: row.reason,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDataSourceRow(row: PrismaApplicationDataSource): ApplicationDataSource {
  return {
    id: row.id,
    applicationId: row.applicationId,
    sourceType: row.sourceType as ApplicationDataSource["sourceType"],
    status: row.status as ApplicationDataSource["status"],
    confidence: scalarToNumber(row.confidence),
    freshnessHours: row.freshnessHours,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDataSourceConnectionRow(row: PrismaDataSourceConnection): DataSourceConnection {
  return {
    id: row.id,
    organizationId: row.organizationId ?? undefined,
    sourceType: row.sourceType as DataSourceConnection["sourceType"],
    providerName: row.providerName,
    status: row.status as DataSourceConnection["status"],
    syncMode: row.syncMode as DataSourceConnection["syncMode"],
    defaultFreshnessHours: row.defaultFreshnessHours,
    coverage: scalarToNumber(row.coverage),
    notes: row.notes,
    lastSyncAt: row.lastSyncAt ? row.lastSyncAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapIngestionRunRow(row: PrismaIngestionRun): IngestionRun {
  return {
    id: row.id,
    organizationId: row.organizationId ?? undefined,
    applicationId: row.applicationId ?? undefined,
    sourceType: row.sourceType as IngestionRun["sourceType"],
    providerName: row.providerName,
    status: row.status as IngestionRun["status"],
    recordsProcessed: row.recordsProcessed,
    triggeredBy: row.triggeredBy,
    detail: row.detail,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapFraudCaseRow(row: PrismaFraudCase): FraudCase {
  return {
    id: row.id,
    applicationId: row.applicationId,
    category: row.category as FraudCase["category"],
    score: scalarToNumber(row.score),
    status: row.status as FraudCase["status"],
    explanation: row.explanation,
    createdAt: row.createdAt.toISOString(),
  };
}

function mapModelEvaluationRow(row: PrismaModelEvaluation): ModelEvaluation {
  return {
    id: row.id,
    applicationId: row.applicationId,
    modelVersionId: row.modelVersionId,
    modelName: row.modelName,
    version: row.version,
    lane: row.lane as ModelEvaluation["lane"],
    score: scalarToNumber(row.score),
    recommendation: row.recommendation as ModelEvaluation["recommendation"],
    deltaFromChampion: scalarToNumber(row.deltaFromChampion),
    verdict: row.verdict as ModelEvaluation["verdict"],
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDocumentRow(row: PrismaApplicationDocument): ApplicationDocument {
  return {
    id: row.id,
    applicationId: row.applicationId,
    fileName: row.fileName,
    mimeType: row.mimeType,
    sizeBytes: scalarToNumber(row.sizeBytes),
    documentType: row.documentType as ApplicationDocument["documentType"],
    verificationStatus: row.verificationStatus as ApplicationDocument["verificationStatus"],
    extractedConfidence: scalarToNumber(row.extractedConfidence),
    analysisSummary: row.analysisSummary,
    extractedData: jsonRecord(row.extractedData),
    storagePath: row.storagePath,
    uploadedAt: row.createdAt.toISOString(),
  };
}

function mapWorkflowRow(row: PrismaWorkflow): WorkflowDefinition {
  return {
    id: row.id,
    organizationId: row.organizationId ?? undefined,
    name: row.name,
    config: normalizeWorkflowConfig(row.config),
    createdAt: row.createdAt.toISOString(),
  };
}

function mapDecisionToApplicationState(
  decision: DecisionAction,
  workflowStage = "underwriter_review",
): Pick<Application, "status" | "workflowStage"> {
  if (decision === "auto_approve") {
    return {
      status: "approved",
      workflowStage: "decisioned",
    };
  }

  if (decision === "decline") {
    return {
      status: "declined",
      workflowStage: "decisioned",
    };
  }

  return {
    status: "manual_review",
    workflowStage,
  };
}

function addMockAuditEvent(event: AuditEvent) {
  mockAuditEvents.unshift(event);
}

function updateMockApplicationState(
  applicationId: string,
  nextState: Pick<Application, "status" | "workflowStage">,
) {
  const application = mockApplications.find((item) => item.id === applicationId);

  if (!application) {
    return null;
  }

  application.status = nextState.status;
  application.workflowStage = nextState.workflowStage;

  return application;
}

function upsertMockRiskScore(assessment: RiskAssessment) {
  const existingIndex = mockRiskScores.findIndex((item) => item.applicationId === assessment.applicationId);

  if (existingIndex >= 0) {
    mockRiskScores[existingIndex] = assessment;
    return;
  }

  mockRiskScores.unshift(assessment);
}

function replaceMockModelEvaluations(applicationId: string, evaluations: ModelEvaluation[]) {
  const remaining = mockModelEvaluations.filter((item) => item.applicationId !== applicationId);
  mockModelEvaluations.splice(0, mockModelEvaluations.length, ...evaluations, ...remaining);
}

function replaceMockDataSources(applicationId: string, sources: ApplicationDataSource[]) {
  const remaining = mockApplicationDataSources.filter((item) => item.applicationId !== applicationId);
  mockApplicationDataSources.splice(0, mockApplicationDataSources.length, ...sources, ...remaining);
}

function replaceMockFraudCases(applicationId: string, cases: FraudCase[]) {
  const remaining = mockFraudCases.filter((item) => item.applicationId !== applicationId);
  mockFraudCases.splice(0, mockFraudCases.length, ...cases, ...remaining);
}

function safeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function tenantOrGlobalWhere(organizationId: string | null) {
  return organizationId ? { OR: [{ organizationId }, { organizationId: null }] } : { organizationId: null };
}

function applicationRelationScope(organizationId: string | null) {
  return {
    application: {
      is: tenantOrGlobalWhere(organizationId),
    },
  };
}

async function getOrganizationId() {
  if (!hasDatabaseUrl()) {
    return null;
  }

  const profile = await getCurrentProfile();
  return profile?.organizationId ?? null;
}

async function maybeCreateFraudAlert(application: Application, assessment: RiskAssessment) {
  if (assessment.fraudProbability < 45 && application.fraudSignals.length === 0) {
    return;
  }

  const reason =
    application.fraudSignals.length > 0
      ? `Borrower flagged for ${application.fraudSignals.join(", ")} during intake.`
      : "Fraud model elevated this file for manual review.";

  if (!hasDatabaseUrl()) {
    const existing = mockFraudAlerts.find((alert) => alert.applicationId === application.id);
    if (existing) {
      return;
    }

    mockFraudAlerts.unshift({
      id: crypto.randomUUID(),
      applicationId: application.id,
      customerName: application.customerName,
      severity: assessment.fraudProbability >= 70 ? "high" : "medium",
      reason,
      createdAt: new Date().toISOString(),
    });
    return;
  }

  try {
    const prisma = getPrismaClient();
    const existingAlert = await prisma.fraudAlert.findFirst({
      where: {
        applicationId: application.id,
      },
      select: { id: true },
    });

    if (existingAlert) {
      return;
    }

    await prisma.fraudAlert.create({
      data: {
        applicationId: application.id,
        customerName: application.customerName,
        severity: assessment.fraudProbability >= 70 ? "high" : "medium",
        reason,
      },
    });
  } catch (error) {
    console.error("Failed to create fraud alert.", error);
  }
}

async function tryDatabase<T>(task: () => Promise<T>, fallback: T): Promise<T> {
  if (!hasDatabaseUrl()) {
    return fallback;
  }

  try {
    return await task();
  } catch (error) {
    console.error("Database query failed, falling back to mock data.", error);
    return fallback;
  }
}

export async function listApplications(): Promise<Application[]> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.application.findMany({
      where: tenantOrGlobalWhere(organizationId),
      orderBy: { submittedAt: "desc" },
    });
    return rows.map(mapApplicationRow);
  }, sortByNewest(mockApplications));
}

export async function listWorkflows(): Promise<WorkflowDefinition[]> {
  const fallback = mockWorkflows;

  if (!hasDatabaseUrl()) {
    return fallback;
  }

  const organizationId = await getOrganizationId();
  if (!organizationId) {
    return [];
  }

  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const rows = await prisma.workflow.findMany({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapWorkflowRow);
  }, fallback);
}

export async function listApplicationDocuments(applicationId: string): Promise<ApplicationDocument[]> {
  const fallback = mockApplicationDocuments.filter((document) => document.applicationId === applicationId);

  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.applicationDocument.findMany({
      where: {
        applicationId,
        ...applicationRelationScope(organizationId),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapDocumentRow);
  }, fallback);
}

export async function listApplicationDataSources(applicationId: string): Promise<ApplicationDataSource[]> {
  const fallback = mockApplicationDataSources.filter((source) => source.applicationId === applicationId);

  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.applicationDataSource.findMany({
      where: {
        applicationId,
        ...applicationRelationScope(organizationId),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapDataSourceRow);
  }, fallback);
}

export async function listDataSourceConnections(): Promise<DataSourceConnection[]> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.dataSourceConnection.findMany({
      where: tenantOrGlobalWhere(organizationId),
      orderBy: [{ status: "asc" }, { sourceType: "asc" }],
    });
    return rows.map(mapDataSourceConnectionRow);
  }, mockDataSourceConnections);
}

export async function listIngestionRuns(applicationId?: string): Promise<IngestionRun[]> {
  const fallback = applicationId
    ? mockIngestionRuns.filter((item) => item.applicationId === applicationId)
    : mockIngestionRuns;

  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.ingestionRun.findMany({
      where: {
        ...(applicationId ? { applicationId } : {}),
        OR: [
          ...(organizationId ? [{ organizationId }] : []),
          { application: { is: tenantOrGlobalWhere(organizationId) } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapIngestionRunRow);
  }, fallback);
}

export async function createDataSourceConnection(
  payload: Omit<DataSourceConnection, "id" | "organizationId" | "lastSyncAt" | "createdAt">,
  organizationId?: string,
): Promise<DataSourceConnection> {
  const connection: DataSourceConnection = {
    id: crypto.randomUUID(),
    organizationId,
    ...payload,
    lastSyncAt: null,
    createdAt: new Date().toISOString(),
  };

  if (!hasDatabaseUrl()) {
    mockDataSourceConnections.unshift(connection);
    return connection;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.dataSourceConnection.create({
      data: {
        id: connection.id,
        organizationId: organizationId ?? null,
        sourceType: connection.sourceType,
        providerName: connection.providerName,
        status: connection.status,
        syncMode: connection.syncMode,
        defaultFreshnessHours: connection.defaultFreshnessHours,
        coverage: connection.coverage,
        notes: connection.notes,
      },
    });
    return mapDataSourceConnectionRow(row);
  } catch (error) {
    console.error("Failed to create data source connection.", error);
    return connection;
  }
}

export async function createIngestionRun(
  payload: Omit<IngestionRun, "id" | "organizationId" | "createdAt">,
  organizationId?: string,
): Promise<IngestionRun> {
  const run: IngestionRun = {
    id: crypto.randomUUID(),
    organizationId,
    ...payload,
    createdAt: new Date().toISOString(),
  };

  if (!hasDatabaseUrl()) {
    mockIngestionRuns.unshift(run);
    return run;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.ingestionRun.create({
      data: {
        id: run.id,
        organizationId: organizationId ?? null,
        applicationId: run.applicationId ?? null,
        sourceType: run.sourceType,
        providerName: run.providerName,
        status: run.status,
        recordsProcessed: run.recordsProcessed,
        triggeredBy: run.triggeredBy,
        detail: run.detail,
      },
    });
    return mapIngestionRunRow(row);
  } catch (error) {
    console.error("Failed to create ingestion run.", error);
    return run;
  }
}

export async function ingestApplicationSource(
  applicationId: string,
  source: SourceIngestionInput,
  triggeredBy: string,
  organizationId?: string,
) {
  const runStatus =
    source.status === "ingested" ? "succeeded" : source.status === "warning" ? "partial" : "failed";

  if (!hasDatabaseUrl()) {
    const existingIndex = mockApplicationDataSources.findIndex(
      (item) => item.applicationId === applicationId && item.sourceType === source.sourceType,
    );
    const nextSource: ApplicationDataSource = {
      id: existingIndex >= 0 ? mockApplicationDataSources[existingIndex].id : crypto.randomUUID(),
      applicationId,
      sourceType: source.sourceType,
      status: source.status,
      confidence: source.confidence,
      freshnessHours: source.freshnessHours,
      detail: `${source.providerName}: ${source.detail}`,
      createdAt: new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      mockApplicationDataSources[existingIndex] = nextSource;
    } else {
      mockApplicationDataSources.unshift(nextSource);
    }

    mockIngestionRuns.unshift({
      id: crypto.randomUUID(),
      organizationId,
      applicationId,
      sourceType: source.sourceType,
      providerName: source.providerName,
      status: runStatus,
      recordsProcessed: source.recordsProcessed ?? 1,
      triggeredBy,
      detail: source.detail,
      createdAt: new Date().toISOString(),
    });
    return nextSource;
  }

  try {
    const prisma = getPrismaClient();
    return await prisma.$transaction(async (tx) => {
      await tx.applicationDataSource.deleteMany({
        where: {
          applicationId,
          sourceType: source.sourceType,
        },
      });

      const row = await tx.applicationDataSource.create({
        data: {
          applicationId,
          sourceType: source.sourceType,
          status: source.status,
          confidence: source.confidence,
          freshnessHours: source.freshnessHours,
          detail: `${source.providerName}: ${source.detail}`,
        },
      });

      await tx.ingestionRun.create({
        data: {
          organizationId: organizationId ?? null,
          applicationId,
          sourceType: source.sourceType,
          providerName: source.providerName,
          status: runStatus,
          recordsProcessed: source.recordsProcessed ?? 1,
          triggeredBy,
          detail: source.detail,
        },
      });

      return mapDataSourceRow(row);
    });
  } catch (error) {
    console.error("Failed to ingest application source.", error);
    return null;
  }
}

export async function listFraudCases(applicationId?: string): Promise<FraudCase[]> {
  const fallback = applicationId ? mockFraudCases.filter((item) => item.applicationId === applicationId) : mockFraudCases;

  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.fraudCase.findMany({
      where: {
        ...(applicationId ? { applicationId } : {}),
        ...applicationRelationScope(organizationId),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapFraudCaseRow);
  }, fallback);
}

export async function updateFraudCaseStatus(
  caseId: string,
  status: FraudCase["status"],
  actor?: string,
) {
  if (!hasDatabaseUrl()) {
    const item = mockFraudCases.find((entry) => entry.id === caseId);
    if (item) item.status = status;
    return item ?? null;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.fraudCase.update({
        where: { id: caseId },
        data: { status },
      });

      if (actor) {
        await tx.auditLog.create({
          data: {
            applicationId: updated.applicationId,
            actor,
            action: "Fraud case updated",
            details: `Fraud case ${updated.category.replace(/_/g, " ")} moved to ${status}.`,
          },
        });
      }

      return updated;
    });

    return mapFraudCaseRow(row);
  } catch (error) {
    console.error("Failed to update fraud case status.", error);
    return null;
  }
}

export async function listModelEvaluations(applicationId?: string): Promise<ModelEvaluation[]> {
  const fallback = applicationId
    ? mockModelEvaluations.filter((item) => item.applicationId === applicationId)
    : mockModelEvaluations;

  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.modelEvaluation.findMany({
      where: {
        ...(applicationId ? { applicationId } : {}),
        ...applicationRelationScope(organizationId),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapModelEvaluationRow);
  }, fallback);
}

export async function getApplicationById(id: string): Promise<Application | null> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const row = await prisma.application.findFirst({
      where: {
        id,
        ...tenantOrGlobalWhere(organizationId),
      },
    });
    return row ? mapApplicationRow(row) : null;
  }, mockApplications.find((application) => application.id === id) ?? null);
}

export async function updateApplicationDocumentStatus(
  documentId: string,
  status: ApplicationDocument["verificationStatus"],
  actor?: string,
) {
  if (!hasDatabaseUrl()) {
    const item = mockApplicationDocuments.find((entry) => entry.id === documentId);
    if (item) item.verificationStatus = status;
    return item ?? null;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.$transaction(async (tx) => {
      const updated = await tx.applicationDocument.update({
        where: { id: documentId },
        data: { verificationStatus: status },
      });

      if (actor) {
        await tx.auditLog.create({
          data: {
            applicationId: updated.applicationId,
            actor,
            action: "Document review updated",
            details: `${updated.fileName} marked ${status}.`,
          },
        });
      }

      return updated;
    });

    return mapDocumentRow(row);
  } catch (error) {
    console.error("Failed to update document review status.", error);
    return null;
  }
}

export async function listRiskScores(): Promise<RiskAssessment[]> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.riskScore.findMany({
      where: applicationRelationScope(organizationId),
      orderBy: { generatedAt: "desc" },
    });
    return rows.map(mapRiskRow);
  }, mockRiskScores);
}

export async function getRiskScoreByApplicationId(applicationId: string): Promise<RiskAssessment | null> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const row = await prisma.riskScore.findFirst({
      where: {
        applicationId,
        ...applicationRelationScope(organizationId),
      },
    });
    return row ? mapRiskRow(row) : null;
  }, mockRiskScores.find((score) => score.applicationId === applicationId) ?? null);
}

export async function listAuditEventsByApplicationId(applicationId: string): Promise<AuditEvent[]> {
  const fallback = mockAuditEvents.filter((event) => event.applicationId === applicationId);

  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.auditLog.findMany({
      where: {
        applicationId,
        ...applicationRelationScope(organizationId),
      },
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapAuditRow);
  }, fallback);
}

export async function listModelVersions(): Promise<ModelVersion[]> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.modelVersion.findMany({
      where: tenantOrGlobalWhere(organizationId),
      orderBy: { deployedAt: "desc" },
    });
    return rows.map(mapModelRow);
  }, mockModelVersions);
}

export async function createModelVersion(
  payload: Omit<ModelVersion, "id" | "status"> & {
    status?: ModelVersion["status"];
    organizationId?: string;
  },
): Promise<ModelVersion> {
  const model: ModelVersion = {
    id: crypto.randomUUID(),
    status: payload.status ?? "challenger",
    ...payload,
  };

  if (!hasDatabaseUrl()) {
    mockModelVersions.unshift(model);
    return model;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.modelVersion.create({
      data: {
        id: model.id,
        organizationId: payload.organizationId ?? null,
        name: model.name,
        version: model.version,
        status: model.status,
        auc: model.auc,
        precision: model.precision,
        recall: model.recall,
        drift: model.drift,
        trafficShare: model.trafficShare,
        approvalThreshold: model.approvalThreshold,
        deployedAt: new Date(model.deployedAt),
        notes: model.notes,
      },
    });
    return mapModelRow(row);
  } catch (error) {
    console.error("Failed to create model version.", error);
    return model;
  }
}

export async function updateModelVersion(
  modelId: string,
  payload: Pick<ModelVersion, "approvalThreshold" | "drift" | "notes">,
) {
  if (!hasDatabaseUrl()) {
    const model = mockModelVersions.find((item) => item.id === modelId);
    if (model) {
      model.approvalThreshold = payload.approvalThreshold;
      model.drift = payload.drift;
      model.notes = payload.notes;
    }
    return model ?? null;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.modelVersion.update({
      where: { id: modelId },
      data: {
        approvalThreshold: payload.approvalThreshold,
        drift: payload.drift,
        notes: payload.notes,
      },
    });
    return mapModelRow(row);
  } catch (error) {
    console.error("Failed to update model version.", error);
    return null;
  }
}

export async function promoteModelVersion(modelId: string) {
  if (!hasDatabaseUrl()) {
    mockModelVersions.forEach((model) => {
      if (model.id === modelId) {
        model.status = "champion";
        model.trafficShare = 70;
      } else if (model.status === "champion") {
        model.status = "challenger";
        model.trafficShare = 20;
      }
    });
    return;
  }

  try {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();

    await prisma.$transaction(async (tx) => {
      const champion = await tx.modelVersion.findFirst({
        where: {
          status: "champion",
          ...tenantOrGlobalWhere(organizationId),
        },
        select: { id: true },
      });

      if (champion && champion.id !== modelId) {
        await tx.modelVersion.update({
          where: { id: champion.id },
          data: { status: "challenger", trafficShare: 20 },
        });
      }

      await tx.modelVersion.update({
        where: { id: modelId },
        data: { status: "champion", trafficShare: 70 },
      });
    });
  } catch (error) {
    console.error("Failed to promote model version.", error);
  }
}

export async function rebalanceModelTraffic(modelId: string, trafficShare: number) {
  const normalized = Math.max(0, Math.min(100, trafficShare));

  if (!hasDatabaseUrl()) {
    const model = mockModelVersions.find((item) => item.id === modelId);
    if (model) model.trafficShare = normalized;
    return;
  }

  try {
    const prisma = getPrismaClient();
    await prisma.modelVersion.update({
      where: { id: modelId },
      data: { trafficShare: normalized },
    });
  } catch (error) {
    console.error("Failed to update model traffic.", error);
  }
}

export async function listFraudAlerts(): Promise<FraudAlert[]> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.fraudAlert.findMany({
      where: applicationRelationScope(organizationId),
      orderBy: { createdAt: "desc" },
    });
    return rows.map(mapFraudAlertRow);
  }, mockFraudAlerts);
}

export async function listPortfolioMetrics(): Promise<PortfolioMetric[]> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const rows = await prisma.portfolioMetric.findMany({
      where: tenantOrGlobalWhere(organizationId),
      orderBy: { createdAt: "desc" },
      take: 3,
    });
    return rows.map((row: PrismaPortfolioMetric) => ({
      id: row.id,
      label: row.label,
      value: row.value,
      delta: row.delta,
      tone: row.tone as PortfolioMetric["tone"],
    }));
  }, mockPortfolioMetrics);
}

export async function listPortfolioConcentrations(): Promise<PortfolioConcentration[]> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const [applications, scores] = await Promise.all([
      prisma.application.findMany({
        where: tenantOrGlobalWhere(organizationId),
        select: { id: true, state: true },
      }),
      prisma.riskScore.findMany({
        where: applicationRelationScope(organizationId),
        select: { applicationId: true, score: true },
      }),
    ]);

    const scoreMap = new Map(scores.map((item) => [item.applicationId, scalarToNumber(item.score)]));
    const total = applications.length;
    const grouped = new Map<string, { count: number; scores: number[] }>();

    for (const application of applications) {
      const key = `${application.state} borrowers`;
      const current = grouped.get(key) ?? { count: 0, scores: [] };
      current.count += 1;
      current.scores.push(scoreMap.get(application.id) ?? 35);
      grouped.set(key, current);
    }

    return [...grouped.entries()]
      .map(([segment, value]) => {
        const averageScore = value.scores.reduce((sum, item) => sum + item, 0) / Math.max(value.scores.length, 1);
        return {
          segment,
          exposure: Math.round((value.count / Math.max(total, 1)) * 100),
          lossRatio: Math.round(averageScore * 0.72),
          change: averageScore >= 50 ? "+2.1 pts" : averageScore >= 35 ? "+0.6 pts" : "-1.1 pts",
        };
      })
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, 6);
  }, mockPortfolioConcentrations);
}

export async function updateWorkflowDefinition(
  workflowId: string,
  payload: Pick<WorkflowDefinition, "name" | "config">,
) {
  const normalized = normalizeWorkflowConfig(payload.config);

  if (!hasDatabaseUrl()) {
    const workflow = mockWorkflows.find((item) => item.id === workflowId);
    if (workflow) {
      workflow.name = payload.name;
      workflow.config = normalized;
    }
    return workflow ?? null;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.workflow.update({
      where: { id: workflowId },
      data: {
        name: payload.name,
        config: toJsonValue(normalized),
      },
    });
    return mapWorkflowRow(row);
  } catch (error) {
    console.error("Failed to update workflow definition.", error);
    return null;
  }
}

export async function getDashboardSnapshot(): Promise<DashboardSnapshot> {
  return tryDatabase(async () => {
    const prisma = getPrismaClient();
    const organizationId = await getOrganizationId();
    const [applications, scores, fraudAlertCount, champion, sources, evaluations] = await Promise.all([
      prisma.application.findMany({
        where: tenantOrGlobalWhere(organizationId),
        select: { status: true },
      }),
      prisma.riskScore.findMany({
        where: applicationRelationScope(organizationId),
        select: { score: true, recommendation: true },
      }),
      prisma.fraudAlert.count({
        where: applicationRelationScope(organizationId),
      }),
      prisma.modelVersion.findFirst({
        where: {
          status: "champion",
          ...tenantOrGlobalWhere(organizationId),
        },
        select: { name: true, version: true },
      }),
      prisma.applicationDataSource.findMany({
        where: applicationRelationScope(organizationId),
        select: { status: true },
      }),
      prisma.modelEvaluation.findMany({
        where: applicationRelationScope(organizationId),
        select: { lane: true, verdict: true },
      }),
    ]);

    const averageRiskScore = Math.round(
      scores.reduce((sum, item) => sum + scalarToNumber(item.score), 0) / Math.max(scores.length, 1),
    );
    const autoDecisionRate = Math.round(
      (scores.filter((item) => item.recommendation === "auto_approve").length / Math.max(scores.length, 1)) * 100,
    );
    const ingestedSources = sources.filter((item) => item.status === "ingested").length;
    const challengerEvaluations = evaluations.filter((item) => item.lane === "challenger");
    const challengerWins = challengerEvaluations.filter((item) => item.verdict === "outperforming").length;

    return {
      applicationsToday: applications.length,
      averageRiskScore,
      autoDecisionRate,
      manualReviewQueue: applications.filter((item) => item.status === "manual_review" || item.status === "scored").length,
      fraudAlertCount,
      activeModelName: champion ? `${champion.name} v${champion.version}` : "No champion model",
      modeLabel: "Live workspace",
      ingestionCoverage: Math.round((ingestedSources / Math.max(sources.length, 1)) * 100),
      challengerWinRate: Math.round((challengerWins / Math.max(challengerEvaluations.length, 1)) * 100),
    };
  }, buildDashboardSnapshot());
}

export async function createApplication(
  payload: Omit<Application, "id" | "status" | "workflowStage" | "submittedAt"> &
    Partial<Pick<Application, "status" | "workflowStage" | "submittedAt">>,
): Promise<Application> {
  const application: Application = {
    id: crypto.randomUUID(),
    organizationId: payload.organizationId,
    externalRef: payload.externalRef,
    customerName: payload.customerName,
    email: payload.email,
    productLine: payload.productLine,
    amountRequested: payload.amountRequested,
    annualIncome: payload.annualIncome,
    creditScore: payload.creditScore,
    debtToIncome: payload.debtToIncome,
    claimsCount: payload.claimsCount,
    fraudSignals: payload.fraudSignals,
    documentConfidence: payload.documentConfidence,
    geospatialRisk: payload.geospatialRisk,
    state: payload.state,
    status: payload.status ?? "new",
    workflowStage: payload.workflowStage ?? "intake",
    submittedAt: payload.submittedAt ?? new Date().toISOString(),
  };

  if (!hasDatabaseUrl()) {
    return application;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.application.create({
      data: {
        id: application.id,
        organizationId: application.organizationId ?? null,
        externalRef: application.externalRef,
        customerName: application.customerName,
        email: application.email,
        productLine: application.productLine,
        amountRequested: application.amountRequested,
        annualIncome: application.annualIncome,
        creditScore: application.creditScore,
        debtToIncome: application.debtToIncome,
        claimsCount: application.claimsCount,
        fraudSignals: application.fraudSignals,
        documentConfidence: application.documentConfidence,
        geospatialRisk: application.geospatialRisk,
        state: application.state,
        status: application.status,
        workflowStage: application.workflowStage,
        submittedAt: new Date(application.submittedAt),
      },
    });
    return mapApplicationRow(row);
  } catch (error) {
    console.error("Failed to create application in database.", error);
  }

  return application;
}

async function getPrimaryWorkflow(organizationId?: string) {
  if (!hasDatabaseUrl()) {
    return mockWorkflows.find((item) => item.organizationId === organizationId) ?? mockWorkflows[0] ?? null;
  }

  if (!organizationId) {
    return null;
  }

  try {
    const prisma = getPrismaClient();
    const row = await prisma.workflow.findFirst({
      where: { organizationId },
      orderBy: { createdAt: "asc" },
    });
    return row ? mapWorkflowRow(row) : null;
  } catch (error) {
    console.error("Failed to load workflow definition.", error);
    return null;
  }
}

export async function createScoredApplication(
  payload: Omit<Application, "id" | "status" | "workflowStage" | "submittedAt"> &
    Partial<Pick<Application, "status" | "workflowStage" | "submittedAt">>,
  actor = "system",
  options?: {
    documents?: Array<
      Pick<
        ApplicationDocument,
        | "fileName"
        | "documentType"
        | "verificationStatus"
        | "extractedConfidence"
        | "analysisSummary"
        | "mimeType"
        | "sizeBytes"
        | "extractedData"
      > & { file?: File }
    >;
    sourceInputs?: SourceIngestionInput[];
  },
): Promise<{ application: Application; assessment: RiskAssessment }> {
  const createdApplication = await createApplication(payload);
  const workflow = await getPrimaryWorkflow(createdApplication.organizationId);
  const baseAssessment = assessApplication(createdApplication);
  const workflowDecision = evaluateWorkflow(createdApplication, baseAssessment, workflow);
  const assessment = {
    ...baseAssessment,
    recommendation: workflowDecision.recommendation,
    reasons: [...baseAssessment.reasons, ...workflowDecision.reasons],
  };
  const nextState = mapDecisionToApplicationState(assessment.recommendation, workflowDecision.workflowStage);
  const scoredApplication = {
    ...createdApplication,
    ...nextState,
  };
  const documentsForIntelligence =
    options?.documents?.map((document) => ({
      fileName: document.fileName,
      documentType: document.documentType,
      verificationStatus: document.verificationStatus,
      extractedConfidence: document.extractedConfidence,
    })) ?? [];
  const dataSources = buildApplicationDataSources(scoredApplication, documentsForIntelligence, options?.sourceInputs ?? []);
  const fraudCases = buildFraudCases(scoredApplication, assessment, documentsForIntelligence);

  if (!hasDatabaseUrl()) {
    const models = mockModelVersions;
    const modelEvaluations = evaluateModels(scoredApplication, models);

    mockApplications.unshift(scoredApplication);
    upsertMockRiskScore(assessment);
    addMockAuditEvent({
      id: crypto.randomUUID(),
      applicationId: createdApplication.id,
      actor,
      action: "Risk score generated",
      details: `Recommendation ${assessment.recommendation.replace(/_/g, " ")} at score ${assessment.score}. Rules: ${workflowDecision.triggeredRules.join(", ")}.`,
      createdAt: assessment.generatedAt,
    });
    replaceMockDataSources(
      scoredApplication.id,
      dataSources.map((source) => ({
        id: crypto.randomUUID(),
        applicationId: scoredApplication.id,
        ...source,
        createdAt: assessment.generatedAt,
      })),
    );
    replaceMockFraudCases(
      scoredApplication.id,
      fraudCases.map((item) => ({
        id: crypto.randomUUID(),
        applicationId: scoredApplication.id,
        ...item,
        createdAt: assessment.generatedAt,
      })),
    );
    replaceMockModelEvaluations(
      scoredApplication.id,
      modelEvaluations.map((item) => ({
        ...item,
        applicationId: scoredApplication.id,
      })),
    );
    if (options?.sourceInputs?.length) {
      mockIngestionRuns.unshift(
        ...options.sourceInputs.map((source): IngestionRun => ({
          id: crypto.randomUUID(),
          organizationId: scoredApplication.organizationId,
          applicationId: scoredApplication.id,
          sourceType: source.sourceType,
          providerName: source.providerName,
          status: source.status === "ingested" ? "succeeded" : source.status === "warning" ? "partial" : "failed",
          recordsProcessed: source.recordsProcessed ?? 1,
          triggeredBy: actor,
          detail: source.detail,
          createdAt: assessment.generatedAt,
        })),
      );
    }
    await maybeCreateFraudAlert(scoredApplication, assessment);

    return {
      application: scoredApplication,
      assessment,
    };
  }

  try {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      const modelRows = await tx.modelVersion.findMany({
        where: tenantOrGlobalWhere(scoredApplication.organizationId ?? null),
        orderBy: { deployedAt: "desc" },
      });
      const modelEvaluations = evaluateModels(scoredApplication, modelRows.map(mapModelRow));

      await tx.riskScore.upsert({
        where: { applicationId: assessment.applicationId },
        create: {
          applicationId: assessment.applicationId,
          score: assessment.score,
          band: assessment.band,
          fraudProbability: assessment.fraudProbability,
          documentConfidence: assessment.documentConfidence,
          recommendation: assessment.recommendation,
          reasons: assessment.reasons,
          factors: toJsonValue(assessment.factors),
          modelVersion: assessment.modelVersion,
          generatedAt: new Date(assessment.generatedAt),
        },
        update: {
          score: assessment.score,
          band: assessment.band,
          fraudProbability: assessment.fraudProbability,
          documentConfidence: assessment.documentConfidence,
          recommendation: assessment.recommendation,
          reasons: assessment.reasons,
          factors: toJsonValue(assessment.factors),
          modelVersion: assessment.modelVersion,
          generatedAt: new Date(assessment.generatedAt),
        },
      });

      await tx.application.update({
        where: { id: createdApplication.id },
        data: { status: nextState.status, workflowStage: nextState.workflowStage },
      });

      await tx.auditLog.create({
        data: {
          applicationId: createdApplication.id,
          actor,
          action: "Risk score generated",
          details: `Recommendation ${assessment.recommendation.replace(/_/g, " ")} at score ${assessment.score}. Rules: ${workflowDecision.triggeredRules.join(", ")}.`,
          createdAt: new Date(assessment.generatedAt),
        },
      });

      await tx.applicationDataSource.deleteMany({ where: { applicationId: scoredApplication.id } });
      await tx.applicationDataSource.createMany({
        data: dataSources.map((source) => ({
          applicationId: scoredApplication.id,
          sourceType: source.sourceType,
          status: source.status,
          confidence: source.confidence,
          freshnessHours: source.freshnessHours,
          detail: source.detail,
          createdAt: new Date(assessment.generatedAt),
        })),
      });

      if (options?.sourceInputs?.length) {
        await tx.ingestionRun.createMany({
          data: options.sourceInputs.map((source) => ({
            applicationId: scoredApplication.id,
            organizationId: scoredApplication.organizationId ?? null,
            sourceType: source.sourceType,
            providerName: source.providerName,
            status: source.status === "ingested" ? "succeeded" : source.status === "warning" ? "partial" : "failed",
            recordsProcessed: source.recordsProcessed ?? 1,
            triggeredBy: actor,
            detail: source.detail,
            createdAt: new Date(assessment.generatedAt),
          })),
        });
      }

      await tx.fraudCase.deleteMany({ where: { applicationId: scoredApplication.id } });
      if (fraudCases.length > 0) {
        await tx.fraudCase.createMany({
          data: fraudCases.map((item) => ({
            applicationId: scoredApplication.id,
            category: item.category,
            score: item.score,
            status: item.status,
            explanation: item.explanation,
            createdAt: new Date(assessment.generatedAt),
          })),
        });
      }

      await tx.modelEvaluation.deleteMany({ where: { applicationId: scoredApplication.id } });
      if (modelEvaluations.length > 0) {
        await tx.modelEvaluation.createMany({
          data: modelEvaluations.map((evaluation) => ({
            id: evaluation.id,
            applicationId: scoredApplication.id,
            modelVersionId: evaluation.modelVersionId,
            modelName: evaluation.modelName,
            version: evaluation.version,
            lane: evaluation.lane,
            score: evaluation.score,
            recommendation: evaluation.recommendation,
            deltaFromChampion: evaluation.deltaFromChampion,
            verdict: evaluation.verdict,
            createdAt: new Date(evaluation.createdAt),
          })),
        });
      }

      const shouldCreateFraudAlert = assessment.fraudProbability >= 45 || scoredApplication.fraudSignals.length > 0;
      if (shouldCreateFraudAlert) {
        const existingAlert = await tx.fraudAlert.findFirst({
          where: { applicationId: scoredApplication.id },
          select: { id: true },
        });

        if (!existingAlert) {
          await tx.fraudAlert.create({
            data: {
              applicationId: scoredApplication.id,
              customerName: scoredApplication.customerName,
              severity: assessment.fraudProbability >= 70 ? "high" : "medium",
              reason:
                scoredApplication.fraudSignals.length > 0
                  ? `Borrower flagged for ${scoredApplication.fraudSignals.join(", ")} during intake.`
                  : "Fraud model elevated this file for manual review.",
              createdAt: new Date(assessment.generatedAt),
            },
          });
        }
      }
    });
  } catch (error) {
    console.error("Failed to create scored application in database. Falling back to mock store.", error);
    const models = mockModelVersions;
    const modelEvaluations = evaluateModels(scoredApplication, models);

    mockApplications.unshift(scoredApplication);
    upsertMockRiskScore(assessment);
    addMockAuditEvent({
      id: crypto.randomUUID(),
      applicationId: createdApplication.id,
      actor,
      action: "Risk score generated",
      details: `Recommendation ${assessment.recommendation.replace(/_/g, " ")} at score ${assessment.score}. Rules: ${workflowDecision.triggeredRules.join(", ")}.`,
      createdAt: assessment.generatedAt,
    });
    replaceMockDataSources(
      scoredApplication.id,
      dataSources.map((source) => ({
        id: crypto.randomUUID(),
        applicationId: scoredApplication.id,
        ...source,
        createdAt: assessment.generatedAt,
      })),
    );
    replaceMockFraudCases(
      scoredApplication.id,
      fraudCases.map((item) => ({
        id: crypto.randomUUID(),
        applicationId: scoredApplication.id,
        ...item,
        createdAt: assessment.generatedAt,
      })),
    );
    replaceMockModelEvaluations(
      scoredApplication.id,
      modelEvaluations.map((item) => ({
        ...item,
        applicationId: scoredApplication.id,
      })),
    );
    if (options?.sourceInputs?.length) {
      mockIngestionRuns.unshift(
        ...options.sourceInputs.map((source): IngestionRun => ({
          id: crypto.randomUUID(),
          organizationId: scoredApplication.organizationId,
          applicationId: scoredApplication.id,
          sourceType: source.sourceType,
          providerName: source.providerName,
          status: source.status === "ingested" ? "succeeded" : source.status === "warning" ? "partial" : "failed",
          recordsProcessed: source.recordsProcessed ?? 1,
          triggeredBy: actor,
          detail: source.detail,
          createdAt: assessment.generatedAt,
        })),
      );
    }
    await maybeCreateFraudAlert(scoredApplication, assessment);
  }

  return {
    application: scoredApplication,
    assessment,
  };
}

export async function storeApplicationDocuments(
  application: Pick<Application, "id" | "organizationId">,
  documents: Array<
    Pick<
      ApplicationDocument,
      | "fileName"
      | "mimeType"
      | "sizeBytes"
      | "documentType"
      | "verificationStatus"
      | "extractedConfidence"
      | "analysisSummary"
      | "extractedData"
    > & { file?: File }
  >,
) {
  if (documents.length === 0) {
    return [];
  }

  if (!hasDatabaseUrl()) {
    const created = documents.map((document) => ({
      id: crypto.randomUUID(),
      applicationId: application.id,
      fileName: document.fileName,
      mimeType: document.mimeType,
      sizeBytes: document.sizeBytes,
      documentType: document.documentType,
      verificationStatus: document.verificationStatus,
      extractedConfidence: document.extractedConfidence,
      analysisSummary: document.analysisSummary,
      extractedData: document.extractedData,
      storagePath: null,
      uploadedAt: new Date().toISOString(),
    }));
    mockApplicationDocuments.unshift(...created);
    return created;
  }

  const bucket = process.env.SUPABASE_STORAGE_BUCKET;
  const admin = hasSupabaseStorageEnv() && bucket ? createSupabaseStorageAdminClient() : null;
  const prisma = getPrismaClient();
  const rows: ApplicationDocument[] = [];

  for (const document of documents) {
    let path: string | null = null;

    if (admin && bucket && document.file) {
      path = `${application.organizationId ?? "shared"}/${application.id}/${Date.now()}-${safeFileName(document.fileName)}`;
      const { error: uploadError } = await admin.storage.from(bucket).upload(path, document.file, {
        contentType: document.mimeType,
        upsert: false,
      });
      if (uploadError) throw uploadError;
    }

    const row = await prisma.applicationDocument.create({
      data: {
        applicationId: application.id,
        fileName: document.fileName,
        mimeType: document.mimeType,
        sizeBytes: BigInt(document.sizeBytes),
        documentType: document.documentType,
        verificationStatus: document.verificationStatus,
        extractedConfidence: document.extractedConfidence,
        analysisSummary: document.analysisSummary,
        extractedData: toJsonValue(document.extractedData),
        storagePath: path,
      },
    });
    rows.push(mapDocumentRow(row));
  }

  return rows;
}

export async function createDecision(payload: DecisionPayload) {
  const assessment = await getRiskScoreByApplicationId(payload.applicationId);
  const decision = {
    id: crypto.randomUUID(),
    applicationId: payload.applicationId,
    decision: payload.decision,
    actor: payload.actor,
    notes: payload.notes,
    createdAt: new Date().toISOString(),
    assessment,
  };

  const nextState = mapDecisionToApplicationState(payload.decision);

  if (!hasDatabaseUrl()) {
    updateMockApplicationState(payload.applicationId, nextState);
    addMockAuditEvent({
      id: crypto.randomUUID(),
      applicationId: payload.applicationId,
      actor: payload.actor,
      action: "Decision recorded",
      details: `${payload.decision.replace(/_/g, " ")}: ${payload.notes}`,
      createdAt: decision.createdAt,
    });
    return decision;
  }

  try {
    const prisma = getPrismaClient();
    await prisma.$transaction(async (tx) => {
      await tx.decision.create({
        data: {
          id: decision.id,
          applicationId: decision.applicationId,
          decision: decision.decision,
          actor: decision.actor,
          notes: decision.notes,
          createdAt: new Date(decision.createdAt),
        },
      });

      await tx.application.update({
        where: { id: decision.applicationId },
        data: { status: nextState.status, workflowStage: nextState.workflowStage },
      });

      await tx.auditLog.create({
        data: {
          applicationId: decision.applicationId,
          actor: decision.actor,
          action: "Decision recorded",
          details: `${decision.decision.replace(/_/g, " ")}: ${decision.notes}`,
          createdAt: new Date(decision.createdAt),
        },
      });
    });
  } catch (error) {
    console.error("Failed to persist decision.", error);
  }

  return decision;
}
