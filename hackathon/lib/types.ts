export type ProductLine = "auto_insurance" | "personal_loan";
export type ApplicationStatus = "new" | "scored" | "manual_review" | "approved" | "declined";
export type RiskBand = "low" | "moderate" | "high";
export type DecisionAction = "auto_approve" | "manual_review" | "decline";
export type ModelStatus = "champion" | "challenger" | "shadow";
export type AlertSeverity = "low" | "medium" | "high";
export type MetricTone = "positive" | "neutral" | "negative";
export type FactorDirection = "increases" | "reduces";
export type DataSourceType =
  | "credit_bureau"
  | "payroll"
  | "bank_statements"
  | "public_records"
  | "device_intelligence"
  | "geospatial_index"
  | "social_media"
  | "iot_device";
export type DataSourceStatus = "ingested" | "warning" | "missing";
export type DataSourceConnectionStatus = "connected" | "attention" | "disconnected";
export type IngestionRunStatus = "succeeded" | "partial" | "failed";
export type IngestionSyncMode = "api" | "batch" | "manual";
export type FraudCaseStatus = "open" | "watch" | "cleared";
export type FraudCaseCategory = "claims_pattern" | "document_anomaly" | "identity_risk" | "synthetic_profile";
export type DocumentType = "bank_statement" | "pay_stub" | "identity_document" | "other";
export type DocumentVerificationStatus = "verified" | "review" | "rejected";
export type ModelEvaluationVerdict = "outperforming" | "trailing" | "parity";
export type MonitoringAlertCategory = "drift" | "performance" | "ingestion" | "fraud" | "document" | "workflow";

export interface WorkflowConfig {
  autoApproveBelow: number;
  declineAboveOrEqual: number;
  fraudEscalationAt: number;
  maxDebtToIncome: number;
  minDocumentConfidence: number;
  highAmountManualReviewAbove: number;
  defaultReviewStage: string;
  fraudReviewStage: string;
}

export interface WorkflowDefinition {
  id: string;
  organizationId?: string;
  name: string;
  config: WorkflowConfig;
  createdAt: string;
}

export interface WorkflowSimulation {
  recommendation: DecisionAction;
  workflowStage: string;
  reasons: string[];
  triggeredRules: string[];
}

export interface Application {
  id: string;
  organizationId?: string;
  externalRef: string;
  customerName: string;
  email: string;
  productLine: ProductLine;
  amountRequested: number;
  annualIncome: number;
  creditScore: number;
  debtToIncome: number;
  claimsCount: number;
  fraudSignals: string[];
  documentConfidence: number;
  geospatialRisk: number;
  state: string;
  status: ApplicationStatus;
  workflowStage: string;
  submittedAt: string;
}

export interface RiskFactorBreakdown {
  name: string;
  value: number | string;
  score: number;
  direction: FactorDirection;
  summary: string;
}

export interface RiskInput {
  applicationId?: string;
  productLine: ProductLine;
  amountRequested: number;
  annualIncome: number;
  creditScore: number;
  debtToIncome: number;
  claimsCount: number;
  fraudSignals: string[];
  documentConfidence: number;
  geospatialRisk: number;
}

export interface RiskAssessment {
  applicationId: string;
  score: number;
  band: RiskBand;
  fraudProbability: number;
  documentConfidence: number;
  recommendation: DecisionAction;
  reasons: string[];
  factors: RiskFactorBreakdown[];
  modelVersion: string;
  generatedAt: string;
}

export interface AuditEvent {
  id: string;
  applicationId: string;
  actor: string;
  action: string;
  details: string;
  createdAt: string;
}

export interface ModelVersion {
  id: string;
  name: string;
  version: string;
  status: ModelStatus;
  auc: number;
  precision: number;
  recall: number;
  drift: number;
  trafficShare: number;
  approvalThreshold: number;
  deployedAt: string;
  notes: string;
}

export interface PortfolioMetric {
  id: string;
  label: string;
  value: string;
  delta: string;
  tone: MetricTone;
}

export interface PortfolioConcentration {
  segment: string;
  exposure: number;
  lossRatio: number;
  change: string;
}

