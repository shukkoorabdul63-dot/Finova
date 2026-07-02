import { useState } from "react";
import { useData } from "../context/DataContext";
import { useCost } from "../context/CostContext";
import { useCategory } from "../context/CategoryContext";
import { useUnitProfile } from "../context/UnitProfileContext";

const ITEMS = [
  { id: "data",     label: "Imported Data",         desc: "Clears the uploaded CSV/Excel rows from memory",  icon: "📄" },
  { id: "filters",  label: "Active Filters",         desc: "Resets FY / Branch / Dept / Month filters",       icon: "🔍" },
  { id: "links",    label: "Sales ↔ COGS Links",     desc: "Clears your product category linking in P&L",     icon: "🔗" },
  { id: "costs",    label: "Cost Classifications",   desc: "Clears Fixed / Variable / Semi tags per group",   icon: "⚙" },
  { id: "profiles", label: "Unit Profiles",          desc: "Deletes all Per-Vehicle / Per-Job-Card profiles", icon: "#" },
];

export default function ClearSessionModal({ onClose }) {
  const { setRawData, resetFilters } = useData();
  const { reset: resetCosts } = useCost();
  const { reset: resetLinks } = useCategory();
  const { resetAll: resetProfiles } = useUnitProfile();

  const [selected, setSelected] = useState({ data: true, filters: true, links: false, costs: false, profiles: false });
  const [done, setDone] = useState(false);

  function toggle(id) { setSelected(prev => ({ ...prev, [id]: !prev[id] })); }
  function selectAll() { setSelected(Object.fromEntries(ITEMS.map(i => [i.id, true]))); }
  function selectNone() { setSelected(Object.fromEntries(ITEMS.map(i => [i.id, false]))); }

  const anySelected = Object.values(selected).some(Boolean);

  function handleClear() {
    if (selected.data) setRawData([]);
    if (selected.filters) resetFilters();
    if (selected.links) resetLinks();
    if (selected.costs) resetCosts();
    if (selected.profiles) resetProfiles();
    setDone(true);
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ width: 460 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{done ? "✓ Cleared" : "Clear Session"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
            <div style={{ fontWeight: 600, marginBottom: "0.5rem" }}>Done!</div>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: "1.25rem" }}>
              Selected items have been cleared. Import new data to begin.
            </div>
            <button className="upload-btn" onClick={onClose}>Close</button>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: "1rem" }}>
              Choose what to clear — useful when switching to a different company's data.
            </div>

            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
              <button className="quick-btn reset" style={{ fontSize: 11 }} onClick={selectAll}>Select All</button>
              <button className="quick-btn variable" style={{ fontSize: 11 }} onClick={selectNone}>Select None</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", marginBottom: "1.25rem" }}>
              {ITEMS.map(item => (
                <label key={item.id} className={`clear-item ${selected[item.id] ? "selected" : ""}`}>
                  <input type="checkbox" checked={selected[item.id]} onChange={() => toggle(item.id)} />
                  <span className="clear-item-icon">{item.icon}</span>
                  <div className="clear-item-text">
                    <div className="clear-item-label">{item.label}</div>
                    <div className="clear-item-desc">{item.desc}</div>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
              <button className="quick-btn variable" onClick={onClose}>Cancel</button>
              <button
                disabled={!anySelected}
                onClick={handleClear}
                style={{
                  background: "var(--red)", color: "#fff", border: "none",
                  padding: "0.45rem 1.1rem", borderRadius: 8, fontSize: 13,
                  fontWeight: 600, cursor: anySelected ? "pointer" : "not-allowed",
                  opacity: anySelected ? 1 : 0.5
                }}>
                🗑 Clear Selected
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
