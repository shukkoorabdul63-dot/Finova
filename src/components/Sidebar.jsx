import { useData } from "../context/DataContext";

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⊞" },
  { id: "transactions", label: "Transactions", icon: "≡" },
  { id: "cashflow", label: "Cash Flow", icon: "⇄" },
];
const REPORTS = [
  { id: "yoy", label: "Year over Year", icon: "📅" },
  { id: "pnl", label: "Monthly P&L", icon: "📊" },
  { id: "branch", label: "Branch Analysis", icon: "🏢" },
  { id: "budget", label: "Budget vs Actual", icon: "📋" },
];
const ANALYSIS = [
  { id: "costs", label: "Cost Classifier", icon: "⚙" },
  { id: "breakeven", label: "Break Even", icon: "◎" },
  { id: "projection", label: "Projection", icon: "🎯" },
];
const VISUALIZE = [
  { id: "chartbuilder", label: "Chart Builder", icon: "📈", badge: "NEW" },
  { id: "ai", label: "Finova AI", icon: "✦", badge: "BETA" },
];

export default function Sidebar({ page, setPage }) {
  const { rawData } = useData();

  const Section = ({ label, items }) => (
    <>
      <div className="nav-section-label" style={{ marginTop: "1.25rem" }}>{label}</div>
      {items.map(n => (
        <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
          <span className="nav-icon">{n.icon}</span>
          <span>{n.label}</span>
          {n.badge && <span className={`badge ${n.badge === "NEW" ? "badge-green" : ""}`}>{n.badge}</span>}
        </button>
      ))}
    </>
  );

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-icon">◈</span>
        <span className="logo-text">Finova</span>
      </div>
      <nav className="sidebar-nav">
        <div className="nav-section-label">GENERAL</div>
        {NAV.map(n => (
          <button key={n.id} className={`nav-item ${page === n.id ? "active" : ""}`} onClick={() => setPage(n.id)}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
        <Section label="REPORTS" items={REPORTS} />
        <Section label="ANALYSIS" items={ANALYSIS} />
        <Section label="VISUALIZE" items={VISUALIZE} />
      </nav>
      <div className="sidebar-footer">
        <div className="data-status">
          {rawData.length > 0
            ? <><span className="status-dot active"></span>{rawData.length.toLocaleString("en-IN")} rows</>
            : <><span className="status-dot"></span>No data</>
          }
        </div>
      </div>
    </aside>
  );
}
