import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { buildMonitoringAlerts } from "@/lib/monitoring";
import { summarizeChampionChallenger } from "@/lib/model-experiments";
import {
  listApplicationDocuments,
  listApplications,
  listDataSourceConnections,
  listFraudAlerts,
  listFraudCases,
  listIngestionRuns,
  listModelEvaluations,
  listModelVersions,
  listWorkflows,
} from "@/lib/repository";
import { formatDate } from "@/lib/utils";

export default async function MonitoringPage() {
  const [applications, models, evaluations, fraudAlerts, fraudCases, runs, connections, workflows] = await Promise.all([
    listApplications(),
    listModelVersions(),
    listModelEvaluations(),
    listFraudAlerts(),
    listFraudCases(),
    listIngestionRuns(),
    listDataSourceConnections(),
    listWorkflows(),
  ]);

  const documentGroups = await Promise.all(applications.map((application) => listApplicationDocuments(application.id)));
  const documents = documentGroups.flat();
  const alerts = buildMonitoringAlerts({
    models,
    evaluations,
    fraudAlerts,
    fraudCases,
    runs,
    connections,
    documents,
    workflows,
  });
  const experiments = summarizeChampionChallenger(evaluations).filter((item) => item.lane !== "champion");

  return (
    <div className="page-grid">
      <PageHeader
        title="Monitoring and alerts"
        description="Track model drift, experiment quality, ingestion failures, workflow health, and document verification backlog."
      />

      <section className="detail-grid">
        <article className="content-card">
          <p className="kicker">Active monitoring alerts</p>
          <h2 className="section-title">Operations incidents</h2>
          <div className="alert-list">
            {alerts.map((alert) => (
              <article className="alert-card" key={alert.id}>
                <div className="alert-header">
                  <div>
                    <h3 className="card-title">{alert.title}</h3>
                    <p className="card-copy">{alert.detail}</p>
                  </div>
                  <StatusPill value={alert.severity} />
                </div>
                <p className="meta-text">
                  {alert.category} · {alert.metric} · {formatDate(alert.createdAt)}
                </p>
              </article>
            ))}
          </div>
        </article>

        <article className="content-card">
          <p className="kicker">Champion challenger</p>
          <h2 className="section-title">Experiment watchlist</h2>
          <div className="alert-list">
            {experiments.length === 0 ? (
              <p className="card-copy">No challenger or shadow experiments are active.</p>
            ) : (
              experiments.map((experiment) => (
                <article className="alert-card" key={experiment.modelVersionId}>
                  <div className="alert-header">
                    <div>
                      <h3 className="card-title">{experiment.modelName} v{experiment.version}</h3>
                      <p className="card-copy">{experiment.recommendation}</p>
                    </div>
                    <StatusPill value={experiment.confidenceLabel} />
                  </div>
                  <p className="meta-text">
                    Lane {experiment.lane} · Win rate {experiment.winRate}% · Significance {experiment.significance}% · Sample {experiment.sampleSize}
                  </p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>
    </div>
  );
}
