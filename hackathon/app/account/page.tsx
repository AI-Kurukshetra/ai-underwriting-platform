import { changeEmailAction, changePasswordAction } from "@/app/auth/actions";
import { PageHeader } from "@/components/page-header";
import { requireUser, getCurrentProfile } from "@/lib/auth";
import { getRuntimeDiagnostics } from "@/lib/runtime-status";
import { formatToken } from "@/lib/utils";

function diagnosticLabel(value: string) {
  if (value === "prisma_live") return "Live workspace";
  if (value === "mock_fallback") return "Demo mode";
  if (value === "connected") return "Connected";
  if (value === "missing") return "Not configured";
  if (value === "error") return "Unavailable";
  if (value === "configured") return "Ready";
  return formatToken(value);
}

export default async function AccountPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  const user = await requireUser();
  const [profile, diagnostics] = await Promise.all([getCurrentProfile(), getRuntimeDiagnostics()]);

  return (
    <div className="page-grid">
      <PageHeader
        title="Account settings"
        description="Authenticated user profile, organization assignment, and workspace access details."
      />
      {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

      <section className="detail-grid">
        <article className="content-card">
          <p className="kicker">Identity</p>
          <h2 className="section-title">Signed-in user</h2>
          <ul className="meta-list">
            <li>Email: {user.email ?? "Unknown"}</li>
            <li>User ID: <span className="mono">{user.id}</span></li>
            <li>Email confirmed: {user.email_confirmed_at ? "Yes" : "No"}</li>
            <li>Last sign-in: {user.last_sign_in_at ?? "Unavailable"}</li>
          </ul>
        </article>

        <article className="content-card">
          <p className="kicker">Workspace</p>
          <h2 className="section-title">Organization context</h2>
          {profile ? (
            <ul className="meta-list">
              <li>Name: {profile.fullName}</li>
              <li>Role: {profile.role}</li>
              <li>Organization: {profile.organizationName ?? "Unassigned"}</li>
              <li>Organization ID: <span className="mono">{profile.organizationId}</span></li>
            </ul>
          ) : (
            <p className="card-copy">
              No workspace profile was found for this user. Sign out and create the account again if onboarding did not finish correctly.
            </p>
          )}
        </article>
      </section>

      <section className="content-card">
        <p className="kicker">Workspace status</p>
        <h2 className="section-title">Current access and storage mode</h2>
        <ul className="meta-list">
          <li>Data mode: {diagnosticLabel(diagnostics.dataMode)}</li>
          <li>Workspace data: {diagnosticLabel(diagnostics.database)}</li>
          <li>Sign-in service: {diagnosticLabel(diagnostics.auth)}</li>
          <li>File storage: {diagnosticLabel(diagnostics.storage)}</li>
        </ul>
        <p className="card-copy">
          `Live workspace` means your operational data is available. `Demo mode` means the app is using fallback sample data right now.
        </p>
      </section>

      <section className="detail-grid">
        <article className="content-card">
          <p className="kicker">Email management</p>
          <h2 className="section-title">Change login email</h2>
          <p className="card-copy">
            A confirmation link will be sent to the new address before the change takes effect.
          </p>

          <form action={changeEmailAction} className="panel-form">
            <label className="form-field">
              <span className="form-label">New email</span>
              <input className="form-input" type="email" name="email" placeholder={user.email ?? "new@company.com"} required />
            </label>

            <button className="button-link form-submit" type="submit">
              Request email change
            </button>
          </form>
        </article>

        <article className="content-card">
          <p className="kicker">Password management</p>
          <h2 className="section-title">Update password</h2>
          <p className="card-copy">
            For account recovery, use the forgot-password link from the sign-in screen. This form updates the password while signed in.
          </p>

          <form action={changePasswordAction} className="panel-form">
            <label className="form-field">
              <span className="form-label">New password</span>
              <input className="form-input" type="password" name="password" minLength={6} required />
            </label>

            <label className="form-field">
              <span className="form-label">Confirm password</span>
              <input className="form-input" type="password" name="confirmPassword" minLength={6} required />
            </label>

            <button className="button-link form-submit" type="submit">
              Update password
            </button>
          </form>
        </article>
      </section>
    </div>
  );
}
