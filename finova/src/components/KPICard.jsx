import { formatINR } from "../utils/finance";

export default function KPICard({ title, value, sub, badge, color, icon, isCount }) {
  return (
    <div className={`kpi-card ${color || ""}`}>
      <div className="kpi-top">
        <div className="kpi-icon">{icon}</div>
        {badge && <span className={`kpi-badge ${badge.type}`}>{badge.label}</span>}
      </div>
      <div className="kpi-title">{title}</div>
      <div className="kpi-value">
        {isCount ? value.toLocaleString("en-IN") : formatINR(value, true)}
      </div>
      {sub && <div className="kpi-sub">{sub}</div>}
    </div>
  );
}
