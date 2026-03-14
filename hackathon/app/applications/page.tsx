import { ApplicationIntakeForm } from "@/components/application-intake-form";
import { ApplicationTable } from "@/components/application-table";
import { PageHeader } from "@/components/page-header";
import { listApplications, listRiskScores } from "@/lib/repository";

export default async function ApplicationsPage({
  searchParams,
}: {
  searchParams?: { message?: string };
}) {
  const [applications, riskScores] = await Promise.all([listApplications(), listRiskScores()]);

  return (
    <div className="page-grid">
      <PageHeader
        title="Loan operations queue"
        description="Create borrower files, compare risk signals, and work the manual-review queue from one lending console."
      />
      {searchParams?.message ? <p className="message-banner">{searchParams.message}</p> : null}
      <ApplicationIntakeForm />
      <ApplicationTable applications={applications} scores={riskScores} />
    </div>
  );
}
