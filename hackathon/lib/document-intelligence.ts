import type { ApplicationDocument } from "@/lib/types";

interface DocumentDescriptor {
  name: string;
  type: string;
  size: number;
}

export interface DocumentAnalysisResult {
  documentConfidence: number;
  fraudSignals: string[];
  documents: Array<
    Pick<
      ApplicationDocument,
      | "fileName"
      | "mimeType"
      | "sizeBytes"
      | "documentType"
      | "verificationStatus"
      | "extractedConfidence"
      | "analysisSummary"
      | "extractedData"
    >
  >;
}

export interface DocumentPacketSummary {
  totalDocuments: number;
  verifiedDocuments: number;
  reviewDocuments: number;
  rejectedDocuments: number;
  averageConfidence: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function baseScoreForType(type: string) {
  if (type === "application/pdf") return 0.9;
  if (type.startsWith("image/")) return 0.84;
  if (type.startsWith("text/")) return 0.74;
  return 0.58;
}

function adjustmentForSize(size: number) {
  if (size < 40_000) return -0.18;
  if (size < 120_000) return -0.08;
  if (size > 8_000_000) return -0.06;
  return 0.04;
}

function summaryForDocument(file: DocumentDescriptor, confidence: number) {
  const quality =
    confidence >= 0.86
      ? "strong OCR readiness"
      : confidence >= 0.72
        ? "usable OCR readiness"
        : "weak OCR readiness";

  return `${file.type || "unknown type"} · ${quality}`;
}

function detectDocumentType(fileName: string): ApplicationDocument["documentType"] {
  if (fileName.includes("bank") || fileName.includes("statement")) return "bank_statement";
  if (fileName.includes("paystub") || fileName.includes("pay_stub") || fileName.includes("income")) return "pay_stub";
  if (fileName.includes("id") || fileName.includes("license") || fileName.includes("passport")) return "identity_document";
  return "other";
}

function verificationStatus(
  documentType: ApplicationDocument["documentType"],
  confidence: number,
): ApplicationDocument["verificationStatus"] {
  if (confidence >= 0.88) return "verified";
  if (documentType === "other" || confidence < 0.68) return "review";
  return "verified";
}

function mockExtractedData(
  fileName: string,
  confidence: number,
  type: ApplicationDocument["documentType"],
): Record<string, string | number> {
  if (type === "bank_statement") {
    return {
      statement_months: confidence >= 0.85 ? 3 : 2,
      detected_employer: fileName.includes("bacancy") ? "Bacancy" : "Primary employer detected",
      average_balance_band: confidence >= 0.82 ? "healthy" : "review",
    };
  }

  if (type === "pay_stub") {
    return {
      gross_income_band: confidence >= 0.82 ? "matched" : "requires review",
      pay_frequency: "monthly",
      employer_match: confidence >= 0.8 ? "verified" : "partial",
    };
  }

  if (type === "identity_document") {
    return {
      identity_match: confidence >= 0.8 ? "verified" : "review",
      expiry_check: "passed",
    };
  }

  return {
    extraction_quality: confidence >= 0.8 ? "usable" : "review",
  };
}

export function analyzeUploadedDocuments(files: File[]): DocumentAnalysisResult {
  return analyzeDocumentDescriptors(
    files.map((file) => ({
      name: file.name,
      type: file.type,
      size: file.size,
    })),
  );
}

export function analyzeDocumentDescriptors(rawFiles: DocumentDescriptor[]): DocumentAnalysisResult {
  if (rawFiles.length === 0) {
    return {
      documentConfidence: 0.45,
      fraudSignals: ["missing_supporting_docs"],
      documents: [],
    };
  }

  const descriptors = rawFiles.map((file) => ({
    name: file.name.toLowerCase(),
    type: file.type || "application/octet-stream",
    size: file.size,
  }));

  const documents = descriptors.map((file) => {
    let confidence = baseScoreForType(file.type) + adjustmentForSize(file.size);

    if (file.name.includes("bank") || file.name.includes("statement")) confidence += 0.03;
    if (file.name.includes("paystub") || file.name.includes("income")) confidence += 0.03;
    if (file.name.includes("scan") || file.name.includes("photo")) confidence -= 0.02;

    const extractedConfidence = clamp(Number(confidence.toFixed(2)), 0.3, 0.98);

    return {
      fileName: file.name,
      mimeType: file.type,
      sizeBytes: file.size,
      documentType: detectDocumentType(file.name),
      verificationStatus: verificationStatus(detectDocumentType(file.name), extractedConfidence),
      extractedConfidence,
      analysisSummary: summaryForDocument(file, extractedConfidence),
      extractedData: mockExtractedData(file.name, extractedConfidence, detectDocumentType(file.name)),
    };
  });

  const fraudSignals = new Set<string>();

  if (rawFiles.length < 2) {
    fraudSignals.add("limited_document_pack");
  }
  if (documents.some((file) => file.sizeBytes < 40_000)) {
    fraudSignals.add("low_quality_scan");
  }
  if (documents.some((file) => file.mimeType === "application/octet-stream")) {
    fraudSignals.add("unsupported_document_type");
  }
  if (documents.some((file) => file.verificationStatus === "review")) {
    fraudSignals.add("ocr_verification_review");
  }

  const averageConfidence =
    documents.reduce((sum, file) => sum + file.extractedConfidence, 0) /
    Math.max(documents.length, 1);
  const packBonus = rawFiles.length >= 3 ? 0.04 : rawFiles.length === 2 ? 0.02 : 0;

  return {
    documentConfidence: clamp(Number((averageConfidence + packBonus).toFixed(2)), 0.35, 0.98),
    fraudSignals: [...fraudSignals],
    documents,
  };
}

export function summarizeDocumentPacket(
  documents: Pick<ApplicationDocument, "verificationStatus" | "extractedConfidence">[],
): DocumentPacketSummary {
  const totalDocuments = documents.length;
  const verifiedDocuments = documents.filter((item) => item.verificationStatus === "verified").length;
  const reviewDocuments = documents.filter((item) => item.verificationStatus === "review").length;
  const rejectedDocuments = documents.filter((item) => item.verificationStatus === "rejected").length;
  const averageConfidence =
    documents.reduce((sum, item) => sum + item.extractedConfidence, 0) / Math.max(totalDocuments, 1);

  return {
    totalDocuments,
    verifiedDocuments,
    reviewDocuments,
    rejectedDocuments,
    averageConfidence: Math.round(averageConfidence * 100),
  };
}
