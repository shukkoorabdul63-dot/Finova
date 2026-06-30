import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { formatINR, groupBy, sumAmount, MONTH_ORDER } from "../utils/finance";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export default function CashFlow() {
  const { data } = useData();

  const monthlyFlow = useMemo(() => {
    const byMonth = groupBy(data, "MONTH");
    let cumulative = 0;
    return MONTH_ORDER.filter(m => byMonth[m]).map(m => {
      const rows = byMonth[m];
      const inflow = sumAmount(rows.filter(r => r.MAIN_HEAD && r.MAIN_HEAD.toLowerCase().includes("income")));
      const outflow = Math.abs(sumAmount(rows.filter(r => r.MAIN_HEAD && r.MAIN_HEAD.toLowerCase().includes("expense"))));
      const net = inflow - outflow;
      cumulative += net;
      return { month: m.slice(0, 3), inflow, outflow, net, cumulative };
    });
  }, [data]);

  const totalInflow = monthlyFlow.reduce((s, m) => s + m.inflow, 0);
  const totalOutflow = monthlyFlow.reduce((s, m) => s + m.outflow, 0);
  const netFlow = totalInflow - totalOutflow;

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">⇄</div><h2>No data loaded</h2><p>Import your data to view cash flow.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header"><h1>Cash Flow</h1></div>

      <div className="kpi-grid three-col">
        <div className="kpi-card green"><div className="kpi-icon">↑</div><div className="kpi-title">Total Inflow</div><div className="kpi-value pos">{formatINR(totalInflow, true)}</div></div>
        <div className="kpi-card red"><div className="kpi-icon">↓</div><div className="kpi-title">Total Outflow</div><div className="kpi-value neg">{formatINR(totalOutflow, true)}</div></div>
        <div className={`kpi-card ${netFlow >= 0 ? "purple" : "red"}`}><div className="kpi-icon">⇄</div><div className="kpi-title">Net Flow</div><div className={`kpi-value ${netFlow >= 0 ? "pos" : "neg"}`}>{formatINR(netFlow, true)}</div></div>
      </div>

      <div className="card">
        <div className="card-title">Cumulative Cash Flow</div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={monthlyFlow} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
            <defs>
              <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#7c6af7" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#7c6af7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="month" tick={{ fill: "var(--text-muted)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={v => formatINR(v, true)} tick={{ fill: "var(--text-muted)", fontSize: 10 }} axisLine={false} tickLine={false} width={65} />
            <Tooltip formatter={v => formatINR(v)} contentStyle={{ background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)" }} />
            <Area type="monotone" dataKey="cumulative" stroke="#7c6af7" strokeWidth={2} fill="url(#cumGrad)" name="Cumulative" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <div className="card-title">Monthly Inflow vs Outflow</div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr><th>Month</th><th>Inflow</th><th>Outflow</th><th>Net</th><th>Cumulative</th></tr>
            </thead>
            <tbody>
              {monthlyFlow.map(m => (
                <tr key={m.month}>
                  <td>{m.month}</td>
                  <td className="pos">{formatINR(m.inflow)}</td>
                  <td className="neg">{formatINR(m.outflow)}</td>
                  <td className={m.net >= 0 ? "pos" : "neg"}>{formatINR(m.net)}</td>
                  <td className={m.cumulative >= 0 ? "pos" : "neg"}>{formatINR(m.cumulative)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
