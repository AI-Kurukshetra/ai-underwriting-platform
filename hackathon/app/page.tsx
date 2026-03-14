import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

const mvpFeatures = [
  {
    title: "Real-time risk scoring",
    copy: "Explainable ML scoring combines credit, income, claims history, documents, and geospatial risk in one decision surface.",
  },
  {
    title: "Workflow automation",
    copy: "Applications route into auto-approve, manual review, or decline lanes with a full audit trail for every decision.",
  },
  {
    title: "Portfolio intelligence",
    copy: "Operations teams track concentration, drift, fraud alerts, and approval quality from a single underwriting console.",
  },
];

const workflowSteps = [
  {
    step: "01",
    title: "Capture applications",
    copy: "Collect borrower files from internal operators or partner channels without losing context.",
  },
  {
    step: "02",
    title: "Score and explain",
    copy: "Generate risk, fraud, and document signals instantly with clear decision reasons.",
  },
  {
    step: "03",
    title: "Route exceptions",
    copy: "Auto-approve clean files and send complex or suspicious cases to review queues.",
  },
  {
    step: "04",
    title: "Monitor the book",
    copy: "Watch model drift, concentration risk, and active investigations from one control room.",
  },
];

const landingStats = [
  { label: "Decision target", value: "80%", copy: "automated throughput" },
  { label: "Review posture", value: "1 queue", copy: "for edge cases and fraud" },
  { label: "Coverage", value: "Full", copy: "audit trail on every file" },
];

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <div className="page-grid">
      <section className="hero landing-hero">
        <div className="hero-grid landing-hero-grid">
          <div>
            <span className="eyebrow">Underwriting Intelligence MVP</span>
            <h1 className="hero-title">AI-assisted personal loan decisions for faster, safer lending.</h1>
            <p className="hero-copy">
              Run underwriting from a single workspace for intake, scoring, review, fraud checks, document verification, and portfolio monitoring.
            </p>
            <div className="hero-actions">
              {user ? (
                <>
                  <Link className="button-link" href="/dashboard">
                    Open dashboard
                  </Link>
                  <Link className="button-link secondary" href="/applications">
                    Review applications
                  </Link>
                </>
              ) : (
                <>
                  <Link className="button-link" href="/auth/login">
                    Sign in
                  </Link>
                  <Link className="button-link secondary" href="/auth/sign-up">
                    Create workspace
                  </Link>
                </>
              )}
            </div>
            <div className="landing-proof-row">
              <span className="landing-proof-chip">Risk scoring</span>
              <span className="landing-proof-chip">Fraud review</span>
              <span className="landing-proof-chip">Document verification</span>
              <span className="landing-proof-chip">Portfolio monitoring</span>
            </div>
          </div>
          <div className="hero-panel landing-panel">
            <div className="landing-panel-card">
              <div className="landing-panel-head">
                <div>
                  <p className="kicker">Decision command center</p>
                  <h2 className="section-title">What operators see</h2>
                </div>
                <span className="status-pill approved">Live</span>
              </div>
              <div className="landing-score-band">
                <div>
                  <span className="data-label">Auto decision rate</span>
                  <strong>80%</strong>
                </div>
                <div>
                  <span className="data-label">Manual review</span>
                  <strong>Focused</strong>
                </div>
              </div>
              <div className="landing-signal-list">
                <div className="landing-signal-item">
                  <span className="landing-signal-dot approved" />
                  <div>
                    <strong>Low-risk files move immediately</strong>
                    <p className="meta-text">Clear borrowers are approved without waiting on manual review.</p>
                  </div>
                </div>
                <div className="landing-signal-item">
                  <span className="landing-signal-dot warning" />
                  <div>
                    <strong>Borderline files get context</strong>
                    <p className="meta-text">Reviewers see score reasons, document quality, and geospatial signals together.</p>
                  </div>
                </div>
                <div className="landing-signal-item">
                  <span className="landing-signal-dot declined" />
                  <div>
                    <strong>Fraud patterns stay visible</strong>
                    <p className="meta-text">Suspicious files are escalated with alerts, case status, and linked patterns.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="landing-stat-grid">
              {landingStats.map((item) => (
                <div className="hero-stat" key={item.label}>
                  <span className="kicker">{item.label}</span>
                  <strong>{item.value}</strong>
                  <p className="card-copy">{item.copy}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-block">
        <div>
          <p className="kicker">Core capabilities</p>
          <h2 className="section-title">Built around the MVP scope in the brief</h2>
          <p className="section-copy">
            The generated project focuses on the shortest path to underwriting value: intake, risk scoring, manual review queue, model governance, and auditability.
          </p>
        </div>
        <div className="feature-grid">
          {mvpFeatures.map((feature) => (
            <article className="highlight-card" key={feature.title}>
              <h3 className="card-title">{feature.title}</h3>
              <p className="card-copy">{feature.copy}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section-block">
        <div>
          <p className="kicker">How it works</p>
          <h2 className="section-title">A simple lending operations flow</h2>
        </div>
        <div className="landing-process-grid">
          {workflowSteps.map((item) => (
            <article className="highlight-card landing-process-card" key={item.step}>
              <span className="landing-step">{item.step}</span>
              <h3 className="card-title">{item.title}</h3>
              <p className="card-copy">{item.copy}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
