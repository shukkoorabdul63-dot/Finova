import { useState } from "react";
import { useData } from "../context/DataContext";
import { useTheme } from "../context/ThemeContext";
import { useFormat, FORMAT_OPTIONS } from "../context/FormatContext";
import MultiSelectDropdown from "./MultiSelectDropdown";
import ClearSessionModal from "./ClearSessionModal";

export default function TopBar({ onUpload }) {
  const { filters, updateFilter, resetFilters, options, rawData } = useData();
  const { dark, toggle } = useTheme();
  const { format, setFormat } = useFormat();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showClear, setShowClear] = useState(false);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }

  const anyFilterActive = Object.values(filters).some(arr => arr.length > 0);

  return (
    <>
      <header className="topbar">
        <div className="topbar-filters">
          <MultiSelectDropdown label="FY" options={options.fy} selected={filters.fy} onChange={v => updateFilter("fy", v)} />
          <MultiSelectDropdown label="Company" options={options.company} selected={filters.company} onChange={v => updateFilter("company", v)} />
          <MultiSelectDropdown label="Branch" options={options.branch} selected={filters.branch} onChange={v => updateFilter("branch", v)} />
          <MultiSelectDropdown label="Dept" options={options.department} selected={filters.department} onChange={v => updateFilter("department", v)} />
          <MultiSelectDropdown label="Month" options={options.month} selected={filters.month} onChange={v => updateFilter("month", v)} searchable={false} />
          {anyFilterActive && (
            <button className="reset-btn" onClick={resetFilters}>✕ Reset Filters</button>
          )}
        </div>
        <div className="topbar-actions">
          <select className="filter-select" value={format} onChange={e => setFormat(e.target.value)} title="Number Format">
            {FORMAT_OPTIONS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
          </select>
          <button className="theme-toggle" onClick={toggle} title="Toggle theme">{dark ? "☀" : "☾"}</button>
          <button className="theme-toggle" onClick={toggleFullscreen} title="Full Screen">{isFullscreen ? "⊡" : "⊞"}</button>
          <button
            className="clear-session-btn"
            onClick={() => setShowClear(true)}
            title="Clear data / settings for a new company"
          >
            🗑 Clear
          </button>
          <button className="upload-btn" onClick={onUpload}>↑ Import Data</button>
        </div>
      </header>
      {showClear && <ClearSessionModal onClose={() => setShowClear(false)} />}
    </>
  );
}
