import { StatusPill } from "@/components/status-pill";
import type { ApplicationDataSource } from "@/lib/types";
import { formatPercent, formatToken } from "@/lib/utils";

export function ApplicationDataSources({
  sources,
}: {
  sources: ApplicationDataSource[];
}) {
  return (
    <section className="content-card">
      <p className="kicker">Multi-source ingestion</p>
      <h2 className="section-title">Data source coverage</h2>
      {sources.length === 0 ? (
        <p className="card-copy">No ingestion evidence has been recorded for this borrower file yet.</p>
      ) : (
        <div className="alert-list">
          {sources.map((source) => (
            <article className="alert-card" key={source.id}>
              <div className="alert-header">
                <div>
                  <h3 className="card-title">{formatToken(source.sourceType)}</h3>
                  <p className="card-copy">{source.detail}</p>
                </div>
                <StatusPill value={source.status} />
              </div>
              <p className="meta-text">
                Confidence {formatPercent(source.confidence)} · Freshness {source.freshnessHours}h
              </p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
