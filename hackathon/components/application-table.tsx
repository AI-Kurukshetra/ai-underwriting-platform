import Link from "next/link";
import type { Application, RiskAssessment } from "@/lib/types";
import { formatCurrency, formatDate, formatPercent, formatToken } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";

export function ApplicationTable({
  applications,
  scores,
}: {
  applications: Application[];
  scores: RiskAssessment[];
}) {
  const scoreMap = new Map(scores.map((score) => [score.applicationId, score]));

  return (
    <section className="table-card">
      <p className="kicker">Queue view</p>
      <h2 className="section-title">Recent loan submissions</h2>
      <div className="table-shell">
        <table className="table">
          <thead>
            <tr>
              <th>Borrower</th>
              <th>Amount</th>
              <th>Risk</th>
              <th>Recommendation</th>
              <th>Stage</th>
              <th>Doc confidence</th>
              <th>Status</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {applications.map((application) => {
              const score = scoreMap.get(application.id);
              return (
                <tr key={application.id}>
                  <td>
                    <Link className="table-row-link" href={`/applications/${application.id}`}>
                      {application.customerName}
                    </Link>
                    <div className="meta-text mono">{application.externalRef}</div>
                  </td>
                  <td>{formatCurrency(application.amountRequested)}</td>
                  <td>
                    {score ? (
                      <>
                        <strong>{score.score}</strong>
                        <div className="meta-text">{formatToken(score.band)}</div>
                      </>
                    ) : (
                      "Pending"
                    )}
                  </td>
                  <td>{score ? formatToken(score.recommendation) : "Pending"}</td>
                  <td>{formatToken(application.workflowStage)}</td>
                  <td>{formatPercent(application.documentConfidence)}</td>
                  <td>
                    <StatusPill value={application.status} />
                  </td>
                  <td>{formatDate(application.submittedAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
