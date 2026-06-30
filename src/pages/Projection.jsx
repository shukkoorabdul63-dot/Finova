import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { useCost } from "../context/CostContext";
import { calcKPIs, classifyCosts, calcProjection, formatINR, groupBy } from "../utils/finance";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";

export default function Projection() {
  const { data } = useData();
  const { costMap } = useCost();
  const [targetInput, setTargetInput] = useState("");
  const [scope, setScope] = useState("company");

  const branches = useMemo(() => ["company", ...new Set(data.map(r => r.BRANCH).filter(Boolean))], [data]);
  const scopedData = useMemo(() => scope === "company" ? data : data.filter(r => r.BRANCH === scope), [data, scope]);

  const kpi = useMemo(() => calcKPIs(scopedData), [scopedData]);
  const costs = useMemo(() => classifyCosts(scopedData, costMap), [scopedData, costMap]);

  const targetProfit = parseFloat(targetInput.replace(/[₹,]/g, "")) || 0;
  const projection = useMemo(() => {
    if (targetProfit === 0 || kpi.grossRevenue === 0) return null;
    return calcProjection(kpi, costs.fixed, costs.variable, targetProfit);
  }, [targetProfit, kpi, costs]);

  const noClassification = Object.keys(costMap).length === 0;

  // Branch projections at current cost structure
  const branchProjections = useMemo(() => {
    if (!targetProfit || scope !== "company") return [];
    const branchList = [...new Set(data.map(r => r.BRANCH).filter(Boolean))];
    return branchList.map(branch => {
      const bRows = data.filter(r => r.BRANCH === branch);
      const bKpi = calcKPIs(bRows);
      const bCosts = classifyCosts(bRows, costMap);
      const bProj = bKpi.grossRevenue > 0 ? calcProjection(bKpi, bCosts.fixed, bCosts.variable, targetProfit / branchList.length) : null;
      return { branch, kpi: bKpi, costs: bCosts, proj: bProj };
    });
  }, [data, costMap, targetProfit, scope]);

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">🎯</div><h2>No data loaded</h2><p>Import your data to run projections.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Profit Projection</h1>
        <select className="filter-select" value={scope} onChange={e => setScope(e.target.value)}>
          {branches.map(b => <option key={b} value={b}>{b === "company" ? "Whole Company" : b}</option>)}
        </select>
      </div>

      {noClassification && (
        <div className="alert-banner">
          ⚠ No costs classified. Visit <strong>Cost Classifier</strong> to tag Fixed/Variable costs for accurate projections.
        </div>
      )}

      {/* Current State */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", marginBottom: "1rem" }}>
        <div className="kpi-card purple"><div className="kpi-title">Current Revenue</div><div className="kpi-value">{formatINR(kpi.grossRevenue, true)}</div></div>
        <div className={`kpi-card ${kpi.netProfit >= 0 ? "green" : "red"}`}><div className="kpi-title">Current Net Profit</div><div className={`kpi-value ${kpi.netProfit >= 0 ? "pos" : "neg"}`}>{formatINR(kpi.netProfit, true)}</div></div>
        <div className="kpi-card"><div className="kpi-title">Fixed Costs</div><div className="kpi-value">{formatINR(costs.fixed, true)}</div></div>
        <div className="kpi-card"><div className="kpi-title">Variable Costs</div><div className="kpi-value">{formatINR(costs.variable, true)}</div></div>
        <div className="kpi-card"><div className="kpi-title">Net Margin</div><div className="kpi-value">{kpi.netMargin.toFixed(1)}%</div></div>
      </div>

      {/* Target Input */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: "1rem" }}>Set Target Profit</div>
        <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative" }}>
            <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)", fontSize: 14 }}>₹</span>
            <input
              type="number"
              className="search-input"
              style={{ paddingLeft: "1.75rem", width: 220, fontSize: 15, fontWeight: 600 }}
              placeholder="Enter target profit..."
              value={targetInput}
              onChange={e => setTargetInput(e.target.value)}
            />
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {[10, 20, 50].map(pct => (
              <button key={pct} className="quick-btn variable" style={{ fontSize: 12 }}
                onClick={() => setTargetInput(Math.round(kpi.netProfit * (1 + pct / 100)).toString())}>
                +{pct}% ({formatINR(kpi.netProfit * (1 + pct / 100), true)})
              </button>
            ))}
            <button className="quick-btn fixed" style={{ fontSize: 12 }}
              onClick={() => setTargetInput(Math.round(kpi.grossRevenue * 0.1).toString())}>
              10% of Revenue
            </button>
          </div>
        </div>
      </div>

      {/* Scenarios */}
      {projection && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
            {/* Scenario 1: Revenue Only */}
            <div className="card scenario-card" style={{ borderTop: "3px solid var(--accent)" }}>
              <div className="scenario-label" style={{ color: "var(--accent)" }}>Scenario A — Grow Revenue</div>
              <div className="scenario-desc">Increase revenue, keep costs the same</div>
              <div className="scenario-kpis">
                <div><span>Revenue needed</span><strong className="pos">{formatINR(projection.scenarios.revenueOnly.revenueNeeded, true)}</strong></div>
                <div><span>Increase required</span><strong>{formatINR(projection.scenarios.revenueOnly.revenueIncrease, true)}</strong></div>
                <div><span>Growth %</span><strong className={projection.scenarios.revenueOnly.revenueIncreasePct >= 0 ? "pos" : "neg"}>{projection.scenarios.revenueOnly.revenueIncreasePct.toFixed(1)}%</strong></div>
                <div><span>Cost cuts needed</span><strong style={{ color: "var(--text-muted)" }}>None</strong></div>
              </div>
              <div className="scenario-verdict">
                {projection.scenarios.revenueOnly.revenueIncreasePct < 15
                  ? "✓ Achievable with moderate growth"
                  : projection.scenarios.revenueOnly.revenueIncreasePct < 40
                    ? "⚠ Requires significant effort"
                    : "✗ Very aggressive — consider mixed approach"}
              </div>
            </div>

            {/* Scenario 2: Cost Cut Only */}
            <div className="card scenario-card" style={{ borderTop: "3px solid var(--green)" }}>
              <div className="scenario-label" style={{ color: "var(--green)" }}>Scenario B — Cut Costs</div>
              <div className="scenario-desc">Reduce costs, keep revenue the same</div>
              <div className="scenario-kpis">
                <div><span>Revenue stays at</span><strong>{formatINR(kpi.grossRevenue, true)}</strong></div>
                <div><span>Cost cut needed</span><strong className="neg">{formatINR(projection.scenarios.costOnly.costCutNeeded, true)}</strong></div>
                <div><span>Cut %</span><strong className="neg">{projection.scenarios.costOnly.costCutPct.toFixed(1)}%</strong></div>
                <div><span>Revenue change</span><strong style={{ color: "var(--text-muted)" }}>None</strong></div>
              </div>
              <div className="scenario-verdict">
                {projection.scenarios.costOnly.costCutPct < 10
                  ? "✓ Achievable with tight cost control"
                  : projection.scenarios.costOnly.costCutPct < 25
                    ? "⚠ Requires significant restructuring"
                    : "✗ Not realistic — revenue growth needed too"}
              </div>
            </div>

            {/* Scenario 3: Mixed */}
            <div className="card scenario-card" style={{ borderTop: "3px solid #f97316" }}>
              <div className="scenario-label" style={{ color: "#f97316" }}>Scenario C — Mixed Approach</div>
              <div className="scenario-desc">50% revenue growth + 50% cost reduction</div>
              <div className="scenario-kpis">
                <div><span>Revenue needed</span><strong>{formatINR(projection.scenarios.mixed.revenueNeeded, true)}</strong></div>
                <div><span>Revenue increase</span><strong className="pos">{formatINR(projection.scenarios.mixed.revenueIncrease, true)}</strong></div>
                <div><span>Cost cut needed</span><strong className="neg">{formatINR(projection.scenarios.mixed.costCutNeeded, true)}</strong></div>
                <div><span>Expected profit</span><strong className={projection.scenarios.mixed.mixedProfit >= targetProfit ? "pos" : "neg"}>{formatINR(projection.scenarios.mixed.mixedProfit, true)}</strong></div>
              </div>
              <div className="scenario-verdict">⭐ Recommended — balanced and sustainable</div>
            </div>
          </div>

          {/* Profit Curve Chart */}
          <div className="card">
            <div className="card-title">Profit Curve</div>
            <div className="card-sub" style={{ marginBottom: "1rem" }}>How profit changes with revenue at current cost structure</div>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={projection.profitCurve} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="label" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} interval={2} />
                <YAxis tickFormatter={v => formatINR(v, true)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
                <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
                <ReferenceLine y={targetProfit} stroke="#f97316" strokeDasharray="4 4"
                  label={{ value: `Target: ${formatINR(targetProfit, true)}`, fill: "#f97316", fontSize: 10, position: "insideTopRight" }} />
                <Line type="monotone" dataKey="profit" stroke="#22d3a5" strokeWidth={2.5} dot={false} name="Projected Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Branch Projections */}
          {branchProjections.length > 0 && (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
                <div className="card-title">Branch-wise Projection</div>
                <div className="card-sub">Target split equally across branches</div>
              </div>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr><th>BRANCH</th><th>CURRENT PROFIT</th><th>BRANCH TARGET</th><th>REV NEEDED (A)</th><th>COST CUT (B)</th><th>GAP</th></tr>
                  </thead>
                  <tbody>
                    {branchProjections.map(b => {
                      const branchTarget = targetProfit / branchProjections.length;
                      const gap = branchTarget - b.kpi.netProfit;
                      return (
                        <tr key={b.branch}>
                          <td style={{ fontWeight: 600, color: "var(--accent)" }}>{b.branch}</td>
                          <td className={b.kpi.netProfit >= 0 ? "pos" : "neg"}>{formatINR(b.kpi.netProfit, true)}</td>
                          <td style={{ color: "#f97316", fontWeight: 600 }}>{formatINR(branchTarget, true)}</td>
                          <td>{b.proj ? formatINR(b.proj.scenarios.revenueOnly.revenueNeeded, true) : "—"}</td>
                          <td className="neg">{b.proj ? formatINR(b.proj.scenarios.costOnly.costCutNeeded, true) : "—"}</td>
                          <td className={gap <= 0 ? "pos" : "neg"}>{formatINR(gap, true)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!projection && targetProfit === 0 && (
        <div className="empty-state" style={{ paddingTop: "2rem" }}>
          <div className="empty-icon">🎯</div>
          <h2>Enter a target profit above</h2>
          <p>Finova will calculate what revenue growth or cost cuts are needed — for the company and each branch.</p>
        </div>
      )}
    </div>
  );
}
