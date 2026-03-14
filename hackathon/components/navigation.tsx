import Link from "next/link";
import { getCurrentProfile, getCurrentUser } from "@/lib/auth";
import { signOutAction } from "@/app/auth/actions";
import { NavLinks } from "@/components/nav-links";

const links = [
  { href: "/", label: "Overview" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/applications", label: "Loan Queue" },
  { href: "/workflows", label: "Workflows" },
  { href: "/fraud-detection", label: "Fraud" },
  { href: "/data-sources", label: "Data Sources" },
  { href: "/models", label: "Models" },
  { href: "/portfolio", label: "Portfolio" },
  { href: "/monitoring", label: "Monitoring" },
  { href: "/account", label: "Account" },
];

export async function Navigation() {
  const [user, profile] = await Promise.all([getCurrentUser(), getCurrentProfile()]);

  return (
    <header className="nav-shell">
      <div className="nav-topline">
        <div className="brand">
          <span className="brand-label">Fintech / Personal Loans</span>
          <strong className="brand-title">Risk Intelligence Platform</strong>
        </div>
        <div className="nav-meta">
          <span className="nav-chip">Underwriting workspace</span>
          <span className="meta-text">{profile?.organizationName ?? user?.email ?? "Guest access"}</span>
        </div>
      </div>
      <div className="nav-bottomline">
        <NavLinks links={links} />
        <div className="nav-actions">
          {user ? (
            <form action={signOutAction}>
              <button className="nav-link-muted nav-button" type="submit">
                Sign out
              </button>
            </form>
          ) : (
            <Link className="nav-link" href="/auth/login">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
