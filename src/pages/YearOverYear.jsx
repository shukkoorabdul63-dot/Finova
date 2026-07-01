import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { useFormat } from "../context/FormatContext";
import { useCategory } from "../context/CategoryContext";
import { calcKPIs, groupBy, smartSum, sumAmount, isDirectIncome, isDirectExpense, isIndirectIncome, isIndirectExpense } from "../utils/finance";

function buildGroups(data, predicate) {
  const rows = data.filter(r => predicate(r.MAIN_HEAD));
  const byGroup = groupBy(rows, "GROUP");
  return Object.entries(byGroup).map(([group, gRows]) => ({ group, total: smartSum(gRows) }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

function growthPct(curr, prev) {
  if (!prev) return curr > 0 ? Infinity : 0;
  return ((curr - prev) / Math.abs(prev)) * 100;
}

function GrowthBadge({ pct }) {
  if (!isFinite(pct)) return <span className="growth-badge pos">NEW</span>;
  const pos = pct >= 0;
  return <span className={`growth-badge ${pos ? "pos" : "neg"}`}>{pos ? "▲" : "▼"} {Math.abs(pct).toFixed(1)}%</span>;
}

export default function YearOverYear() {
  const { data } = useData();
  const { fmt } = useFormat();
  const { linkMap, toggleLink, autoSuggest, reset: resetLinks } = useCategory();
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const fyList = useMemo(() => [...new Set(data.map(r => r.FY).filter(Boolean))].sort(), [data]);

  const [yearA, setYearA] = useState("");
  const [yearB, setYearB] = useState("");

  useMemo(() => {
    if (fyList.length >= 2 && !yearA && !yearB) {
      setYearA(fyList[fyList.length - 2]);
      setYearB(fyList[fyList.length - 1]);
    } else if (fyList.length === 1 && !yearA) {
      setYearA(fyList[0]);
    }
  }, [fyList]);

  const dataA = useMemo(() => data.filter(r => r.FY === yearA), [data, yearA]);
  const dataB = useMemo(() => data.filter(r => r.FY === yearB), [data, yearB]);
  const kpiA = useMemo(() => calcKPIs(dataA), [dataA]);
  const kpiB = useMemo(() => calcKPIs(dataB), [dataB]);

  const diGroupsAll = useMemo(() => buildGroups(data, isDirectIncome), [data]);
  const deGroupsAll = useMemo(() => buildGroups(data, isDirectExpense), [data]);
  const diGroupsA = useMemo(() => buildGroups(dataA, isDirectIncome), [dataA]);
  const diGroupsB = useMemo(() => buildGroups(dataB, isDirectIncome), [dataB]);
  const deGroupsA = useMemo(() => buildGroups(dataA, isDirectExpense), [dataA]);
  const deGroupsB = useMemo(() => buildGroups(dataB, isDirectExpense), [dataB]);
  const iiGroupsA = useMemo(() => buildGroups(dataA, isIndirectIncome), [dataA]);
  const iiGroupsB = useMemo(() => buildGroups(dataB, isIndirectIncome), [dataB]);
  const ieGroupsA = useMemo(() => buildGroups(dataA, isIndirectExpense), [dataA]);
  const ieGroupsB = useMemo(() => buildGroups(dataB, isIndirectExpense), [dataB]);

  function mergeGroups(groupsA, groupsB) {
    const names = [...new Set([...groupsA.map(g => g.group), ...groupsB.map(g => g.group)])];
    return names.map(name => {
      const a = groupsA.find(g => g.group === name)?.total || 0;
      const b = groupsB.find(g => g.group === name)?.total || 0;
      return { group: name, a, b, growth: growthPct(b, a) };
    }).sort((x, y) => Math.abs(y.b) - Math.abs(x.b));
  }

  const iiMerged = useMemo(() => mergeGroups(iiGroupsA, iiGroupsB), [iiGroupsA, iiGroupsB]);
  const ieMerged = useMemo(() => mergeGroups(ieGroupsA, ieGroupsB), [ieGroupsA, ieGroupsB]);

  // Per-product Sales↔COGS comparison across the two years, using the shared linkMap
  const productComparison = useMemo(() => {
    return diGroupsAll.map(sg => {
      const linked = linkMap[sg.group] || [];
      const salesA = diGroupsA.find(g => g.group === sg.group)?.total || 0;
      const salesB = diGroupsB.find(g => g.group === sg.group)?.total || 0;
      const cogsA = sumAmount(dataA.filter(r => linked.includes(r.GROUP)));
      const cogsB = sumAmount(dataB.filter(r => linked.includes(r.GROUP)));
      const gpA = salesA - cogsA, gpB = salesB - cogsB;
      const gpPctA = salesA ? (gpA / salesA) * 100 : 0;
      const gpPctB = salesB ? (gpB / salesB) * 100 : 0;
      return { group: sg.group, linked, salesA, salesB, cogsA, cogsB, gpA, gpB, gpPctA, gpPctB, growth: growthPct(gpB, gpA) };
    });
  }, [diGroupsAll, diGroupsA, diGroupsB, dataA, dataB, linkMap]);

  const linkedCogsGroups = useMemo(() => new Set(Object.values(linkMap).flat()), [linkMap]);
  const unlinkedCogsAll = useMemo(() => deGroupsAll.filter(g => !linkedCogsGroups.has(g.group)), [deGroupsAll, linkedCogsGroups]);
  const unlinkedMerged = useMemo(() => mergeGroups(
    deGroupsA.filter(g => !linkedCogsGroups.has(g.group)),
    deGroupsB.filter(g => !linkedCogsGroups.has(g.group))
  ), [deGroupsA, deGroupsB, linkedCogsGroups]);

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">📅</div><h2>No data loaded</h2><p>Import data with FY column to compare years.</p></div></div>
  );
  if (fyList.length < 2) return (
    <div className="page">
      <div className="page-header"><h1>Year over Year</h1></div>
      <div className="empty-state"><div className="empty-icon">📅</div><h2>Only one FY found</h2><p>Upload data with multiple financial years to compare.</p></div>
    </div>
  );

  const Row = ({ label, a, b, bold, section }) => (
    <tr className={section ? "pnl-section-row" : bold ? "pnl-total-row" : "pnl-group-row"}>
      {section ? <td colSpan={4}>{label}</td> : (
        <>
          <td style={{ paddingLeft: bold ? 0 : "1.5rem" }}>{label}</td>
          <td style={{ textAlign: "right" }} className={a >= 0 ? "pos" : "neg"}>{fmt(a)}</td>
          <td style={{ textAlign: "right" }} className={b >= 0 ? "pos" : "neg"}>{fmt(b)}</td>
          <td style={{ textAlign: "right" }}><GrowthBadge pct={growthPct(b, a)} /></td>
        </>
      )}
    </tr>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Year over Year</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Compare</span>
          <select className="filter-select" value={yearA} onChange={e => setYearA(e.target.value)}>
            {fyList.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>vs</span>
          <select className="filter-select" value={yearB} onChange={e => setYearB(e.target.value)}>
            {fyList.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <button className="quick-btn fixed" onClick={() => setShowLinkPanel(s => !s)}>
            {showLinkPanel ? "✕ Close" : "🔗 Link Sales→COGS"}
          </button>
        </div>
      </div>

      {showLinkPanel && (
        <div className="card" style={{ marginBottom: "0.75rem", padding: 0 }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div className="card-title">Link each Sales group to its COGS group(s)</div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="quick-btn variable" style={{ fontSize: 11 }} onClick={() => autoSuggest(diGroupsAll.map(g => g.group), deGroupsAll.map(g => g.group))}>✨ Auto-suggest</button>
              <button className="quick-btn reset" style={{ fontSize: 11 }} onClick={resetLinks}>Reset</button>
            </div>
          </div>
          <div className="link-table-wrap">
            {diGroupsAll.map(sg => (
              <div key={sg.group} className="link-row">
                <div className="link-sales-name">{sg.group}</div>
                <div className="link-cogs-picks">
                  {deGroupsAll.map(cg => (
                    <label key={cg.group} className={`link-chip ${(linkMap[sg.group] || []).includes(cg.group) ? "active" : ""}`}>
                      <input type="checkbox" checked={(linkMap[sg.group] || []).includes(cg.group)} onChange={() => toggleLink(sg.group, cg.group)} />
                      {cg.group}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="fy-grid">
        <div className="fy-card" style={{ borderTop: "3px solid #7c6af7" }}>
          <div className="fy-label">{yearA}</div>
          <div className="fy-kpis">
            <div><span>Sales</span><strong>{fmt(kpiA.grossRevenue)}</strong></div>
            <div><span>Gross Profit</span><strong className={kpiA.grossProfit >= 0 ? "pos" : "neg"}>{fmt(kpiA.grossProfit)}</strong></div>
            <div><span>Net Profit</span><strong className={kpiA.netProfit >= 0 ? "pos" : "neg"}>{fmt(kpiA.netProfit)}</strong></div>
            <div><span>Net Margin</span><strong className={kpiA.netMargin >= 0 ? "pos" : "neg"}>{kpiA.netMargin.toFixed(1)}%</strong></div>
          </div>
        </div>
        <div className="fy-card" style={{ borderTop: "3px solid #22d3a5" }}>
          <div className="fy-label">{yearB}</div>
          <div className="fy-kpis">
            <div><span>Sales</span><strong>{fmt(kpiB.grossRevenue)}</strong></div>
            <div><span>Gross Profit</span><strong className={kpiB.grossProfit >= 0 ? "pos" : "neg"}>{fmt(kpiB.grossProfit)}</strong></div>
            <div><span>Net Profit</span><strong className={kpiB.netProfit >= 0 ? "pos" : "neg"}>{fmt(kpiB.netProfit)}</strong></div>
            <div><span>Net Margin</span><strong className={kpiB.netMargin >= 0 ? "pos" : "neg"}>{kpiB.netMargin.toFixed(1)}%</strong></div>
          </div>
          <div className={`fy-growth ${kpiB.netProfit >= kpiA.netProfit ? "pos" : "neg"}`}>
            Net Profit: <GrowthBadge pct={growthPct(kpiB.netProfit, kpiA.netProfit)} /> vs {yearA}
          </div>
        </div>
      </div>

      {/* Full P&L Comparison, organized by product using the same linking as Monthly P&L */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title">P&L Comparison — {yearA} vs {yearB}</div>
          <div className="card-sub">Trading Account (by product) → Gross Profit → Indirect Income/Expense → Net Profit, with growth %</div>
        </div>
        <div className="pnl-scroll-wrap">
          <table className="data-table pnl-table">
            <thead>
              <tr>
                <th style={{ width: "34%" }}>PARTICULARS</th>
                <th style={{ textAlign: "right" }}>{yearA}</th>
                <th style={{ textAlign: "right" }}>{yearB}</th>
                <th style={{ textAlign: "right" }}>GROWTH</th>
              </tr>
            </thead>
            <tbody>
              <Row label="TRADING ACCOUNT" section />

              {productComparison.map(p => (
                <>
                  <tr key={"sg-"+p.group} className="pnl-group-row">
                    <td style={{ paddingLeft: "1.5rem", fontWeight: 600 }}>{p.group}</td>
                    <td style={{ textAlign: "right" }} className="pos">{fmt(p.salesA)}</td>
                    <td style={{ textAlign: "right" }} className="pos">{fmt(p.salesB)}</td>
                    <td style={{ textAlign: "right" }}><GrowthBadge pct={growthPct(p.salesB, p.salesA)} /></td>
                  </tr>
                  {p.linked.length === 0 ? (
                    <tr className="pnl-margin-row"><td colSpan={4} style={{ paddingLeft: "2.25rem", color: "var(--orange)" }}>⚠ Not linked to any COGS group</td></tr>
                  ) : p.linked.map(cg => {
                    const cgTotalA = deGroupsA.find(d => d.group === cg)?.total || 0;
                    const cgTotalB = deGroupsB.find(d => d.group === cg)?.total || 0;
                    return (
                      <tr key={"lc-"+p.group+cg} className="pnl-group-row">
                        <td style={{ paddingLeft: "2.25rem", color: "var(--text-muted)" }}>− {cg}</td>
                        <td style={{ textAlign: "right" }} className="neg">{fmt(cgTotalA)}</td>
                        <td style={{ textAlign: "right" }} className="neg">{fmt(cgTotalB)}</td>
                        <td style={{ textAlign: "right" }}><GrowthBadge pct={growthPct(cgTotalB, cgTotalA)} /></td>
                      </tr>
                    );
                  })}
                  <tr className="pnl-gp-row">
                    <td style={{ paddingLeft: "1.5rem" }}>GP: {p.group} ({p.gpPctA.toFixed(1)}% → {p.gpPctB.toFixed(1)}%)</td>
                    <td style={{ textAlign: "right" }} className={p.gpA >= 0 ? "pos" : "neg"}>{fmt(p.gpA)}</td>
                    <td style={{ textAlign: "right" }} className={p.gpB >= 0 ? "pos" : "neg"}>{fmt(p.gpB)}</td>
                    <td style={{ textAlign: "right" }}><GrowthBadge pct={p.growth} /></td>
                  </tr>
                </>
              ))}

              {unlinkedCogsAll.length > 0 && <>
                <tr className="pnl-subsection-row"><td colSpan={4}>Other COGS (unlinked)</td></tr>
                {unlinkedMerged.map(g => <Row key={"uc-"+g.group} label={g.group} a={g.a} b={g.b} />)}
              </>}

              <Row label="Total Sales" a={kpiA.grossRevenue} b={kpiB.grossRevenue} bold />
              <Row label="Total COGS" a={kpiA.cogs} b={kpiB.cogs} bold />

              <tr className="pnl-gp-row">
                <td>GROSS PROFIT</td>
                <td style={{ textAlign: "right" }} className={kpiA.grossProfit >= 0 ? "pos" : "neg"}>{fmt(kpiA.grossProfit)}</td>
                <td style={{ textAlign: "right" }} className={kpiB.grossProfit >= 0 ? "pos" : "neg"}>{fmt(kpiB.grossProfit)}</td>
                <td style={{ textAlign: "right" }}><GrowthBadge pct={growthPct(kpiB.grossProfit, kpiA.grossProfit)} /></td>
              </tr>

              <Row label="INDIRECT INCOME" section />
              {iiMerged.map(g => <Row key={"ii-"+g.group} label={g.group} a={g.a} b={g.b} />)}
              <Row label="Total Indirect Income" a={kpiA.indirectIncome} b={kpiB.indirectIncome} bold />

              <Row label="INDIRECT EXPENSE" section />
              {ieMerged.map(g => <Row key={"ie-"+g.group} label={g.group} a={g.a} b={g.b} />)}
              <Row label="Total Indirect Expense" a={kpiA.indirectExpense} b={kpiB.indirectExpense} bold />

              <tr className="pnl-net-row">
                <td>NET PROFIT / LOSS</td>
                <td style={{ textAlign: "right" }} className={kpiA.netProfit >= 0 ? "pos" : "neg"}>{fmt(kpiA.netProfit)}</td>
                <td style={{ textAlign: "right" }} className={kpiB.netProfit >= 0 ? "pos" : "neg"}>{fmt(kpiB.netProfit)}</td>
                <td style={{ textAlign: "right" }}><GrowthBadge pct={growthPct(kpiB.netProfit, kpiA.netProfit)} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
