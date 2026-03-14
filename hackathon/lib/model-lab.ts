import { assessApplication } from "@/lib/risk-engine";
import type { Application, DecisionAction, ModelEvaluation, ModelVersion } from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function scoreAdjustment(status: ModelVersion["status"], drift: number, precision: number, recall: number) {
  if (status === "champion") return 0;
  if (status === "shadow") return Math.round((recall - precision) * 18 - drift * 0.6);
  return Math.round((precision - 0.8) * 40 + (recall - 0.76) * 24 - drift * 0.5);
}

function recommendationForScore(score: number, threshold: number, fraudProbability: number): DecisionAction {
  if (score <= threshold && fraudProbability < 35) return "auto_approve";
  if (score >= threshold + 28 || fraudProbability >= 70) return "decline";
  return "manual_review";
}

export function evaluateModels(application: Application, models: ModelVersion[]): ModelEvaluation[] {
  const championModel = models.find((model) => model.status === "champion") ?? models[0];
  const baseAssessment = assessApplication(application);
  const championScore = baseAssessment.score;

  return models.map((model) => {
    const adjustedScore = clamp(
      championScore + scoreAdjustment(model.status, model.drift, model.precision, model.recall),
      0,
      100,
    );
    const recommendation = recommendationForScore(
      adjustedScore,
      model.approvalThreshold,
      baseAssessment.fraudProbability,
    );

    const deltaFromChampion = adjustedScore - championScore;
    const verdict =
      deltaFromChampion <= -3 ? "outperforming" : deltaFromChampion >= 3 ? "trailing" : "parity";

    return {
      id: crypto.randomUUID(),
      applicationId: application.id,
      modelVersionId: model.id,
      modelName: model.name,
      version: model.version,
      lane: model.status,
      score: adjustedScore,
      recommendation,
      deltaFromChampion,
      verdict,
      createdAt: new Date().toISOString(),
    };
  });
}
