import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { useCost } from "../context/CostContext";
import { calcKPIs, classifyCosts, calcBreakEven, formatINR, groupBy, sumCount } from "../utils/finance";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart, Legend } from "recharts";

export default function BreakEven() {
  const { data } = useData();
  const { costMap } = useCost();
  const [unit, setUnit] = useState("revenue"); // "revenue" | "units"
  const [scope, setScope] = useState("company"); // "company" | branch name

  const branches = useMemo(() => ["company", ...new Set(data.map(r => r.BRANCH).filter(Boolean))], [data]);

  const scopedData = useMemo(() => scope === "company" ? data : data.filter(r => r.BRANCH === scope), [data, scope]);

  const kpi = useMemo(() => calcKPIs(scopedData), [scopedData]);
  const costs = useMemo(() => classifyCosts(scopedData, costMap), [scopedData, costMap]);
  const bep = useMemo(() => calcBreakEven(kpi.grossRevenue, costs.fixed, costs.variable), [kpi, costs]);

  const totalCount = useMemo(() => sumCount(scopedData), [scopedData]);
  const avgRevenuePerUnit = totalCount > 0 ? kpi.grossRevenue / totalCount : 0;
  const bepUnits = avgRevenuePerUnit > 0 ? bep.bepRevenue / avgRevenuePerUnit : 0;
  const currentUnits = totalCount;

  // Chart data - profit/loss at different revenue levels
  const chartData = useMemo(() => {
    if (kpi.grossRevenue === 0) return [];
    const maxRev = Math.max(bep.bepRevenue * 1.8, kpi.grossRevenue * 1.3);
    const steps = 20;
    return Array.from({ length: steps + 1 }, (_, i) => {
      const rev = (maxRev / steps) * i;
      const varCost = kpi.grossRevenue > 0 ? costs.variable * (rev / kpi.grossRevenue) : 0;
      const profit = rev - varCost - costs.fixed;
      const units = avgRevenuePerUnit > 0 ? rev / avgRevenuePerUnit : 0;
      return {
        revenue: rev,
        units: Math.round(units),
        profit,
        totalCost: varCost + costs.fixed,
        label: unit === "revenue" ? formatINR(rev, true) : Math.round(units).toLocaleString(),
      };
    });
  }, [bep, kpi, costs, unit, avgRevenuePerUnit]);

  const hasCostData = costs.fixed + costs.variable > 0;
  const noClassification = Object.keys(costMap).length === 0;

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">◎</div><h2>No data loaded</h2><p>Import your financial data first.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Break Even Analysis</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select className="filter-select" value={scope} onChange={e => setScope(e.target.value)}>
            {branches.map(b => <option key={b} value={b}>{b === "company" ? "Whole Company" : b}</option>)}
          </select>
          <div className="toggle-group">
            <button className={unit === "revenue" ? "active" : ""} onClick={() => setUnit("revenue")}>₹ Revenue</button>
            <button className={unit === "units" ? "active" : ""} onClick={() => setUnit("units")}># Units</button>
          </div>
        </div>
      </div>

      {noClassification && (
        <div className="alert-banner">
          ⚠ No costs classified yet. Go to <strong>Cost Classifier</strong> to tag Fixed / Variable / Semi costs for accurate BEP calculation.
        </div>
      )}

      {/* KPI Cards */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <div className="kpi-card purple">
          <div className="kpi-title">BEP Revenue</div>
          <div className="kpi-value">{formatINR(bep.bepRevenue, true)}</div>
          <div className="kpi-sub">Revenue needed to break even</div>
        </div>
        {unit === "units" && avgRevenuePerUnit > 0 && (
          <div className="kpi-card purple">
            <div className="kpi-title">BEP Units</div>
            <div className="kpi-value">{Math.ceil(bepUnits).toLocaleString()}</div>
            <div className="kpi-sub">Units needed to break even</div>
          </div>
        )}
        <div className="kpi-card">
          <div className="kpi-title">Fixed Costs</div>
          <div className="kpi-value">{formatINR(costs.fixed, true)}</div>
          <div className="kpi-sub">Does not change with output</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Variable Costs</div>
          <div className="kpi-value">{formatINR(costs.variable, true)}</div>
          <div className="kpi-sub">Changes with output</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-title">Contribution Margin</div>
          <div className="kpi-value">{bep.contributionMarginRatio.toFixed(1)}%</div>
          <div className="kpi-sub">{formatINR(bep.contributionMargin, true)} total</div>
        </div>
        <div className={`kpi-card ${bep.marginOfSafety >= 0 ? "green" : "red"}`}>
          <div className="kpi-title">Margin of Safety</div>
          <div className={`kpi-value ${bep.marginOfSafety >= 0 ? "pos" : "neg"}`}>
            {bep.marginOfSafety.toFixed(1)}%
          </div>
          <div className="kpi-sub">
            {bep.marginOfSafety >= 0
              ? `₹${formatINR(kpi.grossRevenue - bep.bepRevenue, true)} above BEP`
              : `₹${formatINR(bep.bepRevenue - kpi.grossRevenue, true)} below BEP`}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Current Revenue</div>
          <div className="kpi-value">{formatINR(kpi.grossRevenue, true)}</div>
          <div className="kpi-sub">{currentUnits > 0 ? `${currentUnits.toLocaleString()} units` : "No count data"}</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Variable Cost Ratio</div>
          <div className="kpi-value">{bep.variableCostRatio.toFixed(1)}%</div>
          <div className="kpi-sub">Of revenue</div>
        </div>
      </div>

      {/* BEP Chart */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-title">Break Even Chart</div>
          <div className="card-sub" style={{ marginBottom: "1rem" }}>
            BEP at {unit === "revenue" ? formatINR(bep.bepRevenue, true) : `${Math.ceil(bepUnits).toLocaleString()} units`}
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#22d3a5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#22d3a5" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={4} />
              <YAxis tickFormatter={v => formatINR(v, true)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
              <Tooltip
                formatter={(v, n) => [formatINR(v), n]}
                contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
              <ReferenceLine
                x={unit === "revenue" ? formatINR(bep.bepRevenue, true) : Math.ceil(bepUnits).toLocaleString()}
                stroke="var(--accent)" strokeDasharray="4 4"
                label={{ value: "BEP", fill: "var(--accent)", fontSize: 11 }}
              />
              <Area type="monotone" dataKey="profit" stroke="#22d3a5" strokeWidth={2} fill="url(#profitGrad)" name="Profit / Loss" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Branch BEP Table */}
      {scope === "company" && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title">Break Even by Branch</div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BRANCH</th><th>REVENUE</th><th>FIXED</th><th>VARIABLE</th><th>BEP REVENUE</th><th>CONTRIBUTION MRG</th><th>MARGIN OF SAFETY</th><th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {branches.filter(b => b !== "company").map(branch => {
                  const bRows = data.filter(r => r.BRANCH === branch);
                  const bKpi = calcKPIs(bRows);
                  const bCosts = classifyCosts(bRows, costMap);
                  const bBep = calcBreakEven(bKpi.grossRevenue, bCosts.fixed, bCosts.variable);
                  return (
                    <tr key={branch}>
                      <td style={{ fontWeight: 600, color: "var(--accent)" }}>{branch}</td>
                      <td>{formatINR(bKpi.grossRevenue, true)}</td>
                      <td>{formatINR(bCosts.fixed, true)}</td>
                      <td>{formatINR(bCosts.variable, true)}</td>
                      <td style={{ fontWeight: 600 }}>{formatINR(bBep.bepRevenue, true)}</td>
                      <td>{bBep.contributionMarginRatio.toFixed(1)}%</td>
                      <td className={bBep.marginOfSafety >= 0 ? "pos" : "neg"}>{bBep.marginOfSafety.toFixed(1)}%</td>
                      <td>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                          background: bBep.marginOfSafety >= 0 ? "var(--green-soft)" : "var(--red-soft)",
                          color: bBep.marginOfSafety >= 0 ? "var(--green)" : "var(--red)"
                        }}>
                          {bBep.marginOfSafety >= 0 ? "ABOVE BEP ✓" : "BELOW BEP ✗"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
