import { resetPasswordAction } from "@/app/auth/actions";

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  return (
    <div className="auth-shell">
      <section className="auth-card">
        <p className="kicker">Password reset</p>
        <h1 className="page-title">Choose a new password</h1>
        <p className="page-copy">
          After the recovery link signs you in, set a new password for your workspace account.
        </p>

        {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}

        <form action={resetPasswordAction} className="auth-form">
          <label className="form-field">
            <span className="form-label">New password</span>
            <input className="form-input" type="password" name="password" minLength={6} required />
          </label>

          <label className="form-field">
            <span className="form-label">Confirm password</span>
            <input className="form-input" type="password" name="confirmPassword" minLength={6} required />
          </label>

          <button className="button-link auth-submit" type="submit">
            Update password
          </button>
        </form>
      </section>
    </div>
  );
}
