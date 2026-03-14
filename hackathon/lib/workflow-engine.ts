import type { Application, RiskAssessment, WorkflowConfig, WorkflowDefinition, WorkflowSimulation } from "@/lib/types";

export const defaultWorkflowConfig: WorkflowConfig = {
  autoApproveBelow: 35,
  declineAboveOrEqual: 65,
  fraudEscalationAt: 70,
  maxDebtToIncome: 0.45,
  minDocumentConfidence: 0.74,
  highAmountManualReviewAbove: 20_000,
  defaultReviewStage: "underwriter_review",
  fraudReviewStage: "fraud_review",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function readNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function readString(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

export function normalizeWorkflowConfig(config: unknown): WorkflowConfig {
  const source = config && typeof config === "object" ? (config as Record<string, unknown>) : {};
  const legacyDeclineThreshold = readNumber(source.manualReviewBelow, defaultWorkflowConfig.declineAboveOrEqual);

  return {
    autoApproveBelow: clamp(readNumber(source.autoApproveBelow, defaultWorkflowConfig.autoApproveBelow), 0, 100),
    declineAboveOrEqual: clamp(readNumber(source.declineAboveOrEqual, legacyDeclineThreshold), 0, 100),
    fraudEscalationAt: clamp(readNumber(source.fraudEscalationAt, defaultWorkflowConfig.fraudEscalationAt), 0, 100),
    maxDebtToIncome: clamp(readNumber(source.maxDebtToIncome, defaultWorkflowConfig.maxDebtToIncome), 0, 1),
    minDocumentConfidence: clamp(
      readNumber(source.minDocumentConfidence, defaultWorkflowConfig.minDocumentConfidence),
      0,
      1,
    ),
    highAmountManualReviewAbove: clamp(
      readNumber(source.highAmountManualReviewAbove, defaultWorkflowConfig.highAmountManualReviewAbove),
      1_000,
      250_000,
    ),
    defaultReviewStage: readString(source.defaultReviewStage, defaultWorkflowConfig.defaultReviewStage),
    fraudReviewStage: readString(source.fraudReviewStage, defaultWorkflowConfig.fraudReviewStage),
  };
}

export function evaluateWorkflow(
  application: Application,
  assessment: RiskAssessment,
  workflow?: Pick<WorkflowDefinition, "config"> | null,
): WorkflowSimulation {
  const config = normalizeWorkflowConfig(workflow?.config);
  const triggeredRules: string[] = [];
  const reasons: string[] = [];

  if (assessment.fraudProbability >= config.fraudEscalationAt || application.fraudSignals.length >= 2) {
    triggeredRules.push("fraud_escalation");
    reasons.push(`Fraud controls escalated this file at ${assessment.fraudProbability}% probability.`);

    return {
      recommendation: "manual_review",
      workflowStage: config.fraudReviewStage,
      reasons,
      triggeredRules,
    };
  }

  if (application.debtToIncome > config.maxDebtToIncome) {
    triggeredRules.push("debt_to_income_guardrail");
    reasons.push(`Debt-to-income ${Math.round(application.debtToIncome * 100)}% exceeds the workflow cap.`);
  }

  if (application.documentConfidence < config.minDocumentConfidence) {
    triggeredRules.push("document_guardrail");
    reasons.push(`Document confidence ${Math.round(application.documentConfidence * 100)}% requires human review.`);
  }

  if (application.amountRequested >= config.highAmountManualReviewAbove) {
    triggeredRules.push("exposure_guardrail");
    reasons.push(`Requested exposure ${application.amountRequested} exceeds the manual-review threshold.`);
  }

  if (assessment.score <= config.autoApproveBelow && triggeredRules.length === 0) {
    return {
      recommendation: "auto_approve",
      workflowStage: "decisioned",
      reasons: [`Score ${assessment.score} cleared the workflow auto-approve threshold.`],
      triggeredRules: ["auto_approve"],
    };
  }

  if (assessment.score >= config.declineAboveOrEqual && triggeredRules.length === 0) {
    return {
      recommendation: "decline",
      workflowStage: "decisioned",
      reasons: [`Score ${assessment.score} exceeded the workflow decline threshold.`],
      triggeredRules: ["decline_threshold"],
    };
  }

  if (triggeredRules.length === 0) {
    triggeredRules.push("score_band_review");
    reasons.push(`Score ${assessment.score} falls between automated decision thresholds.`);
  }

  return {
    recommendation: "manual_review",
    workflowStage: config.defaultReviewStage,
    reasons,
    triggeredRules,
  };
}
