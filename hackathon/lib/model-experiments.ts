import type { ChampionChallengerSummary, ModelEvaluation, ModelStatus } from "@/lib/types";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function confidenceLabel(significance: number) {
  if (significance >= 95) return "significant";
  if (significance >= 80) return "emerging";
  return "insufficient";
}

export function summarizeChampionChallenger(
  evaluations: ModelEvaluation[],
): ChampionChallengerSummary[] {
  const grouped = new Map<string, ModelEvaluation[]>();

  for (const evaluation of evaluations) {
    const bucket = grouped.get(evaluation.modelVersionId) ?? [];
    bucket.push(evaluation);
    grouped.set(evaluation.modelVersionId, bucket);
  }

  return [...grouped.values()]
    .map((items) => {
      const sample = items[0];
      const wins = items.filter((item) => item.verdict === "outperforming").length;
      const losses = items.filter((item) => item.verdict === "trailing").length;
      const averageDelta =
        items.reduce((sum, item) => sum + item.deltaFromChampion, 0) / Math.max(items.length, 1);
      const winRate = Math.round((wins / Math.max(items.length, 1)) * 100);
      const signalStrength = Math.abs(averageDelta) * 8 + Math.sqrt(items.length) * 9 + Math.abs(wins - losses) * 3;
      const significance = clamp(Math.round(signalStrength), 35, 99);
      const recommendation =
        sample.lane === "challenger" && averageDelta <= -2 && significance >= 80
          ? "Candidate is outperforming champion. Increase traffic or promote."
          : sample.lane === "challenger" && significance < 80
            ? "Collect more evaluation volume before rollout."
            : sample.lane === "shadow"
              ? "Keep in shadow mode until recall improvement is stable."
              : "Baseline champion benchmark.";

      return {
        modelVersionId: sample.modelVersionId,
        modelName: sample.modelName,
        version: sample.version,
        lane: sample.lane as ModelStatus,
        sampleSize: items.length,
        wins,
        losses,
        averageDelta: Math.round(averageDelta * 10) / 10,
        winRate,
        significance,
        confidenceLabel: confidenceLabel(significance),
        recommendation,
      };
    })
    .sort((a, b) => b.significance - a.significance);
}
