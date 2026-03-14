import { ApplicationDataSources } from "@/components/application-data-sources";
import { ApplicationDocuments } from "@/components/application-documents";
import { DecisionPanel } from "@/components/decision-panel";
import { FraudCasesPanel } from "@/components/fraud-cases-panel";
import { GeospatialInsightCard } from "@/components/geospatial-insight-card";
import { ModelEvaluations } from "@/components/model-evaluations";
import { PageHeader } from "@/components/page-header";
import { RiskBreakdown } from "@/components/risk-breakdown";
import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile } from "@/lib/auth";
import { deriveGeospatialInsight } from "@/lib/geospatial";
import {
  getApplicationById,
  getRiskScoreByApplicationId,
  listApplicationDataSources,
  listApplicationDocuments,
  listAuditEventsByApplicationId,
  listFraudCases,
  listModelEvaluations,
} from "@/lib/repository";
import { formatCurrency, formatDate, formatPercent, formatToken } from "@/lib/utils";
import { notFound } from "next/navigation";

export default async function ApplicationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { message?: string };
}) {
  const application = await getApplicationById(params.id);

  if (!application) {
    notFound();
  }

  const geospatialInsight = deriveGeospatialInsight(application.state, application.amountRequested);
  const [riskScore, auditEvents, documents, dataSources, fraudCases, modelEvaluations, profile] = await Promise.all([
    getRiskScoreByApplicationId(application.id),
    listAuditEventsByApplicationId(application.id),
    listApplicationDocuments(application.id),
    listApplicationDataSources(application.id),
    listFraudCases(application.id),
    listModelEvaluations(application.id),
    getCurrentProfile(),
  ]);

  return (
    <div className="page-grid">
      <PageHeader
        title={application.customerName}
        description={`Personal loan application · ${application.state}`}
        actions={<StatusPill value={application.status} />}
      />
      {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

      <section className="kpi-strip">
        <div className="kpi">
          <div className="data-label">Requested amount</div>
          <strong>{formatCurrency(application.amountRequested)}</strong>
        </div>
        <div className="kpi">
          <div className="data-label">Annual income</div>
          <strong>{formatCurrency(application.annualIncome)}</strong>
        </div>
        <div className="kpi">
          <div className="data-label">Debt-to-income</div>
          <strong>{formatPercent(application.debtToIncome)}</strong>
        </div>
        <div className="kpi">
          <div className="data-label">Credit score</div>
          <strong>{application.creditScore}</strong>
        </div>
      </section>

      <section className="detail-grid">
        <div className="content-card">
          <p className="kicker">Scoring summary</p>
          <h2 className="section-title">Explainable assessment</h2>
          {riskScore ? <RiskBreakdown assessment={riskScore} /> : <p className="card-copy">No score generated yet.</p>}
        </div>

        <div className="page-grid">
          <div className="content-card">
            <p className="kicker">Application metadata</p>
            <h2 className="section-title">Borrower review context</h2>
            <ul className="meta-list">
              <li>Workflow stage: {formatToken(application.workflowStage)}</li>
              <li>Submitted: {formatDate(application.submittedAt)}</li>
              <li>Document confidence: {formatPercent(application.documentConfidence)}</li>
              <li>Fraud signals: {application.fraudSignals.length}</li>
              <li>Prior loss events: {application.claimsCount}</li>
              <li>Geospatial risk: {formatPercent(application.geospatialRisk)}</li>
            </ul>
          </div>
          <GeospatialInsightCard insight={geospatialInsight} />
        </div>
      </section>

      <section className="detail-grid">
        <ApplicationDataSources sources={dataSources} />
        <FraudCasesPanel cases={fraudCases} />
      </section>

      <DecisionPanel applicationId={application.id} assessment={riskScore} profile={profile} />
      <ModelEvaluations evaluations={modelEvaluations} />
      <ApplicationDocuments documents={documents} />

      <section className="content-card">
        <p className="kicker">Decision audit trail</p>
        <h2 className="section-title">Recent activity</h2>
        <div className="audit-list">
          {auditEvents.map((event) => (
            <article className="alert-card" key={event.id}>
              <div className="audit-header">
                <strong>{event.action}</strong>
                <span className="meta-text">{formatDate(event.createdAt)}</span>
              </div>
              <p className="card-copy">{event.details}</p>
              <p className="meta-text">Actor: {event.actor}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
