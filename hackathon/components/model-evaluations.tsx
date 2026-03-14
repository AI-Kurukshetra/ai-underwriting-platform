import { StatusPill } from "@/components/status-pill";
import type { ModelEvaluation } from "@/lib/types";
import { formatToken } from "@/lib/utils";

export function ModelEvaluations({
  evaluations,
}: {
  evaluations: ModelEvaluation[];
}) {
  return (
    <section className="content-card">
      <p className="kicker">Champion challenger</p>
      <h2 className="section-title">Model comparison</h2>
      {evaluations.length === 0 ? (
        <p className="card-copy">No per-file model evaluations are available yet.</p>
      ) : (
        <div className="alert-list">
          {evaluations.map((evaluation) => (
            <article className="alert-card" key={evaluation.id}>
              <div className="alert-header">
                <div>
                  <h3 className="card-title">
                    {evaluation.modelName} v{evaluation.version}
                  </h3>
                  <p className="card-copy">
                    {formatToken(evaluation.lane)} lane · {formatToken(evaluation.recommendation)}
                  </p>
                </div>
                <StatusPill value={evaluation.verdict} />
              </div>
              <p className="meta-text">
                Score {Math.round(evaluation.score)} · Delta vs champion {evaluation.deltaFromChampion > 0 ? "+" : ""}
                {Math.round(evaluation.deltaFromChampion)}
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
