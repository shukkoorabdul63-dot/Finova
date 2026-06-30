import { calcKPIs, sumAmount, sumCount, isIncome, isExpense } from "./finance.js";
import { MONTH_ORDER } from "./finance.js";

export const CHART_TYPES = [
  { id: "bar", label: "Bar" },
  { id: "hbar", label: "Horiz. Bar" },
  { id: "line", label: "Line" },
  { id: "area", label: "Area" },
  { id: "pie", label: "Pie" },
  { id: "donut", label: "Donut" },
  { id: "stacked", label: "Stacked Bar" },
];

export const X_FIELDS = [
  { id: "BRANCH", label: "Branch" },
  { id: "DEPARTMENT", label: "Department" },
  { id: "GROUP", label: "Group" },
  { id: "SUBGROUP", label: "Sub Group" },
  { id: "HEAD", label: "Head" },
  { id: "MONTH", label: "Month" },
  { id: "FY", label: "Financial Year" },
  { id: "COMPANY", label: "Company" },
  { id: "MAIN_HEAD", label: "Main Head" },
];

export const Y_METRICS = [
  { id: "amount_sum", label: "Amount (Sum)", field: "AMOUNT", agg: "sum" },
  { id: "count_sum", label: "Count (Sum)", field: "COUNT", agg: "sum" },
  { id: "gross_revenue", label: "Gross Revenue", computed: true },
  { id: "gross_profit", label: "Gross Profit", computed: true },
  { id: "net_profit", label: "Net Profit", computed: true },
  { id: "total_expenses", label: "Total Expenses", computed: true },
  { id: "gross_margin", label: "Gross Margin %", computed: true },
  { id: "net_margin", label: "Net Margin %", computed: true },
  { id: "amount_avg", label: "Amount (Average)", field: "AMOUNT", agg: "avg" },
  { id: "amount_count", label: "Row Count", field: "AMOUNT", agg: "count" },
];

export const AGGREGATIONS = [
  { id: "sum", label: "Sum" },
  { id: "avg", label: "Average" },
  { id: "count", label: "Count" },
  { id: "max", label: "Maximum" },
  { id: "min", label: "Minimum" },
];

export const CHART_COLORS = [
  "#7c6af7","#22d3a5","#f97316","#3b82f6","#ec4899",
  "#a855f7","#14b8a6","#f59e0b","#ef4444","#06b6d4","#84cc16","#8b5cf6",
];

function computeMetric(rows, metricId) {
  const kpi = calcKPIs(rows);
  switch (metricId) {
    case "gross_revenue": return kpi.grossRevenue;
    case "gross_profit": return kpi.grossProfit;
    case "net_profit": return kpi.netProfit;
    case "total_expenses": return kpi.totalExpenses;
    case "gross_margin": return kpi.grossMargin;
    case "net_margin": return kpi.netMargin;
    case "amount_sum": return sumAmount(rows);
    case "count_sum": return sumCount(rows);
    case "amount_avg": return rows.length > 0 ? sumAmount(rows) / rows.length : 0;
    case "amount_count": return rows.length;
    default: return sumAmount(rows);
  }
}

export function aggregateForChart(data, xField, yMetricId, groupByField, sortOrder = "desc", limit = 0) {
  if (!data || data.length === 0) return [];

  const groups = {};

  data.forEach(row => {
    const xKey = row[xField] || "Unknown";
    if (!groups[xKey]) groups[xKey] = { name: xKey, _rows: {}, _allRows: [] };
    groups[xKey]._allRows.push(row);

    if (groupByField) {
      const gKey = row[groupByField] || "Unknown";
      if (!groups[xKey]._rows[gKey]) groups[xKey]._rows[gKey] = [];
      groups[xKey]._rows[gKey].push(row);
    }
  });

  let result = Object.entries(groups).map(([name, g]) => {
    const item = { name };
    if (groupByField) {
      Object.entries(g._rows).forEach(([gKey, rows]) => {
        item[gKey] = computeMetric(rows, yMetricId);
      });
      item._total = computeMetric(g._allRows, yMetricId);
    } else {
      item.value = computeMetric(g._allRows, yMetricId);
    }
    return item;
  });

  // Sort months in FY order
  if (xField === "MONTH") {
    result.sort((a, b) => {
      const ai = MONTH_ORDER.indexOf(a.name);
      const bi = MONTH_ORDER.indexOf(b.name);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });
  } else {
    // Sort by value
    const val = r => groupByField ? (r._total || 0) : (r.value || 0);
    if (sortOrder === "desc") result.sort((a, b) => val(b) - val(a));
    else if (sortOrder === "asc") result.sort((a, b) => val(a) - val(b));
  }

  // Apply limit
  if (limit > 0) result = result.slice(0, limit);

  return result;
}

export function getGroupByKeys(data, groupByField) {
  if (!groupByField) return [];
  return [...new Set(data.map(r => r[groupByField]).filter(Boolean))].slice(0, 12);
}
