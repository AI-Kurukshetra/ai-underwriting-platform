import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signUpAction } from "@/app/auth/actions";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams?: { message?: string; next?: string };
}) {
  const user = await getCurrentUser();

  if (user) {
    redirect("/dashboard");
  }

  const next = searchParams?.next ?? "/dashboard";
  const message = searchParams?.message;

  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="kicker">Workspace onboarding</p>
        <h1 className="page-title">Create a new underwriting workspace</h1>
        <p className="page-copy">
          This creates your account, provisions your organization, and prepares the workspace for underwriting operations.
        </p>

        {message ? <p className="message-banner">{message}</p> : null}

        <form action={signUpAction} className="auth-form">
          <input type="hidden" name="next" value={next} />

          <label className="form-field">
            <span className="form-label">Full name</span>
            <input className="form-input" type="text" name="fullName" placeholder="Riya Shah" required />
          </label>

          <label className="form-field">
            <span className="form-label">Organization</span>
            <input className="form-input" type="text" name="organizationName" placeholder="Acme Credit Union" required />
          </label>

          <label className="form-field">
            <span className="form-label">Email</span>
            <input className="form-input" type="email" name="email" placeholder="riya@acme.com" required />
          </label>

          <label className="form-field">
            <span className="form-label">Password</span>
            <input className="form-input" type="password" name="password" placeholder="Minimum 6 characters" required minLength={6} />
          </label>

          <button className="button-link auth-submit" type="submit">
            Create account
          </button>
        </form>

        <p className="form-note">
          Already have access?{" "}
          <Link href={`/auth/login?next=${encodeURIComponent(next)}`}>
            Sign in instead
          </Link>
        </p>
      </section>
    </div>
  );
}
