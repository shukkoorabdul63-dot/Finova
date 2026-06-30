import { useMemo, useState } from "react";
import { useData } from "../context/DataContext";
import { aggregateForChart, getGroupByKeys, CHART_TYPES, X_FIELDS, Y_METRICS, CHART_COLORS } from "../utils/chartAggregator";
import { formatINR } from "../utils/finance";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend, CartesianGrid
} from "recharts";

const LIMITS = [
  { id: 0, label: "All" },
  { id: 5, label: "Top 5" },
  { id: 10, label: "Top 10" },
  { id: 20, label: "Top 20" },
];

const SORT_OPTIONS = [
  { id: "desc", label: "High → Low" },
  { id: "asc", label: "Low → High" },
  { id: "natural", label: "Natural" },
];

function ChartRenderer({ chartType, data, xKey, groupKeys, yMetricId, colorScheme, title }) {
  const fmt = v => formatINR(v, true);
  const tt = {
    contentStyle: { background: "var(--card-bg)", border: "1px solid var(--border)", borderRadius: 8, color: "var(--text)", fontSize: 12 }
  };
  const ax = { tick: { fill: "var(--text-muted)", fontSize: 10 }, axisLine: false, tickLine: false };

  const colors = colorScheme || CHART_COLORS;
  const isGrouped = groupKeys && groupKeys.length > 0;
  const yKey = isGrouped ? null : "value";

  if (!data || data.length === 0) {
    return <div className="chart-empty">No data to display — adjust your selections</div>;
  }

  if (chartType === "pie" || chartType === "donut") {
    const pieData = data.map(d => ({ name: d.name, value: d.value || 0 }));
    return (
      <ResponsiveContainer width="100%" height={320}>
        <PieChart>
          <Pie data={pieData} cx="50%" cy="50%" outerRadius={120} innerRadius={chartType === "donut" ? 60 : 0}
            dataKey="value" nameKey="name"
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(1)}%`}
            labelLine={false} fontSize={11}>
            {pieData.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
          </Pie>
          <Tooltip formatter={v => fmt(v)} {...tt} />
          <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />
        </PieChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "hbar") {
    return (
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 36)}>
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
          <XAxis type="number" tickFormatter={fmt} {...ax} />
          <YAxis type="category" dataKey="name" {...ax} width={80} />
          <Tooltip formatter={v => fmt(v)} {...tt} />
          {isGrouped
            ? groupKeys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={[0, 3, 3, 0]} stackId={chartType === "stacked" ? "s" : undefined} />)
            : <Bar dataKey="value" radius={[0, 3, 3, 0]}>{data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Bar>
          }
          {isGrouped && <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />}
        </BarChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "line") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <XAxis dataKey="name" {...ax} />
          <YAxis tickFormatter={fmt} {...ax} width={65} />
          <Tooltip formatter={v => fmt(v)} {...tt} />
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          {isGrouped
            ? groupKeys.map((k, i) => <Line key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} strokeWidth={2} dot={false} />)
            : <Line type="monotone" dataKey="value" stroke={colors[0]} strokeWidth={2.5} dot={false} />
          }
          {isGrouped && <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />}
        </LineChart>
      </ResponsiveContainer>
    );
  }

  if (chartType === "area") {
    return (
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            {colors.slice(0, Math.max(1, groupKeys?.length || 1)).map((c, i) => (
              <linearGradient key={i} id={`ag${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={c} stopOpacity={0.3} />
                <stop offset="95%" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          <XAxis dataKey="name" {...ax} />
          <YAxis tickFormatter={fmt} {...ax} width={65} />
          <Tooltip formatter={v => fmt(v)} {...tt} />
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />
          {isGrouped
            ? groupKeys.map((k, i) => <Area key={k} type="monotone" dataKey={k} stroke={colors[i % colors.length]} fill={`url(#ag${i})`} strokeWidth={2} />)
            : <Area type="monotone" dataKey="value" stroke={colors[0]} fill="url(#ag0)" strokeWidth={2} />
          }
          {isGrouped && <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />}
        </AreaChart>
      </ResponsiveContainer>
    );
  }

  // Default: Bar
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 30 }}>
        <XAxis dataKey="name" {...ax} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? "end" : "middle"} />
        <YAxis tickFormatter={fmt} {...ax} width={65} />
        <Tooltip formatter={v => fmt(v)} {...tt} />
        {chartType === "stacked" && <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" />}
        {isGrouped
          ? groupKeys.map((k, i) => <Bar key={k} dataKey={k} fill={colors[i % colors.length]} radius={chartType !== "stacked" ? [3, 3, 0, 0] : [0, 0, 0, 0]} stackId={chartType === "stacked" ? "s" : undefined} />)
          : <Bar dataKey="value" radius={[3, 3, 0, 0]}>{data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}</Bar>
        }
        {isGrouped && <Legend wrapperStyle={{ fontSize: 11, color: "var(--text-muted)" }} />}
      </BarChart>
    </ResponsiveContainer>
  );
}

