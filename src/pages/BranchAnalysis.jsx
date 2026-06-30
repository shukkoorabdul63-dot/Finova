import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { calcKPIs, formatINR, groupBy, sumAmount } from "../utils/finance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";

export default function BranchAnalysis() {
  const { data } = useData();

  const branches = useMemo(() => [...new Set(data.map(r => r.BRANCH).filter(Boolean))], [data]);
  const departments = useMemo(() => [...new Set(data.map(r => r.DEPARTMENT).filter(Boolean))], [data]);

  const branchData = useMemo(() => {
    return branches.map(branch => {
      const rows = data.filter(r => r.BRANCH === branch);
      const kpi = calcKPIs(rows);
      const deptBreakdown = departments.reduce((acc, dept) => {
        const dRows = rows.filter(r => r.DEPARTMENT === dept);
        acc[dept] = calcKPIs(dRows);
        return acc;
      }, {});
      return { branch, kpi, deptBreakdown, count: rows.length };
    }).sort((a, b) => b.kpi.netProfit - a.kpi.netProfit);
  }, [data, branches, departments]);

  const chartData = useMemo(() => branchData.map(b => ({
    branch: b.branch,
    Revenue: b.kpi.grossRevenue,
    "Net Profit": b.kpi.netProfit,
    Expenses: b.kpi.totalExpenses,
  })), [branchData]);

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">🏢</div><h2>No data loaded</h2><p>Import your data to view branch analysis.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header"><h1>Branch Analysis</h1></div>

      <div className="card">
        <div className="card-title">Revenue & Profit by Branch</div>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 20 }}>
            <XAxis dataKey="branch" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} angle={-30} textAnchor="end" />
            <YAxis tickFormatter={v => formatINR(v, true)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
            <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
            <Bar dataKey="Revenue" fill="#7c6af7" radius={[3,3,0,0]} />
            <Bar dataKey="Net Profit" fill="#22d3a5" radius={[3,3,0,0]} />
            <Bar dataKey="Expenses" fill="#ef4444" radius={[3,3,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Branch Cards */}
      <div className="branch-grid">
        {branchData.map(b => (
          <div key={b.branch} className="branch-card">
            <div className="branch-name">{b.branch}</div>
            <div className="branch-kpis">
              <div><span>Revenue</span><strong className="pos">{formatINR(b.kpi.grossRevenue, true)}</strong></div>
              <div><span>COGS</span><strong>{formatINR(b.kpi.cogs, true)}</strong></div>
              <div><span>Gross Profit</span><strong className={b.kpi.grossProfit >= 0 ? "pos" : "neg"}>{formatINR(b.kpi.grossProfit, true)}</strong></div>
              <div><span>Net Profit</span><strong className={b.kpi.netProfit >= 0 ? "pos" : "neg"}>{formatINR(b.kpi.netProfit, true)}</strong></div>
              <div><span>Net Margin</span><strong className={b.kpi.netMargin >= 0 ? "pos" : "neg"}>{b.kpi.netMargin.toFixed(1)}%</strong></div>
              <div><span>Count</span><strong>{b.kpi.totalCount.toLocaleString()}</strong></div>
            </div>
            {departments.length > 0 && (
              <div className="dept-breakdown">
                {departments.map(dept => {
                  const dk = b.deptBreakdown[dept];
                  if (!dk || dk.totalIncome === 0 && dk.totalExpenses === 0) return null;
                  return (
                    <div key={dept} className="dept-row">
                      <span className="dept-tag">{dept}</span>
                      <span className={dk.netProfit >= 0 ? "pos" : "neg"}>{formatINR(dk.netProfit, true)}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
