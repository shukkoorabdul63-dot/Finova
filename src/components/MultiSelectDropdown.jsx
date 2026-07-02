import { useState, useRef, useEffect } from "react";

export default function MultiSelectDropdown({ label, options, selected, onChange, searchable = true }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef();

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setSearch(""); }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = searchable && search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  function toggle(opt) {
    onChange(selected.includes(opt) ? selected.filter(s => s !== opt) : [...selected, opt]);
  }

  const displayLabel = selected.length === 0
    ? `All ${label}s`
    : selected.length === 1
      ? selected[0]
      : `${selected.length} ${label}s`;

  return (
    <div className="msd-wrap" ref={ref}>
      <button className={`msd-trigger ${selected.length > 0 ? "active" : ""}`} onClick={() => setOpen(o => !o)}>
        {displayLabel} <span className="msd-caret">▾</span>
      </button>
      {open && (
        <div className="msd-panel">
          {searchable && (
            <input className="msd-search" placeholder={`Search ${label.toLowerCase()}s...`} value={search}
              onChange={e => setSearch(e.target.value)} autoFocus />
          )}
          <div className="msd-actions">
            <button onClick={() => onChange(options)}>Select All</button>
            <button onClick={() => onChange([])}>Clear</button>
          </div>
          <div className="msd-list">
            {filtered.length === 0 && <div className="msd-empty">No matches</div>}
            {filtered.map(o => (
              <label key={o} className={`msd-item ${selected.includes(o) ? "active" : ""}`}>
                <input type="checkbox" checked={selected.includes(o)} onChange={() => toggle(o)} />
                <span>{o}</span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
