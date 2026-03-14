import { NextResponse } from "next/server";
import { buildMonitoringAlerts } from "@/lib/monitoring";
import {
  getDashboardSnapshot,
  listApplicationDocuments,
  listApplications,
  listDataSourceConnections,
  listFraudAlerts,
  listFraudCases,
  listIngestionRuns,
  listModelEvaluations,
  listModelVersions,
  listWorkflows,
} from "@/lib/repository";

export const dynamic = "force-dynamic";

export async function GET() {
  const [snapshot, applications, fraudAlerts, fraudCases, modelEvaluations, models, runs, connections, workflows] = await Promise.all([
    getDashboardSnapshot(),
    listApplications(),
    listFraudAlerts(),
    listFraudCases(),
    listModelEvaluations(),
    listModelVersions(),
    listIngestionRuns(),
    listDataSourceConnections(),
    listWorkflows(),
  ]);
  const documentGroups = await Promise.all(applications.map((application) => listApplicationDocuments(application.id)));
  const documents = documentGroups.flat();
  const alerts = buildMonitoringAlerts({
    models,
    evaluations: modelEvaluations,
    fraudAlerts,
    fraudCases,
    runs,
    connections,
    documents,
    workflows,
  });

  return NextResponse.json({
    data: {
      snapshot,
      alerts,
      fraudAlerts,
      fraudCases,
      modelEvaluations,
      models,
      connections,
      runs,
      workflows,
    },
  });
}
