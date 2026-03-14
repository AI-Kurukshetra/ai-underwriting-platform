import type { Application, RiskAssessment, RiskFactorBreakdown, RiskInput } from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function toRiskInput(application: Application): RiskInput {
  return {
    applicationId: application.id,
    productLine: application.productLine,
    amountRequested: application.amountRequested,
    annualIncome: application.annualIncome,
    creditScore: application.creditScore,
    debtToIncome: application.debtToIncome,
    claimsCount: application.claimsCount,
    fraudSignals: application.fraudSignals,
    documentConfidence: application.documentConfidence,
    geospatialRisk: application.geospatialRisk,
  };
}

function creditRisk(creditScore: number) {
  return clamp(((850 - creditScore) / 550) * 100, 0, 100);
}

function affordabilityRisk(amountRequested: number, annualIncome: number, debtToIncome: number) {
  const loanToIncome = amountRequested / Math.max(annualIncome, 1);
  return clamp(loanToIncome * 110 + debtToIncome * 60, 0, 100);
}

function claimsRisk(claimsCount: number) {
  return clamp(claimsCount * 18, 0, 100);
}

function fraudRisk(signals: string[]) {
  return clamp(signals.length * 24, 0, 100);
}

function documentRisk(documentConfidence: number) {
  return clamp((1 - documentConfidence) * 100, 0, 100);
}

function geoRisk(geospatialRisk: number) {
  return clamp(geospatialRisk * 100, 0, 100);
}

function buildFactors(input: RiskInput) {
  const factors: RiskFactorBreakdown[] = [
    {
      name: "Credit profile",
      value: input.creditScore,
      score: Math.round(creditRisk(input.creditScore) * 0.28),
      direction: input.creditScore < 650 ? "increases" : "reduces",
      summary:
        input.creditScore < 650
          ? "Lower credit score increases default risk and pushes this file toward manual review."
          : "Strong credit profile offsets a portion of underwriting risk.",
    },
    {
      name: "Affordability",
      value: `${Math.round(input.debtToIncome * 100)}% DTI`,
      score: Math.round(affordabilityRisk(input.amountRequested, input.annualIncome, input.debtToIncome) * 0.22),
      direction: input.debtToIncome > 0.42 ? "increases" : "reduces",
      summary:
        input.debtToIncome > 0.42
          ? "Debt burden and requested amount create affordability stress."
          : "Income coverage supports the requested amount.",
    },
    {
      name: "Prior claims / losses",
      value: input.claimsCount,
      score: Math.round(claimsRisk(input.claimsCount) * 0.12),
      direction: input.claimsCount >= 2 ? "increases" : "reduces",
      summary:
        input.claimsCount >= 2
          ? "Loss history suggests higher expected claims or repayment volatility."
          : "Clean historical record reduces expected loss exposure.",
    },
    {
      name: "Document confidence",
      value: `${Math.round(input.documentConfidence * 100)}%`,
      score: Math.round(documentRisk(input.documentConfidence) * 0.14),
      direction: input.documentConfidence < 0.8 ? "increases" : "reduces",
      summary:
        input.documentConfidence < 0.8
          ? "Low extraction confidence indicates missing or inconsistent source documents."
          : "Document package appears complete and internally consistent.",
    },
    {
      name: "Fraud signals",
      value: input.fraudSignals.length,
      score: Math.round(fraudRisk(input.fraudSignals) * 0.14),
      direction: input.fraudSignals.length > 0 ? "increases" : "reduces",
      summary:
        input.fraudSignals.length > 0
          ? `Observed signals: ${input.fraudSignals.join(", ")}.`
          : "No immediate fraud heuristics triggered on intake.",
    },
    {
      name: "Geospatial risk",
      value: `${Math.round(input.geospatialRisk * 100)}%`,
      score: Math.round(geoRisk(input.geospatialRisk) * 0.1),
      direction: input.geospatialRisk > 0.55 ? "increases" : "reduces",
      summary:
        input.geospatialRisk > 0.55
          ? "Region-level concentration or catastrophe exposure increases expected losses."
          : "Location risk stays within portfolio tolerance.",
    },
  ];

  return factors;
}

export function assessApplication(input: RiskInput | Application): RiskAssessment {
  const normalized = "externalRef" in input ? toRiskInput(input) : input;
  const factors = buildFactors(normalized);
  const weightedScore = clamp(factors.reduce((sum, factor) => sum + factor.score, 0), 0, 100);
  const fraudProbability = clamp(
    Math.round(fraudRisk(normalized.fraudSignals) * 0.6 + documentRisk(normalized.documentConfidence) * 0.2 + claimsRisk(normalized.claimsCount) * 0.2),
    0,
    100,
  );

  const band = weightedScore <= 35 ? "low" : weightedScore <= 65 ? "moderate" : "high";
  const recommendation =
    band === "low" && fraudProbability < 35
      ? "auto_approve"
      : band === "high" || fraudProbability >= 70
        ? "decline"
        : "manual_review";

  const reasons: string[] = [];

  if (normalized.creditScore < 640) reasons.push("Credit score is below preferred threshold.");
  if (normalized.debtToIncome > 0.42) reasons.push("Debt-to-income ratio exceeds automated approval guardrail.");
  if (normalized.documentConfidence < 0.8) reasons.push("Document extraction confidence requires human verification.");
  if (normalized.fraudSignals.length > 0) reasons.push(`Fraud heuristics triggered: ${normalized.fraudSignals.join(", ")}.`);
  if (normalized.geospatialRisk > 0.55) reasons.push("Geospatial risk exceeds portfolio baseline.");
  if (reasons.length === 0) reasons.push("Application fits current underwriting appetite.");

  return {
    applicationId: normalized.applicationId ?? crypto.randomUUID(),
    score: weightedScore,
    band,
    fraudProbability,
    documentConfidence: normalized.documentConfidence,
    recommendation,
    reasons,
    factors,
    modelVersion: "gradient-lite-v1.3.0",
    generatedAt: new Date().toISOString(),
  };
}
