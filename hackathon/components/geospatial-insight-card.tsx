import type { GeospatialInsight } from "@/lib/types";
import { formatPercent } from "@/lib/utils";

export function GeospatialInsightCard({
  insight,
}: {
  insight: GeospatialInsight;
}) {
  return (
    <section className="content-card">
      <p className="kicker">Geospatial intelligence</p>
      <h2 className="section-title">Regional exposure</h2>
      <ul className="meta-list">
        <li>State: {insight.state}</li>
        <li>Region: {insight.region}</li>
        <li>Baseline risk: {formatPercent(insight.baselineRisk)}</li>
        <li>Concentration index: {formatPercent(insight.concentrationIndex)}</li>
        <li>Climate volatility: {formatPercent(insight.climateVolatility)}</li>
        <li>Labor stress: {formatPercent(insight.laborStress)}</li>
        <li>Fraud pressure: {formatPercent(insight.fraudPressure)}</li>
        <li>Derived risk: {formatPercent(insight.derivedRisk)}</li>
      </ul>
      <p className="card-copy">{insight.hazardSummary}</p>
    </section>
  );
}
