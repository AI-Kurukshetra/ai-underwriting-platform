"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminProfile, requireProfile } from "@/lib/auth";
import {
  createDataSourceConnection,
  createIngestionRun,
  ingestApplicationSource,
} from "@/lib/repository";
import { dataSourceConnectionSchema, ingestionRunSchema, sourceIngestionSchema } from "@/lib/validators";

function stringValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function numberValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() !== "" ? Number(raw) : Number.NaN;
}

function redirectWithMessage(message: string): never {
  redirect(`/data-sources?message=${encodeURIComponent(message)}`);
}

export async function createDataSourceConnectionAction(formData: FormData) {
  const { profile } = await requireAdminProfile();
  const payload = {
    sourceType: stringValue(formData, "sourceType"),
    providerName: stringValue(formData, "providerName"),
    status: stringValue(formData, "status"),
    syncMode: stringValue(formData, "syncMode"),
    defaultFreshnessHours: numberValue(formData, "defaultFreshnessHours"),
    coverage: numberValue(formData, "coverage"),
    notes: stringValue(formData, "notes"),
  };

  const parsed = dataSourceConnectionSchema.safeParse(payload);
  if (!parsed.success) {
    redirectWithMessage("Connection details are incomplete.");
  }

  await createDataSourceConnection(parsed.data, profile.organizationId);

  revalidatePath("/data-sources");
  revalidatePath("/monitoring");
  redirectWithMessage(`Connected ${payload.providerName} for ${payload.sourceType.replace(/_/g, " ")}.`);
}

export async function triggerIngestionRunAction(formData: FormData) {
  const { user, profile } = await requireProfile();
  const sourcePayload = {
    sourceType: stringValue(formData, "sourceType"),
    providerName: stringValue(formData, "providerName"),
    status: stringValue(formData, "status"),
    confidence: numberValue(formData, "confidence"),
    freshnessHours: numberValue(formData, "freshnessHours"),
    detail: stringValue(formData, "detail"),
    recordsProcessed: numberValue(formData, "recordsProcessed"),
  };
  const applicationId = stringValue(formData, "applicationId") || undefined;

  const parsedSource = sourceIngestionSchema.safeParse(sourcePayload);
  if (!parsedSource.success) {
    redirectWithMessage("Ingestion input is invalid.");
  }

  const actor = profile.fullName ?? user.email ?? "Underwriter";

  if (applicationId) {
    await ingestApplicationSource(applicationId, parsedSource.data, actor, profile.organizationId);
  } else {
    const parsedRun = ingestionRunSchema.safeParse({
      applicationId,
      sourceType: parsedSource.data.sourceType,
      providerName: parsedSource.data.providerName,
      status: parsedSource.data.status === "ingested" ? "succeeded" : parsedSource.data.status === "warning" ? "partial" : "failed",
      recordsProcessed: parsedSource.data.recordsProcessed ?? 1,
      triggeredBy: actor,
      detail: parsedSource.data.detail,
    });

    if (!parsedRun.success) {
      redirectWithMessage("Ingestion run could not be recorded.");
    }

    await createIngestionRun(parsedRun.data, profile.organizationId);
  }

  revalidatePath("/data-sources");
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
  if (applicationId) {
    revalidatePath(`/applications/${applicationId}`);
  }
  redirectWithMessage(`Ingestion recorded for ${parsedSource.data.providerName}.`);
}
