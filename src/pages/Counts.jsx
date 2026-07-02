import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { useFormat } from "../context/FormatContext";
import { useUnitProfile } from "../context/UnitProfileContext";
import { sumCount, sumAmount, MONTH_ORDER } from "../utils/finance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import LineItemModal from "../components/LineItemModal";

// ── Count-only formatter — NEVER pass this through the currency fmt() ──
const cnt = v => (v || 0).toLocaleString("en-IN");

export default function Counts() {
  const { data } = useData();
  const { fmt } = useFormat();
  const { profiles, addProfile, removeProfile, removeLineItem } = useUnitProfile();

  const [pivotField, setPivotField] = useState("GROUP"); // GROUP | DEPARTMENT
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileCountGroup, setNewProfileCountGroup] = useState("");
  const [modalState, setModalState] = useState(null); // { profileId, profileName, editingItem } | null

  const countRows = useMemo(() => data.filter(r => (parseFloat(r.COUNT) || 0) !== 0), [data]);

  const groups = useMemo(() => [...new Set(data.map(r => r.GROUP).filter(Boolean))].sort(), [data]);
  const groupsWithCount = useMemo(() => [...new Set(countRows.map(r => r.GROUP).filter(Boolean))].sort(), [countRows]);
  const branches = useMemo(() => [...new Set(data.map(r => r.BRANCH).filter(Boolean))].sort(), [data]);
  const departments = useMemo(() => [...new Set(data.map(r => r.DEPARTMENT).filter(Boolean))].sort(), [data]);
  const months = useMemo(() => MONTH_ORDER.filter(m => data.some(r => r.MONTH === m)), [data]);

  const totalCount = useMemo(() => sumCount(countRows), [countRows]);

  const monthlyCounts = useMemo(() => months.map(m => ({
    month: m.slice(0, 3),
    count: sumCount(countRows.filter(r => r.MONTH === m)),
  })), [countRows, months]);

  const pivotColumns = pivotField === "GROUP" ? groupsWithCount : departments;
  const pivotMatrix = useMemo(() => {
    return branches.map(b => {
      const row = { branch: b };
      let rowTotal = 0;
      pivotColumns.forEach(col => {
        const v = sumCount(countRows.filter(r => r.BRANCH === b && r[pivotField] === col));
        row[col] = v;
        rowTotal += v;
      });
      row._total = rowTotal;
      return row;
    });
  }, [branches, pivotColumns, countRows, pivotField]);

  const columnTotals = useMemo(() => {
    const totals = {};
    pivotColumns.forEach(col => { totals[col] = sumCount(countRows.filter(r => r[pivotField] === col)); });
    return totals;
  }, [pivotColumns, countRows, pivotField]);

  function computeLineItem(li) {
    const addAmt = sumAmount(data.filter(r => li.addGroups.includes(r.GROUP)));
    const subAmt = sumAmount(data.filter(r => li.subtractGroups.includes(r.GROUP)));
    return addAmt - subAmt;
  }
  function computeProfileCount(p) {
    return sumCount(data.filter(r => p.countGroups.includes(r.GROUP)));
  }
  function groupsSummary(li) {
    const parts = [];
    if (li.addGroups.length) parts.push(`+${li.addGroups.length}`);
    if (li.subtractGroups.length) parts.push(`−${li.subtractGroups.length}`);
    return parts.join(" ") + " groups";
  }

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">#</div><h2>No data loaded</h2><p>Import your data to view count analysis.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Counts</h1>
        <span className="row-count">{cnt(totalCount)} total count</span>
      </div>

      {countRows.length === 0 && (
        <div className="alert-banner">⚠ No rows in your data have a non-zero COUNT value. Add a COUNT column to your CSV to use this page.</div>
      )}

      {countRows.length > 0 && <>
        <div className="card">
          <div className="card-title">Monthly Count Trend</div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlyCounts} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={cnt} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={55} />
              <Tooltip formatter={v => cnt(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
              <Bar dataKey="count" fill="#7c6af7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card" style={{ padding: 0 }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <div className="card-title">Count by Branch × {pivotField === "GROUP" ? "Group" : "Department"}</div>
              <div className="card-sub">Sum of COUNT — never currency formatted</div>
            </div>
            <div className="toggle-group">
              <button className={pivotField === "GROUP" ? "active" : ""} onClick={() => setPivotField("GROUP")}>By Group</button>
              <button className={pivotField === "DEPARTMENT" ? "active" : ""} onClick={() => setPivotField("DEPARTMENT")}>By Dept</button>
            </div>
          </div>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>BRANCH</th>
                  {pivotColumns.map(col => <th key={col} style={{ textAlign: "right" }}>{col}</th>)}
                  <th style={{ textAlign: "right", fontWeight: 700 }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {pivotMatrix.map(row => (
                  <tr key={row.branch}>
                    <td style={{ fontWeight: 600, color: "var(--accent)" }}>{row.branch}</td>
                    {pivotColumns.map(col => <td key={col} style={{ textAlign: "right" }}>{row[col] > 0 ? cnt(row[col]) : "—"}</td>)}
                    <td style={{ textAlign: "right", fontWeight: 700 }}>{cnt(row._total)}</td>
                  </tr>
                ))}
                <tr className="pnl-total-row">
                  <td>TOTAL</td>
                  {pivotColumns.map(col => <td key={col} style={{ textAlign: "right" }}>{cnt(columnTotals[col])}</td>)}
                  <td style={{ textAlign: "right" }}>{cnt(totalCount)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="page-header" style={{ marginTop: "0.5rem" }}>
          <h2 style={{ fontSize: "1.1rem" }}>Per-Unit Profitability</h2>
        </div>
        <div className="alert-banner" style={{ background: "rgba(124,106,247,0.08)", borderColor: "rgba(124,106,247,0.3)", color: "var(--accent)" }}>
          Build a profile like "Profit / Vehicle" — pick which GROUP's count is the divisor, then add line items where each is Amount ÷ Count.
        </div>

        <div className="card">
          <div className="card-title" style={{ marginBottom: "0.75rem" }}>New Profile</div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
            <input className="search-input" style={{ width: 200 }} placeholder="Profile name e.g. Per Vehicle"
              value={newProfileName} onChange={e => setNewProfileName(e.target.value)} />
            <select className="filter-select" value={newProfileCountGroup} onChange={e => setNewProfileCountGroup(e.target.value)}>
              <option value="">Select count source group...</option>
              {groupsWithCount.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
            <button className="upload-btn" style={{ fontSize: 12, padding: "6px 14px" }}
              disabled={!newProfileName || !newProfileCountGroup}
              onClick={() => { addProfile(newProfileName, [newProfileCountGroup]); setNewProfileName(""); setNewProfileCountGroup(""); }}>
              + Create Profile
            </button>
          </div>
        </div>

        {/* Each profile: line items (left) side-by-side with calculated results (right) */}
        {profiles.map(p => {
          const profileCount = computeProfileCount(p);
          const results = p.lineItems.map(li => ({ ...li, perUnit: profileCount ? computeLineItem(li) / profileCount : 0 }));
          const totalPerUnit = results.reduce((s, r) => s + r.perUnit, 0);

          return (
            <div key={p.id} className="card unit-profile-card">
              <div className="unit-profile-header">
                <div>
                  <div className="card-title">{p.name}</div>
                  <div className="card-sub">Count source: {p.countGroups.join(", ")} • Count = {cnt(profileCount)}</div>
                </div>
                <button className="quick-btn reset" onClick={() => removeProfile(p.id)}>✕ Delete Profile</button>
              </div>

              <div className="unit-profile-layout">
                {/* LEFT: Line items management */}
                <div className="unit-lineitem-panel">
                  <div className="unit-panel-title">Line Items</div>
                  {p.lineItems.length === 0 && (
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: "0.5rem" }}>No line items yet — add your first below.</div>
                  )}
                  {p.lineItems.map(li => (
                    <div key={li.id} className="unit-item-row">
                      <div className="unit-item-info">
                        <div className="unit-item-label">{li.label}</div>
                        <div className="unit-item-groups-summary">{groupsSummary(li)}</div>
                      </div>
                      <div className="unit-item-actions">
                        <button title="Edit" onClick={() => setModalState({ profileId: p.id, profileName: p.name, editingItem: li })}>✎</button>
                        <button title="Delete" className="danger" onClick={() => removeLineItem(p.id, li.id)}>✕</button>
                      </div>
                    </div>
                  ))}
                  <button className="unit-add-btn" onClick={() => setModalState({ profileId: p.id, profileName: p.name, editingItem: null })}>
                    + Add Line Items
                  </button>
                </div>

                {/* RIGHT: Calculated results */}
                <div className="unit-results-panel">
                  <div className="unit-panel-title">Calculation</div>
                  {results.length === 0 ? (
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Results will appear here once you add line items.</div>
                  ) : (
                    <table className="data-table" style={{ width: "100%" }}>
                      <tbody>
                        <tr><td style={{ fontWeight: 700, color: "var(--accent)" }}>COUNT</td><td style={{ textAlign: "right", fontWeight: 700, color: "var(--accent)" }}>{cnt(profileCount)}</td></tr>
                        {results.map(r => (
                          <tr key={r.id}>
                            <td>{r.label}</td>
                            <td style={{ textAlign: "right" }} className={r.perUnit >= 0 ? "pos" : "neg"}>{fmt(r.perUnit)}</td>
                          </tr>
                        ))}
                        <tr className="pnl-total-row">
                          <td>TOTAL</td>
                          <td style={{ textAlign: "right" }} className={totalPerUnit >= 0 ? "pos" : "neg"}>{fmt(totalPerUnit)}</td>
                        </tr>
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </>}

      {modalState && (
        <LineItemModal
          profileId={modalState.profileId}
          profileName={modalState.profileName}
          editingItem={modalState.editingItem}
          groups={groups}
          onClose={() => setModalState(null)}
        />
      )}
    </div>
  );
}
