import { NextResponse } from "next/server";
import { buildFraudPatternGroups } from "@/lib/fraud-patterns";
import {
  listApplications,
  listFraudAlerts,
  listFraudCases,
  listRiskScores,
} from "@/lib/repository";

export async function GET() {
  const [applications, riskScores, fraudAlerts, fraudCases] = await Promise.all([
    listApplications(),
    listRiskScores(),
    listFraudAlerts(),
    listFraudCases(),
  ]);

  return NextResponse.json({
    data: {
      fraudAlerts,
      fraudCases,
      patternGroups: buildFraudPatternGroups(applications, fraudCases, riskScores),
    },
  });
}