export interface FraudAlert {
  id: string;
  applicationId: string;
  customerName: string;
  severity: AlertSeverity;
  reason: string;
  createdAt: string;
}

export interface DashboardSnapshot {
  applicationsToday: number;
  averageRiskScore: number;
  autoDecisionRate: number;
  manualReviewQueue: number;
  fraudAlertCount: number;
  activeModelName: string;
  modeLabel: string;
  ingestionCoverage: number;
  challengerWinRate: number;
}

export interface DecisionPayload {
  applicationId: string;
  decision: DecisionAction;
  actor: string;
  notes: string;
}

export interface ApplicationDocument {
  id: string;
  applicationId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentType: DocumentType;
  verificationStatus: DocumentVerificationStatus;
  extractedConfidence: number;
  analysisSummary: string;
  extractedData: Record<string, string | number>;
  storagePath: string | null;
  uploadedAt: string;
}

export interface ApplicationDataSource {
  id: string;
  applicationId: string;
  sourceType: DataSourceType;
  status: DataSourceStatus;
  confidence: number;
  freshnessHours: number;
  detail: string;
  createdAt: string;
}

export interface DataSourceConnection {
  id: string;
  organizationId?: string;
  sourceType: DataSourceType;
  providerName: string;
  status: DataSourceConnectionStatus;
  syncMode: IngestionSyncMode;
  defaultFreshnessHours: number;
  coverage: number;
  notes: string;
  lastSyncAt: string | null;
  createdAt: string;
}

export interface IngestionRun {
  id: string;
  organizationId?: string;
  applicationId?: string;
  sourceType: DataSourceType;
  providerName: string;
  status: IngestionRunStatus;
  recordsProcessed: number;
  triggeredBy: string;
  detail: string;
  createdAt: string;
}

export interface FraudCase {
  id: string;
  applicationId: string;
  category: FraudCaseCategory;
  score: number;
  status: FraudCaseStatus;
  explanation: string;
  createdAt: string;
}

export interface GeospatialInsight {
  state: string;
  region: string;
  baselineRisk: number;
  concentrationIndex: number;
  climateVolatility: number;
  laborStress: number;
  fraudPressure: number;
  hazardSummary: string;
  derivedRisk: number;
}

export interface ModelEvaluation {
  id: string;
  applicationId: string;
  modelVersionId: string;
  modelName: string;
  version: string;
  lane: ModelStatus;
  score: number;
  recommendation: DecisionAction;
  deltaFromChampion: number;
  verdict: ModelEvaluationVerdict;
  createdAt: string;
}

export interface ChampionChallengerSummary {
  modelVersionId: string;
  modelName: string;
  version: string;
  lane: ModelStatus;
  sampleSize: number;
  wins: number;
  losses: number;
  averageDelta: number;
  winRate: number;
  significance: number;
  confidenceLabel: string;
  recommendation: string;
}

export interface FraudPatternGroup {
  id: string;
  title: string;
  patternType: "shared_signal" | "shared_geography" | "shared_domain";
  applications: string[];
  averageFraudScore: number;
  caseCount: number;
  detail: string;
}

export interface PortfolioProjection {
  horizon: string;
  projectedExposure: number;
  expectedLossRate: number;
  projectedApprovals: number;
  projectedManualReviews: number;
  projectedDeclines: number;
}

export interface GeospatialPortfolioRow {
  state: string;
  region: string;
  applications: number;
  averageRisk: number;
  concentrationIndex: number;
  climateVolatility: number;
  laborStress: number;
  fraudPressure: number;
}

export interface DocumentPortfolioSummary {
  totalDocuments: number;
  verifiedDocuments: number;
  reviewDocuments: number;
  rejectedDocuments: number;
  averageConfidence: number;
  ocrCoverage: number;
}

export interface MonitoringAlert {
  id: string;
  category: MonitoringAlertCategory;
  severity: AlertSeverity;
  title: string;
  detail: string;
  metric: string;
  createdAt: string;
}

export interface SourceIngestionInput {
  sourceType: DataSourceType;
  providerName: string;
  status: DataSourceStatus;
  confidence: number;
  freshnessHours: number;
  detail: string;
  recordsProcessed?: number;
}
