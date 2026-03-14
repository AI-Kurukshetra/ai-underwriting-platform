import {
  createModelVersionAction,
  promoteModelVersionAction,
  rebalanceModelTrafficAction,
  updateModelVersionAction,
} from "@/app/models/actions";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile } from "@/lib/auth";
import { summarizeChampionChallenger } from "@/lib/model-experiments";
import { listModelEvaluations, listModelVersions } from "@/lib/repository";

function summarizeEvaluations(modelId: string, evaluations: Awaited<ReturnType<typeof listModelEvaluations>>) {
  const items = evaluations.filter((evaluation) => evaluation.modelVersionId === modelId);
  const wins = items.filter((evaluation) => evaluation.verdict === "outperforming").length;
  const trailing = items.filter((evaluation) => evaluation.verdict === "trailing").length;
  const avgDelta = Math.round(
    items.reduce((sum, evaluation) => sum + evaluation.deltaFromChampion, 0) / Math.max(items.length, 1),
  );

  return {
    sampleSize: items.length,
    wins,
    trailing,
    avgDelta,
  };
}

export default async function ModelsPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  const [models, evaluations, profile] = await Promise.all([
    listModelVersions(),
    listModelEvaluations(),
    getCurrentProfile(),
  ]);
  const isAdmin = profile?.role === "admin";
  const experimentSummaries = summarizeChampionChallenger(evaluations);

  return (
    <div className="page-grid">
      <PageHeader
        title="Model governance"
        description="Manage champion-challenger traffic, score thresholds, and release readiness for personal-loan underwriting models."
      />
      {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

      <section className="metrics-grid">
        {models.map((model) => {
          const summary = summarizeEvaluations(model.id, evaluations);

          return (
            <article className="metric-card" key={model.id}>
              <div className="alert-header">
                <div>
                  <p className="kicker">{model.name}</p>
                  <h2 className="card-title">Version {model.version}</h2>
                </div>
                <StatusPill value={model.status} />
              </div>
              <p className="card-copy">{model.notes}</p>
              <ul className="meta-list">
                <li>AUC: {model.auc}</li>
                <li>Precision: {model.precision}</li>
                <li>Recall: {model.recall}</li>
                <li>Drift: {model.drift}%</li>
                <li>Traffic share: {model.trafficShare}%</li>
                <li>Approve threshold: {model.approvalThreshold}</li>
                <li>Eval sample: {summary.sampleSize}</li>
                <li>Challenger wins: {summary.wins}</li>
                <li>Trailing calls: {summary.trailing}</li>
                <li>Average delta vs champion: {summary.avgDelta > 0 ? "+" : ""}{summary.avgDelta}</li>
              </ul>

              {experimentSummaries
                .filter((item) => item.modelVersionId === model.id)
                .map((experiment) => (
                  <div className="alert-card" key={experiment.modelVersionId}>
                    <div className="alert-header">
                      <div>
                        <h3 className="card-title">A/B evaluation</h3>
                        <p className="card-copy">{experiment.recommendation}</p>
                      </div>
                      <StatusPill value={experiment.confidenceLabel} />
                    </div>
                    <p className="meta-text">
                      Win rate {experiment.winRate}% · Significance {experiment.significance}% · Sample {experiment.sampleSize}
                    </p>
                  </div>
                ))}

              {isAdmin ? (
                <>
                  <form action={rebalanceModelTrafficAction} className="panel-form">
                    <input type="hidden" name="modelId" value={model.id} />
                    <label className="form-field">
                      <span className="form-label">Traffic share</span>
                      <input className="form-input" type="number" name="trafficShare" min="0" max="100" defaultValue={model.trafficShare} required />
                    </label>
                    <div className="action-row">
                      <button className="button-link secondary" type="submit">
                        Update traffic
                      </button>
                      {model.status !== "champion" ? (
                        <button className="button-link" type="submit" formAction={promoteModelVersionAction} name="modelId" value={model.id}>
                          Promote champion
                        </button>
                      ) : null}
                    </div>
                  </form>
                  <form action={updateModelVersionAction} className="panel-form">
                    <input type="hidden" name="modelId" value={model.id} />
                    <div className="form-grid form-grid-2">
                      <label className="form-field">
                        <span className="form-label">Approve threshold</span>
                        <input className="form-input" type="number" name="approvalThreshold" min="0" max="100" defaultValue={model.approvalThreshold} required />
                      </label>
                      <label className="form-field">
                        <span className="form-label">Observed drift</span>
                        <input className="form-input" type="number" name="drift" min="0" max="100" step="0.1" defaultValue={model.drift} required />
                      </label>
                    </div>
                    <label className="form-field">
                      <span className="form-label">Deployment note</span>
                      <textarea className="form-input form-textarea" name="notes" defaultValue={model.notes} required />
                    </label>
                    <button className="button-link secondary" type="submit">
                      Save governance settings
                    </button>
                  </form>
                </>
              ) : null}
            </article>
          );
        })}
      </section>

      <section className="content-card">
        <p className="kicker">Release management</p>
        <h2 className="section-title">Create challenger model</h2>
        <p className="card-copy">
          Add a candidate model with explicit thresholds and traffic allocation before promoting it into champion status.
        </p>

        {isAdmin ? (
          <form action={createModelVersionAction} className="panel-form">
            <div className="form-grid form-grid-2">
              <label className="form-field">
                <span className="form-label">Model name</span>
                <input className="form-input" type="text" name="name" defaultValue="Gradient Lite" required />
              </label>

              <label className="form-field">
                <span className="form-label">Version</span>
                <input className="form-input" type="text" name="version" placeholder="1.5.0-rc1" required />
              </label>

              <label className="form-field">
                <span className="form-label">AUC</span>
                <input className="form-input" type="number" name="auc" min="0" max="1" step="0.001" placeholder="0.901" required />
              </label>

              <label className="form-field">
                <span className="form-label">Precision</span>
                <input className="form-input" type="number" name="precision" min="0" max="1" step="0.001" placeholder="0.832" required />
              </label>

              <label className="form-field">
                <span className="form-label">Recall</span>
                <input className="form-input" type="number" name="recall" min="0" max="1" step="0.001" placeholder="0.801" required />
              </label>

              <label className="form-field">
                <span className="form-label">Drift</span>
                <input className="form-input" type="number" name="drift" min="0" max="100" step="0.1" placeholder="1.4" required />
              </label>

              <label className="form-field">
                <span className="form-label">Traffic share</span>
                <input className="form-input" type="number" name="trafficShare" min="0" max="100" step="1" defaultValue="10" required />
              </label>

              <label className="form-field">
                <span className="form-label">Approve threshold</span>
                <input className="form-input" type="number" name="approvalThreshold" min="0" max="100" step="1" defaultValue="34" required />
              </label>
            </div>

            <label className="form-field">
              <span className="form-label">Release notes</span>
              <textarea
                className="form-input form-textarea"
                name="notes"
                placeholder="Summarize new features, guardrails, and expected benefit against the champion."
                required
              />
            </label>

            <button className="button-link form-submit" type="submit">
              Create challenger
            </button>
          </form>
        ) : (
          <p className="form-note">Admin access is required to create or promote model versions.</p>
        )}
      </section>
    </div>
  );
}
