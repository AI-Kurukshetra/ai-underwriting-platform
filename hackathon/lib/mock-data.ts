import { assessApplication } from "@/lib/risk-engine";
import { evaluateModels } from "@/lib/model-lab";
import { buildApplicationDataSources, buildFraudCases } from "@/lib/underwriting-intelligence";
import type {
  Application,
  ApplicationDataSource,
  ApplicationDocument,
  AuditEvent,
  DashboardSnapshot,
  DataSourceConnection,
  FraudCase,
  FraudAlert,
  IngestionRun,
  ModelEvaluation,
  ModelVersion,
  PortfolioConcentration,
  PortfolioMetric,
  RiskAssessment,
  WorkflowDefinition,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/*  globalThis cache so mock data survives Next.js dev-mode HMR        */
/* ------------------------------------------------------------------ */

interface MockStore {
  applications: Application[];
  riskScores: RiskAssessment[];
  applicationDocuments: ApplicationDocument[];
  auditEvents: AuditEvent[];
  modelVersions: ModelVersion[];
  workflows: WorkflowDefinition[];
  applicationDataSources: ApplicationDataSource[];
  dataSourceConnections: DataSourceConnection[];
  ingestionRuns: IngestionRun[];
  fraudCases: FraudCase[];
  modelEvaluations: ModelEvaluation[];
  fraudAlerts: FraudAlert[];
  portfolioMetrics: PortfolioMetric[];
  portfolioConcentrations: PortfolioConcentration[];
}

const globalForMock = globalThis as unknown as { __mockStore?: MockStore };

function getOrCreateStore(): MockStore {
  if (!globalForMock.__mockStore) {
    globalForMock.__mockStore = buildInitialStore();
  }
  return globalForMock.__mockStore;
}

function buildInitialStore(): MockStore {
  const applications = seedApplications();
  const riskScores = applications.map((app) => assessApplication(app));
  const applicationDocuments = seedApplicationDocuments();
  const modelVersions = seedModelVersions();

  const applicationDataSources = applications.flatMap((application) =>
    buildApplicationDataSources(
      application,
      applicationDocuments
        .filter((doc) => doc.applicationId === application.id)
        .map((doc) => ({
          fileName: doc.fileName,
          documentType: doc.documentType,
          extractedConfidence: doc.extractedConfidence,
        })),
    ).map((source, index) => ({
      id: `${application.id}-source-${index + 1}`,
      applicationId: application.id,
      ...source,
      createdAt: application.submittedAt,
    })),
  );

  const fraudCases = applications.flatMap((application) => {
    const assessment = riskScores.find((score) => score.applicationId === application.id);
    if (!assessment) return [];
    return buildFraudCases(
      application,
      assessment,
      applicationDocuments.filter((doc) => doc.applicationId === application.id),
    ).map((item, index) => ({
      id: `${application.id}-fraud-${index + 1}`,
      applicationId: application.id,
      ...item,
      createdAt: application.submittedAt,
    }));
  });

  const modelEvaluations = applications.flatMap((application) =>
    evaluateModels(application, modelVersions).map((evaluation, index) => ({
      ...evaluation,
      id: `${application.id}-eval-${index + 1}`,
      createdAt: application.submittedAt,
    })),
  );

  return {
    applications,
    riskScores,
    applicationDocuments,
    auditEvents: seedAuditEvents(),
    modelVersions,
    workflows: seedWorkflows(),
    applicationDataSources,
    dataSourceConnections: seedDataSourceConnections(),
    ingestionRuns: seedIngestionRuns(),
    fraudCases,
    modelEvaluations,
    fraudAlerts: seedFraudAlerts(),
    portfolioMetrics: seedPortfolioMetrics(),
    portfolioConcentrations: seedPortfolioConcentrations(),
  };
}

/* ------------------------------------------------------------------ */
/*  Public exports — all point to the globalThis-cached store          */
/* ------------------------------------------------------------------ */

const store = getOrCreateStore();

export const mockApplications: Application[] = store.applications;
export const mockRiskScores: RiskAssessment[] = store.riskScores;
export const mockApplicationDocuments: ApplicationDocument[] = store.applicationDocuments;
export const mockAuditEvents: AuditEvent[] = store.auditEvents;
export const mockModelVersions: ModelVersion[] = store.modelVersions;
export const mockWorkflows: WorkflowDefinition[] = store.workflows;
export const mockApplicationDataSources: ApplicationDataSource[] = store.applicationDataSources;
export const mockDataSourceConnections: DataSourceConnection[] = store.dataSourceConnections;
export const mockIngestionRuns: IngestionRun[] = store.ingestionRuns;
export const mockFraudCases: FraudCase[] = store.fraudCases;
export const mockModelEvaluations: ModelEvaluation[] = store.modelEvaluations;
export const mockFraudAlerts: FraudAlert[] = store.fraudAlerts;
export const mockPortfolioMetrics: PortfolioMetric[] = store.portfolioMetrics;
export const mockPortfolioConcentrations: PortfolioConcentration[] = store.portfolioConcentrations;

/* ------------------------------------------------------------------ */
/*  Dashboard helper                                                   */
/* ------------------------------------------------------------------ */

export function buildDashboardSnapshot(): DashboardSnapshot {
  const assessments = mockRiskScores;
  const autoApproved = assessments.filter((assessment) => assessment.recommendation === "auto_approve").length;
  const manualReviewQueue = mockApplications.filter((application) => application.status === "manual_review" || application.status === "scored").length;

  return {
    applicationsToday: mockApplications.length,
    averageRiskScore: Math.round(assessments.reduce((sum, assessment) => sum + assessment.score, 0) / Math.max(assessments.length, 1)),
    autoDecisionRate: Math.round((autoApproved / Math.max(assessments.length, 1)) * 100),
    manualReviewQueue,
    fraudAlertCount: mockFraudAlerts.length,
    activeModelName: "Gradient Lite v1.3.0",
    modeLabel: "Demo mode",
    ingestionCoverage: 86,
    challengerWinRate: 41,
  };
}

/* ------------------------------------------------------------------ */
/*  Seed data                                                          */
/* ------------------------------------------------------------------ */

function seedApplications(): Application[] {
  return [
    {
      id: "app-1001",
      organizationId: "org-gradient-demo",
      externalRef: "UW-2026-1001",
      customerName: "Mia Reynolds",
      email: "mia.reynolds@example.com",
      productLine: "personal_loan",
      amountRequested: 18000,
      annualIncome: 92000,
      creditScore: 742,
      debtToIncome: 0.24,
      claimsCount: 0,
      fraudSignals: [],
      documentConfidence: 0.94,
      geospatialRisk: 0.22,
      state: "Texas",
      status: "approved",
      workflowStage: "decisioned",
      submittedAt: "2026-03-14T05:45:00.000Z",
    },
    {
      id: "app-1002",
      organizationId: "org-gradient-demo",
      externalRef: "UW-2026-1002",
      customerName: "Jordan Patel",
      email: "jordan.patel@example.com",
      productLine: "personal_loan",
      amountRequested: 9200,
      annualIncome: 64000,
      creditScore: 661,
      debtToIncome: 0.39,
      claimsCount: 2,
      fraudSignals: ["device_mismatch"],
      documentConfidence: 0.81,
      geospatialRisk: 0.48,
      state: "Florida",
      status: "manual_review",
      workflowStage: "underwriter_review",
      submittedAt: "2026-03-14T06:10:00.000Z",
    },
    {
      id: "app-1003",
      organizationId: "org-gradient-demo",
      externalRef: "UW-2026-1003",
      customerName: "Avery Brooks",
      email: "avery.brooks@example.com",
      productLine: "personal_loan",
      amountRequested: 26000,
      annualIncome: 51000,
      creditScore: 612,
      debtToIncome: 0.46,
      claimsCount: 1,
      fraudSignals: ["bank_statement_gap", "thin_file"],
      documentConfidence: 0.72,
      geospatialRisk: 0.6,
      state: "Louisiana",
      status: "declined",
      workflowStage: "decisioned",
      submittedAt: "2026-03-14T07:20:00.000Z",
    },
    {
      id: "app-1004",
      organizationId: "org-gradient-demo",
      externalRef: "UW-2026-1004",
      customerName: "Noah Chen",
      email: "noah.chen@example.com",
      productLine: "personal_loan",
      amountRequested: 4100,
      annualIncome: 118000,
      creditScore: 788,
      debtToIncome: 0.18,
      claimsCount: 0,
      fraudSignals: [],
      documentConfidence: 0.97,
      geospatialRisk: 0.19,
      state: "California",
      status: "approved",
      workflowStage: "decisioned",
      submittedAt: "2026-03-14T08:05:00.000Z",
    },
    {
      id: "app-1005",
      organizationId: "org-gradient-demo",
      externalRef: "UW-2026-1005",
      customerName: "Elena Martinez",
      email: "elena.martinez@example.com",
      productLine: "personal_loan",
      amountRequested: 14500,
      annualIncome: 68000,
      creditScore: 698,
      debtToIncome: 0.35,
      claimsCount: 1,
      fraudSignals: [],
      documentConfidence: 0.87,
      geospatialRisk: 0.31,
      state: "Arizona",
      status: "scored",
      workflowStage: "underwriter_review",
      submittedAt: "2026-03-14T08:45:00.000Z",
    },
    {
      id: "app-1006",
      organizationId: "org-gradient-demo",
      externalRef: "UW-2026-1006",
      customerName: "Khushbu Shah",
      email: "khushbu.shah@example.com",
      productLine: "personal_loan",
      amountRequested: 50000,
      annualIncome: 45000,
      creditScore: 520,
      debtToIncome: 0.55,
      claimsCount: 3,
      fraudSignals: ["device_mismatch", "thin_file"],
      documentConfidence: 0.56,
      geospatialRisk: 0.65,
      state: "Florida",
      status: "manual_review",
      workflowStage: "fraud_review",
      submittedAt: "2026-03-14T09:15:00.000Z",
    },
  ];
}

function seedApplicationDocuments(): ApplicationDocument[] {
  return [
    {
      id: "doc-1001",
      applicationId: "app-1001",
      fileName: "bank_statement_mia_reynolds.pdf",
      mimeType: "application/pdf",
      sizeBytes: 224_000,
      extractedConfidence: 0.94,
      analysisSummary: "application/pdf · strong OCR readiness",
      documentType: "bank_statement",
      verificationStatus: "verified",
      extractedData: {
        statement_months: 3,
        detected_employer: "Bacancy",
        average_balance_band: "healthy",
      },
      storagePath: null,
      uploadedAt: "2026-03-14T05:40:00.000Z",
    },
    {
      id: "doc-1002",
      applicationId: "app-1001",
      fileName: "paystub_february.png",
      mimeType: "image/png",
      sizeBytes: 168_000,
      extractedConfidence: 0.88,
      analysisSummary: "image/png · strong OCR readiness",
      documentType: "pay_stub",
      verificationStatus: "verified",
      extractedData: {
        gross_income_band: "matched",
        pay_frequency: "monthly",
        employer_match: "verified",
      },
      storagePath: null,
      uploadedAt: "2026-03-14T05:41:00.000Z",
    },
    {
      id: "doc-1003",
      applicationId: "app-1002",
      fileName: "income_letter_scan.jpg",
      mimeType: "image/jpeg",
      sizeBytes: 49_000,
      extractedConfidence: 0.67,
      analysisSummary: "image/jpeg · weak OCR readiness",
      documentType: "pay_stub",
      verificationStatus: "review",
      extractedData: {
        gross_income_band: "requires review",
        pay_frequency: "monthly",
        employer_match: "partial",
      },
      storagePath: null,
      uploadedAt: "2026-03-14T06:09:00.000Z",
    },
    {
      id: "doc-1004",
      applicationId: "app-1003",
      fileName: "bank_statement_avery.txt",
      mimeType: "text/plain",
      sizeBytes: 18_000,
      extractedConfidence: 0.52,
      analysisSummary: "text/plain · weak OCR readiness",
      documentType: "bank_statement",
      verificationStatus: "review",
      extractedData: {
        statement_months: 1,
        detected_employer: "Unknown",
        average_balance_band: "review",
      },
      storagePath: null,
      uploadedAt: "2026-03-14T07:18:00.000Z",
    },
    {
      id: "doc-1005",
      applicationId: "app-1006",
      fileName: "demo-doc.txt",
      mimeType: "text/plain",
      sizeBytes: 129,
      extractedConfidence: 0.56,
      analysisSummary: "text/plain · weak OCR readiness",
      documentType: "other",
      verificationStatus: "review",
      extractedData: {
        extraction_quality: "review",
      },
      storagePath: null,
      uploadedAt: "2026-03-14T09:14:00.000Z",
    },
  ];
}

function seedAuditEvents(): AuditEvent[] {
  return [
    {
      id: "audit-1",
      applicationId: "app-1002",
      actor: "system",
      action: "Risk score generated",
      details: "Automated score pushed file into fraud review queue after device mismatch signal.",
      createdAt: "2026-03-14T06:11:00.000Z",
    },
    {
      id: "audit-2",
      applicationId: "app-1002",
      actor: "Riya Shah",
      action: "Manual review requested",
      details: "Requested income verification before final loan decision.",
      createdAt: "2026-03-14T06:35:00.000Z",
    },
    {
      id: "audit-3",
      applicationId: "app-1003",
      actor: "system",
      action: "Decline recommended",
      details: "High risk band with multiple fraud signals and elevated geospatial exposure.",
      createdAt: "2026-03-14T07:22:00.000Z",
    },
    {
      id: "audit-4",
      applicationId: "app-1001",
      actor: "system",
      action: "Auto approval executed",
      details: "Application met policy thresholds and passed all automated checks.",
      createdAt: "2026-03-14T05:47:00.000Z",
    },
  ];
}

function seedModelVersions(): ModelVersion[] {
  return [
    {
      id: "model-1",
      name: "Gradient Lite",
      version: "1.3.0",
      status: "champion",
      auc: 0.87,
      precision: 0.81,
      recall: 0.78,
      drift: 2.1,
      trafficShare: 70,
      approvalThreshold: 35,
      deployedAt: "2026-03-08",
      notes: "Primary underwriting model with document confidence and geospatial features enabled.",
    },
    {
      id: "model-2",
      name: "Gradient Lite",
      version: "1.4.0-rc1",
      status: "challenger",
      auc: 0.9,
      precision: 0.83,
      recall: 0.8,
      drift: 1.2,
      trafficShare: 20,
      approvalThreshold: 33,
      deployedAt: "2026-03-12",
      notes: "Candidate release testing stronger fraud weighting against the champion model.",
    },
    {
      id: "model-3",
      name: "Fraud Sentinel",
      version: "0.9.2",
      status: "shadow",
      auc: 0.79,
      precision: 0.74,
      recall: 0.82,
      drift: 3.4,
      trafficShare: 10,
      approvalThreshold: 37,
      deployedAt: "2026-03-10",
      notes: "Shadow model for networked fraud signals and device intelligence experiments.",
    },
  ];
}

function seedWorkflows(): WorkflowDefinition[] {
  return [
    {
      id: "workflow-1",
      organizationId: "org-gradient-demo",
      name: "Loan autopilot",
      config: {
        autoApproveBelow: 35,
        declineAboveOrEqual: 65,
        fraudEscalationAt: 70,
        maxDebtToIncome: 0.45,
        minDocumentConfidence: 0.74,
        highAmountManualReviewAbove: 20000,
        defaultReviewStage: "underwriter_review",
        fraudReviewStage: "fraud_review",
      },
      createdAt: "2026-03-10T08:00:00.000Z",
    },
  ];
}

function seedDataSourceConnections(): DataSourceConnection[] {
  return [
    {
      id: "connector-1",
      organizationId: "org-gradient-demo",
      sourceType: "credit_bureau",
      providerName: "Experian Sandbox",
      status: "connected",
      syncMode: "api",
      defaultFreshnessHours: 12,
      coverage: 96,
      notes: "Primary bureau pull for scorecards and delinquencies.",
      lastSyncAt: "2026-03-14T08:40:00.000Z",
      createdAt: "2026-03-10T08:00:00.000Z",
    },
    {
      id: "connector-2",
      organizationId: "org-gradient-demo",
      sourceType: "payroll",
      providerName: "Pinwheel Sandbox",
      status: "connected",
      syncMode: "api",
      defaultFreshnessHours: 4,
      coverage: 88,
      notes: "Income and employer verification for borrower affordability checks.",
      lastSyncAt: "2026-03-14T08:15:00.000Z",
      createdAt: "2026-03-10T08:10:00.000Z",
    },
    {
      id: "connector-3",
      organizationId: "org-gradient-demo",
      sourceType: "public_records",
      providerName: "LexisNexis Sandbox",
      status: "connected",
      syncMode: "batch",
      defaultFreshnessHours: 24,
      coverage: 82,
      notes: "OFAC, address normalization, and public-record screening.",
      lastSyncAt: "2026-03-14T07:50:00.000Z",
      createdAt: "2026-03-10T08:15:00.000Z",
    },
    {
      id: "connector-4",
      organizationId: "org-gradient-demo",
      sourceType: "social_media",
      providerName: "Persona Digital Footprint",
      status: "attention",
      syncMode: "manual",
      defaultFreshnessHours: 168,
      coverage: 41,
      notes: "Used only for escalated fraud reviews and identity-resolution checks.",
      lastSyncAt: "2026-03-13T16:20:00.000Z",
      createdAt: "2026-03-10T08:20:00.000Z",
    },
    {
      id: "connector-5",
      organizationId: "org-gradient-demo",
      sourceType: "iot_device",
      providerName: "DeviceGraph Lab",
      status: "attention",
      syncMode: "batch",
      defaultFreshnessHours: 336,
      coverage: 34,
      notes: "Experimental device and telemetry feed for synthetic-profile investigations.",
      lastSyncAt: "2026-03-12T11:30:00.000Z",
      createdAt: "2026-03-10T08:25:00.000Z",
    },
  ];
}

function seedIngestionRuns(): IngestionRun[] {
  return [
    {
      id: "run-1",
      organizationId: "org-gradient-demo",
      applicationId: "app-1002",
      sourceType: "credit_bureau",
      providerName: "Experian Sandbox",
      status: "succeeded",
      recordsProcessed: 4,
      triggeredBy: "Partner API",
      detail: "Tradelines, inquiries, and delinquency summary normalized into bureau features.",
      createdAt: "2026-03-14T06:10:30.000Z",
    },
    {
      id: "run-2",
      organizationId: "org-gradient-demo",
      applicationId: "app-1002",
      sourceType: "payroll",
      providerName: "Pinwheel Sandbox",
      status: "partial",
      recordsProcessed: 2,
      triggeredBy: "Riya Shah",
      detail: "Employer verified but gross-income coverage is incomplete for one pay period.",
      createdAt: "2026-03-14T06:30:00.000Z",
    },
    {
      id: "run-3",
      organizationId: "org-gradient-demo",
      applicationId: undefined,
      sourceType: "social_media",
      providerName: "Persona Digital Footprint",
      status: "failed",
      recordsProcessed: 0,
      triggeredBy: "Nightly batch",
      detail: "Provider returned a throttling response; manual re-run required.",
      createdAt: "2026-03-14T03:00:00.000Z",
    },
  ];
}

function seedFraudAlerts(): FraudAlert[] {
  return [
    {
      id: "fraud-1",
      applicationId: "app-1002",
      customerName: "Jordan Patel",
      severity: "medium",
      reason: "Device mismatch detected between intake session and document upload.",
      createdAt: "2026-03-14T06:12:00.000Z",
    },
    {
      id: "fraud-2",
      applicationId: "app-1003",
      customerName: "Avery Brooks",
      severity: "high",
      reason: "Thin file combined with inconsistent bank statement metadata.",
      createdAt: "2026-03-14T07:21:00.000Z",
    },
    {
      id: "fraud-3",
      applicationId: "app-1006",
      customerName: "Khushbu Shah",
      severity: "high",
      reason: "Device mismatch with thin file and low-confidence document scan detected.",
      createdAt: "2026-03-14T09:16:00.000Z",
    },
  ];
}

function seedPortfolioMetrics(): PortfolioMetric[] {
  return [
    {
      id: "metric-1",
      label: "Book premium equivalent",
      value: "$12.4M",
      delta: "+4.2% this month",
      tone: "positive",
    },
    {
      id: "metric-2",
      label: "Average expected loss ratio",
      value: "42%",
      delta: "Stable vs prior week",
      tone: "neutral",
    },
    {
      id: "metric-3",
      label: "High-risk concentration",
      value: "18%",
      delta: "Above target by 2 pts",
      tone: "negative",
    },
  ];
}

function seedPortfolioConcentrations(): PortfolioConcentration[] {
  return [
    { segment: "Texas prime borrowers", exposure: 24, lossRatio: 31, change: "-1.2 pts" },
    { segment: "Florida near-prime borrowers", exposure: 19, lossRatio: 44, change: "+1.6 pts" },
    { segment: "California refinance loans", exposure: 16, lossRatio: 28, change: "-0.8 pts" },
    { segment: "Louisiana thin-file borrowers", exposure: 11, lossRatio: 62, change: "+4.7 pts" },
  ];
}
