import { recordDecisionAction } from "@/app/applications/actions";
import { StatusPill } from "@/components/status-pill";
import type { CurrentProfile } from "@/lib/auth";
import type { DecisionAction, RiskAssessment } from "@/lib/types";
import { formatToken } from "@/lib/utils";

const decisions: Array<{ value: DecisionAction; label: string; tone?: "danger" | "secondary" }> = [
  { value: "auto_approve", label: "Approve loan" },
  { value: "manual_review", label: "Keep in review", tone: "secondary" },
  { value: "decline", label: "Decline loan", tone: "danger" },
];

export function DecisionPanel({
  applicationId,
  assessment,
  profile,
}: {
  applicationId: string;
  assessment: RiskAssessment | null;
  profile: CurrentProfile | null;
}) {
  const canOverride = profile?.role === "admin";

  return (
    <section className="content-card">
      <p className="kicker">Decisioning</p>
      <h2 className="section-title">Record an underwriter action</h2>
      <p className="card-copy">
        Capture the final reviewer outcome and keep the audit trail aligned with the file state.
      </p>

      {assessment ? (
        <div className="decision-recommendation">
          <div>
            <div className="data-label">Model recommendation</div>
            <strong>{formatToken(assessment.recommendation)}</strong>
          </div>
          <StatusPill value={assessment.band} />
        </div>
      ) : null}

      {!canOverride && assessment ? (
        <p className="form-note">Only admins can override the model recommendation. Non-admin reviewers can confirm the suggested action.</p>
      ) : null}

      <form action={recordDecisionAction} className="panel-form">
        <input type="hidden" name="applicationId" value={applicationId} />

        <label className="form-field">
          <span className="form-label">Decision notes</span>
          <textarea
            className="form-input form-textarea"
            name="notes"
            placeholder="Summarize why this loan should be approved, reviewed, or declined."
            minLength={5}
            required
          />
        </label>

        <div className="action-row">
          {decisions.map((decision) => {
            const isRecommended = assessment?.recommendation === decision.value;
            const disabled = Boolean(assessment) && !canOverride && !isRecommended;
            const className =
              decision.tone === "danger"
                ? "button-link danger nav-button"
                : decision.tone === "secondary"
                  ? "button-link secondary nav-button"
                  : "button-link";

            return (
              <button
                className={className}
                type="submit"
                name="decision"
                value={decision.value}
                key={decision.value}
                disabled={disabled}
              >
                {decision.label}
              </button>
            );
          })}
        </div>
      </form>
    </section>
  );
}
