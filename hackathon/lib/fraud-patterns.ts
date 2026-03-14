import type { Application, FraudCase, FraudPatternGroup, RiskAssessment } from "@/lib/types";

interface MutableGroup {
  id: string;
  title: string;
  patternType: FraudPatternGroup["patternType"];
  applications: Set<string>;
  fraudScores: number[];
  caseCount: number;
  detail: string;
}

function upsertGroup(
  groups: Map<string, MutableGroup>,
  key: string,
  next: Omit<MutableGroup, "applications" | "fraudScores" | "caseCount"> & {
    applicationId: string;
    fraudScore: number;
    caseCount: number;
  },
) {
  const current = groups.get(key) ?? {
    id: next.id,
    title: next.title,
    patternType: next.patternType,
    applications: new Set<string>(),
    fraudScores: [],
    caseCount: 0,
    detail: next.detail,
  };

  current.applications.add(next.applicationId);
  current.fraudScores.push(next.fraudScore);
  current.caseCount += next.caseCount;
  groups.set(key, current);
}

export function buildFraudPatternGroups(
  applications: Application[],
  cases: FraudCase[],
  assessments: RiskAssessment[],
): FraudPatternGroup[] {
  const groups = new Map<string, MutableGroup>();
  const assessmentMap = new Map(assessments.map((item) => [item.applicationId, item]));

  for (const application of applications) {
    const score = assessmentMap.get(application.id)?.fraudProbability ?? 0;
    const caseCount = cases.filter((item) => item.applicationId === application.id).length;
    const domain = application.email.split("@")[1]?.toLowerCase();

    if (domain) {
      upsertGroup(groups, `domain:${domain}`, {
        id: `domain:${domain}`,
        title: `${domain} borrower cluster`,
        patternType: "shared_domain",
        detail: "Shared email-domain cohort. Review for synthetic-identity or broker concentration.",
        applicationId: application.id,
        fraudScore: score,
        caseCount,
      });
    }

    for (const signal of application.fraudSignals) {
      upsertGroup(groups, `signal:${signal}`, {
        id: `signal:${signal}`,
        title: `${signal.replace(/_/g, " ")} pattern`,
        patternType: "shared_signal",
        detail: "Repeated telemetry or document anomaly signal across multiple borrower files.",
        applicationId: application.id,
        fraudScore: score,
        caseCount,
      });
    }

    upsertGroup(groups, `geo:${application.state.toLowerCase()}`, {
      id: `geo:${application.state.toLowerCase()}`,
      title: `${application.state} concentration`,
      patternType: "shared_geography",
      detail: "Shared regional footprint with overlapping fraud and repayment pressure.",
      applicationId: application.id,
      fraudScore: score,
      caseCount,
    });
  }

  return [...groups.values()]
    .filter((group) => group.applications.size > 1 || group.caseCount > 1)
    .map((group) => ({
      id: group.id,
      title: group.title,
      patternType: group.patternType,
      applications: [...group.applications],
      averageFraudScore: Math.round(
        group.fraudScores.reduce((sum, value) => sum + value, 0) / Math.max(group.fraudScores.length, 1),
      ),
      caseCount: group.caseCount,
      detail: group.detail,
    }))
    .sort((a, b) => b.caseCount - a.caseCount || b.averageFraudScore - a.averageFraudScore)
    .slice(0, 8);
}
