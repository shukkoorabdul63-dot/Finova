import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useCategory } from "../context/CategoryContext";
import { useFormat } from "../context/FormatContext";
import { groupBy, smartSum, sumCount, isDirectIncome, isDirectExpense } from "../utils/finance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

export default function ProductPnL() {
  const { data } = useData();
  const { linkMap, toggleLink, autoSuggest, reset } = useCategory();
  const { fmt } = useFormat();

  const salesGroups = useMemo(() => {
    const rows = data.filter(r => isDirectIncome(r.MAIN_HEAD));
    return [...new Set(rows.map(r => r.GROUP).filter(Boolean))].sort();
  }, [data]);

  const cogsGroups = useMemo(() => {
    const rows = data.filter(r => isDirectExpense(r.MAIN_HEAD));
    return [...new Set(rows.map(r => r.GROUP).filter(Boolean))].sort();
  }, [data]);

  const salesGroupData = useMemo(() => groupBy(data.filter(r => isDirectIncome(r.MAIN_HEAD)), "GROUP"), [data]);
  const cogsGroupData = useMemo(() => groupBy(data.filter(r => isDirectExpense(r.MAIN_HEAD)), "GROUP"), [data]);

  const categoryResults = useMemo(() => {
    return salesGroups.map(sg => {
      const salesRows = salesGroupData[sg] || [];
      const linkedCogs = linkMap[sg] || [];
      const cogsRows = linkedCogs.flatMap(cg => cogsGroupData[cg] || []);
      const sales = smartSum(salesRows);
      const cogs = smartSum(cogsRows);
      const gp = sales - cogs;
      const gpPct = sales ? (gp / sales) * 100 : 0;
      const count = sumCount(salesRows);
      return { group: sg, sales, cogs, gp, gpPct, count, linkedCogs };
    });
  }, [salesGroups, salesGroupData, cogsGroupData, linkMap]);

  const unlinkedCount = categoryResults.filter(c => c.linkedCogs.length === 0).length;

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">🔗</div><h2>No data loaded</h2><p>Import your data first.</p></div></div>
  );

  if (salesGroups.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">🔗</div><h2>No Sales groups found</h2><p>Make sure your MAIN HEAD column has Direct Income rows.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Product P&L</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {unlinkedCount > 0 && <span className="row-count" style={{ color: "var(--orange)" }}>{unlinkedCount} unlinked</span>}
          <button className="quick-btn variable" onClick={() => autoSuggest(salesGroups, cogsGroups)}>✨ Auto-suggest links</button>
          <button className="quick-btn reset" onClick={reset}>Reset</button>
        </div>
      </div>

      <div className="alert-banner" style={{ background: "rgba(124,106,247,0.08)", borderColor: "rgba(124,106,247,0.3)", color: "var(--accent)" }}>
        Link each Sales group to its matching COGS group(s) — this connection is manual and yours to define, since group names may change over time. Gross Profit per product is calculated only from groups you link below.
      </div>

      {/* Linking UI */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title">Link Sales Groups → COGS Groups</div>
          <div className="card-sub">Tick every COGS group that belongs to each Sales group's cost</div>
        </div>
        <div className="link-table-wrap">
          {salesGroups.map(sg => (
            <div key={sg} className="link-row">
              <div className="link-sales-name">{sg}</div>
              <div className="link-cogs-picks">
                {cogsGroups.length === 0 && <span style={{ fontSize: 12, color: "var(--text-muted)" }}>No COGS groups found in data</span>}
                {cogsGroups.map(cg => (
                  <label key={cg} className={`link-chip ${(linkMap[sg] || []).includes(cg) ? "active" : ""}`}>
                    <input type="checkbox" checked={(linkMap[sg] || []).includes(cg)} onChange={() => toggleLink(sg, cg)} />
                    {cg}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="card">
        <div className="card-title">Gross Profit by Product / Sales Group</div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={categoryResults} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
            <XAxis dataKey="group" tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
            <YAxis tickFormatter={v => fmt(v)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip formatter={v => fmt(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            <Bar dataKey="gp" radius={[4, 4, 0, 0]} name="Gross Profit">
              {categoryResults.map((c, i) => <Cell key={i} fill={c.gp >= 0 ? "#22d3a5" : "#ef4444"} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title">Product-wise P&L</div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>SALES GROUP</th><th>LINKED COGS GROUPS</th><th>SALES</th><th>COGS</th><th>GROSS PROFIT</th><th>GP %</th><th>COUNT</th></tr>
            </thead>
            <tbody>
              {categoryResults.map(c => (
                <tr key={c.group}>
                  <td style={{ fontWeight: 600, color: "var(--accent)" }}>{c.group}</td>
                  <td style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {c.linkedCogs.length > 0 ? c.linkedCogs.join(", ") : <span style={{ color: "var(--orange)" }}>Not linked</span>}
                  </td>
                  <td className="pos">{fmt(c.sales)}</td>
                  <td className="neg">{fmt(c.cogs)}</td>
                  <td className={c.gp >= 0 ? "pos" : "neg"} style={{ fontWeight: 600 }}>{fmt(c.gp)}</td>
                  <td className={c.gpPct >= 0 ? "pos" : "neg"}>{c.gpPct.toFixed(1)}%</td>
                  <td>{c.count > 0 ? c.count.toLocaleString("en-IN") : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
