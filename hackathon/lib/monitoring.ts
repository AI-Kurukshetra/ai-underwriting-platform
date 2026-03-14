import type {
  ApplicationDocument,
  DataSourceConnection,
  FraudAlert,
  FraudCase,
  IngestionRun,
  ModelEvaluation,
  ModelVersion,
  MonitoringAlert,
  WorkflowDefinition,
} from "@/lib/types";
import { summarizeChampionChallenger } from "@/lib/model-experiments";
import { normalizeWorkflowConfig } from "@/lib/workflow-engine";

export function buildMonitoringAlerts(input: {
  models: ModelVersion[];
  evaluations: ModelEvaluation[];
  fraudAlerts: FraudAlert[];
  fraudCases: FraudCase[];
  runs: IngestionRun[];
  connections: DataSourceConnection[];
  documents: ApplicationDocument[];
  workflows: WorkflowDefinition[];
}): MonitoringAlert[] {
  const alerts: MonitoringAlert[] = [];
  const now = new Date().toISOString();
  const experimentSummaries = summarizeChampionChallenger(input.evaluations);

  for (const model of input.models) {
    if (model.drift >= 4) {
      alerts.push({
        id: `drift-${model.id}`,
        category: "drift",
        severity: model.drift >= 6 ? "high" : "medium",
        title: `${model.name} v${model.version} drift alert`,
        detail: "Model drift is beyond the underwriting tolerance and should trigger retraining or rollback review.",
        metric: `Drift ${model.drift}%`,
        createdAt: now,
      });
    }
  }

  for (const summary of experimentSummaries) {
    if (summary.lane === "challenger" && summary.significance >= 80) {
      alerts.push({
        id: `experiment-${summary.modelVersionId}`,
        category: "performance",
        severity: summary.winRate >= 55 ? "medium" : "low",
        title: `${summary.modelName} v${summary.version} experiment signal`,
        detail: summary.recommendation,
        metric: `Win rate ${summary.winRate}% · Confidence ${summary.significance}%`,
        createdAt: now,
      });
    }
  }

  for (const run of input.runs.filter((item) => item.status !== "succeeded").slice(0, 4)) {
    alerts.push({
      id: `ingestion-${run.id}`,
      category: "ingestion",
      severity: run.status === "failed" ? "high" : "medium",
      title: `${run.providerName} ingestion degraded`,
      detail: run.detail,
      metric: `${run.recordsProcessed} records · ${run.status}`,
      createdAt: run.createdAt,
    });
  }

  for (const connection of input.connections.filter((item) => item.status !== "connected").slice(0, 4)) {
    alerts.push({
      id: `connection-${connection.id}`,
      category: "ingestion",
      severity: connection.status === "disconnected" ? "high" : "medium",
      title: `${connection.providerName} connector attention`,
      detail: connection.notes,
      metric: `Coverage ${Math.round(connection.coverage)}%`,
      createdAt: connection.createdAt,
    });
  }

  for (const alert of input.fraudAlerts.slice(0, 4)) {
    alerts.push({
      id: `fraud-${alert.id}`,
      category: "fraud",
      severity: alert.severity,
      title: `Fraud alert for ${alert.customerName}`,
      detail: alert.reason,
      metric: `Application ${alert.applicationId}`,
      createdAt: alert.createdAt,
    });
  }

  for (const fraudCase of input.fraudCases.filter((item) => item.status !== "cleared").slice(0, 4)) {
    alerts.push({
      id: `case-${fraudCase.id}`,
      category: "fraud",
      severity: fraudCase.score >= 75 ? "high" : "medium",
      title: `${fraudCase.category.replace(/_/g, " ")} case active`,
      detail: fraudCase.explanation,
      metric: `Score ${Math.round(fraudCase.score)}`,
      createdAt: fraudCase.createdAt,
    });
  }

  const reviewDocuments = input.documents.filter((item) => item.verificationStatus !== "verified");
  if (reviewDocuments.length > 0) {
    alerts.push({
      id: "document-review",
      category: "document",
      severity: reviewDocuments.some((item) => item.verificationStatus === "rejected") ? "high" : "medium",
      title: "Document verification backlog",
      detail: "Some uploaded packets still require OCR verification or were rejected.",
      metric: `${reviewDocuments.length} documents pending`,
      createdAt: now,
    });
  }

  const primaryWorkflow = input.workflows[0];
  if (primaryWorkflow) {
    const config = normalizeWorkflowConfig(primaryWorkflow.config);
    if (config.autoApproveBelow >= config.declineAboveOrEqual) {
      alerts.push({
        id: `workflow-${primaryWorkflow.id}`,
        category: "workflow",
        severity: "high",
        title: `${primaryWorkflow.name} has invalid thresholds`,
        detail: "Auto-approve threshold must stay below the decline threshold to keep decision routing deterministic.",
        metric: `${config.autoApproveBelow} / ${config.declineAboveOrEqual}`,
        createdAt: primaryWorkflow.createdAt,
      });
    }
  }

  return alerts
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);
}
