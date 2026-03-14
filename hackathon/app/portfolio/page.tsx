import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { buildGeospatialPortfolioRows, buildPortfolioProjections } from "@/lib/portfolio-analytics";
import { listApplications, listPortfolioConcentrations, listPortfolioMetrics, listRiskScores } from "@/lib/repository";
import { formatCurrency } from "@/lib/utils";

export default async function PortfolioPage() {
  const [metrics, concentrations, applications, riskScores] = await Promise.all([
    listPortfolioMetrics(),
    listPortfolioConcentrations(),
    listApplications(),
    listRiskScores(),
  ]);
  const geospatialRows = buildGeospatialPortfolioRows(applications);
  const projections = buildPortfolioProjections(applications, riskScores);

  return (
    <div className="page-grid">
      <PageHeader
        title="Portfolio analytics"
        description="Monitor concentration risk, segment-level exposure, and regional performance trends across the personal-loan book."
      />

      <section className="metrics-grid">
        {metrics.map((metric) => (
          <StatCard key={metric.id} label={metric.label} value={metric.value} delta={metric.delta} tone={metric.tone} />
        ))}
      </section>

      <section className="table-card">
        <p className="kicker">Concentration view</p>
        <h2 className="section-title">Segment exposure</h2>
        <div className="table-shell">
          <table className="table">
            <thead>
              <tr>
                <th>Segment</th>
                <th>Exposure</th>
                <th>Loss ratio</th>
                <th>Trend</th>
              </tr>
            </thead>
            <tbody>
              {concentrations.map((item) => (
                <tr key={item.segment}>
                  <td>{item.segment}</td>
                  <td>{item.exposure}%</td>
                  <td>{item.lossRatio}%</td>
                  <td>{item.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-card">
        <p className="kicker">Geospatial risk analysis</p>
        <h2 className="section-title">State concentration heat map</h2>
        <div className="table-shell">
          <table className="table">
            <thead>
              <tr>
                <th>State</th>
                <th>Region</th>
                <th>Applications</th>
                <th>Avg derived risk</th>
                <th>Peak concentration</th>
                <th>Climate</th>
                <th>Labor</th>
                <th>Fraud</th>
              </tr>
            </thead>
            <tbody>
              {geospatialRows.map((row) => (
                <tr key={row.state}>
                  <td>{row.state}</td>
                  <td>{row.region}</td>
                  <td>{row.applications}</td>
                  <td>{row.averageRisk}%</td>
                  <td>{row.concentrationIndex}%</td>
                  <td>{row.climateVolatility}%</td>
                  <td>{row.laborStress}%</td>
                  <td>{row.fraudPressure}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="table-card">
        <p className="kicker">Portfolio projection</p>
        <h2 className="section-title">Exposure and loss outlook</h2>
        <div className="table-shell">
          <table className="table">
            <thead>
              <tr>
                <th>Horizon</th>
                <th>Projected exposure</th>
                <th>Expected loss rate</th>
                <th>Approvals</th>
                <th>Manual review</th>
                <th>Declines</th>
              </tr>
            </thead>
            <tbody>
              {projections.map((row) => (
                <tr key={row.horizon}>
                  <td>{row.horizon}</td>
                  <td>{formatCurrency(row.projectedExposure)}</td>
                  <td>{row.expectedLossRate}%</td>
                  <td>{row.projectedApprovals}</td>
                  <td>{row.projectedManualReviews}</td>
                  <td>{row.projectedDeclines}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
