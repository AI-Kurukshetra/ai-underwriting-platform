import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Find the first organization to attach seed data to
  const org = await prisma.organization.findFirst({ orderBy: { createdAt: "asc" } });
  if (!org) {
    console.error("No organization found. Sign up first, then run this seed.");
    process.exit(1);
  }
  const orgId = org.id;
  console.log(`Seeding demo data for organization "${org.name}" (${orgId})…`);

  // ── Model versions ──────────────────────────────────────────────
  const modelData = [
    { name: "Gradient Lite", version: "1.3.0", status: "champion", auc: 0.87, precision: 0.81, recall: 0.78, drift: 2.1, trafficShare: 70, approvalThreshold: 35, deployedAt: new Date("2026-03-08"), notes: "Primary underwriting model with document confidence and geospatial features enabled." },
    { name: "Gradient Lite", version: "1.4.0-rc1", status: "challenger", auc: 0.90, precision: 0.83, recall: 0.80, drift: 1.2, trafficShare: 20, approvalThreshold: 33, deployedAt: new Date("2026-03-12"), notes: "Candidate release testing stronger fraud weighting against the champion model." },
    { name: "Fraud Sentinel", version: "0.9.2", status: "shadow", auc: 0.79, precision: 0.74, recall: 0.82, drift: 3.4, trafficShare: 10, approvalThreshold: 37, deployedAt: new Date("2026-03-10"), notes: "Shadow model for networked fraud signals and device intelligence experiments." },
  ];
  for (const m of modelData) {
    const existing = await prisma.modelVersion.findFirst({ where: { organizationId: orgId, name: m.name, version: m.version } });
    if (!existing) await prisma.modelVersion.create({ data: { organizationId: orgId, ...m } });
  }
  console.log("  ✔ Model versions");

  // ── Workflow ─────────────────────────────────────────────────────
  const existingWorkflow = await prisma.workflow.findFirst({ where: { organizationId: orgId } });
  if (!existingWorkflow) {
    await prisma.workflow.create({
      data: {
        organizationId: orgId,
        name: "Loan autopilot",
        config: { autoApproveBelow: 35, declineAboveOrEqual: 65, fraudEscalationAt: 70, maxDebtToIncome: 0.45, minDocumentConfidence: 0.74, highAmountManualReviewAbove: 20000, defaultReviewStage: "underwriter_review", fraudReviewStage: "fraud_review" },
      },
    });
  }
  console.log("  ✔ Workflow");

  // ── Applications ─────────────────────────────────────────────────
  const apps = [
    { externalRef: "DEMO-1001", customerName: "Mia Reynolds", email: "mia.reynolds@gmail.com", productLine: "personal_loan", amountRequested: 18000, annualIncome: 92000, creditScore: 742, debtToIncome: 0.24, claimsCount: 0, fraudSignals: [] as string[], documentConfidence: 0.94, geospatialRisk: 0.22, state: "Texas", status: "approved", workflowStage: "decisioned" },
    { externalRef: "DEMO-1002", customerName: "Jordan Patel", email: "jordan.patel@gmail.com", productLine: "personal_loan", amountRequested: 9200, annualIncome: 64000, creditScore: 661, debtToIncome: 0.39, claimsCount: 2, fraudSignals: ["device_mismatch"], documentConfidence: 0.81, geospatialRisk: 0.48, state: "Florida", status: "manual_review", workflowStage: "underwriter_review" },
    { externalRef: "DEMO-1003", customerName: "Avery Brooks", email: "avery.brooks@gmail.com", productLine: "personal_loan", amountRequested: 26000, annualIncome: 51000, creditScore: 612, debtToIncome: 0.46, claimsCount: 1, fraudSignals: ["bank_statement_gap", "thin_file"], documentConfidence: 0.72, geospatialRisk: 0.60, state: "Louisiana", status: "declined", workflowStage: "decisioned" },
    { externalRef: "DEMO-1004", customerName: "Noah Chen", email: "noah.chen@gmail.com", productLine: "personal_loan", amountRequested: 4100, annualIncome: 118000, creditScore: 788, debtToIncome: 0.18, claimsCount: 0, fraudSignals: [] as string[], documentConfidence: 0.97, geospatialRisk: 0.19, state: "California", status: "approved", workflowStage: "decisioned" },
    { externalRef: "DEMO-1005", customerName: "Elena Martinez", email: "elena.martinez@gmail.com", productLine: "personal_loan", amountRequested: 14500, annualIncome: 68000, creditScore: 698, debtToIncome: 0.35, claimsCount: 1, fraudSignals: [] as string[], documentConfidence: 0.87, geospatialRisk: 0.31, state: "Arizona", status: "scored", workflowStage: "underwriter_review" },
    { externalRef: "DEMO-1006", customerName: "Khushbu Shah", email: "khushbu.shah@gmail.com", productLine: "personal_loan", amountRequested: 50000, annualIncome: 45000, creditScore: 520, debtToIncome: 0.55, claimsCount: 3, fraudSignals: ["device_mismatch", "thin_file"], documentConfidence: 0.56, geospatialRisk: 0.65, state: "Florida", status: "manual_review", workflowStage: "fraud_review" },
  ];

  const appIds: Record<string, string> = {};
  for (const app of apps) {
    const existing = await prisma.application.findFirst({ where: { externalRef: app.externalRef } });
    if (existing) {
      appIds[app.externalRef] = existing.id;
    } else {
      const created = await prisma.application.create({ data: { organizationId: orgId, ...app } });
      appIds[app.externalRef] = created.id;
    }
  }
  console.log("  ✔ Applications (6)");

  // ── Application documents ────────────────────────────────────────
  const docs = [
    { appRef: "DEMO-1001", fileName: "bank_statement_mia_reynolds.pdf", mimeType: "application/pdf", sizeBytes: 224000, extractedConfidence: 0.94, analysisSummary: "application/pdf · strong OCR readiness", documentType: "bank_statement", verificationStatus: "verified", extractedData: { statement_months: 3, detected_employer: "Bacancy", average_balance_band: "healthy" } },
    { appRef: "DEMO-1001", fileName: "paystub_february.png", mimeType: "image/png", sizeBytes: 168000, extractedConfidence: 0.88, analysisSummary: "image/png · strong OCR readiness", documentType: "pay_stub", verificationStatus: "verified", extractedData: { gross_income_band: "matched", pay_frequency: "monthly", employer_match: "verified" } },
    { appRef: "DEMO-1002", fileName: "income_letter_scan.jpg", mimeType: "image/jpeg", sizeBytes: 49000, extractedConfidence: 0.67, analysisSummary: "image/jpeg · weak OCR readiness", documentType: "pay_stub", verificationStatus: "review", extractedData: { gross_income_band: "requires review", pay_frequency: "monthly", employer_match: "partial" } },
    { appRef: "DEMO-1003", fileName: "bank_statement_avery.txt", mimeType: "text/plain", sizeBytes: 18000, extractedConfidence: 0.52, analysisSummary: "text/plain · weak OCR readiness", documentType: "bank_statement", verificationStatus: "review", extractedData: { statement_months: 1, detected_employer: "Unknown", average_balance_band: "review" } },
    { appRef: "DEMO-1006", fileName: "demo-doc.txt", mimeType: "text/plain", sizeBytes: 129, extractedConfidence: 0.56, analysisSummary: "text/plain · weak OCR readiness", documentType: "other", verificationStatus: "review", extractedData: { extraction_quality: "review" } },
  ];
  for (const doc of docs) {
    const appId = appIds[doc.appRef];
    const existing = await prisma.applicationDocument.findFirst({ where: { applicationId: appId, fileName: doc.fileName } });
    if (!existing) {
      const { appRef, ...data } = doc;
      await prisma.applicationDocument.create({ data: { applicationId: appId, ...data } });
    }
  }
  console.log("  ✔ Documents (5)");

  // ── Risk scores ──────────────────────────────────────────────────
  const scores = [
    { appRef: "DEMO-1001", score: 18, band: "low", fraudProbability: 7, documentConfidence: 0.94, recommendation: "auto_approve", reasons: ["Strong credit profile", "Clean intake signals"], modelVersion: "Gradient Lite v1.3.0" },
    { appRef: "DEMO-1002", score: 47, band: "medium", fraudProbability: 34, documentConfidence: 0.81, recommendation: "manual_review", reasons: ["Device mismatch signal", "Claims count above baseline"], modelVersion: "Gradient Lite v1.3.0" },
    { appRef: "DEMO-1003", score: 71, band: "high", fraudProbability: 58, documentConfidence: 0.72, recommendation: "decline", reasons: ["Bank statement gap", "Thin file", "Elevated geospatial risk"], modelVersion: "Gradient Lite v1.3.0" },
    { appRef: "DEMO-1004", score: 12, band: "low", fraudProbability: 4, documentConfidence: 0.97, recommendation: "auto_approve", reasons: ["Excellent credit", "High income ratio"], modelVersion: "Gradient Lite v1.3.0" },
    { appRef: "DEMO-1005", score: 38, band: "medium", fraudProbability: 22, documentConfidence: 0.87, recommendation: "manual_review", reasons: ["Moderate debt-to-income", "One prior loss event"], modelVersion: "Gradient Lite v1.3.0" },
    { appRef: "DEMO-1006", score: 82, band: "high", fraudProbability: 78, documentConfidence: 0.56, recommendation: "decline", reasons: ["High claims count", "Device mismatch signal", "Low document confidence", "Thin file"], modelVersion: "Gradient Lite v1.3.0" },
  ];
  for (const s of scores) {
    const appId = appIds[s.appRef];
    const existing = await prisma.riskScore.findFirst({ where: { applicationId: appId } });
    if (!existing) {
      const { appRef, ...data } = s;
      await prisma.riskScore.create({ data: { applicationId: appId, ...data, factors: JSON.stringify([]) } });
    }
  }
  console.log("  ✔ Risk scores (6)");

  // ── Fraud alerts ─────────────────────────────────────────────────
  const alerts = [
    { appRef: "DEMO-1002", customerName: "Jordan Patel", severity: "medium", reason: "Device mismatch detected between intake session and document upload." },
    { appRef: "DEMO-1003", customerName: "Avery Brooks", severity: "high", reason: "Thin file combined with inconsistent bank statement metadata." },
    { appRef: "DEMO-1006", customerName: "Khushbu Shah", severity: "high", reason: "Device mismatch with thin file and low-confidence document scan detected." },
  ];
  for (const a of alerts) {
    const appId = appIds[a.appRef];
    const existing = await prisma.fraudAlert.findFirst({ where: { applicationId: appId } });
    if (!existing) {
      const { appRef, ...data } = a;
      await prisma.fraudAlert.create({ data: { applicationId: appId, ...data } });
    }
  }
  console.log("  ✔ Fraud alerts (3)");

  // ── Fraud cases ──────────────────────────────────────────────────
  const fraudCases = [
    { appRef: "DEMO-1002", category: "claims_pattern", score: 68, status: "watch", explanation: "Historical loss events are above the portfolio baseline and require fraud-pattern validation." },
    { appRef: "DEMO-1002", category: "document_anomaly", score: 56, status: "watch", explanation: "Borrower document packet contains low-confidence or mismatched OCR extraction." },
    { appRef: "DEMO-1002", category: "identity_risk", score: 57, status: "open", explanation: "Identity telemetry flagged signals: device_mismatch." },
    { appRef: "DEMO-1003", category: "document_anomaly", score: 56, status: "watch", explanation: "Borrower document packet contains low-confidence or mismatched OCR extraction." },
    { appRef: "DEMO-1006", category: "claims_pattern", score: 82, status: "open", explanation: "Historical loss events are above the portfolio baseline and require fraud-pattern validation." },
    { appRef: "DEMO-1006", category: "document_anomaly", score: 56, status: "open", explanation: "Borrower document packet contains low-confidence or mismatched OCR extraction." },
    { appRef: "DEMO-1006", category: "identity_risk", score: 69, status: "open", explanation: "Identity telemetry flagged signals: device_mismatch, thin_file." },
  ];
  for (const fc of fraudCases) {
    const appId = appIds[fc.appRef];
    const existing = await prisma.fraudCase.findFirst({ where: { applicationId: appId, category: fc.category } });
    if (!existing) {
      const { appRef, ...data } = fc;
      await prisma.fraudCase.create({ data: { applicationId: appId, ...data } });
    }
  }
  console.log("  ✔ Fraud cases (7)");

  // ── Data source connections ──────────────────────────────────────
  const connectors = [
    { sourceType: "credit_bureau", providerName: "Experian Sandbox", status: "connected", syncMode: "api", defaultFreshnessHours: 12, coverage: 96, notes: "Primary bureau pull for scorecards and delinquencies." },
    { sourceType: "payroll", providerName: "Pinwheel Sandbox", status: "connected", syncMode: "api", defaultFreshnessHours: 4, coverage: 88, notes: "Income and employer verification for borrower affordability checks." },
    { sourceType: "public_records", providerName: "LexisNexis Sandbox", status: "connected", syncMode: "batch", defaultFreshnessHours: 24, coverage: 82, notes: "OFAC, address normalization, and public-record screening." },
    { sourceType: "social_media", providerName: "Persona Digital Footprint", status: "attention", syncMode: "manual", defaultFreshnessHours: 168, coverage: 41, notes: "Used only for escalated fraud reviews and identity-resolution checks." },
    { sourceType: "iot_device", providerName: "DeviceGraph Lab", status: "attention", syncMode: "batch", defaultFreshnessHours: 336, coverage: 34, notes: "Experimental device and telemetry feed for synthetic-profile investigations." },
  ];
  for (const c of connectors) {
    const existing = await prisma.dataSourceConnection.findFirst({ where: { organizationId: orgId, sourceType: c.sourceType } });
    if (!existing) {
      await prisma.dataSourceConnection.create({ data: { organizationId: orgId, ...c } });
    }
  }
  console.log("  ✔ Data source connections (5)");

  // ── Ingestion runs ───────────────────────────────────────────────
  const runs = [
    { appRef: "DEMO-1002", sourceType: "credit_bureau", providerName: "Experian Sandbox", status: "succeeded", recordsProcessed: 4, triggeredBy: "Partner API", detail: "Tradelines, inquiries, and delinquency summary normalized into bureau features." },
    { appRef: "DEMO-1002", sourceType: "payroll", providerName: "Pinwheel Sandbox", status: "partial", recordsProcessed: 2, triggeredBy: "Riya Shah", detail: "Employer verified but gross-income coverage is incomplete for one pay period." },
    { appRef: null, sourceType: "social_media", providerName: "Persona Digital Footprint", status: "failed", recordsProcessed: 0, triggeredBy: "Nightly batch", detail: "Provider returned a throttling response; manual re-run required." },
  ];
  for (const r of runs) {
    const appId = r.appRef ? appIds[r.appRef] : null;
    const existing = await prisma.ingestionRun.findFirst({ where: { organizationId: orgId, sourceType: r.sourceType, applicationId: appId } });
    if (!existing) {
      const { appRef, ...data } = r;
      await prisma.ingestionRun.create({ data: { organizationId: orgId, applicationId: appId, ...data } });
    }
  }
  console.log("  ✔ Ingestion runs (3)");

  // ── Audit logs ───────────────────────────────────────────────────
  const auditLogs = [
    { appRef: "DEMO-1002", actor: "system", action: "Risk score generated", details: "Automated score pushed file into fraud review queue after device mismatch signal." },
    { appRef: "DEMO-1002", actor: "Riya Shah", action: "Manual review requested", details: "Requested income verification before final loan decision." },
    { appRef: "DEMO-1003", actor: "system", action: "Decline recommended", details: "High risk band with multiple fraud signals and elevated geospatial exposure." },
    { appRef: "DEMO-1001", actor: "system", action: "Auto approval executed", details: "Application met policy thresholds and passed all automated checks." },
    { appRef: "DEMO-1006", actor: "system", action: "Risk score generated", details: "Fraud review escalation triggered by device mismatch and thin file signals." },
  ];
  for (const log of auditLogs) {
    const appId = appIds[log.appRef];
    const existing = await prisma.auditLog.findFirst({ where: { applicationId: appId, action: log.action } });
    if (!existing) {
      const { appRef, ...data } = log;
      await prisma.auditLog.create({ data: { applicationId: appId, ...data } });
    }
  }
  console.log("  ✔ Audit logs (5)");

  // ── Portfolio metrics ────────────────────────────────────────────
  const metrics = [
    { label: "Book premium equivalent", value: "$12.4M", delta: "+4.2% this month", tone: "positive" },
    { label: "Average expected loss ratio", value: "42%", delta: "Stable vs prior week", tone: "neutral" },
    { label: "High-risk concentration", value: "18%", delta: "Above target by 2 pts", tone: "negative" },
  ];
  for (const m of metrics) {
    const existing = await prisma.portfolioMetric.findFirst({ where: { organizationId: orgId, label: m.label } });
    if (!existing) {
      await prisma.portfolioMetric.create({ data: { organizationId: orgId, ...m } });
    }
  }
  console.log("  ✔ Portfolio metrics (3)");

  console.log("\n✅ Demo seed complete. Refresh the app to see the data.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
