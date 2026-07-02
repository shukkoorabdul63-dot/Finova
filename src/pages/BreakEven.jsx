import { useMemo, useState, useEffect } from "react";
import { useData } from "../context/DataContext";
import { useCost } from "../context/CostContext";
import { calcKPIs, classifyCosts, calcBreakEven, formatINR, groupBy, sumAmount, sumCount, isIncome, isExpense } from "../utils/finance";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import { loadPersisted, savePersisted } from "../utils/persist";
import MultiSelectDropdown from "../components/MultiSelectDropdown";

const STORAGE_KEY = "finova_bep_revenue_groups";

export default function BreakEven() {
  const { data } = useData();
  const { costMap } = useCost();
  const [unit, setUnit] = useState("revenue");
  const [scope, setScope] = useState("company");
  const [showRevenuePanel, setShowRevenuePanel] = useState(false);
  const [revenueGroupSearch, setRevenueGroupSearch] = useState("");

  // All unique income groups across ALL main heads (Direct + Indirect)
  // grouped by their MAIN HEAD for clear display
  const allIncomeGroups = useMemo(() => {
    const rows = data.filter(r => isIncome(r.MAIN_HEAD));
    const byMainHead = groupBy(rows, "MAIN_HEAD");
    return Object.entries(byMainHead).map(([mainHead, mhRows]) => {
      const groups = [...new Set(mhRows.map(r => r.GROUP).filter(Boolean))].sort();
      return { mainHead, groups };
    });
  }, [data]);

  const allGroupNames = useMemo(() =>
    allIncomeGroups.flatMap(mh => mh.groups),
    [allIncomeGroups]);

  // Selected revenue groups — persisted
  // Default: all Direct Income groups selected (standard BEP)
  const defaultSelected = useMemo(() => {
    return data.filter(r => r.MAIN_HEAD && r.MAIN_HEAD.toLowerCase().startsWith("direct income"))
      .map(r => r.GROUP).filter(Boolean);
  }, [data]);

  const [selectedRevenueGroups, setSelectedRevenueGroups] = useState(() => {
    const saved = loadPersisted(STORAGE_KEY, null);
    return saved || [];
  });

  // Once data loads, if nothing was saved, pre-select all Direct Income groups
  useEffect(() => {
    const saved = loadPersisted(STORAGE_KEY, null);
    if (!saved && defaultSelected.length > 0) {
      setSelectedRevenueGroups([...new Set(defaultSelected)]);
    }
  }, [defaultSelected]);

  useEffect(() => { savePersisted(STORAGE_KEY, selectedRevenueGroups); }, [selectedRevenueGroups]);

  const branches = useMemo(() => ["company", ...new Set(data.map(r => r.BRANCH).filter(Boolean))], [data]);
  const scopedData = useMemo(() => scope === "company" ? data : data.filter(r => r.BRANCH === scope), [data, scope]);

  // Revenue = sum of selected income groups only
  const customRevenue = useMemo(() => {
    return sumAmount(scopedData.filter(r => selectedRevenueGroups.includes(r.GROUP) && isIncome(r.MAIN_HEAD)));
  }, [scopedData, selectedRevenueGroups]);

  const kpi = useMemo(() => calcKPIs(scopedData), [scopedData]);
  const costs = useMemo(() => classifyCosts(scopedData, costMap), [scopedData, costMap]);
  const bep = useMemo(() => calcBreakEven(customRevenue, costs.fixed, costs.variable), [customRevenue, costs]);

  const totalCount = useMemo(() => sumCount(scopedData.filter(r => selectedRevenueGroups.includes(r.GROUP))), [scopedData, selectedRevenueGroups]);
  const avgRevenuePerUnit = totalCount > 0 ? customRevenue / totalCount : 0;
  const bepUnits = avgRevenuePerUnit > 0 ? bep.bepRevenue / avgRevenuePerUnit : 0;

  const noClassification = Object.keys(costMap).length === 0;
  const noGroupsSelected = selectedRevenueGroups.length === 0;

  // Revenue breakdown by selected group (for display)
  const revenueBreakdown = useMemo(() => {
    return selectedRevenueGroups.map(g => ({
      group: g,
      amount: sumAmount(scopedData.filter(r => r.GROUP === g && isIncome(r.MAIN_HEAD))),
      mainHead: scopedData.find(r => r.GROUP === g)?.MAIN_HEAD || "",
    })).filter(g => g.amount !== 0).sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  }, [scopedData, selectedRevenueGroups]);

  // Chart
  const chartData = useMemo(() => {
    if (customRevenue === 0) return [];
    const maxRev = Math.max(bep.bepRevenue * 1.8, customRevenue * 1.3);
    return Array.from({ length: 21 }, (_, i) => {
      const rev = (maxRev / 20) * i;
      const varCost = customRevenue > 0 ? costs.variable * (rev / customRevenue) : 0;
      const profit = rev - varCost - costs.fixed;
      const units = avgRevenuePerUnit > 0 ? Math.round(rev / avgRevenuePerUnit) : 0;
      return {
        label: unit === "revenue" ? formatINR(rev, true) : units.toLocaleString("en-IN"),
        profit,
        revenue: rev,
        totalCost: varCost + costs.fixed,
      };
    });
  }, [bep, customRevenue, costs, unit, avgRevenuePerUnit]);

  // Per-branch BEP
  const branchBEP = useMemo(() => {
    return branches.filter(b => b !== "company").map(branch => {
      const bRows = scopedData.filter(r => r.BRANCH === branch);
      const bRev = sumAmount(bRows.filter(r => selectedRevenueGroups.includes(r.GROUP) && isIncome(r.MAIN_HEAD)));
      const bCosts = classifyCosts(bRows, costMap);
      const bBep = calcBreakEven(bRev, bCosts.fixed, bCosts.variable);
      return { branch, revenue: bRev, fixed: bCosts.fixed, variable: bCosts.variable, bep: bBep };
    });
  }, [branches, scopedData, selectedRevenueGroups, costMap]);

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">◎</div><h2>No data loaded</h2><p>Import your financial data first.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Break Even Analysis</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <select className="filter-select" value={scope} onChange={e => setScope(e.target.value)}>
            {branches.map(b => <option key={b} value={b}>{b === "company" ? "Whole Company" : b}</option>)}
          </select>
          <div className="toggle-group">
            <button className={unit === "revenue" ? "active" : ""} onClick={() => setUnit("revenue")}>₹ Revenue</button>
            <button className={unit === "units" ? "active" : ""} onClick={() => setUnit("units")}># Units</button>
          </div>
          <button className="quick-btn fixed" onClick={() => setShowRevenuePanel(s => !s)}>
            {showRevenuePanel ? "✕ Close" : `⚙ Revenue Groups (${selectedRevenueGroups.length})`}
          </button>
        </div>
      </div>

      {/* ── REVENUE GROUP SELECTOR ── */}
      {showRevenuePanel && (
        <div className="card" style={{ marginBottom: "0.75rem", padding: 0 }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <div className="card-title">Select Revenue Groups for BEP</div>
              <div className="card-sub">
                Pick exactly which income groups count as "Revenue" — e.g. include Labour, AMC, EW along with Vehicle/Spare Sales.
                Groups are shown under their MAIN HEAD for context.
              </div>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <button className="quick-btn variable" style={{ fontSize: 11 }} onClick={() => setSelectedRevenueGroups([...allGroupNames])}>Select All</button>
              <button className="quick-btn fixed" style={{ fontSize: 11 }} onClick={() => setSelectedRevenueGroups([...new Set(defaultSelected)])}>Direct Income Only</button>
              <button className="quick-btn reset" style={{ fontSize: 11 }} onClick={() => setSelectedRevenueGroups([])}>Clear</button>
            </div>
          </div>

          <div style={{ padding: "0.75rem 1.25rem" }}>
            <input className="search-input" style={{ width: "100%", marginBottom: "0.75rem" }}
              placeholder="Search groups..."
              value={revenueGroupSearch}
              onChange={e => setRevenueGroupSearch(e.target.value)} />

            {allIncomeGroups.map(({ mainHead, groups }) => {
              const filtered = revenueGroupSearch
                ? groups.filter(g => g.toLowerCase().includes(revenueGroupSearch.toLowerCase()))
                : groups;
              if (filtered.length === 0) return null;
              return (
                <div key={mainHead} style={{ marginBottom: "1rem" }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.4rem" }}>
                    {mainHead}
                  </div>
                  <div className="group-toggle-grid">
                    {filtered.map(g => {
                      const amt = sumAmount(scopedData.filter(r => r.GROUP === g && isIncome(r.MAIN_HEAD)));
                      const isSelected = selectedRevenueGroups.includes(g);
                      return (
                        <label key={g} className={`group-toggle-item ${isSelected ? "" : "excluded"}`}
                          style={{ justifyContent: "space-between" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <input type="checkbox" checked={isSelected}
                              onChange={() => setSelectedRevenueGroups(prev =>
                                prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]
                              )} />
                            <span>{g}</span>
                          </div>
                          <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>{formatINR(amt, true)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Selected groups revenue preview */}
          {revenueBreakdown.length > 0 && (
            <div style={{ padding: "0.75rem 1.25rem", borderTop: "1px solid var(--border)", background: "var(--surface)", borderRadius: "0 0 10px 10px" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.5rem" }}>
                Revenue Preview — Total: {formatINR(customRevenue, true)}
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {revenueBreakdown.map(g => (
                  <span key={g.group} style={{ fontSize: 11.5, background: "var(--card-bg)", border: "1px solid var(--border)", padding: "3px 9px", borderRadius: 20, color: "var(--text)" }}>
                    {g.group}: {formatINR(g.amount, true)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {noClassification && (
        <div className="alert-banner">
          ⚠ No costs classified yet. Go to <strong>Cost Classifier</strong> to tag Fixed / Variable / Semi costs for accurate BEP.
        </div>
      )}
      {noGroupsSelected && (
        <div className="alert-banner">
          ⚠ No revenue groups selected. Click <strong>"⚙ Revenue Groups"</strong> above to pick which income groups count as revenue for BEP.
        </div>
      )}

      {/* ── KPI CARDS ── */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))" }}>
        <div className="kpi-card purple">
          <div className="kpi-title">BEP Revenue</div>
          <div className="kpi-value">{formatINR(bep.bepRevenue, true)}</div>
          <div className="kpi-sub">Revenue needed to break even</div>
        </div>
        {unit === "units" && avgRevenuePerUnit > 0 && (
          <div className="kpi-card purple">
            <div className="kpi-title">BEP Units</div>
            <div className="kpi-value">{Math.ceil(bepUnits).toLocaleString("en-IN")}</div>
            <div className="kpi-sub">Units to break even</div>
          </div>
        )}
        <div className="kpi-card">
          <div className="kpi-title">Current Revenue</div>
          <div className="kpi-value">{formatINR(customRevenue, true)}</div>
          <div className="kpi-sub">{selectedRevenueGroups.length} groups included</div>
        </div>
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
          <div className={`kpi-value ${bep.marginOfSafety >= 0 ? "pos" : "neg"}`}>{bep.marginOfSafety.toFixed(1)}%</div>
          <div className="kpi-sub">
            {bep.marginOfSafety >= 0
              ? `${formatINR(customRevenue - bep.bepRevenue, true)} above BEP`
              : `${formatINR(bep.bepRevenue - customRevenue, true)} below BEP`}
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Variable Cost Ratio</div>
          <div className="kpi-value">{bep.variableCostRatio.toFixed(1)}%</div>
          <div className="kpi-sub">Of revenue</div>
        </div>
      </div>

      {/* ── BREAK EVEN CHART ── */}
      {chartData.length > 0 && (
        <div className="card">
          <div className="card-title">Break Even Chart</div>
          <div className="card-sub" style={{ marginBottom: "1rem" }}>
            BEP at {unit === "revenue" ? formatINR(bep.bepRevenue, true) : `${Math.ceil(bepUnits).toLocaleString("en-IN")} units`}
            {" — "}{selectedRevenueGroups.length} revenue groups included
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
              <Tooltip formatter={(v, n) => [formatINR(v), n]} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
              <ReferenceLine y={0} stroke="var(--border)" strokeDasharray="4 4" />
              <Area type="monotone" dataKey="profit" stroke="#22d3a5" strokeWidth={2} fill="url(#profitGrad)" name="Profit / Loss" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ── BRANCH BEP TABLE ── */}
      {scope === "company" && (
        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
            <div className="card-title">Break Even by Branch</div>
            <div className="card-sub">Using same {selectedRevenueGroups.length} revenue groups for all branches</div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BRANCH</th><th>REVENUE</th><th>FIXED</th><th>VARIABLE</th>
                  <th>BEP REVENUE</th><th>CM %</th><th>MARGIN OF SAFETY</th><th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {branchBEP.map(b => (
                  <tr key={b.branch}>
                    <td style={{ fontWeight: 600, color: "var(--accent)" }}>{b.branch}</td>
                    <td>{formatINR(b.revenue, true)}</td>
                    <td>{formatINR(b.fixed, true)}</td>
                    <td>{formatINR(b.variable, true)}</td>
                    <td style={{ fontWeight: 600 }}>{formatINR(b.bep.bepRevenue, true)}</td>
                    <td>{b.bep.contributionMarginRatio.toFixed(1)}%</td>
                    <td className={b.bep.marginOfSafety >= 0 ? "pos" : "neg"}>{b.bep.marginOfSafety.toFixed(1)}%</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 4,
                        background: b.bep.marginOfSafety >= 0 ? "var(--green-soft)" : "var(--red-soft)",
                        color: b.bep.marginOfSafety >= 0 ? "var(--green)" : "var(--red)"
                      }}>
                        {b.bep.marginOfSafety >= 0 ? "ABOVE BEP ✓" : "BELOW BEP ✗"}
                      </span>
                    </td>
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