export default function ChartBuilder() {
  const { data } = useData();
  const [chartType, setChartType] = useState("bar");
  const [xField, setXField] = useState("BRANCH");
  const [yMetric, setYMetric] = useState("net_profit");
  const [groupBy, setGroupBy] = useState("");
  const [sortOrder, setSortOrder] = useState("desc");
  const [limit, setLimit] = useState(10);
  const [title, setTitle] = useState("");
  const [savedCharts, setSavedCharts] = useState([]);
  const [activeChart, setActiveChart] = useState(null);
  const [filterField, setFilterField] = useState("");
  const [filterValue, setFilterValue] = useState("All");

  const filterOptions = useMemo(() => {
    if (!filterField) return [];
    return ["All", ...new Set(data.map(r => r[filterField]).filter(Boolean))];
  }, [data, filterField]);

  const filteredData = useMemo(() => {
    if (!filterField || filterValue === "All") return data;
    return data.filter(r => r[filterField] === filterValue);
  }, [data, filterField, filterValue]);

  const chartData = useMemo(() => {
    return aggregateForChart(filteredData, xField, yMetric, groupBy || null, sortOrder, limit);
  }, [filteredData, xField, yMetric, groupBy, sortOrder, limit]);

  const groupKeys = useMemo(() => {
    if (!groupBy) return [];
    return getGroupByKeys(filteredData, groupBy);
  }, [filteredData, groupBy]);

  const currentTitle = title || `${Y_METRICS.find(m => m.id === yMetric)?.label || ""} by ${X_FIELDS.find(f => f.id === xField)?.label || ""}`;

  function saveChart() {
    const chart = { id: Date.now(), title: currentTitle, chartType, xField, yMetric, groupBy, sortOrder, limit, filterField, filterValue, data: chartData, groupKeys };
    setSavedCharts(s => [...s, chart]);
    setActiveChart(chart.id);
  }

  function deleteChart(id) {
    setSavedCharts(s => s.filter(c => c.id !== id));
    if (activeChart === id) setActiveChart(null);
  }

  if (data.length === 0) return (
    <div className="page"><div className="empty-state"><div className="empty-icon">📈</div><h2>No data loaded</h2><p>Import your financial data to start building charts.</p></div></div>
  );

  const active = savedCharts.find(c => c.id === activeChart);

  return (
    <div className="page cb-page">
      <div className="page-header">
        <h1>Chart Builder</h1>
        <span className="row-count">{savedCharts.length} saved chart{savedCharts.length !== 1 ? "s" : ""}</span>
      </div>

      <div className="cb-layout">
        {/* Left Panel */}
        <div className="cb-left">
          <div className="cb-panel">
            <div className="cb-panel-title">📊 Chart Type</div>
            <div className="cb-type-grid">
              {CHART_TYPES.map(t => (
                <button key={t.id} className={`cb-type-btn ${chartType === t.id ? "active" : ""}`} onClick={() => setChartType(t.id)}>{t.label}</button>
              ))}
            </div>
          </div>

          <div className="cb-panel">
            <div className="cb-panel-title">⚙ Configuration</div>
            <div className="cb-field-row">
              <label>X Axis</label>
              <select className="filter-select" style={{ width: "100%" }} value={xField} onChange={e => setXField(e.target.value)}>
                {X_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="cb-field-row">
              <label>Y Axis (Metric)</label>
              <select className="filter-select" style={{ width: "100%" }} value={yMetric} onChange={e => setYMetric(e.target.value)}>
                {Y_METRICS.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </div>
            <div className="cb-field-row">
              <label>Group By (optional)</label>
              <select className="filter-select" style={{ width: "100%" }} value={groupBy} onChange={e => setGroupBy(e.target.value)}>
                <option value="">None</option>
                {X_FIELDS.filter(f => f.id !== xField).map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            <div className="cb-field-row">
              <label>Sort</label>
              <select className="filter-select" style={{ width: "100%" }} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
                {SORT_OPTIONS.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}
              </select>
            </div>
            <div className="cb-field-row">
              <label>Limit</label>
              <select className="filter-select" style={{ width: "100%" }} value={limit} onChange={e => setLimit(Number(e.target.value))}>
                {LIMITS.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
          </div>

          <div className="cb-panel">
            <div className="cb-panel-title">🔍 Filter</div>
            <div className="cb-field-row">
              <label>Filter by</label>
              <select className="filter-select" style={{ width: "100%" }} value={filterField} onChange={e => { setFilterField(e.target.value); setFilterValue("All"); }}>
                <option value="">No filter</option>
                {X_FIELDS.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
              </select>
            </div>
            {filterField && (
              <div className="cb-field-row">
                <label>Value</label>
                <select className="filter-select" style={{ width: "100%" }} value={filterValue} onChange={e => setFilterValue(e.target.value)}>
                  {filterOptions.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            )}
          </div>

          {/* Saved Charts */}
          {savedCharts.length > 0 && (
            <div className="cb-panel">
              <div className="cb-panel-title">💾 Saved Charts</div>
              {savedCharts.map(c => (
                <div key={c.id} className={`saved-chart-item ${activeChart === c.id ? "active" : ""}`} onClick={() => setActiveChart(activeChart === c.id ? null : c.id)}>
                  <span className="saved-chart-type">{CHART_TYPES.find(t => t.id === c.chartType)?.label || c.chartType}</span>
                  <span className="saved-chart-name">{c.title}</span>
                  <button className="saved-chart-del" onClick={e => { e.stopPropagation(); deleteChart(c.id); }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Main Chart Area */}
        <div className="cb-main">
          {/* Live Preview */}
          <div className="card cb-chart-card">
            <div className="cb-chart-header">
              <input className="cb-title-input" value={title} onChange={e => setTitle(e.target.value)} placeholder={currentTitle} />
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button className="upload-btn" style={{ fontSize: 12, padding: "4px 12px" }} onClick={saveChart}>💾 Save Chart</button>
              </div>
            </div>
            <div className="cb-chart-meta">
              {chartData.length} data points • {X_FIELDS.find(f => f.id === xField)?.label} × {Y_METRICS.find(m => m.id === yMetric)?.label}
              {filterField && filterValue !== "All" ? ` • Filtered: ${filterValue}` : ""}
            </div>
            <ChartRenderer chartType={chartType} data={chartData} xKey="name" groupKeys={groupKeys} yMetricId={yMetric} colorScheme={CHART_COLORS} title="" />
          </div>

          {/* Saved Chart Preview */}
          {active && (
            <div className="card cb-chart-card">
              <div className="cb-chart-header">
                <div style={{ fontWeight: 600 }}>{active.title}</div>
                <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Saved chart</span>
              </div>
              <ChartRenderer chartType={active.chartType} data={active.data} xKey="name" groupKeys={active.groupKeys} yMetricId={active.yMetric} colorScheme={CHART_COLORS} title="" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
