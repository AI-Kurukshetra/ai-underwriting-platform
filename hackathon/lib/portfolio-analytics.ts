import { deriveGeospatialInsight } from "@/lib/geospatial";
import type {
  Application,
  ApplicationDocument,
  DocumentPortfolioSummary,
  GeospatialPortfolioRow,
  PortfolioProjection,
  RiskAssessment,
} from "@/lib/types";

function average(values: number[]) {
  return values.reduce((sum, value) => sum + value, 0) / Math.max(values.length, 1);
}

export function buildPortfolioProjections(
  applications: Application[],
  assessments: RiskAssessment[],
): PortfolioProjection[] {
  const exposure = applications.reduce((sum, item) => sum + item.amountRequested, 0);
  const expectedLossRate = Math.round(average(assessments.map((item) => item.score)) * 0.55);
  const approvals = assessments.filter((item) => item.recommendation === "auto_approve").length;
  const declines = assessments.filter((item) => item.recommendation === "decline").length;
  const manualReviews = assessments.filter((item) => item.recommendation === "manual_review").length;

  return [
    { horizon: "30 days", projectedExposure: Math.round(exposure * 1.05), expectedLossRate, projectedApprovals: approvals + 8, projectedManualReviews: manualReviews + 3, projectedDeclines: declines + 2 },
    { horizon: "60 days", projectedExposure: Math.round(exposure * 1.11), expectedLossRate: expectedLossRate + 1, projectedApprovals: approvals + 15, projectedManualReviews: manualReviews + 5, projectedDeclines: declines + 4 },
    { horizon: "90 days", projectedExposure: Math.round(exposure * 1.18), expectedLossRate: expectedLossRate + 2, projectedApprovals: approvals + 21, projectedManualReviews: manualReviews + 8, projectedDeclines: declines + 6 },
  ];
}

export function buildGeospatialPortfolioRows(applications: Application[]): GeospatialPortfolioRow[] {
  return Object.values(
    applications.reduce<Record<string, GeospatialPortfolioRow>>((acc, application) => {
      const insight = deriveGeospatialInsight(application.state, application.amountRequested);
      const current = acc[application.state] ?? {
        state: application.state,
        region: insight.region,
        applications: 0,
        averageRisk: 0,
        concentrationIndex: 0,
        climateVolatility: 0,
        laborStress: 0,
        fraudPressure: 0,
      };

      current.applications += 1;
      current.averageRisk += insight.derivedRisk;
      current.concentrationIndex = Math.max(current.concentrationIndex, insight.concentrationIndex);
      current.climateVolatility = Math.max(current.climateVolatility, insight.climateVolatility);
      current.laborStress = Math.max(current.laborStress, insight.laborStress);
      current.fraudPressure = Math.max(current.fraudPressure, insight.fraudPressure);
      acc[application.state] = current;
      return acc;
    }, {}),
  )
    .map((row) => ({
      ...row,
      averageRisk: Math.round((row.averageRisk / Math.max(row.applications, 1)) * 100),
      concentrationIndex: Math.round(row.concentrationIndex * 100),
      climateVolatility: Math.round(row.climateVolatility * 100),
      laborStress: Math.round(row.laborStress * 100),
      fraudPressure: Math.round(row.fraudPressure * 100),
    }))
    .sort((a, b) => b.averageRisk - a.averageRisk);
}

export function summarizeDocumentPortfolio(documents: ApplicationDocument[]): DocumentPortfolioSummary {
  const totalDocuments = documents.length;
  const verifiedDocuments = documents.filter((item) => item.verificationStatus === "verified").length;
  const reviewDocuments = documents.filter((item) => item.verificationStatus === "review").length;
  const rejectedDocuments = documents.filter((item) => item.verificationStatus === "rejected").length;
  const averageConfidence = average(documents.map((item) => item.extractedConfidence));

  return {
    totalDocuments,
    verifiedDocuments,
    reviewDocuments,
    rejectedDocuments,
    averageConfidence: Math.round(averageConfidence * 100),
    ocrCoverage: Math.round((verifiedDocuments / Math.max(totalDocuments, 1)) * 100),
  };
}
