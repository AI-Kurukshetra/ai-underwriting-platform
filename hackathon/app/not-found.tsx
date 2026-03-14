import Link from "next/link";

export default function NotFound() {
  return (
    <div className="content-card">
      <p className="kicker">Missing resource</p>
      <h1 className="page-title">Application not found</h1>
      <p className="page-copy">
        The requested record does not exist in the current workspace or is no longer available.
      </p>
      <div className="hero-actions">
        <Link className="button-link" href="/applications">
          Back to applications
        </Link>
        <Link className="button-link secondary" href="/dashboard">
          Open dashboard
        </Link>
      </div>
    </div>
  );
}
