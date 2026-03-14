"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminProfile } from "@/lib/auth";
import { createModelVersion, promoteModelVersion, rebalanceModelTraffic, updateModelVersion } from "@/lib/repository";

function stringValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
}

function redirectWithMessage(message: string): never {
  redirect(`/models?message=${encodeURIComponent(message)}`);
}

export async function createModelVersionAction(formData: FormData) {
  const { profile } = await requireAdminProfile();

  const name = stringValue(formData, "name");
  const version = stringValue(formData, "version");
  const notes = stringValue(formData, "notes");
  const auc = numberValue(formData, "auc");
  const precision = numberValue(formData, "precision");
  const recall = numberValue(formData, "recall");
  const drift = numberValue(formData, "drift");
  const trafficShare = numberValue(formData, "trafficShare");
  const approvalThreshold = numberValue(formData, "approvalThreshold");

  if (!name || !version || !notes) {
    redirectWithMessage("Model name, version, and notes are required.");
  }

  if ([auc, precision, recall, drift, trafficShare, approvalThreshold].some((value) => Number.isNaN(value))) {
    redirectWithMessage("Model metrics must be valid numbers.");
  }

  if (auc < 0 || auc > 1 || precision < 0 || precision > 1 || recall < 0 || recall > 1) {
    redirectWithMessage("AUC, precision, and recall must be between 0 and 1.");
  }

  await createModelVersion({
    organizationId: profile.organizationId,
    name,
    version,
    status: "challenger",
    auc,
    precision,
    recall,
    drift,
    trafficShare,
    approvalThreshold,
    deployedAt: new Date().toISOString().slice(0, 10),
    notes: `${notes} Added by ${profile.fullName}.`,
  });

  revalidatePath("/models");
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
  redirectWithMessage(`Created challenger model ${name} v${version}.`);
}

export async function promoteModelVersionAction(formData: FormData) {
  await requireAdminProfile();
  const modelId = stringValue(formData, "modelId");

  if (!modelId) {
    redirectWithMessage("Model selection is required.");
  }

  await promoteModelVersion(modelId);

  revalidatePath("/models");
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
  redirectWithMessage("Model promoted to champion.");
}

export async function rebalanceModelTrafficAction(formData: FormData) {
  await requireAdminProfile();
  const modelId = stringValue(formData, "modelId");
  const trafficShare = numberValue(formData, "trafficShare");

  if (!modelId || Number.isNaN(trafficShare)) {
    redirectWithMessage("A valid model and traffic share are required.");
  }

  await rebalanceModelTraffic(modelId, trafficShare);

  revalidatePath("/models");
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
  redirectWithMessage("Model traffic updated.");
}

export async function updateModelVersionAction(formData: FormData) {
  await requireAdminProfile();
  const modelId = stringValue(formData, "modelId");
  const approvalThreshold = numberValue(formData, "approvalThreshold");
  const drift = numberValue(formData, "drift");
  const notes = stringValue(formData, "notes");

  if (!modelId || Number.isNaN(approvalThreshold) || Number.isNaN(drift) || !notes) {
    redirectWithMessage("A valid model, threshold, drift score, and notes are required.");
  }

  await updateModelVersion(modelId, {
    approvalThreshold,
    drift,
    notes,
  });

  revalidatePath("/models");
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
  redirectWithMessage("Model governance settings updated.");
}
