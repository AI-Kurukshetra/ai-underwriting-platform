import Link from "next/link";
import { requestPasswordResetAction } from "@/app/auth/actions";

export default function ForgotPasswordPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="kicker">Account recovery</p>
        <h1 className="page-title">Request a password reset</h1>
        <p className="page-copy">
          Enter your workspace email and we&apos;ll send a recovery link so you can reset your password.
        </p>

        {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

        <form action={requestPasswordResetAction} className="auth-form">
          <label className="form-field">
            <span className="form-label">Email</span>
            <input className="form-input" type="email" name="email" placeholder="underwriter@company.com" required />
          </label>

          <button className="button-link auth-submit" type="submit">
            Send reset link
          </button>
        </form>

        <p className="form-note">
          Remembered it? <Link href="/auth/login">Return to sign in</Link>
        </p>
      </section>
    </div>
  );
}
