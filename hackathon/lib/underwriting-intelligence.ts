import { deriveGeospatialInsight } from "@/lib/geospatial";
import type {
  Application,
  ApplicationDataSource,
  ApplicationDocument,
  FraudCase,
  RiskAssessment,
  SourceIngestionInput,
} from "@/lib/types";

function keyedSources(
  sources: Array<Omit<ApplicationDataSource, "id" | "applicationId" | "createdAt">>,
  sourceInputs: SourceIngestionInput[],
) {
  const base = new Map(sources.map((source) => [source.sourceType, source]));

  for (const input of sourceInputs) {
    base.set(input.sourceType, {
      sourceType: input.sourceType,
      status: input.status,
      confidence: input.confidence,
      freshnessHours: input.freshnessHours,
      detail: `${input.providerName}: ${input.detail}`,
    });
  }

  return [...base.values()];
}

export function buildApplicationDataSources(
  application: Application,
  documents: Array<Pick<ApplicationDocument, "fileName" | "documentType" | "extractedConfidence">>,
  sourceInputs: SourceIngestionInput[] = [],
): Array<Omit<ApplicationDataSource, "id" | "applicationId" | "createdAt">> {
  const geo = deriveGeospatialInsight(application.state, application.amountRequested);
  const hasBankDocs = documents.some((document) => document.documentType === "bank_statement");
  const hasIncomeDocs = documents.some((document) => document.documentType === "pay_stub");

  return keyedSources(
    [
      {
        sourceType: "credit_bureau",
        status: application.creditScore >= 300 ? "ingested" : "missing",
        confidence: 0.94,
        freshnessHours: 12,
        detail: `Credit bureau pull normalized to score ${application.creditScore}.`,
      },
      {
        sourceType: "payroll",
        status: hasIncomeDocs ? "ingested" : "warning",
        confidence: hasIncomeDocs ? 0.89 : 0.58,
        freshnessHours: hasIncomeDocs ? 4 : 48,
        detail: hasIncomeDocs
          ? "Income verification package matched borrower stated income."
          : "Borrower income present, but payroll evidence needs review.",
      },
      {
        sourceType: "bank_statements",
        status: hasBankDocs ? "ingested" : "warning",
        confidence: hasBankDocs ? 0.91 : 0.52,
        freshnessHours: hasBankDocs ? 6 : 72,
        detail: hasBankDocs
          ? "Bank statement ingestion completed with OCR coverage."
          : "Limited statement coverage across uploaded packet.",
      },
      {
        sourceType: "public_records",
        status: "ingested",
        confidence: 0.73,
        freshnessHours: 24,
        detail: `Address and sanctions screening completed for ${application.state}.`,
      },
      {
        sourceType: "device_intelligence",
        status: application.fraudSignals.some((signal) => signal.includes("device")) ? "warning" : "ingested",
        confidence: application.fraudSignals.some((signal) => signal.includes("device")) ? 0.55 : 0.82,
        freshnessHours: 1,
        detail: application.fraudSignals.some((signal) => signal.includes("device"))
          ? "Device mismatch or session anomaly flagged during intake."
          : "Device fingerprint and session telemetry are consistent.",
      },
      {
        sourceType: "geospatial_index",
        status: "ingested",
        confidence: 0.88,
        freshnessHours: 12,
        detail: `${geo.region} concentration index ${Math.round(geo.concentrationIndex * 100)} with derived risk ${Math.round(
          geo.derivedRisk * 100,
        )}%.`,
      },
      {
        sourceType: "social_media",
        status: application.fraudSignals.some((signal) => signal.includes("social")) ? "warning" : "missing",
        confidence: application.fraudSignals.some((signal) => signal.includes("social")) ? 0.44 : 0.2,
        freshnessHours: 168,
        detail: application.fraudSignals.some((signal) => signal.includes("social"))
          ? "Digital footprint review flagged inconsistencies in borrower presence."
          : "No social-risk feed connected for this application yet.",
      },
      {
        sourceType: "iot_device",
        status: application.fraudSignals.some((signal) => signal.includes("iot")) ? "warning" : "missing",
        confidence: application.fraudSignals.some((signal) => signal.includes("iot")) ? 0.48 : 0.18,
        freshnessHours: 336,
        detail: application.fraudSignals.some((signal) => signal.includes("iot"))
          ? "Device telemetry source reported anomalous borrower-device behavior."
          : "No IoT or telematics signal is currently attached to this borrower file.",
      },
    ],
    sourceInputs,
  );
}

export function buildFraudCases(
  application: Application,
  assessment: RiskAssessment,
  documents: Array<Pick<ApplicationDocument, "fileName" | "documentType" | "verificationStatus" | "extractedConfidence">>,
): Array<Omit<FraudCase, "id" | "applicationId" | "createdAt">> {
  const cases: Array<Omit<FraudCase, "id" | "applicationId" | "createdAt">> = [];

  if (application.claimsCount >= 2) {
    cases.push({
      category: "claims_pattern",
      score: Math.min(100, 40 + application.claimsCount * 14),
      status: application.claimsCount >= 3 ? "open" : "watch",
      explanation: "Historical loss events are above the portfolio baseline and require fraud-pattern validation.",
    });
  }

  if (documents.some((document) => document.extractedConfidence < 0.75 || document.verificationStatus !== "verified")) {
    cases.push({
      category: "document_anomaly",
      score: Math.min(
        100,
        38 +
          documents.filter((document) => document.extractedConfidence < 0.75 || document.verificationStatus !== "verified").length * 18,
      ),
      status: assessment.fraudProbability >= 70 ? "open" : "watch",
      explanation: "Borrower document packet contains low-confidence or mismatched OCR extraction.",
    });
  }

  if (application.fraudSignals.some((signal) => signal.includes("device") || signal.includes("identity") || signal.includes("social"))) {
    cases.push({
      category: "identity_risk",
      score: Math.min(100, 45 + application.fraudSignals.length * 12),
      status: "open",
      explanation: `Identity telemetry flagged signals: ${application.fraudSignals.join(", ")}.`,
    });
  }

  if (assessment.fraudProbability >= 60 && application.creditScore < 640 && application.claimsCount === 0) {
    cases.push({
      category: "synthetic_profile",
      score: assessment.fraudProbability,
      status: "watch",
      explanation: "Thin-file borrower pattern with elevated fraud probability may indicate synthetic identity characteristics.",
    });
  }

  return cases;
}
