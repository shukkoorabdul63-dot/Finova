import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useCost } from "../context/CostContext";
import { getCostGroups, formatINR } from "../utils/finance";

const TYPE_COLORS = {
  fixed: { bg: "var(--accent-soft)", color: "var(--accent)", label: "Fixed" },
  variable: { bg: "var(--green-soft)", color: "var(--green)", label: "Variable" },
  semi: { bg: "rgba(249,115,22,0.12)", color: "#f97316", label: "Semi" },
};

export default function CostClassifier() {
  const { data } = useData();
  const { costMap, setClassification, bulkSet, setFixedPct, getClassification, reset } = useCost();

  const groups = useMemo(() => getCostGroups(data), [data]);
  const totalCost = groups.reduce((s, g) => s + g.total, 0);

  const summary = useMemo(() => {
    let fixed = 0, variable = 0, semi = 0, unclassified = 0;
    groups.forEach(g => {
      const c = getClassification(g.group);
      if (!costMap[g.group]) { unclassified += g.total; return; }
      if (c.type === "fixed") fixed += g.total;
      else if (c.type === "variable") variable += g.total;
      else if (c.type === "semi") semi += g.total;
    });
    return { fixed, variable, semi, unclassified };
  }, [groups, costMap]);

  if (data.length === 0) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">⚙</div>
        <h2>No data loaded</h2>
        <p>Import your data first to classify costs.</p>
      </div>
    </div>
  );

  if (groups.length === 0) return (
    <div className="page">
      <div className="empty-state">
        <div className="empty-icon">⚙</div>
        <h2>No expense groups found</h2>
        <p>Make sure your MAIN HEAD column has "Indirect Expense" or "Direct Expense" values.</p>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Cost Classifier</h1>
        <span className="row-count">{groups.length} expense groups</span>
      </div>

      {/* Summary */}
      <div className="kpi-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
        <div className="kpi-card purple">
          <div className="kpi-title">Fixed Costs</div>
          <div className="kpi-value">{formatINR(summary.fixed, true)}</div>
          <div className="kpi-sub">{totalCost ? ((summary.fixed / totalCost) * 100).toFixed(1) : 0}% of total</div>
        </div>
        <div className="kpi-card green">
          <div className="kpi-title">Variable Costs</div>
          <div className="kpi-value">{formatINR(summary.variable, true)}</div>
          <div className="kpi-sub">{totalCost ? ((summary.variable / totalCost) * 100).toFixed(1) : 0}% of total</div>
        </div>
        <div className="kpi-card" style={{ borderColor: "rgba(249,115,22,0.3)" }}>
          <div className="kpi-title">Semi-Variable</div>
          <div className="kpi-value">{formatINR(summary.semi, true)}</div>
          <div className="kpi-sub">{totalCost ? ((summary.semi / totalCost) * 100).toFixed(1) : 0}% of total</div>
        </div>
        <div className="kpi-card">
          <div className="kpi-title">Unclassified</div>
          <div className="kpi-value" style={{ color: summary.unclassified > 0 ? "var(--red)" : "var(--green)" }}>
            {formatINR(summary.unclassified, true)}
          </div>
          <div className="kpi-sub">{groups.filter(g => !costMap[g.group]).length} groups</div>
        </div>
      </div>

      {/* Quick assign buttons */}
      <div className="card" style={{ marginBottom: "1rem" }}>
        <div className="card-title" style={{ marginBottom: "0.75rem" }}>Quick Assign All</div>
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
          <button className="quick-btn fixed" onClick={() => bulkSet(groups.map(g => g.group), "fixed")}>Mark All Fixed</button>
          <button className="quick-btn variable" onClick={() => bulkSet(groups.map(g => g.group), "variable")}>Mark All Variable</button>
          <button className="quick-btn reset" onClick={reset}>Reset All</button>
        </div>
      </div>

      {/* Group table */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title">Classify Each Cost Group</div>
          <div className="card-sub">Tag each group — used in Break Even & Projection calculations</div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>GROUP</th>
                <th>TOTAL AMOUNT</th>
                <th>% OF COSTS</th>
                <th>CLASSIFICATION</th>
                <th>FIXED %</th>
                <th>VARIABLE %</th>
              </tr>
            </thead>
            <tbody>
              {groups.sort((a, b) => b.total - a.total).map(g => {
                const c = getClassification(g.group);
                const classified = !!costMap[g.group];
                return (
                  <tr key={g.group}>
                    <td>
                      <div style={{ fontWeight: 500 }}>{g.group}</div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{g.heads.slice(0, 2).join(", ")}{g.heads.length > 2 ? ` +${g.heads.length - 2} more` : ""}</div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{formatINR(g.total, true)}</td>
                    <td>{totalCost ? ((g.total / totalCost) * 100).toFixed(1) : 0}%</td>
                    <td>
                      <div style={{ display: "flex", gap: "0.35rem" }}>
                        {["fixed", "variable", "semi"].map(type => (
                          <button
                            key={type}
                            onClick={() => setClassification(g.group, type, c.fixedPct)}
                            style={{
                              padding: "3px 10px", borderRadius: 5, fontSize: 11, fontWeight: 600, cursor: "pointer", border: "1px solid",
                              background: classified && c.type === type ? TYPE_COLORS[type].bg : "transparent",
                              color: classified && c.type === type ? TYPE_COLORS[type].color : "var(--text-muted)",
                              borderColor: classified && c.type === type ? TYPE_COLORS[type].color : "var(--border)",
                            }}
                          >
                            {TYPE_COLORS[type].label}
                          </button>
                        ))}
                      </div>
                    </td>
                    <td>
                      {c.type === "semi" ? (
                        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                          <input
                            type="range" min={0} max={100} value={c.fixedPct}
                            onChange={e => setFixedPct(g.group, parseInt(e.target.value))}
                            style={{ width: 80 }}
                          />
                          <span style={{ fontSize: 12, color: "var(--accent)", minWidth: 28 }}>{c.fixedPct}%</span>
                        </div>
                      ) : c.type === "fixed" ? <span style={{ color: "var(--accent)", fontSize: 12 }}>100%</span>
                        : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>0%</span>}
                    </td>
                    <td>
                      {c.type === "semi" ? <span style={{ color: "var(--green)", fontSize: 12 }}>{100 - c.fixedPct}%</span>
                        : c.type === "variable" ? <span style={{ color: "var(--green)", fontSize: 12 }}>100%</span>
                          : <span style={{ color: "var(--text-muted)", fontSize: 12 }}>0%</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
