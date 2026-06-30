import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { calcKPIs, formatINR, groupBy, sumAmount, sumBudget, MONTH_ORDER } from "../utils/finance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

function VarianceBadge({ actual, budget }) {
  if (!budget) return <span style={{ color: "var(--text-muted)", fontSize: 11 }}>No budget</span>;
  const pct = ((actual - budget) / Math.abs(budget)) * 100;
  const pos = pct >= 0;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, padding: "2px 7px", borderRadius: 4,
      background: pos ? "var(--green-soft)" : "var(--red-soft)",
      color: pos ? "var(--green)" : "var(--red)"
    }}>
      {pos ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%
    </span>
  );
}

export default function BudgetVsActual() {
  const { data } = useData();

  const hasBudget = useMemo(() => data.some(r => r.BUDGET && parseFloat(r.BUDGET) !== 0), [data]);

  const kpi = useMemo(() => calcKPIs(data), [data]);

  const monthlyData = useMemo(() => {
    const byMonth = groupBy(data, "MONTH");
    return MONTH_ORDER.filter(m => byMonth[m]).map(m => {
      const rows = byMonth[m];
      const k = calcKPIs(rows);
      return {
        month: m.slice(0, 3),
        actualRevenue: k.grossRevenue,
        budgetRevenue: sumBudget(rows.filter(r => r.MAIN_HEAD?.toLowerCase().includes("income"))),
        actualProfit: k.netProfit,
        budgetProfit: k.budgetProfit,
      };
    });
  }, [data]);

  const groupData = useMemo(() => {
    const byGroup = groupBy(data, "GROUP");
    return Object.entries(byGroup).map(([group, rows]) => ({
      group,
      actual: sumAmount(rows),
      budget: sumBudget(rows),
      variance: sumAmount(rows) - sumBudget(rows),
    })).filter(g => g.budget !== 0).sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance));
  }, [data]);

  const branchData = useMemo(() => {
    const branches = [...new Set(data.map(r => r.BRANCH).filter(Boolean))];
    return branches.map(branch => {
      const rows = data.filter(r => r.BRANCH === branch);
      const k = calcKPIs(rows);
      return {
        branch,
        actualRevenue: k.grossRevenue,
        budgetRevenue: k.budgetRevenue,
        actualProfit: k.netProfit,
        budgetProfit: k.budgetProfit,
        revenueVariance: k.revenueVariance,
        profitVariance: k.profitVariance,
      };
    }).filter(b => b.budgetRevenue !== 0);
  }, [data]);

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">📋</div><h2>No data loaded</h2><p>Import your data to view budget analysis.</p></div></div>
  );

  if (!hasBudget) return (
    <div className="page">
      <div className="page-header"><h1>Budget vs Actual</h1></div>
      <div className="empty-state">
        <div className="empty-icon">📋</div>
        <h2>No budget data found</h2>
        <p>Add a <strong>BUDGET</strong> column to your CSV/Excel file with the budgeted amounts for each row. Then re-import the file.</p>
        <div style={{ marginTop: "1.5rem", background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 12, padding: "1rem", textAlign: "left", maxWidth: 480, margin: "1.5rem auto 0" }}>
          <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--accent)" }}>
            FY, MONTH, BRANCH, ..., AMOUNT, <strong>BUDGET</strong>, COUNT<br />
            2025-26, April, AMP, ..., 150000, <strong>140000</strong>, 5
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header"><h1>Budget vs Actual</h1></div>

      {/* Summary KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))" }}>
        <div className="kpi-card purple">
          <div className="kpi-title">Actual Revenue</div>
          <div className="kpi-value">{formatINR(kpi.grossRevenue, true)}</div>
          <div className="kpi-sub">Budget: {formatINR(kpi.budgetRevenue, true)}</div>
        </div>
        <div className={`kpi-card ${kpi.revenueVariance >= 0 ? "green" : "red"}`}>
          <div className="kpi-title">Revenue Variance</div>
          <div className={`kpi-value ${kpi.revenueVariance >= 0 ? "pos" : "neg"}`}>{formatINR(kpi.revenueVariance, true)}</div>
          <div className="kpi-sub">{kpi.budgetRevenue ? ((kpi.revenueVariance / kpi.budgetRevenue) * 100).toFixed(1) : 0}% vs budget</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Actual Net Profit</div>
          <div className="kpi-value">{formatINR(kpi.netProfit, true)}</div>
          <div className="kpi-sub">Budget: {formatINR(kpi.budgetProfit, true)}</div>
        </div>
        <div className={`kpi-card ${kpi.profitVariance >= 0 ? "green" : "red"}`}>
          <div className="kpi-title">Profit Variance</div>
          <div className={`kpi-value ${kpi.profitVariance >= 0 ? "pos" : "neg"}`}>{formatINR(kpi.profitVariance, true)}</div>
          <div className="kpi-sub">{kpi.budgetProfit ? ((kpi.profitVariance / Math.abs(kpi.budgetProfit)) * 100).toFixed(1) : 0}% vs budget</div>
        </div>
      </div>

      {/* Monthly Chart */}
      <div className="card">
        <div className="card-title">Monthly: Actual vs Budget Revenue</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={monthlyData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatINR(v, true)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
            <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
            <Bar dataKey="actualRevenue" name="Actual Revenue" fill="#7c6af7" radius={[3, 3, 0, 0]} />
            <Bar dataKey="budgetRevenue" name="Budget Revenue" fill="var(--border)" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Branch Variance Table */}
      {branchData.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title">Branch-wise Budget vs Actual</div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr><th>BRANCH</th><th>ACTUAL REV</th><th>BUDGET REV</th><th>REV VARIANCE</th><th>ACTUAL PROFIT</th><th>BUDGET PROFIT</th><th>PROFIT VARIANCE</th></tr>
              </thead>
              <tbody>
                {branchData.map(b => (
                  <tr key={b.branch}>
                    <td style={{ fontWeight: 600, color: "var(--accent)" }}>{b.branch}</td>
                    <td>{formatINR(b.actualRevenue, true)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{formatINR(b.budgetRevenue, true)}</td>
                    <td><span className={b.revenueVariance >= 0 ? "pos" : "neg"}>{formatINR(b.revenueVariance, true)}</span> <VarianceBadge actual={b.actualRevenue} budget={b.budgetRevenue} /></td>
                    <td className={b.actualProfit >= 0 ? "pos" : "neg"}>{formatINR(b.actualProfit, true)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{formatINR(b.budgetProfit, true)}</td>
                    <td><span className={b.profitVariance >= 0 ? "pos" : "neg"}>{formatINR(b.profitVariance, true)}</span> <VarianceBadge actual={b.actualProfit} budget={b.budgetProfit} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Group Variance Table */}
      {groupData.length > 0 && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title">Group-wise Variance (Top deviations)</div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead><tr><th>GROUP</th><th>ACTUAL</th><th>BUDGET</th><th>VARIANCE</th><th>%</th></tr></thead>
              <tbody>
                {groupData.slice(0, 15).map(g => (
                  <tr key={g.group}>
                    <td>{g.group}</td>
                    <td>{formatINR(g.actual, true)}</td>
                    <td style={{ color: "var(--text-muted)" }}>{formatINR(g.budget, true)}</td>
                    <td className={g.variance >= 0 ? "pos" : "neg"}>{formatINR(g.variance, true)}</td>
                    <td><VarianceBadge actual={g.actual} budget={g.budget} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
