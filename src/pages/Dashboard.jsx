import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useFormat } from "../context/FormatContext";
import { calcKPIs, monthlyTrend, groupBy, sumAmount, isDirectIncome, isDirectExpense, isIndirectIncome, isIndirectExpense } from "../utils/finance";
import KPICard from "../components/KPICard";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#7c6af7","#22d3a5","#f97316","#3b82f6","#ec4899","#a855f7","#14b8a6","#f59e0b","#ef4444","#06b6d4","#84cc16","#8b5cf6"];

export default function Dashboard() {
  const { data } = useData();
  const { fmt } = useFormat();
  const kpi = useMemo(() => calcKPIs(data), [data]);
  const trend = useMemo(() => monthlyTrend(data), [data]);

  // Dynamic KPI cards: one per unique MAIN HEAD as labeled in data
  const mainHeadCards = useMemo(() => {
    const mhs = [...new Set(data.map(r => r.MAIN_HEAD).filter(Boolean))];
    return mhs.map(mh => ({
      label: mh,
      value: kpi.mainHeadSums[mh] || 0,
      isIncome: isDirectIncome(mh) || isIndirectIncome(mh),
      isExpense: isDirectExpense(mh) || isIndirectExpense(mh),
    }));
  }, [data, kpi]);

  const expenseBreakdown = useMemo(() => {
    const rows = data.filter(r => isDirectExpense(r.MAIN_HEAD) || isIndirectExpense(r.MAIN_HEAD));
    const byGroup = groupBy(rows, "GROUP");
    return Object.entries(byGroup).map(([name,rows]) => ({name,value:Math.abs(sumAmount(rows))}))
      .sort((a,b)=>b.value-a.value).slice(0,8);
  }, [data]);

  const incomeBreakdown = useMemo(() => {
    const rows = data.filter(r => isDirectIncome(r.MAIN_HEAD) || isIndirectIncome(r.MAIN_HEAD));
    const byGroup = groupBy(rows, "GROUP");
    return Object.entries(byGroup).map(([name,rows]) => ({name,value:Math.abs(sumAmount(rows))}))
      .sort((a,b)=>b.value-a.value).slice(0,8);
  }, [data]);

  const topTransactions = useMemo(() => [...data].sort((a,b)=>Math.abs(b.AMOUNT)-Math.abs(a.AMOUNT)).slice(0,8), [data]);
  const empty = data.length === 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        {!empty && <span className="row-count">{data.length.toLocaleString("en-IN")} records</span>}
      </div>

      {empty && (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <h2>No data loaded</h2>
          <p>Click <strong>Import Data</strong> to upload your financial CSV or Excel file.</p>
        </div>
      )}

      {!empty && (
        <>
          {(kpi.blankMainHeadCount > 0 || kpi.unclassifiedCount > 0) && (
            <div className="alert-banner">
              ⚠ {(kpi.blankMainHeadCount + kpi.unclassifiedCount).toLocaleString("en-IN")} rows have blank or unrecognized MAIN HEAD — excluded from P&L totals. Fix MAIN HEAD column values in your data and re-import.
            </div>
          )}

          {/* Dynamic MAIN HEAD KPI cards — one per unique MAIN HEAD value in data */}
          <div className="kpi-grid">
            {mainHeadCards.map((c, i) => (
              <KPICard key={c.label} title={c.label} value={c.value} icon="₹" fmt={fmt}
                color={c.isIncome ? "green" : c.isExpense ? "red" : "default"} />
            ))}
            <KPICard title="Gross Profit" value={kpi.grossProfit} icon="%" fmt={fmt}
              color="purple"
              badge={{ type: kpi.grossMargin >= 0 ? "green" : "red", label: `${kpi.grossMargin.toFixed(1)}% MRG` }} />
            <KPICard title="Net Profit" value={kpi.netProfit} icon="↗" fmt={fmt}
              color="purple"
              badge={{ type: kpi.netMargin >= 0 ? "green" : "red", label: `${kpi.netMargin.toFixed(1)}% MRG` }} />
            <KPICard title="Total Count" value={kpi.totalCount} icon="#" fmt={fmt} color="default" isCount />
          </div>

          {/* Performance Trend */}
          <div className="card">
            <div className="card-header">
              <div><div className="card-title">Performance Trend</div><div className="card-sub">Monthly revenue vs expenses vs profit</div></div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{top:5,right:10,left:0,bottom:5}}>
                <XAxis dataKey="month" tick={{fill:"var(--text-muted)",fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis tickFormatter={v=>fmt(v)} tick={{fill:"var(--text-muted)",fontSize:10}} axisLine={false} tickLine={false} width={80}/>
                <Tooltip formatter={(v,n)=>[fmt(v),n]} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)"}}/>
                <Legend wrapperStyle={{fontSize:12,color:"var(--text-muted)"}}/>
                <Line type="monotone" dataKey="revenue" stroke="#7c6af7" strokeWidth={2} dot={false} name="Revenue"/>
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses"/>
                <Line type="monotone" dataKey="profit" stroke="#22d3a5" strokeWidth={2} dot={false} name="Profit"/>
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Transactions */}
          <div className="card">
            <div className="card-title" style={{marginBottom:"0.75rem"}}>Top Transactions</div>
            <div className="table-wrap">
              <table className="data-table">
                <thead><tr><th>HEAD</th><th>GROUP</th><th>MAIN HEAD</th><th>BRANCH</th><th>DEPT</th><th>MONTH</th><th>AMOUNT</th></tr></thead>
                <tbody>
                  {topTransactions.map((r,i)=>(
                    <tr key={i}>
                      <td>{r.HEAD||"—"}</td>
                      <td><span className="tag">{r.GROUP||"—"}</span></td>
                      <td><span className="tag">{r.MAIN_HEAD||"—"}</span></td>
                      <td>{r.BRANCH||"—"}</td>
                      <td>{r.DEPARTMENT||"—"}</td>
                      <td>{r.MONTH||"—"}</td>
                      <td className={r.AMOUNT>=0?"pos":"neg"}>{fmt(r.AMOUNT)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="two-col">
            <div className="card">
              <div className="card-title">Expense Breakdown by Group</div>
              <div className="card-sub" style={{marginBottom:"0.75rem"}}>{fmt(kpi.totalExpenses)} total</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {expenseBreakdown.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)"}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="card-title">Income Sources by Group</div>
              <div className="card-sub" style={{marginBottom:"0.75rem"}}>{fmt(kpi.totalIncome)} total</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={incomeBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name"
                    label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {incomeBreakdown.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                  </Pie>
                  <Tooltip formatter={v=>fmt(v)} contentStyle={{background:"var(--card-bg)",border:"1px solid var(--border)",borderRadius:8,color:"var(--text)"}}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
