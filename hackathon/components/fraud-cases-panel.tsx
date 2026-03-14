import { StatusPill } from "@/components/status-pill";
import type { FraudCase } from "@/lib/types";
import { formatToken } from "@/lib/utils";

export function FraudCasesPanel({
  cases,
}: {
  cases: FraudCase[];
}) {
  return (
    <section className="content-card">
      <p className="kicker">Fraud investigations</p>
      <h2 className="section-title">Case triage</h2>
      {cases.length === 0 ? (
        <p className="card-copy">No active fraud cases are attached to this application.</p>
      ) : (
        <div className="alert-list">
          {cases.map((item) => (
            <article className="alert-card" key={item.id}>
              <div className="alert-header">
                <div>
                  <h3 className="card-title">{formatToken(item.category)}</h3>
                  <p className="card-copy">{item.explanation}</p>
                </div>
                <StatusPill value={item.status} />
              </div>
              <p className="meta-text">Fraud score {Math.round(item.score)} / 100</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
