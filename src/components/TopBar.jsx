import { useState } from "react";
import { useData } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";
import { useFormat, FORMAT_OPTIONS } from "../context/FormatContext";

export default function TopBar({ onUpload }) {
  const { filters, updateFilter, resetFilters, options } = useData();
  const { dark, toggle } = useTheme();
  const { format, setFormat } = useFormat();
  const [isFullscreen, setIsFullscreen] = useState(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

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
        <select className="filter-select" value={format} onChange={e => setFormat(e.target.value)} title="Number Format">
          {FORMAT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
        </select>
        <button className="theme-toggle" onClick={toggle} title="Toggle theme">{dark ? "☀" : "☾"}</button>
        <button className="theme-toggle" onClick={toggleFullscreen} title="Full Screen">{isFullscreen ? "⊡" : "⊞"}</button>
        <button className="upload-btn" onClick={onUpload}>↑ Import Data</button>
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
