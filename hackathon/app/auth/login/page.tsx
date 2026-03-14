import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { signInAction } from "@/app/auth/actions";

export default async function LoginPage({
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
        <p className="kicker">Workspace access</p>
        <h1 className="page-title">Sign in to the underwriting workspace</h1>
        <p className="page-copy">
          Use your email and password to access your dashboard, applications, and workspace tools.
        </p>

        {message ? <p className="message-banner">{message}</p> : null}

        <form action={signInAction} className="auth-form">
          <input type="hidden" name="next" value={next} />

          <label className="form-field">
            <span className="form-label">Email</span>
            <input className="form-input" type="email" name="email" placeholder="underwriter@company.com" required />
          </label>

          <label className="form-field">
            <span className="form-label">Password</span>
            <input className="form-input" type="password" name="password" placeholder="Minimum 6 characters" required />
          </label>

          <button className="button-link auth-submit" type="submit">
            Sign in
          </button>
        </form>

        <p className="form-note">
          <Link href="/auth/forgot-password">Forgot your password?</Link>
        </p>

        <p className="form-note">
          New here?{" "}
          <Link href={`/auth/sign-up?next=${encodeURIComponent(next)}`}>
            Create a workspace account
          </Link>
        </p>
      </section>
    </div>
  );
}
