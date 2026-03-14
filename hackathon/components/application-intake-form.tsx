import { submitApplicationAction } from "@/app/applications/actions";

export function ApplicationIntakeForm() {
  return (
    <section className="content-card">
      <p className="kicker">Internal intake</p>
      <h2 className="section-title">Create a personal loan application</h2>
      <p className="card-copy">
        Intake analysts can submit a borrower profile here and let the scoring engine route the file automatically.
      </p>

      <form action={submitApplicationAction} className="panel-form">
        <div className="form-grid form-grid-2">
          <label className="form-field">
            <span className="form-label">Borrower name</span>
            <input className="form-input" type="text" name="customerName" placeholder="Mia Reynolds" required />
          </label>

          <label className="form-field">
            <span className="form-label">Email</span>
            <input className="form-input" type="email" name="email" placeholder="mia@example.com" required />
          </label>

          <label className="form-field">
            <span className="form-label">Requested amount</span>
            <input className="form-input" type="number" name="amountRequested" min="1000" step="100" placeholder="18000" required />
          </label>

          <label className="form-field">
            <span className="form-label">Annual income</span>
            <input className="form-input" type="number" name="annualIncome" min="1000" step="100" placeholder="92000" required />
          </label>

          <label className="form-field">
            <span className="form-label">Credit score</span>
            <input className="form-input" type="number" name="creditScore" min="300" max="850" step="1" placeholder="742" required />
          </label>

          <label className="form-field">
            <span className="form-label">Debt-to-income ratio</span>
            <input className="form-input" type="number" name="debtToIncome" min="0" max="1" step="0.01" placeholder="0.24" required />
          </label>

          <label className="form-field">
            <span className="form-label">Prior loss events</span>
            <input className="form-input" type="number" name="claimsCount" min="0" max="20" step="1" defaultValue="0" required />
          </label>

          <label className="form-field">
            <span className="form-label">State</span>
            <input className="form-input" type="text" name="state" placeholder="Texas" required />
          </label>
        </div>

        <label className="form-field">
          <span className="form-label">Supporting documents</span>
          <input
            className="form-input"
            type="file"
            name="documents"
            accept=".pdf,image/*,text/plain"
            multiple
            required
          />
          <span className="form-help">Upload bank statements, pay stubs, or ID scans. The system derives document confidence from the uploaded packet.</span>
        </label>

        <label className="form-field">
          <span className="form-label">Fraud signals</span>
          <input
            className="form-input"
            type="text"
            name="fraudSignals"
            placeholder="device_mismatch, thin_file"
          />
        </label>

        <button className="button-link form-submit" type="submit">
          Score and route application
        </button>
      </form>
    </section>
  );
}
