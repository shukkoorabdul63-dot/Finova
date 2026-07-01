import { useMemo, useState, useRef } from "react";
import { useData } from "../context/DataContext";
import { useFormat } from "../context/FormatContext";
import { useCategory } from "../context/CategoryContext";
import { calcKPIs, groupBy, sumAmount, smartSum, MONTH_ORDER, isDirectIncome, isDirectExpense, isIndirectIncome, isIndirectExpense, isOpeningStock, isClosingStock } from "../utils/finance";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

function sectionRows(data, predicate) {
  const rows = data.filter(r => predicate(r.MAIN_HEAD));
  const byGroup = groupBy(rows, "GROUP");
  return Object.entries(byGroup).map(([group, gRows]) => ({
    group,
    total: smartSum(gRows),
    isOpening: gRows.some(isOpeningStock),
    isClosing: gRows.some(isClosingStock),
  })).sort((a,b) => Math.abs(b.total)-Math.abs(a.total));
}

export default function PnL() {
  const { data } = useData();
  const { fmt } = useFormat();
  const { linkMap, toggleLink, autoSuggest, reset: resetLinks } = useCategory();
  const [excludedGroups, setExcludedGroups] = useState([]);
  const [showGroupPanel, setShowGroupPanel] = useState(false);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const pageRef = useRef();

  const allGroups = useMemo(() => [...new Set(data.map(r => r.GROUP).filter(Boolean))].sort(), [data]);
  const months = useMemo(() => MONTH_ORDER.filter(m => data.some(r => r.MONTH === m)), [data]);

  const filtered = useMemo(() =>
    excludedGroups.length > 0 ? data.filter(r => !excludedGroups.includes(r.GROUP)) : data,
    [data, excludedGroups]);

  const kpi = useMemo(() => calcKPIs(filtered), [filtered]);

  const diGroups = useMemo(() => sectionRows(filtered, isDirectIncome), [filtered]);
  const deGroups = useMemo(() => sectionRows(filtered, isDirectExpense), [filtered]);
  const iiGroups = useMemo(() => sectionRows(filtered, isIndirectIncome), [filtered]);
  const ieGroups = useMemo(() => sectionRows(filtered, isIndirectExpense), [filtered]);

  const mainHeadLabels = useMemo(() => [...new Set(filtered.map(r => r.MAIN_HEAD).filter(Boolean))], [filtered]);
  const diLabel = mainHeadLabels.find(isDirectIncome) || "Direct Income";
  const deLabel = mainHeadLabels.find(isDirectExpense) || "Direct Expense";
  const iiLabel = mainHeadLabels.find(isIndirectIncome) || "Indirect Income";
  const ieLabel = mainHeadLabels.find(isIndirectExpense) || "Indirect Expense";

  // Which COGS groups are already linked to some Sales group (so we don't double-list them)
  const linkedCogsGroups = useMemo(() => new Set(Object.values(linkMap).flat()), [linkMap]);
  const unlinkedCogsGroups = useMemo(() => deGroups.filter(g => !linkedCogsGroups.has(g.group)), [deGroups, linkedCogsGroups]);

  const monthlyProfit = useMemo(() => months.map(m => {
    const rows = filtered.filter(r => r.MONTH === m);
    return { month: m.slice(0,3), netProfit: calcKPIs(rows).netProfit };
  }), [filtered, months]);

  function monthAmt(predicate, month) {
    return sumAmount(filtered.filter(r => predicate(r.MAIN_HEAD) && r.MONTH === month));
  }
  function groupMonthAmt(group, month) {
    return sumAmount(filtered.filter(r => r.GROUP === group && r.MONTH === month));
  }
  function linkedGroupsMonthAmt(groups, month) {
    return sumAmount(filtered.filter(r => groups.includes(r.GROUP) && r.MONTH === month));
  }

  function toggleFullscreen() {
    if (!document.fullscreenElement) { pageRef.current?.requestFullscreen?.(); setIsFullscreen(true); }
    else { document.exitFullscreen(); setIsFullscreen(false); }
  }
  function toggleGroup(g) { setExcludedGroups(prev => prev.includes(g) ? prev.filter(x=>x!==g) : [...prev, g]); }

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">📊</div><h2>No data loaded</h2><p>Import your data to view P&L.</p></div></div>
  );

  const SectionRow = ({label}) => <tr className="pnl-section-row"><td colSpan={months.length+2}>{label}</td></tr>;
  const SubRow = ({label}) => <tr className="pnl-subsection-row"><td colSpan={months.length+2}>{label}</td></tr>;

  return (
    <div className="page" ref={pageRef}>
      <div className="page-header">
        <h1>Monthly P&L</h1>
        <div style={{display:"flex",gap:"0.5rem",flexWrap:"wrap"}}>
          {excludedGroups.length > 0 && (
            <span className="row-count" style={{color:"var(--orange)"}}>{excludedGroups.length} group{excludedGroups.length>1?"s":""} excluded</span>
          )}
          <button className="quick-btn fixed" onClick={() => setShowLinkPanel(s=>!s)}>
            {showLinkPanel ? "✕ Close" : "🔗 Link Sales→COGS"}
          </button>
          <button className="quick-btn variable" onClick={() => setShowGroupPanel(s=>!s)}>
            {showGroupPanel ? "✕ Close" : "⚙ Groups"}
          </button>
          <button className="theme-toggle" onClick={toggleFullscreen} title="Full Screen">⊞</button>
        </div>
      </div>

      {/* Sales → COGS linking panel */}
      {showLinkPanel && (
        <div className="card" style={{marginBottom:"0.75rem",padding:0}}>
          <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <div>
              <div className="card-title">Link each Sales group to its COGS group(s)</div>
              <div className="card-sub">Determines the per-product Gross Profit rows shown below</div>
            </div>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <button className="quick-btn variable" style={{fontSize:11}} onClick={()=>autoSuggest(diGroups.map(g=>g.group), deGroups.map(g=>g.group))}>✨ Auto-suggest</button>
              <button className="quick-btn reset" style={{fontSize:11}} onClick={resetLinks}>Reset</button>
            </div>
          </div>
          <div className="link-table-wrap">
            {diGroups.map(sg => (
              <div key={sg.group} className="link-row">
                <div className="link-sales-name">{sg.group}</div>
                <div className="link-cogs-picks">
                  {deGroups.length === 0 && <span style={{fontSize:12,color:"var(--text-muted)"}}>No {deLabel} groups found</span>}
                  {deGroups.map(cg => (
                    <label key={cg.group} className={`link-chip ${(linkMap[sg.group]||[]).includes(cg.group)?"active":""}`}>
                      <input type="checkbox" checked={(linkMap[sg.group]||[]).includes(cg.group)} onChange={()=>toggleLink(sg.group,cg.group)} />
                      {cg.group}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Group include/exclude panel */}
      {showGroupPanel && (
        <div className="card" style={{marginBottom:"0.75rem",padding:"1rem"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"0.75rem"}}>
            <div className="card-title">Include / Exclude Groups from P&L</div>
            <div style={{display:"flex",gap:"0.5rem"}}>
              <button className="quick-btn fixed" style={{fontSize:11}} onClick={()=>setExcludedGroups([])}>Include All</button>
              <button className="quick-btn reset" style={{fontSize:11}} onClick={()=>setExcludedGroups([...allGroups])}>Exclude All</button>
            </div>
          </div>
          <div className="group-toggle-grid">
            {allGroups.map(g => (
              <label key={g} className={`group-toggle-item ${excludedGroups.includes(g)?"excluded":""}`}>
                <input type="checkbox" checked={!excludedGroups.includes(g)} onChange={()=>toggleGroup(g)} />
                <span>{g}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Profit trend chart */}
      <div className="card">
        <div className="card-title">Monthly Net Profit</div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={monthlyProfit} margin={{top:5,right:10,left:0,bottom:5}}>
            <XAxis dataKey="month" tick={{fill:"var(--text-muted)",fontSize:11}} axisLine={false} tickLine={false}/>
            <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} width={80}/>
            <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)"}}/>
            <Bar dataKey="netProfit" radius={[4,4,0,0]}>
              {monthlyProfit.map((e,i)=><Cell key={i} fill={e.netProfit>=0?"#22d3a5":"#ef4444"}/>)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Full P&L Table */}
      <div className="card" style={{padding:0}}>
        <div style={{padding:"1rem 1.25rem",borderBottom:"1px solid var(--border)"}}>
          <div className="card-title">Profit & Loss Statement</div>
          <div className="card-sub">Trading Account (by product) → Gross Profit → {iiLabel} → {ieLabel} → Net Profit</div>
        </div>
        <div className="pnl-scroll-wrap">
          <table className="data-table pnl-table">
            <thead>
              <tr>
                <th style={{width:"28%",minWidth:180}}>PARTICULARS</th>
                {months.map(m=><th key={m} style={{textAlign:"right",whiteSpace:"nowrap"}}>{m.slice(0,3)}</th>)}
                <th style={{textAlign:"right",fontWeight:700,whiteSpace:"nowrap"}}>TOTAL</th>
              </tr>
            </thead>
            <tbody>

              {/* ── TRADING ACCOUNT, organized per product (Sales group → its linked COGS) ── */}
              <SectionRow label="TRADING ACCOUNT"/>

              {diGroups.map(sg => {
                const linkedCogs = linkMap[sg.group] || [];
                const cogsTotal = sumAmount(filtered.filter(r => linkedCogs.includes(r.GROUP)));
                const productGP = sg.total - cogsTotal;
                const productGPPct = sg.total ? (productGP / sg.total) * 100 : 0;
                return (
                  <>
                    <tr key={"sg-"+sg.group} className="pnl-group-row">
                      <td style={{paddingLeft:"1.5rem",fontWeight:600}}>
                        {sg.group}
                        {sg.isOpening&&<span className="stock-tag">opening only</span>}
                        {sg.isClosing&&<span className="stock-tag">closing only</span>}
                      </td>
                      {months.map(m=>{const v=groupMonthAmt(sg.group,m);return <td key={m} style={{textAlign:"right"}} className={v>=0?"pos":"neg"}>{v!==0?fmt(v):"—"}</td>;})}
                      <td style={{textAlign:"right",fontWeight:700}} className="pos">{fmt(sg.total)}</td>
                    </tr>
                    {linkedCogs.length === 0 ? (
                      <tr className="pnl-margin-row"><td colSpan={months.length+2} style={{paddingLeft:"2.25rem",color:"var(--orange)"}}>⚠ Not linked to any COGS group — click "🔗 Link Sales→COGS" above</td></tr>
                    ) : linkedCogs.map(cg => {
                      const cgRow = deGroups.find(d => d.group === cg);
                      if (!cgRow) return null;
                      return (
                        <tr key={"lc-"+sg.group+cg} className="pnl-group-row">
                          <td style={{paddingLeft:"2.25rem",color:"var(--text-muted)"}}>− {cg}</td>
                          {months.map(m=>{const v=groupMonthAmt(cg,m);return <td key={m} style={{textAlign:"right"}} className="neg">{v!==0?fmt(v):"—"}</td>;})}
                          <td style={{textAlign:"right"}} className="neg">{fmt(cgRow.total)}</td>
                        </tr>
                      );
                    })}
                    <tr className="pnl-gp-row">
                      <td style={{paddingLeft:"1.5rem"}}>GP: {sg.group} ({productGPPct.toFixed(1)}%)</td>
                      {months.map(m=>{
                        const s=groupMonthAmt(sg.group,m);
                        const c=linkedGroupsMonthAmt(linkedCogs,m);
                        return <td key={m} style={{textAlign:"right"}} className={(s-c)>=0?"pos":"neg"}>{fmt(s-c)}</td>;
                      })}
                      <td style={{textAlign:"right"}} className={productGP>=0?"pos":"neg"}>{fmt(productGP)}</td>
                    </tr>
                  </>
                );
              })}

              {/* Unlinked COGS groups still counted in overall totals */}
              {unlinkedCogsGroups.length > 0 && <>
                <SubRow label={`Other ${deLabel} (unlinked)`}/>
                {unlinkedCogsGroups.map(g=>(
                  <tr key={"uc-"+g.group} className="pnl-group-row">
                    <td style={{paddingLeft:"1.5rem"}}>{g.group}</td>
                    {months.map(m=>{const v=groupMonthAmt(g.group,m);return <td key={m} style={{textAlign:"right"}} className={v>=0?"pos":"neg"}>{v!==0?fmt(v):"—"}</td>;})}
                    <td style={{textAlign:"right",fontWeight:600}} className={g.total>=0?"pos":"neg"}>{fmt(g.total)}</td>
                  </tr>
                ))}
              </>}

              {/* Overall Sales / COGS totals (unaffected by linking — always accurate) */}
              <tr className="pnl-total-row">
                <td>Total {diLabel}</td>
                {months.map(m=>{const v=monthAmt(isDirectIncome,m);return <td key={m} style={{textAlign:"right"}} className={v>=0?"pos":"neg"}>{fmt(v)}</td>;})}
                <td style={{textAlign:"right"}} className="pos">{fmt(kpi.grossRevenue)}</td>
              </tr>
              <tr className="pnl-total-row">
                <td>Total {deLabel}</td>
                {months.map(m=>{const v=monthAmt(isDirectExpense,m);return <td key={m} style={{textAlign:"right"}} className="neg">{fmt(v)}</td>;})}
                <td style={{textAlign:"right"}} className="neg">{fmt(kpi.cogs)}</td>
              </tr>

              <tr className="pnl-gp-row">
                <td>GROSS PROFIT</td>
                {months.map(m=>{const k=calcKPIs(filtered.filter(r=>r.MONTH===m));return <td key={m} style={{textAlign:"right"}} className={k.grossProfit>=0?"pos":"neg"}>{fmt(k.grossProfit)}</td>;})}
                <td style={{textAlign:"right"}} className={kpi.grossProfit>=0?"pos":"neg"}>{fmt(kpi.grossProfit)}</td>
              </tr>
              <tr className="pnl-margin-row">
                <td>Gross Margin %</td>
                {months.map(m=>{const k=calcKPIs(filtered.filter(r=>r.MONTH===m));return <td key={m} style={{textAlign:"right",fontSize:11,color:"var(--text-muted)"}}>{k.grossMargin.toFixed(1)}%</td>;})}
                <td style={{textAlign:"right",fontSize:11,color:"var(--text-muted)"}}>{kpi.grossMargin.toFixed(1)}%</td>
              </tr>

              {/* ── INDIRECT INCOME ── */}
              {iiGroups.length > 0 && <>
                <SectionRow label={iiLabel}/>
                {iiGroups.map(g=>(
                  <tr key={"ii-"+g.group} className="pnl-group-row">
                    <td style={{paddingLeft:"1.5rem"}}>{g.group}</td>
                    {months.map(m=>{const v=groupMonthAmt(g.group,m);return <td key={m} style={{textAlign:"right"}} className={v>=0?"pos":"neg"}>{v!==0?fmt(v):"—"}</td>;})}
                    <td style={{textAlign:"right",fontWeight:600}} className={g.total>=0?"pos":"neg"}>{fmt(g.total)}</td>
                  </tr>
                ))}
                <tr className="pnl-total-row">
                  <td>Total {iiLabel}</td>
                  {months.map(m=>{const v=monthAmt(isIndirectIncome,m);return <td key={m} style={{textAlign:"right"}} className="pos">{fmt(v)}</td>;})}
                  <td style={{textAlign:"right"}} className="pos">{fmt(kpi.indirectIncome)}</td>
                </tr>
              </>}

              {/* ── INDIRECT EXPENSE ── */}
              {ieGroups.length > 0 && <>
                <SectionRow label={ieLabel}/>
                {ieGroups.map(g=>(
                  <tr key={"ie-"+g.group} className="pnl-group-row">
                    <td style={{paddingLeft:"1.5rem"}}>{g.group}</td>
                    {months.map(m=>{const v=groupMonthAmt(g.group,m);return <td key={m} style={{textAlign:"right"}} className={v>=0?"pos":"neg"}>{v!==0?fmt(v):"—"}</td>;})}
                    <td style={{textAlign:"right",fontWeight:600}} className={g.total>=0?"pos":"neg"}>{fmt(g.total)}</td>
                  </tr>
                ))}
                <tr className="pnl-total-row">
                  <td>Total {ieLabel}</td>
                  {months.map(m=>{const v=monthAmt(isIndirectExpense,m);return <td key={m} style={{textAlign:"right"}} className="neg">{fmt(v)}</td>;})}
                  <td style={{textAlign:"right"}} className="neg">{fmt(kpi.indirectExpense)}</td>
                </tr>
              </>}

              {/* ── NET PROFIT ── */}
              <tr className="pnl-net-row">
                <td>NET PROFIT / LOSS</td>
                {months.map(m=>{const k=calcKPIs(filtered.filter(r=>r.MONTH===m));return <td key={m} style={{textAlign:"right"}} className={k.netProfit>=0?"pos":"neg"}>{fmt(k.netProfit)}</td>;})}
                <td style={{textAlign:"right"}} className={kpi.netProfit>=0?"pos":"neg"}>{fmt(kpi.netProfit)}</td>
              </tr>
              <tr className="pnl-margin-row">
                <td>Net Margin %</td>
                {months.map(m=>{const k=calcKPIs(filtered.filter(r=>r.MONTH===m));return <td key={m} style={{textAlign:"right",fontSize:11,color:"var(--text-muted)"}}>{k.netMargin.toFixed(1)}%</td>;})}
                <td style={{textAlign:"right",fontSize:11,color:"var(--text-muted)"}}>{kpi.netMargin.toFixed(1)}%</td>
              </tr>

            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
