import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { calcKPIs, formatINR, formatPct, groupBy, smartSum, sumAmount, isDirectIncome, isDirectExpense, isIndirectIncome, isIndirectExpense, MONTH_ORDER } from "../utils/finance";

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

  const diGroupsA = useMemo(() => buildGroups(dataA, isDirectIncome), [dataA]);
  const diGroupsB = useMemo(() => buildGroups(dataB, isDirectIncome), [dataB]);
  const deGroupsA = useMemo(() => buildGroups(dataA, isDirectExpense), [dataA]);
  const deGroupsB = useMemo(() => buildGroups(dataB, isDirectExpense), [dataB]);
  const iiGroupsA = useMemo(() => buildGroups(dataA, isIndirectIncome), [dataA]);
  const iiGroupsB = useMemo(() => buildGroups(dataB, isIndirectIncome), [dataB]);
  const ieGroupsA = useMemo(() => buildGroups(dataA, isIndirectExpense), [dataA]);
  const ieGroupsB = useMemo(() => buildGroups(dataB, isIndirectExpense), [dataB]);

  // Merge group names across both years for comparison rows
  function mergeGroups(groupsA, groupsB) {
    const names = [...new Set([...groupsA.map(g => g.group), ...groupsB.map(g => g.group)])];
    return names.map(name => {
      const a = groupsA.find(g => g.group === name)?.total || 0;
      const b = groupsB.find(g => g.group === name)?.total || 0;
      return { group: name, a, b, growth: growthPct(b, a) };
    }).sort((x, y) => Math.abs(y.b) - Math.abs(x.b));
  }

  const diMerged = useMemo(() => mergeGroups(diGroupsA, diGroupsB), [diGroupsA, diGroupsB]);
  const deMerged = useMemo(() => mergeGroups(deGroupsA, deGroupsB), [deGroupsA, deGroupsB]);
  const iiMerged = useMemo(() => mergeGroups(iiGroupsA, iiGroupsB), [iiGroupsA, iiGroupsB]);
  const ieMerged = useMemo(() => mergeGroups(ieGroupsA, ieGroupsB), [ieGroupsA, ieGroupsB]);

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
          <td style={{ textAlign: "right" }} className={a >= 0 ? "pos" : "neg"}>{formatINR(a, true)}</td>
          <td style={{ textAlign: "right" }} className={b >= 0 ? "pos" : "neg"}>{formatINR(b, true)}</td>
          <td style={{ textAlign: "right" }}><GrowthBadge pct={growthPct(b, a)} /></td>
        </>
      )}
    </tr>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Year over Year</h1>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Compare</span>
          <select className="filter-select" value={yearA} onChange={e => setYearA(e.target.value)}>
            {fyList.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>vs</span>
          <select className="filter-select" value={yearB} onChange={e => setYearB(e.target.value)}>
            {fyList.map(fy => <option key={fy} value={fy}>{fy}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="fy-grid">
        <div className="fy-card" style={{ borderTop: "3px solid #7c6af7" }}>
          <div className="fy-label">{yearA}</div>
          <div className="fy-kpis">
            <div><span>Sales</span><strong>{formatINR(kpiA.grossRevenue, true)}</strong></div>
            <div><span>Gross Profit</span><strong className={kpiA.grossProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiA.grossProfit, true)}</strong></div>
            <div><span>Net Profit</span><strong className={kpiA.netProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiA.netProfit, true)}</strong></div>
            <div><span>Net Margin</span><strong className={kpiA.netMargin >= 0 ? "pos" : "neg"}>{kpiA.netMargin.toFixed(1)}%</strong></div>
          </div>
        </div>
        <div className="fy-card" style={{ borderTop: "3px solid #22d3a5" }}>
          <div className="fy-label">{yearB}</div>
          <div className="fy-kpis">
            <div><span>Sales</span><strong>{formatINR(kpiB.grossRevenue, true)}</strong></div>
            <div><span>Gross Profit</span><strong className={kpiB.grossProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiB.grossProfit, true)}</strong></div>
            <div><span>Net Profit</span><strong className={kpiB.netProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiB.netProfit, true)}</strong></div>
            <div><span>Net Margin</span><strong className={kpiB.netMargin >= 0 ? "pos" : "neg"}>{kpiB.netMargin.toFixed(1)}%</strong></div>
          </div>
          <div className={`fy-growth ${kpiB.netProfit >= kpiA.netProfit ? "pos" : "neg"}`}>
            Net Profit: <GrowthBadge pct={growthPct(kpiB.netProfit, kpiA.netProfit)} /> vs {yearA}
          </div>
        </div>
      </div>

      {/* Full Accounting P&L Comparison */}
      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid var(--border)" }}>
          <div className="card-title">P&L Comparison — {yearA} vs {yearB}</div>
          <div className="card-sub">Trading Account → Gross Profit → Indirect Income/Expense → Net Profit, with growth % per group</div>
        </div>
        <div className="table-wrap">
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
              <tr className="pnl-subsection-row"><td colSpan={4}>Sales / Direct Income</td></tr>
              {diMerged.map(g => <Row key={"di-"+g.group} label={g.group} a={g.a} b={g.b} />)}
              <Row label="Total Sales" a={kpiA.grossRevenue} b={kpiB.grossRevenue} bold />

              <tr className="pnl-subsection-row"><td colSpan={4}>Cost of Goods Sold</td></tr>
              {deMerged.map(g => <Row key={"de-"+g.group} label={g.group} a={g.a} b={g.b} />)}
              <Row label="Total COGS" a={kpiA.cogs} b={kpiB.cogs} bold />

              <tr className="pnl-gp-row">
                <td>GROSS PROFIT</td>
                <td style={{ textAlign: "right" }} className={kpiA.grossProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiA.grossProfit, true)}</td>
                <td style={{ textAlign: "right" }} className={kpiB.grossProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiB.grossProfit, true)}</td>
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
                <td style={{ textAlign: "right" }} className={kpiA.netProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiA.netProfit, true)}</td>
                <td style={{ textAlign: "right" }} className={kpiB.netProfit >= 0 ? "pos" : "neg"}>{formatINR(kpiB.netProfit, true)}</td>
                <td style={{ textAlign: "right" }}><GrowthBadge pct={growthPct(kpiB.netProfit, kpiA.netProfit)} /></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
