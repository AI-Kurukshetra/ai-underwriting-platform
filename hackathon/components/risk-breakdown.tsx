import type { RiskAssessment } from "@/lib/types";
import { formatPercent, formatToken } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";

export function RiskBreakdown({ assessment }: { assessment: RiskAssessment }) {
  return (
    <div className="factor-list">
      <article className="factor-card">
        <div className="factor-card-header">
          <div>
            <p className="kicker">Decision recommendation</p>
            <h3 className="card-title">Risk score {assessment.score}</h3>
          </div>
          <StatusPill value={assessment.band} />
        </div>
        <p className="card-copy">Recommendation: {formatToken(assessment.recommendation)}</p>
        <ul className="meta-list">
          <li>Fraud probability: {assessment.fraudProbability}%</li>
          <li>Document confidence: {formatPercent(assessment.documentConfidence)}</li>
          <li>Model version: {assessment.modelVersion}</li>
        </ul>
      </article>

      {assessment.factors.map((factor) => (
        <article className="factor-card" key={factor.name}>
          <div className="factor-card-header">
            <h3 className="card-title">{factor.name}</h3>
            <span className={factor.direction === "increases" ? "status-negative" : "status-positive"}>
              {factor.direction === "increases" ? `+${factor.score}` : `-${factor.score}`}
            </span>
          </div>
          <p className="card-copy">{factor.summary}</p>
          <p className="meta-text">Observed value: {factor.value}</p>
        </article>
      ))}

      <article className="factor-card">
        <p className="kicker">Top reasons</p>
        <ul className="reason-list">
          {assessment.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      </article>
    </div>
  );
}
