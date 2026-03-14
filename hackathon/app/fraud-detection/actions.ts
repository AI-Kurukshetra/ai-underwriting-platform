"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireProfile } from "@/lib/auth";
import { updateFraudCaseStatus } from "@/lib/repository";
import { fraudCaseUpdateSchema } from "@/lib/validators";

function stringValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function redirectWithMessage(message: string): never {
  redirect(`/fraud-detection?message=${encodeURIComponent(message)}`);
}

export async function updateFraudCaseStatusAction(formData: FormData) {
  const { profile, user } = await requireProfile();
  const parsed = fraudCaseUpdateSchema.safeParse({
    caseId: stringValue(formData, "caseId"),
    status: stringValue(formData, "status"),
  });

  if (!parsed.success) {
    redirectWithMessage("Fraud case update was invalid.");
  }

  await updateFraudCaseStatus(parsed.data.caseId, parsed.data.status, profile.fullName ?? user.email ?? "Reviewer");

  revalidatePath("/fraud-detection");
  revalidatePath("/dashboard");
  revalidatePath("/applications");
  redirectWithMessage(`Fraud case moved to ${parsed.data.status}.`);
}
