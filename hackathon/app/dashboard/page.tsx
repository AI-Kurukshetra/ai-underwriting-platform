import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { formatDate, formatToken } from "@/lib/utils";
import {
  getDashboardSnapshot,
  listFraudAlerts,
  listFraudCases,
  listModelVersions,
} from "@/lib/repository";

export default async function DashboardPage() {
  const [snapshot, fraudAlerts, fraudCases, models] = await Promise.all([
    getDashboardSnapshot(),
    listFraudAlerts(),
    listFraudCases(),
    listModelVersions(),
  ]);
  const activeCases = fraudCases.filter((item) => item.status !== "cleared").slice(0, 4);

  return (
    <div className="page-grid">
      <PageHeader
        title="Loan operations dashboard"
        description="Track borrower decision velocity, ingestion coverage, fraud investigations, and model health from one lending workspace."
        actions={
          <>
            <span className="nav-link-muted">{snapshot.activeModelName}</span>
            <span className="nav-link">{snapshot.modeLabel}</span>
          </>
        }
      />

      <section className="metrics-grid">
        <StatCard label="Loan files today" value={String(snapshot.applicationsToday)} delta="Compared with yesterday" tone="neutral" />
        <StatCard label="Average risk score" value={String(snapshot.averageRiskScore)} delta="0 = safer borrower, 100 = highest risk" tone="neutral" />
        <StatCard label="Auto decision rate" value={`${snapshot.autoDecisionRate}%`} delta="Target: 80%" tone={snapshot.autoDecisionRate >= 80 ? "positive" : "neutral"} />
        <StatCard label="Manual review queue" value={String(snapshot.manualReviewQueue)} delta="Borrower files waiting for action" tone={snapshot.manualReviewQueue > 3 ? "negative" : "positive"} />
        <StatCard label="Ingestion coverage" value={`${snapshot.ingestionCoverage}%`} delta="Data sources successfully ingested" tone={snapshot.ingestionCoverage >= 80 ? "positive" : "neutral"} />
        <StatCard label="Challenger win rate" value={`${snapshot.challengerWinRate}%`} delta="Share of challenger evaluations outperforming champion" tone={snapshot.challengerWinRate >= 40 ? "positive" : "neutral"} />
      </section>

      <section className="detail-grid">
        <div className="content-card">
          <p className="kicker">Fraud monitoring</p>
          <h2 className="section-title">Live borrower alerts</h2>
          <div className="alert-list">
            {fraudAlerts.map((alert) => (
              <article className="alert-card" key={alert.id}>
                <div className="alert-header">
                  <div>
                    <h3 className="card-title">{alert.customerName}</h3>
                    <p className="card-copy">{alert.reason}</p>
                  </div>
                  <StatusPill value={alert.severity} />
                </div>
                <p className="meta-text">Application {alert.applicationId} · {formatDate(alert.createdAt)}</p>
              </article>
            ))}
          </div>
        </div>

        <div className="content-card">
          <p className="kicker">Model health</p>
          <h2 className="section-title">Loan model governance</h2>
          <div className="alert-list">
            {models.map((model) => (
              <article className="alert-card" key={model.id}>
                <div className="alert-header">
                  <div>
                    <h3 className="card-title">{model.name}</h3>
                    <p className="card-copy">Version {model.version}</p>
                  </div>
                  <StatusPill value={model.status} />
                </div>
                <p className="meta-text">
                  AUC {model.auc} · Recall {model.recall} · Drift {model.drift}% · Traffic {model.trafficShare}%
                </p>
                <p className="meta-text">{model.notes}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="content-card">
        <p className="kicker">Claims fraud detection</p>
        <h2 className="section-title">Open investigations</h2>
        <div className="alert-list">
          {activeCases.length === 0 ? (
            <p className="card-copy">No active fraud investigations right now.</p>
          ) : (
            activeCases.map((item) => (
              <article className="alert-card" key={item.id}>
                <div className="alert-header">
                  <div>
                    <h3 className="card-title">{formatToken(item.category)}</h3>
                    <p className="card-copy">{item.explanation}</p>
                  </div>
                  <StatusPill value={item.status} />
                </div>
                <p className="meta-text">
                  Application {item.applicationId} · Fraud score {Math.round(item.score)} · {formatDate(item.createdAt)}
                </p>
              </article>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
