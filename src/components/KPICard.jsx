export default function KPICard({ title, value, sub, badge, color, icon, isCount, fmt }) {
  const display = isCount
    ? (value||0).toLocaleString("en-IN")
    : fmt ? fmt(value||0) : `₹${(value||0).toFixed(0)}`;
  return (
    <div className={`kpi-card ${color||""}`}>
      <div className="kpi-top">
        <div className="kpi-icon">{icon}</div>
        {badge && <span className={`kpi-badge ${badge.type}`}>{badge.label}</span>}
      </div>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">{display}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
