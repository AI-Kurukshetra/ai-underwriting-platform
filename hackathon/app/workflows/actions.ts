"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminProfile } from "@/lib/auth";
import { listWorkflows, updateWorkflowDefinition } from "@/lib/repository";
import { workflowUpdateSchema } from "@/lib/validators";

function stringValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
}

function redirectWithMessage(message: string): never {
  redirect(`/workflows?message=${encodeURIComponent(message)}`);
}

export async function updateWorkflowAction(formData: FormData) {
  await requireAdminProfile();
  const workflowId = stringValue(formData, "workflowId");
  const name = stringValue(formData, "name");

  const parsed = workflowUpdateSchema.safeParse({
    workflowId,
    name,
    config: {
      autoApproveBelow: numberValue(formData, "autoApproveBelow"),
      declineAboveOrEqual: numberValue(formData, "declineAboveOrEqual"),
      fraudEscalationAt: numberValue(formData, "fraudEscalationAt"),
      maxDebtToIncome: numberValue(formData, "maxDebtToIncome"),
      minDocumentConfidence: numberValue(formData, "minDocumentConfidence"),
      highAmountManualReviewAbove: numberValue(formData, "highAmountManualReviewAbove"),
      defaultReviewStage: stringValue(formData, "defaultReviewStage"),
      fraudReviewStage: stringValue(formData, "fraudReviewStage"),
    },
  });

  if (!parsed.success) {
    redirectWithMessage("Workflow configuration is invalid. Check thresholds and review stages.");
  }

  await updateWorkflowDefinition(parsed.data.workflowId, {
    name: parsed.data.name,
    config: parsed.data.config,
  });

  revalidatePath("/workflows");
  revalidatePath("/applications");
  revalidatePath("/dashboard");
  redirectWithMessage("Workflow routing updated.");
}

export async function ensureWorkflowAction() {
  await requireAdminProfile();
  const workflows = await listWorkflows();

  if (workflows.length > 0) {
    redirectWithMessage("A workflow is already provisioned for this workspace.");
  }

  redirectWithMessage("No workflow found. Re-run onboarding or seed a baseline workflow.");
}
