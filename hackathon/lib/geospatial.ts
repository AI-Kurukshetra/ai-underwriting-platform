import type { GeospatialInsight } from "@/lib/types";

const stateProfiles: Record<
  string,
  {
    region: string;
    baselineRisk: number;
    concentrationIndex: number;
    climateVolatility: number;
    laborStress: number;
    fraudPressure: number;
    hazardSummary: string;
  }
> = {
  arizona: { region: "Southwest", baselineRisk: 0.29, concentrationIndex: 0.32, climateVolatility: 0.42, laborStress: 0.31, fraudPressure: 0.28, hazardSummary: "Heat and wage-volatility pockets remain manageable." },
  california: { region: "West", baselineRisk: 0.33, concentrationIndex: 0.28, climateVolatility: 0.36, laborStress: 0.34, fraudPressure: 0.29, hazardSummary: "Large borrower base with mild catastrophe and housing-cost pressure." },
  florida: { region: "Southeast", baselineRisk: 0.53, concentrationIndex: 0.61, climateVolatility: 0.71, laborStress: 0.45, fraudPressure: 0.57, hazardSummary: "Storm exposure and prior-loss concentration increase volatility." },
  louisiana: { region: "Southeast", baselineRisk: 0.62, concentrationIndex: 0.68, climateVolatility: 0.79, laborStress: 0.49, fraudPressure: 0.63, hazardSummary: "High catastrophe overlap and thin-file concentration elevate loss exposure." },
  texas: { region: "South", baselineRisk: 0.27, concentrationIndex: 0.35, climateVolatility: 0.39, laborStress: 0.3, fraudPressure: 0.24, hazardSummary: "Stable lending mix with moderate weather-linked volatility." },
  new_york: { region: "Northeast", baselineRisk: 0.31, concentrationIndex: 0.29, climateVolatility: 0.22, laborStress: 0.27, fraudPressure: 0.23, hazardSummary: "Dense metro concentration with stable bureau coverage." },
};

function normalizeState(state: string) {
  return state.trim().toLowerCase().replace(/\s+/g, "_");
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function deriveGeospatialInsight(state: string, amountRequested: number): GeospatialInsight {
  const normalized = normalizeState(state);
  const profile =
    stateProfiles[normalized] ?? {
      region: "National",
      baselineRisk: 0.34,
      concentrationIndex: 0.3,
      climateVolatility: 0.3,
      laborStress: 0.3,
      fraudPressure: 0.3,
      hazardSummary: "Default regional baseline based on the national lending mix.",
    };

  const amountPressure = amountRequested > 20_000 ? 0.04 : amountRequested > 10_000 ? 0.02 : 0;
  const derivedRisk = clamp(
    Number(
      (
        profile.baselineRisk * 0.42 +
        profile.concentrationIndex * 0.2 +
        profile.climateVolatility * 0.13 +
        profile.laborStress * 0.13 +
        profile.fraudPressure * 0.12 +
        amountPressure
      ).toFixed(2),
    ),
    0.15,
    0.85,
  );

  return {
    state,
    region: profile.region,
    baselineRisk: profile.baselineRisk,
    concentrationIndex: profile.concentrationIndex,
    climateVolatility: profile.climateVolatility,
    laborStress: profile.laborStress,
    fraudPressure: profile.fraudPressure,
    hazardSummary: profile.hazardSummary,
    derivedRisk,
  };
}
