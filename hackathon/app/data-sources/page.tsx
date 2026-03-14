import { createDataSourceConnectionAction, triggerIngestionRunAction } from "@/app/data-sources/actions";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile } from "@/lib/auth";
import {
  listApplications,
  listDataSourceConnections,
  listIngestionRuns,
} from "@/lib/repository";
import { formatDate, formatToken } from "@/lib/utils";

const sourceTypes = [
  "credit_bureau",
  "payroll",
  "bank_statements",
  "public_records",
  "device_intelligence",
  "geospatial_index",
  "social_media",
  "iot_device",
] as const;

export default async function DataSourcesPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  const [profile, connections, runs, applications] = await Promise.all([
    getCurrentProfile(),
    listDataSourceConnections(),
    listIngestionRuns(),
    listApplications(),
  ]);
  const isAdmin = profile?.role === "admin";

  return (
    <div className="page-grid">
      <PageHeader
        title="Data source hub"
        description="Connect bureau, payroll, public-record, social, and device feeds, then record ingestion runs against borrower files."
      />
      {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

      <section className="metrics-grid">
        {connections.map((connection) => (
          <article className="metric-card" key={connection.id}>
            <div className="alert-header">
              <div>
                <p className="kicker">{formatToken(connection.sourceType)}</p>
                <h2 className="card-title">{connection.providerName}</h2>
              </div>
              <StatusPill value={connection.status} />
            </div>
            <ul className="meta-list">
              <li>Sync mode: {formatToken(connection.syncMode)}</li>
              <li>Coverage: {Math.round(connection.coverage)}%</li>
              <li>Default freshness: {connection.defaultFreshnessHours}h</li>
              <li>Last sync: {connection.lastSyncAt ? formatDate(connection.lastSyncAt) : "Never"}</li>
            </ul>
            <p className="card-copy">{connection.notes}</p>
          </article>
        ))}
      </section>

      <section className="detail-grid">
        <article className="content-card">
          <p className="kicker">Connection registry</p>
          <h2 className="section-title">Register a source connector</h2>
          {isAdmin ? (
            <form action={createDataSourceConnectionAction} className="panel-form">
              <div className="form-grid form-grid-2">
                <label className="form-field">
                  <span className="form-label">Source type</span>
                  <select className="form-input" name="sourceType" defaultValue="credit_bureau">
                    {sourceTypes.map((type) => (
                      <option key={type} value={type}>{formatToken(type)}</option>
                    ))}
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Provider name</span>
                  <input className="form-input" name="providerName" placeholder="Experian Sandbox" required />
                </label>
                <label className="form-field">
                  <span className="form-label">Status</span>
                  <select className="form-input" name="status" defaultValue="connected">
                    <option value="connected">Connected</option>
                    <option value="attention">Attention</option>
                    <option value="disconnected">Disconnected</option>
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Sync mode</span>
                  <select className="form-input" name="syncMode" defaultValue="api">
                    <option value="api">API</option>
                    <option value="batch">Batch</option>
                    <option value="manual">Manual</option>
                  </select>
                </label>
                <label className="form-field">
                  <span className="form-label">Default freshness hours</span>
                  <input className="form-input" type="number" name="defaultFreshnessHours" min="0" defaultValue="24" required />
                </label>
                <label className="form-field">
                  <span className="form-label">Coverage %</span>
                  <input className="form-input" type="number" name="coverage" min="0" max="100" defaultValue="80" required />
                </label>
              </div>
              <label className="form-field">
                <span className="form-label">Notes</span>
                <textarea className="form-input form-textarea" name="notes" placeholder="Summarize what the connector contributes to underwriting." required />
              </label>
              <button className="button-link form-submit" type="submit">Add connector</button>
            </form>
          ) : (
            <p className="form-note">Admin access is required to add or edit source connectors.</p>
          )}
        </article>

        <article className="content-card">
          <p className="kicker">Ingestion simulator</p>
          <h2 className="section-title">Record a source run</h2>
          <form action={triggerIngestionRunAction} className="panel-form">
            <div className="form-grid form-grid-2">
              <label className="form-field">
                <span className="form-label">Application</span>
                <select className="form-input" name="applicationId" defaultValue="">
                  <option value="">Connector-level run only</option>
                  {applications.map((application) => (
                    <option key={application.id} value={application.id}>{application.customerName} · {application.externalRef}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Source type</span>
                <select className="form-input" name="sourceType" defaultValue="credit_bureau">
                  {sourceTypes.map((type) => (
                    <option key={type} value={type}>{formatToken(type)}</option>
                  ))}
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Provider name</span>
                <input className="form-input" name="providerName" placeholder="Experian Sandbox" required />
              </label>
              <label className="form-field">
                <span className="form-label">Status</span>
                <select className="form-input" name="status" defaultValue="ingested">
                  <option value="ingested">Ingested</option>
                  <option value="warning">Warning</option>
                  <option value="missing">Missing</option>
                </select>
              </label>
              <label className="form-field">
                <span className="form-label">Confidence</span>
                <input className="form-input" type="number" name="confidence" min="0" max="1" step="0.01" defaultValue="0.9" required />
              </label>
              <label className="form-field">
                <span className="form-label">Freshness hours</span>
                <input className="form-input" type="number" name="freshnessHours" min="0" defaultValue="12" required />
              </label>
              <label className="form-field">
                <span className="form-label">Records processed</span>
                <input className="form-input" type="number" name="recordsProcessed" min="0" defaultValue="3" required />
              </label>
            </div>
            <label className="form-field">
              <span className="form-label">Run detail</span>
              <textarea className="form-input form-textarea" name="detail" placeholder="Describe what data was normalized or why the run degraded." required />
            </label>
            <button className="button-link form-submit" type="submit">Record ingestion</button>
          </form>
        </article>
      </section>

      <section className="content-card">
        <p className="kicker">Recent runs</p>
        <h2 className="section-title">Ingestion activity</h2>
        <div className="alert-list">
          {runs.map((run) => (
            <article className="alert-card" key={run.id}>
              <div className="alert-header">
                <div>
                  <h3 className="card-title">{run.providerName}</h3>
                  <p className="card-copy">{formatToken(run.sourceType)} · {run.detail}</p>
                </div>
                <StatusPill value={run.status} />
              </div>
              <p className="meta-text">
                {run.applicationId ? `Application ${run.applicationId} · ` : ""}
                Records {run.recordsProcessed} · Triggered by {run.triggeredBy} · {formatDate(run.createdAt)}
              </p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
