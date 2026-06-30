import { useData } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";

export default function TopBar({ onUpload }) {
  const { filters, updateFilter, resetFilters, options } = useData();
  const { dark, toggle } = useTheme();

  return (
    <header className="topbar">
      <div className="topbar-filters">
        <Select label="FY" value={filters.fy} options={options.fy} onChange={v => updateFilter("fy", v)} />
        <Select label="Company" value={filters.company} options={options.company} onChange={v => updateFilter("company", v)} />
        <Select label="Branch" value={filters.branch} options={options.branch} onChange={v => updateFilter("branch", v)} />
        <Select label="Dept" value={filters.department} options={options.department} onChange={v => updateFilter("department", v)} />
        <Select label="Month" value={filters.month} options={options.month} onChange={v => updateFilter("month", v)} />
        {Object.values(filters).some(v => v !== "All") && (
          <button className="reset-btn" onClick={resetFilters}>✕ Reset</button>
        )}
      </div>
      <div className="topbar-actions">
        <button className="theme-toggle" onClick={toggle} title="Toggle theme">
          {dark ? "☀" : "☾"}
        </button>
        <button className="upload-btn" onClick={onUpload}>
          ↑ Import Data
        </button>
      </div>
    </header>
  );
}

function Select({ label, value, options, onChange }) {
  return (
    <div className="filter-select-wrap">
      <select className="filter-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o} value={o}>{o === "All" ? `All ${label}s` : o}</option>)}
      </select>
    </div>
  );
}
