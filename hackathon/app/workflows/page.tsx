import { updateWorkflowAction } from "@/app/workflows/actions";
import { PageHeader } from "@/components/page-header";
import { StatusPill } from "@/components/status-pill";
import { getCurrentProfile } from "@/lib/auth";
import { getRiskScoreByApplicationId, listApplications, listWorkflows } from "@/lib/repository";
import { evaluateWorkflow } from "@/lib/workflow-engine";
import { formatPercent, formatToken } from "@/lib/utils";

export default async function WorkflowsPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  const [profile, workflows, applications] = await Promise.all([
    getCurrentProfile(),
    listWorkflows(),
    listApplications(),
  ]);
  const primaryWorkflow = workflows[0] ?? null;
  const isAdmin = profile?.role === "admin";

  const simulations = await Promise.all(
    applications.slice(0, 5).map(async (application) => {
      const assessment = await getRiskScoreByApplicationId(application.id);
      return assessment
        ? {
            application,
            assessment,
            result: evaluateWorkflow(application, assessment, primaryWorkflow),
          }
        : null;
    }),
  );

  return (
    <div className="page-grid">
      <PageHeader
        title="Automated workflows"
        description="Configure underwriting thresholds, fraud escalations, and manual-review routes for the primary personal-loan decision tree."
      />
      {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

      {primaryWorkflow ? (
        <>
          <section className="detail-grid">
            <article className="content-card">
              <p className="kicker">Primary workflow</p>
              <h2 className="section-title">{primaryWorkflow.name}</h2>
              <ul className="meta-list">
                <li>Auto-approve below: {primaryWorkflow.config.autoApproveBelow}</li>
                <li>Decline at or above: {primaryWorkflow.config.declineAboveOrEqual}</li>
                <li>Fraud escalation at: {primaryWorkflow.config.fraudEscalationAt}%</li>
                <li>Max debt-to-income: {formatPercent(primaryWorkflow.config.maxDebtToIncome)}</li>
                <li>Min document confidence: {formatPercent(primaryWorkflow.config.minDocumentConfidence)}</li>
                <li>High exposure manual review: ${primaryWorkflow.config.highAmountManualReviewAbove.toLocaleString("en-US")}</li>
                <li>Default review stage: {formatToken(primaryWorkflow.config.defaultReviewStage)}</li>
                <li>Fraud review stage: {formatToken(primaryWorkflow.config.fraudReviewStage)}</li>
              </ul>
            </article>

            <article className="content-card">
              <p className="kicker">Decision preview</p>
              <h2 className="section-title">Recent application routing</h2>
              <div className="alert-list">
                {simulations.filter(Boolean).map((item) => (
                  <article className="alert-card" key={item!.application.id}>
                    <div className="alert-header">
                      <div>
                        <h3 className="card-title">{item!.application.customerName}</h3>
                        <p className="card-copy">{item!.result.reasons.join(" ")}</p>
                      </div>
                      <StatusPill value={item!.result.recommendation} />
                    </div>
                    <p className="meta-text">
                      Score {item!.assessment.score} · Stage {formatToken(item!.result.workflowStage)} · Rules {item!.result.triggeredRules.join(", ")}
                    </p>
                  </article>
                ))}
              </div>
            </article>
          </section>

          <section className="content-card">
            <p className="kicker">Decision tree editor</p>
            <h2 className="section-title">Update workflow thresholds</h2>
            {isAdmin ? (
              <form action={updateWorkflowAction} className="panel-form">
                <input type="hidden" name="workflowId" value={primaryWorkflow.id} />
                <div className="form-grid form-grid-2">
                  <label className="form-field">
                    <span className="form-label">Workflow name</span>
                    <input className="form-input" name="name" defaultValue={primaryWorkflow.name} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Auto-approve below</span>
                    <input className="form-input" type="number" name="autoApproveBelow" min="0" max="100" defaultValue={primaryWorkflow.config.autoApproveBelow} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Decline at or above</span>
                    <input className="form-input" type="number" name="declineAboveOrEqual" min="0" max="100" defaultValue={primaryWorkflow.config.declineAboveOrEqual} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Fraud escalation at</span>
                    <input className="form-input" type="number" name="fraudEscalationAt" min="0" max="100" defaultValue={primaryWorkflow.config.fraudEscalationAt} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Max debt-to-income</span>
                    <input className="form-input" type="number" name="maxDebtToIncome" min="0" max="1" step="0.01" defaultValue={primaryWorkflow.config.maxDebtToIncome} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Min document confidence</span>
                    <input className="form-input" type="number" name="minDocumentConfidence" min="0" max="1" step="0.01" defaultValue={primaryWorkflow.config.minDocumentConfidence} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">High amount manual review</span>
                    <input className="form-input" type="number" name="highAmountManualReviewAbove" min="1000" max="250000" step="100" defaultValue={primaryWorkflow.config.highAmountManualReviewAbove} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Default review stage</span>
                    <input className="form-input" name="defaultReviewStage" defaultValue={primaryWorkflow.config.defaultReviewStage} required />
                  </label>
                  <label className="form-field">
                    <span className="form-label">Fraud review stage</span>
                    <input className="form-input" name="fraudReviewStage" defaultValue={primaryWorkflow.config.fraudReviewStage} required />
                  </label>
                </div>
                <button className="button-link form-submit" type="submit">
                  Save workflow
                </button>
              </form>
            ) : (
              <p className="form-note">Admin access is required to edit underwriting workflow thresholds.</p>
            )}
          </section>
        </>
      ) : (
        <section className="content-card">
          <p className="card-copy">No workflow is provisioned for this workspace.</p>
        </section>
      )}
    </div>
  );
}
