import { useState, useMemo, useRef, useCallback } from "react";
import { useData } from "../context/DataContext";
import { formatINR } from "../utils/finance";

const ROW_HEIGHT = 36;
const BUFFER = 15;
const CONTAINER_HEIGHT = 520;

export default function Transactions() {
  const { data } = useData();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: "AMOUNT", dir: -1 });
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef();

  const filtered = useMemo(() => {
    let rows = [...data];
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(r => Object.values(r).some(v => String(v).toLowerCase().includes(q)));
    }
    rows.sort((a, b) => {
      const av = a[sort.key] ?? "";
      const bv = b[sort.key] ?? "";
      if (typeof av === "number") return (av - bv) * sort.dir;
      return String(av).localeCompare(String(bv)) * sort.dir;
    });
    return rows;
  }, [data, search, sort]);

  const total = filtered.length;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER);
  const endIndex = Math.min(total, startIndex + Math.ceil(CONTAINER_HEIGHT / ROW_HEIGHT) + BUFFER * 2);
  const visibleRows = filtered.slice(startIndex, endIndex);
  const topPad = startIndex * ROW_HEIGHT;
  const bottomPad = Math.max(0, (total - endIndex) * ROW_HEIGHT);

  const handleScroll = useCallback(e => setScrollTop(e.target.scrollTop), []);
  const toggleSort = key => setSort(s => ({ key, dir: s.key === key ? -s.dir : -1 }));
  const SortIcon = ({ k }) => sort.key === k ? (sort.dir === 1 ? " ↑" : " ↓") : "";

  const cols = ["FY","MONTH","COMPANY","BRANCH","DEPARTMENT","MAIN_HEAD","GROUP","SUBGROUP","HEAD","AMOUNT","BUDGET","COUNT"];

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">≡</div><h2>No data loaded</h2><p>Import your data to view transactions.</p></div></div>
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Transactions</h1>
        <span className="row-count">{filtered.toLocaleString ? filtered.length.toLocaleString("en-IN") : filtered.length} of {data.length.toLocaleString("en-IN")} records</span>
      </div>

      <div className="toolbar">
        <input className="search-input" placeholder="Search any field..." value={search}
          onChange={e => { setSearch(e.target.value); setScrollTop(0); containerRef.current && (containerRef.current.scrollTop = 0); }} />
        <span className="toolbar-info">Showing {visibleRows.length} of {total.toLocaleString("en-IN")} • Virtual scroll enabled</span>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ tableLayout: "fixed", minWidth: 900 }}>
            <thead>
              <tr>
                {cols.map(c => (
                  <th key={c} onClick={() => toggleSort(c)} style={{ cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                    {c.replace("_", " ")}<SortIcon k={c} />
                  </th>
                ))}
              </tr>
            </thead>
          </table>
        </div>
        <div ref={containerRef} style={{ height: CONTAINER_HEIGHT, overflowY: "auto" }} onScroll={handleScroll}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ tableLayout: "fixed", minWidth: 900 }}>
              <tbody>
                <tr style={{ height: topPad }}><td colSpan={cols.length} style={{ padding: 0, border: "none" }}></td></tr>
                {visibleRows.map((r, i) => (
                  <tr key={startIndex + i}>
                    <td>{r.FY||"—"}</td>
                    <td>{r.MONTH||"—"}</td>
                    <td>{r.COMPANY||"—"}</td>
                    <td>{r.BRANCH||"—"}</td>
                    <td>{r.DEPARTMENT||"—"}</td>
                    <td><span className="tag small">{r.MAIN_HEAD||"—"}</span></td>
                    <td>{r.GROUP||"—"}</td>
                    <td>{r.SUBGROUP||"—"}</td>
                    <td>{r.HEAD||"—"}</td>
                    <td className={r.AMOUNT>=0?"pos":"neg"}>{formatINR(r.AMOUNT)}</td>
                    <td style={{color:"var(--text-muted)"}}>{r.BUDGET?formatINR(r.BUDGET):"—"}</td>
                    <td>{r.COUNT>0?r.COUNT.toLocaleString("en-IN"):"—"}</td>
                  </tr>
                ))}
                <tr style={{ height: bottomPad }}><td colSpan={cols.length} style={{ padding: 0, border: "none" }}></td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
