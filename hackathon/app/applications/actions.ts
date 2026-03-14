"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentProfile, requireProfile, requireUser } from "@/lib/auth";
import { analyzeUploadedDocuments } from "@/lib/document-intelligence";
import { deriveGeospatialInsight } from "@/lib/geospatial";
import {
  createDecision,
  createScoredApplication,
  getRiskScoreByApplicationId,
  storeApplicationDocuments,
  updateApplicationDocumentStatus,
} from "@/lib/repository";
import { applicationPayloadSchema, decisionPayloadSchema, documentReviewSchema } from "@/lib/validators";

function numberValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
}

function stringValue(formData: FormData, key: string) {
  const raw = formData.get(key);
  return typeof raw === "string" ? raw.trim() : "";
}

function buildExternalRef() {
  const now = new Date();
  const dateStamp = `${now.getUTCFullYear()}${String(now.getUTCMonth() + 1).padStart(2, "0")}${String(
    now.getUTCDate(),
  ).padStart(2, "0")}`;
  return `PL-${dateStamp}-${Math.floor(Math.random() * 9000) + 1000}`;
}

function redirectWithMessage(path: string, message: string): never {
  redirect(`${path}${path.includes("?") ? "&" : "?"}message=${encodeURIComponent(message)}`);
}

export async function submitApplicationAction(formData: FormData) {
  const user = await requireUser();
  const profile = await getCurrentProfile();
  const uploadedFiles = formData
    .getAll("documents")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const analysis = analyzeUploadedDocuments(uploadedFiles);
  const manualSignals = stringValue(formData, "fraudSignals")
    .split(",")
    .map((signal) => signal.trim())
    .filter(Boolean);
  const fraudSignals = [...new Set([...manualSignals, ...analysis.fraudSignals])];
  const state = stringValue(formData, "state");
  const requestedAmount = numberValue(formData, "amountRequested");
  const geospatialInsight = deriveGeospatialInsight(state, requestedAmount);

  const payload = {
    organizationId: profile?.organizationId,
    externalRef: buildExternalRef(),
    customerName: stringValue(formData, "customerName"),
    email: stringValue(formData, "email"),
    productLine: "personal_loan" as const,
    amountRequested: numberValue(formData, "amountRequested"),
    annualIncome: numberValue(formData, "annualIncome"),
    creditScore: numberValue(formData, "creditScore"),
    debtToIncome: numberValue(formData, "debtToIncome"),
    claimsCount: numberValue(formData, "claimsCount"),
    fraudSignals,
    documentConfidence: analysis.documentConfidence,
    geospatialRisk: geospatialInsight.derivedRisk,
    state,
  };

  const parsed = applicationPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    redirectWithMessage("/applications", "Unable to create loan application. Check the required fields.");
  }

  const actor = profile?.fullName ?? user.email ?? "Underwriter";
  const { application } = await createScoredApplication(parsed.data, actor, {
    documents: analysis.documents.map((document, index) => ({
      ...document,
      file: uploadedFiles[index],
    })),
  });

  try {
    await storeApplicationDocuments(
      application,
      analysis.documents.map((document, index) => ({
        ...document,
        file: uploadedFiles[index],
      })),
    );
  } catch (error) {
    console.error("Document upload failed after application creation.", error);
    redirect(
      `/applications/${application.id}?message=${encodeURIComponent(
        "Loan created, but the supporting document upload failed.",
      )}`,
    );
  }

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/portfolio");
  revalidatePath("/fraud-detection");
  revalidatePath("/monitoring");
  revalidatePath(`/applications/${application.id}`);

  redirect(
    `/applications/${application.id}?message=${encodeURIComponent(
      "Loan application created and scored successfully.",
    )}`,
  );
}

export async function recordDecisionAction(formData: FormData) {
  const { user, profile } = await requireProfile();
  const payload = {
    applicationId: stringValue(formData, "applicationId"),
    decision: stringValue(formData, "decision"),
    actor: profile?.fullName ?? user.email ?? "Underwriter",
    notes: stringValue(formData, "notes"),
  };

  const parsed = decisionPayloadSchema.safeParse(payload);

  if (!parsed.success) {
    redirectWithMessage(
      `/applications/${payload.applicationId}`,
      "Decision could not be recorded. Add a short note before submitting.",
    );
  }

  const currentAssessment = await getRiskScoreByApplicationId(payload.applicationId);

  if (!currentAssessment) {
    redirectWithMessage(
      `/applications/${payload.applicationId}`,
      "No model score is available for this borrower file yet.",
    );
  }

  const isOverride = parsed.data.decision !== currentAssessment.recommendation;
  if (isOverride && profile.role !== "admin") {
    redirectWithMessage(
      `/applications/${payload.applicationId}`,
      "Only admins can override the model recommendation.",
    );
  }

  await createDecision(parsed.data);

  revalidatePath("/applications");
  revalidatePath("/dashboard");
  revalidatePath("/monitoring");
  revalidatePath("/fraud-detection");
  revalidatePath(`/applications/${payload.applicationId}`);

  redirect(
    `/applications/${payload.applicationId}?message=${encodeURIComponent(
      `Decision recorded: ${payload.decision.replace(/_/g, " ")}.`,
    )}`,
  );
}

export async function recordDocumentReviewAction(formData: FormData) {
  const { user, profile } = await requireProfile();
  const applicationId = stringValue(formData, "applicationId");
  const parsed = documentReviewSchema.safeParse({
    documentId: stringValue(formData, "documentId"),
    status: stringValue(formData, "status"),
  });

  if (!parsed.success || !applicationId) {
    redirectWithMessage(`/applications/${applicationId || ""}`, "Document review update was invalid.");
  }

  await updateApplicationDocumentStatus(parsed.data.documentId, parsed.data.status, profile.fullName ?? user.email ?? "Reviewer");

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/monitoring");
  redirect(
    `/applications/${applicationId}?message=${encodeURIComponent(
      `Document marked ${parsed.data.status}.`,
    )}`,
  );
}
