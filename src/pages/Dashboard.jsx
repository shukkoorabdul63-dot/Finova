import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { calcKPIs, formatINR, monthlyTrend, groupBy, sumAmount, MONTH_ORDER } from "../utils/finance";
import KPICard from "../components/KPICard";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

const COLORS = ["#7c6af7","#22d3a5","#f97316","#3b82f6","#ec4899","#a855f7","#14b8a6","#f59e0b","#ef4444","#06b6d4","#84cc16","#8b5cf6"];

export default function Dashboard() {
  const { data } = useData();
  const kpi = useMemo(() => calcKPIs(data), [data]);
  const trend = useMemo(() => monthlyTrend(data), [data]);

  const expenseBreakdown = useMemo(() => {
    const expenses = data.filter(r => r.MAIN_HEAD && r.MAIN_HEAD.toLowerCase().includes("expense"));
    const byGroup = groupBy(expenses, "GROUP");
    return Object.entries(byGroup)
      .map(([name, rows]) => ({ name, value: Math.abs(sumAmount(rows)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  const incomeBreakdown = useMemo(() => {
    const income = data.filter(r => r.MAIN_HEAD && r.MAIN_HEAD.toLowerCase().includes("income"));
    const byGroup = groupBy(income, "GROUP");
    return Object.entries(byGroup)
      .map(([name, rows]) => ({ name, value: Math.abs(sumAmount(rows)) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [data]);

  const topTransactions = useMemo(() => {
    return [...data]
      .sort((a, b) => Math.abs(b.AMOUNT) - Math.abs(a.AMOUNT))
      .slice(0, 8);
  }, [data]);

  const empty = data.length === 0;

  return (
    <div className="page">
      <div className="page-header">
        <h1>Dashboard</h1>
        {!empty && <span className="row-count">{data.length.toLocaleString()} records</span>}
      </div>

      {empty && (
        <div className="empty-state">
          <div className="empty-icon">◈</div>
          <h2>No data loaded</h2>
          <p>Click <strong>Import Data</strong> in the top right to upload your financial CSV or Excel file.</p>
        </div>
      )}

      {!empty && (
        <>
          {/* KPI Cards — each card maps directly to a MAIN HEAD category as labeled in your data */}
          <div className="kpi-grid">
            <KPICard title="Total Sales" value={kpi.grossRevenue} icon="₹" color="purple" badge={{ type: "green", label: "ACTIVE" }} />
            <KPICard title="COGS" value={kpi.cogs} icon="📦" color="default" />
            <KPICard title="Gross Profit" value={kpi.grossProfit} icon="%" color="default"
              badge={{ type: kpi.grossMargin >= 0 ? "green" : "red", label: `${kpi.grossMargin.toFixed(1)}% MRG` }} />
            <KPICard title="Net Profit" value={kpi.netProfit} icon="↗" color="default"
              badge={{ type: kpi.netMargin >= 0 ? "green" : "red", label: `${kpi.netMargin.toFixed(1)}% MRG` }} />
            <KPICard title="Indirect Income" value={kpi.indirectIncome} icon="+" color="green" />
            <KPICard title="Indirect Expense" value={kpi.indirectExpense} icon="−" color="red" />
            <KPICard title="Total Count" value={kpi.totalCount} icon="#" color="default" isCount={true} />
          </div>

          {(kpi.blankMainHeadCount > 0 || kpi.unclassifiedCount > 0) && (
            <div className="alert-banner">
              ⚠ {kpi.blankMainHeadCount + kpi.unclassifiedCount} rows have blank or unrecognized MAIN HEAD values and are <strong>excluded</strong> from these totals — re-import with corrected MAIN HEAD to fix.
            </div>
          )}


          {/* Performance Trend */}
          <div className="card">
            <div className="card-header">
              <div>
                <div className="card-title">Performance Trend</div>
                <div className="card-sub">Monthly revenue vs expenses vs profit</div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={trend} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={v => formatINR(v, true)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
                <Tooltip formatter={(v, n) => [formatINR(v), n]} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
                <Legend wrapperStyle={{ fontSize: 12, color: "var(--text-muted)" }} />
                <Line type="monotone" dataKey="revenue" stroke="#7c6af7" strokeWidth={2} dot={false} name="Revenue" />
                <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} dot={false} name="Expenses" />
                <Line type="monotone" dataKey="profit" stroke="#22d3a5" strokeWidth={2} dot={false} name="Profit" />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Transactions */}
          <div className="card">
            <div className="card-header">
              <div className="card-title">Top Transactions</div>
              <div className="card-sub">Largest entries by absolute value</div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>HEAD</th><th>GROUP</th><th>BRANCH</th><th>DEPT</th><th>MONTH</th><th>AMOUNT</th><th>COUNT</th>
                  </tr>
                </thead>
                <tbody>
                  {topTransactions.map((r, i) => (
                    <tr key={i}>
                      <td>{r.HEAD || "—"}</td>
                      <td><span className="tag">{r.GROUP || "—"}</span></td>
                      <td>{r.BRANCH || "—"}</td>
                      <td>{r.DEPARTMENT || "—"}</td>
                      <td>{r.MONTH || "—"}</td>
                      <td className={r.AMOUNT >= 0 ? "pos" : "neg"}>{formatINR(r.AMOUNT)}</td>
                      <td>{r.COUNT > 0 ? r.COUNT.toLocaleString() : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Breakdown Charts */}
          <div className="two-col">
            <div className="card">
              <div className="card-title">Expenses Breakdown</div>
              <div className="card-sub" style={{marginBottom:"1rem"}}>{formatINR(kpi.totalExpenses, true)} total</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={expenseBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {expenseBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="card">
              <div className="card-title">Income Sources</div>
              <div className="card-sub" style={{marginBottom:"1rem"}}>{formatINR(kpi.totalIncome, true)} total</div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={incomeBreakdown} cx="50%" cy="50%" outerRadius={80} dataKey="value" nameKey="name" label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                    {incomeBreakdown.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
