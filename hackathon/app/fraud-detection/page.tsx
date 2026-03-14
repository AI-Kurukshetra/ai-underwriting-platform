import { updateFraudCaseStatusAction } from "@/app/fraud-detection/actions";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { buildFraudPatternGroups } from "@/lib/fraud-patterns";
import {
  listApplications,
  listFraudAlerts,
  listFraudCases,
  listRiskScores,
} from "@/lib/repository";
import { formatDate, formatToken } from "@/lib/utils";

export default async function FraudDetectionPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  const [applications, assessments, fraudAlerts, fraudCases] = await Promise.all([
    listApplications(),
    listRiskScores(),
    listFraudAlerts(),
    listFraudCases(),
  ]);
  const patternGroups = buildFraudPatternGroups(applications, fraudCases, assessments);

  return (
    <div className="page-grid">
      <PageHeader
        title="Fraud detection"
        description="Triage pattern-based investigations, linked borrower clusters, and active fraud alerts from one queue."
      />
      {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

      <section className="detail-grid">
        <article className="content-card">
          <p className="kicker">Active alerts</p>
          <h2 className="section-title">Borrower signals</h2>
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
        </article>

        <article className="content-card">
          <p className="kicker">Pattern recognition</p>
          <h2 className="section-title">Linked clusters</h2>
          <div className="alert-list">
            {patternGroups.length === 0 ? (
              <p className="card-copy">No repeat fraud patterns are clustered yet.</p>
            ) : (
              patternGroups.map((group) => (
                <article className="alert-card" key={group.id}>
                  <div className="alert-header">
                    <div>
                      <h3 className="card-title">{group.title}</h3>
                      <p className="card-copy">{group.detail}</p>
                    </div>
                    <StatusPill value={group.patternType} />
                  </div>
                  <p className="meta-text">
                    Applications {group.applications.length} · Cases {group.caseCount} · Avg fraud score {group.averageFraudScore}
                  </p>
                </article>
              ))
            )}
          </div>
        </article>
      </section>

      <section className="content-card">
        <p className="kicker">Case management</p>
        <h2 className="section-title">Open fraud investigations</h2>
        <div className="alert-list">
          {fraudCases.map((item) => (
            <article className="alert-card" key={item.id}>
              <div className="alert-header">
                <div>
                  <h3 className="card-title">{formatToken(item.category)}</h3>
                  <p className="card-copy">{item.explanation}</p>
                </div>
                <StatusPill value={item.status} />
              </div>
              <p className="meta-text">
                Application {item.applicationId} · Score {Math.round(item.score)} · {formatDate(item.createdAt)}
              </p>
              <form action={updateFraudCaseStatusAction} className="action-row">
                <input type="hidden" name="caseId" value={item.id} />
                <button className="button-link secondary" type="submit" name="status" value="open">
                  Open
                </button>
                <button className="button-link secondary" type="submit" name="status" value="watch">
                  Watch
                </button>
                <button className="button-link secondary" type="submit" name="status" value="cleared">
                  Clear
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
