import { z } from "zod";

export const sourceIngestionSchema = z.object({
  sourceType: z.enum([
    "credit_bureau",
    "payroll",
    "bank_statements",
    "public_records",
    "device_intelligence",
    "geospatial_index",
    "social_media",
    "iot_device",
  ]),
  providerName: z.string().min(2),
  status: z.enum(["ingested", "warning", "missing"]),
  confidence: z.number().min(0).max(1),
  freshnessHours: z.number().int().min(0).max(24 * 30),
  detail: z.string().min(4),
  recordsProcessed: z.number().int().min(0).max(100_000).optional(),
});

export const applicationPayloadSchema = z.object({
  organizationId: z.string().uuid().optional(),
  externalRef: z.string().min(3),
  customerName: z.string().min(2),
  email: z.string().email(),
  productLine: z.enum(["auto_insurance", "personal_loan"]),
  amountRequested: z.number().positive(),
  annualIncome: z.number().positive(),
  creditScore: z.number().int().min(300).max(850),
  debtToIncome: z.number().min(0).max(1),
  claimsCount: z.number().int().min(0).max(20),
  fraudSignals: z.array(z.string()).default([]),
  documentConfidence: z.number().min(0).max(1),
  geospatialRisk: z.number().min(0).max(1),
  state: z.string().min(2).max(32),
  status: z.enum(["new", "scored", "manual_review", "approved", "declined"]).optional(),
  workflowStage: z.string().min(2).optional(),
  submittedAt: z.string().datetime().optional(),
  sourceInputs: z.array(sourceIngestionSchema).optional(),
});

export const riskInputSchema = z.object({
  applicationId: z.string().optional(),
  productLine: z.enum(["auto_insurance", "personal_loan"]),
  amountRequested: z.number().positive(),
  annualIncome: z.number().positive(),
  creditScore: z.number().int().min(300).max(850),
  debtToIncome: z.number().min(0).max(1),
  claimsCount: z.number().int().min(0).max(20),
  fraudSignals: z.array(z.string()).default([]),
  documentConfidence: z.number().min(0).max(1),
  geospatialRisk: z.number().min(0).max(1),
});

export const decisionPayloadSchema = z.object({
  applicationId: z.string().min(1),
  decision: z.enum(["auto_approve", "manual_review", "decline"]),
  actor: z.string().min(2),
  notes: z.string().min(5),
});

export const dataSourceConnectionSchema = z.object({
  sourceType: sourceIngestionSchema.shape.sourceType,
  providerName: z.string().min(2),
  status: z.enum(["connected", "attention", "disconnected"]),
  syncMode: z.enum(["api", "batch", "manual"]),
  defaultFreshnessHours: z.number().int().min(0).max(24 * 30),
  coverage: z.number().min(0).max(100),
  notes: z.string().min(4),
});

export const ingestionRunSchema = z.object({
  applicationId: z.string().optional(),
  sourceType: sourceIngestionSchema.shape.sourceType,
  providerName: z.string().min(2),
  status: z.enum(["succeeded", "partial", "failed"]),
  recordsProcessed: z.number().int().min(0).max(100_000),
  triggeredBy: z.string().min(2),
  detail: z.string().min(4),
});

export const workflowConfigSchema = z.object({
  autoApproveBelow: z.number().min(0).max(100),
  declineAboveOrEqual: z.number().min(0).max(100),
  fraudEscalationAt: z.number().min(0).max(100),
  maxDebtToIncome: z.number().min(0).max(1),
  minDocumentConfidence: z.number().min(0).max(1),
  highAmountManualReviewAbove: z.number().min(1_000).max(250_000),
  defaultReviewStage: z.string().min(2),
  fraudReviewStage: z.string().min(2),
});

export const workflowUpdateSchema = z.object({
  workflowId: z.string().min(1),
  name: z.string().min(2),
  config: workflowConfigSchema.refine((value) => value.autoApproveBelow < value.declineAboveOrEqual, {
    message: "Auto-approve threshold must stay below decline threshold.",
  }),
});

export const fraudCaseUpdateSchema = z.object({
  caseId: z.string().min(1),
  status: z.enum(["open", "watch", "cleared"]),
});

export const documentReviewSchema = z.object({
  documentId: z.string().min(1),
  status: z.enum(["verified", "review", "rejected"]),
});

export const modelUpdateSchema = z.object({
  modelId: z.string().min(1),
  approvalThreshold: z.number().min(0).max(100),
  drift: z.number().min(0).max(100),
  notes: z.string().min(5),
});
