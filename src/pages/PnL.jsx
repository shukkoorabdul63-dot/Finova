import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { calcKPIs, formatINR, groupBy, sumAmount, smartSum, MONTH_ORDER, isDirectIncome, isDirectExpense, isIndirectIncome, isIndirectExpense, isOpeningStock, isClosingStock } from "../utils/finance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function sectionGroups(data, monthlyData, predicate) {
  const rows = data.filter(r => predicate(r.MAIN_HEAD));
  const byGroup = groupBy(rows, "GROUP");
  return Object.entries(byGroup).map(([group, gRows]) => ({
    group,
    total: smartSum(gRows),
    isStock: gRows.some(isOpeningStock) || gRows.some(isClosingStock),
    monthly: monthlyData.map(m => sumAmount(gRows.filter(r => r.MONTH === m.month))),
  })).sort((a, b) => Math.abs(b.total) - Math.abs(a.total));
}

export default function PnL() {
  const { data } = useData();

  const monthsPresent = useMemo(() => MONTH_ORDER.filter(m => data.some(r => r.MONTH === m)), [data]);
  const monthlyData = useMemo(() => monthsPresent.map(m => ({ month: m })), [monthsPresent]);

  const totals = useMemo(() => calcKPIs(data), [data]);

  const monthlyProfitTrend = useMemo(() => {
    return monthsPresent.map(m => {
      const rows = data.filter(r => r.MONTH === m);
      const k = calcKPIs(rows);
      return { month: m, netProfit: k.netProfit };
    });
  }, [data, monthsPresent]);

  const directIncomeGroups = useMemo(() => sectionGroups(data, monthlyData, isDirectIncome), [data, monthlyData]);
  const directExpenseGroups = useMemo(() => sectionGroups(data, monthlyData, isDirectExpense), [data, monthlyData]);
  const indirectIncomeGroups = useMemo(() => sectionGroups(data, monthlyData, isIndirectIncome), [data, monthlyData]);
  const indirectExpenseGroups = useMemo(() => sectionGroups(data, monthlyData, isIndirectExpense), [data, monthlyData]);

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">📊</div><h2>No data loaded</h2><p>Import your data to view the P&L statement.</p></div></div>
  );

  const monthCell = (group, monthIdx) => {
    const v = group.monthly[monthIdx];
    return <td key={monthIdx} style={{ textAlign: "right" }} className={v >= 0 ? "pos" : "neg"}>{v !== 0 ? formatINR(v, true) : "—"}</td>;
  };

  const sectionTotal = (groups) => groups.reduce((s, g) => s + g.total, 0);

  return (
    <div className="page">
      <div className="page-header"><h1>Monthly P&L</h1></div>

      <div className="card">
        <div className="card-title">Monthly Net Profit Overview</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={monthlyProfitTrend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <XAxis dataKey="month" tickFormatter={m => m.slice(0,3)} tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatINR(v, true)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
            <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            <Bar dataKey="netProfit" radius={[4,4,0,0]} name="Net Profit">
              {monthlyProfitTrend.map((entry, i) => (
                <Cell key={i} fill={entry.netProfit >= 0 ? "#22d3a5" : "#ef4444"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card" style={{padding:0}}>
        <div style={{padding:"1rem 1.25rem", borderBottom:"1px solid var(--border)"}}>
          <div className="card-title">Profit & Loss Statement</div>
          <div className="card-sub">Trading Account → Gross Profit → Indirect Income/Expense → Net Profit</div>
        </div>
        <div className="table-wrap">
          <table className="data-table pnl-table">
            <thead>
              <tr>
                <th style={{width:"30%"}}>PARTICULARS</th>
                {monthsPresent.map(m => <th key={m} style={{textAlign:"right"}}>{m.slice(0,3)}</th>)}
                <th style={{textAlign:"right", fontWeight:700}}>TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {/* ── TRADING ACCOUNT ── */}
              <tr className="pnl-section-row"><td colSpan={monthsPresent.length + 2}>TRADING ACCOUNT</td></tr>

              <tr className="pnl-subsection-row"><td colSpan={monthsPresent.length + 2}>Sales / Direct Income</td></tr>
              {directIncomeGroups.map(g => (
                <tr key={"di-"+g.group} className="pnl-group-row">
                  <td style={{paddingLeft:"1.5rem"}}>{g.group}{g.isStock ? <span className="stock-tag">opening only</span> : ""}</td>
                  {g.monthly.map((_, i) => monthCell(g, i))}
                  <td style={{textAlign:"right", fontWeight:600}} className={g.total >= 0 ? "pos" : "neg"}>{formatINR(g.total, true)}</td>
                </tr>
              ))}
              <tr className="pnl-total-row">
                <td>Total Sales</td>
                {monthsPresent.map(m => {
                  const v = sumAmount(data.filter(r => isDirectIncome(r.MAIN_HEAD) && r.MONTH === m));
                  return <td key={m} style={{textAlign:"right"}} className={v >= 0 ? "pos" : "neg"}>{formatINR(v, true)}</td>;
                })}
                <td style={{textAlign:"right"}} className="pos">{formatINR(totals.grossRevenue, true)}</td>
              </tr>

              <tr className="pnl-subsection-row"><td colSpan={monthsPresent.length + 2}>Cost of Goods Sold</td></tr>
              {directExpenseGroups.map(g => (
                <tr key={"de-"+g.group} className="pnl-group-row">
                  <td style={{paddingLeft:"1.5rem"}}>{g.group}{g.isStock ? <span className="stock-tag">{g.group.toLowerCase().includes("open") ? "opening only" : "closing only"}</span> : ""}</td>
                  {g.monthly.map((_, i) => monthCell(g, i))}
                  <td style={{textAlign:"right", fontWeight:600}} className={g.total >= 0 ? "pos" : "neg"}>{formatINR(g.total, true)}</td>
                </tr>
              ))}
              <tr className="pnl-total-row">
                <td>Total COGS</td>
                {monthsPresent.map(m => {
                  const v = sumAmount(data.filter(r => isDirectExpense(r.MAIN_HEAD) && r.MONTH === m));
                  return <td key={m} style={{textAlign:"right"}} className={v >= 0 ? "pos" : "neg"}>{formatINR(v, true)}</td>;
                })}
                <td style={{textAlign:"right"}} className="neg">{formatINR(totals.cogs, true)}</td>
              </tr>

              <tr className="pnl-gp-row">
                <td>GROSS PROFIT</td>
                {monthsPresent.map(m => {
                  const k = calcKPIs(data.filter(r => r.MONTH === m));
                  return <td key={m} style={{textAlign:"right"}} className={k.grossProfit >= 0 ? "pos" : "neg"}>{formatINR(k.grossProfit, true)}</td>;
                })}
                <td style={{textAlign:"right"}} className={totals.grossProfit >= 0 ? "pos" : "neg"}>{formatINR(totals.grossProfit, true)}</td>
              </tr>

              {/* ── INDIRECT INCOME ── */}
              <tr className="pnl-section-row"><td colSpan={monthsPresent.length + 2}>INDIRECT INCOME</td></tr>
              {indirectIncomeGroups.map(g => (
                <tr key={"ii-"+g.group} className="pnl-group-row">
                  <td style={{paddingLeft:"1.5rem"}}>{g.group}</td>
                  {g.monthly.map((_, i) => monthCell(g, i))}
                  <td style={{textAlign:"right", fontWeight:600}} className={g.total >= 0 ? "pos" : "neg"}>{formatINR(g.total, true)}</td>
                </tr>
              ))}
              <tr className="pnl-total-row">
                <td>Total Indirect Income</td>
                {monthsPresent.map(m => {
                  const v = sumAmount(data.filter(r => isIndirectIncome(r.MAIN_HEAD) && r.MONTH === m));
                  return <td key={m} style={{textAlign:"right"}} className="pos">{formatINR(v, true)}</td>;
                })}
                <td style={{textAlign:"right"}} className="pos">{formatINR(totals.indirectIncome, true)}</td>
              </tr>

              {/* ── INDIRECT EXPENSE ── */}
              <tr className="pnl-section-row"><td colSpan={monthsPresent.length + 2}>INDIRECT EXPENSE</td></tr>
              {indirectExpenseGroups.map(g => (
                <tr key={"ie-"+g.group} className="pnl-group-row">
                  <td style={{paddingLeft:"1.5rem"}}>{g.group}</td>
                  {g.monthly.map((_, i) => monthCell(g, i))}
                  <td style={{textAlign:"right", fontWeight:600}} className={g.total >= 0 ? "pos" : "neg"}>{formatINR(g.total, true)}</td>
                </tr>
              ))}
              <tr className="pnl-total-row">
                <td>Total Indirect Expense</td>
                {monthsPresent.map(m => {
                  const v = sumAmount(data.filter(r => isIndirectExpense(r.MAIN_HEAD) && r.MONTH === m));
                  return <td key={m} style={{textAlign:"right"}} className="neg">{formatINR(v, true)}</td>;
                })}
                <td style={{textAlign:"right"}} className="neg">{formatINR(totals.indirectExpense, true)}</td>
              </tr>

              <tr className="pnl-net-row">
                <td>NET PROFIT / LOSS</td>
                {monthsPresent.map(m => {
                  const k = calcKPIs(data.filter(r => r.MONTH === m));
                  return <td key={m} style={{textAlign:"right"}} className={k.netProfit >= 0 ? "pos" : "neg"}>{formatINR(k.netProfit, true)}</td>;
                })}
                <td style={{textAlign:"right"}} className={totals.netProfit >= 0 ? "pos" : "neg"}>{formatINR(totals.netProfit, true)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
