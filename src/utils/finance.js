// ── MONTH ORDER (Indian FY Apr-Mar) ──
export const MONTH_ORDER = ["April","May","June","July","August","September","October","November","December","January","February","March"];

// ── STOCK HEAD DETECTION ──
export function isOpeningStock(row) {
  const h = (row.HEAD || row.GROUP || "").toLowerCase();
  return h.includes("opening stock") || h.includes("opening balance") || h.includes("op. stock") || h.includes("op stock");
}
export function isClosingStock(row) {
  const h = (row.HEAD || row.GROUP || "").toLowerCase();
  return h.includes("closing stock") || h.includes("closing balance") || h.includes("cl. stock") || h.includes("cl stock");
}
export function isDepreciation(row) {
  const h = (row.HEAD || row.GROUP || "").toLowerCase();
  return h.includes("depreciation") || h.includes("amortisation") || h.includes("amortization");
}
export function isProvision(row) {
  const h = (row.HEAD || row.GROUP || "").toLowerCase();
  return h.includes("provision") || h.includes("reserve");
}

// ── MAIN HEAD CLASSIFICATION ──
export function isDirectIncome(mh) {
  if (!mh) return false;
  const m = mh.toLowerCase();
  return m.includes("direct income") || m.includes("trading income") || m.includes("sales income");
}
export function isDirectExpense(mh) {
  if (!mh) return false;
  const m = mh.toLowerCase();
  return m.includes("direct expense") || m.includes("cogs") || m.includes("cost of goods") || m.includes("trading expense") || m.includes("purchase");
}
export function isIndirectIncome(mh) {
  if (!mh) return false;
  return mh.toLowerCase().includes("indirect income");
}
export function isIndirectExpense(mh) {
  if (!mh) return false;
  return mh.toLowerCase().includes("indirect expense");
}
export function isIncome(mh) { return isDirectIncome(mh) || isIndirectIncome(mh); }
export function isExpense(mh) { return isDirectExpense(mh) || isIndirectExpense(mh); }

// ── SMART SUM with accounting rules ──
// For Opening Stock → only first month in data
// For Closing Stock → only last month in data
// For everything else → sum all
export function smartSum(rows, field = "AMOUNT") {
  if (!rows || rows.length === 0) return 0;

  // Separate stock rows from normal rows
  const openingRows = rows.filter(isOpeningStock);
  const closingRows = rows.filter(isClosingStock);
  const normalRows = rows.filter(r => !isOpeningStock(r) && !isClosingStock(r));

  let total = normalRows.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);

  // Opening Stock: only take the FIRST month present in data
  if (openingRows.length > 0) {
    const months = MONTH_ORDER.filter(m => openingRows.some(r => r.MONTH === m));
    const firstMonth = months[0];
    const firstMonthRows = openingRows.filter(r => r.MONTH === firstMonth);
    total += firstMonthRows.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
  }

  // Closing Stock: only take the LAST month present in data
  if (closingRows.length > 0) {
    const months = MONTH_ORDER.filter(m => closingRows.some(r => r.MONTH === m));
    const lastMonth = months[months.length - 1];
    const lastMonthRows = closingRows.filter(r => r.MONTH === lastMonth);
    total += lastMonthRows.reduce((s, r) => s + (parseFloat(r[field]) || 0), 0);
  }

  return total;
}

export function sumAmount(rows) {
  return rows.reduce((s, r) => s + (parseFloat(r.AMOUNT) || 0), 0);
}
export function sumBudget(rows) {
  return rows.reduce((s, r) => s + (parseFloat(r.BUDGET) || 0), 0);
}
export function sumCount(rows) {
  return rows.reduce((s, r) => s + (parseFloat(r.COUNT) || 0), 0);
}

// ── KPI CALCULATION (with smart stock rules) ──
export function calcKPIs(data) {
  const directIncomeRows = data.filter(r => isDirectIncome(r.MAIN_HEAD));
  const directExpenseRows = data.filter(r => isDirectExpense(r.MAIN_HEAD));
  const indirectIncomeRows = data.filter(r => isIndirectIncome(r.MAIN_HEAD));
  const indirectExpenseRows = data.filter(r => isIndirectExpense(r.MAIN_HEAD));

  const grossRevenue = smartSum(directIncomeRows);
  const cogs = smartSum(directExpenseRows);
  const grossProfit = grossRevenue - cogs;
  const indirectIncome = smartSum(indirectIncomeRows);
  const indirectExpense = smartSum(indirectExpenseRows);
  const netProfit = grossProfit + indirectIncome - indirectExpense;
  // Combined totals — used only for "all income/expense groups" pie chart overviews,
  // NOT used for the headline KPI cards (those show Sales/COGS/Indirect Income/Indirect Expense directly)
  const totalExpenses = cogs + indirectExpense;
  const totalIncome = grossRevenue + indirectIncome;
  const totalCount = sumCount(data);

  // Budget KPIs
  const budgetRevenue = sumBudget(directIncomeRows);
  const budgetExpense = sumBudget(directExpenseRows) + sumBudget(indirectExpenseRows);
  const budgetProfit = budgetRevenue - budgetExpense;

  // Row-level data quality check: rows whose MAIN_HEAD didn't match any known category
  const unclassifiedRows = data.filter(r =>
    r.MAIN_HEAD && !isDirectIncome(r.MAIN_HEAD) && !isDirectExpense(r.MAIN_HEAD) &&
    !isIndirectIncome(r.MAIN_HEAD) && !isIndirectExpense(r.MAIN_HEAD)
  );
  const blankMainHeadRows = data.filter(r => !r.MAIN_HEAD);

  return {
    grossRevenue, cogs, grossProfit,
    grossMargin: grossRevenue ? (grossProfit / grossRevenue) * 100 : 0,
    indirectIncome, indirectExpense,
    netProfit,
    // Net margin on Sales (standard convention: net profit as % of sales/revenue)
    netMargin: grossRevenue ? (netProfit / grossRevenue) * 100 : 0,
    totalExpenses, totalIncome, totalCount,
    budgetRevenue, budgetExpense, budgetProfit,
    revenueVariance: grossRevenue - budgetRevenue,
    profitVariance: netProfit - budgetProfit,
    unclassifiedCount: unclassifiedRows.length,
    blankMainHeadCount: blankMainHeadRows.length,
  };
}

// ── COST CLASSIFICATION ENGINE ──
// costMap: { [GROUP or HEAD]: { type: "fixed"|"variable"|"semi", fixedPct: 0-100 } }
export function classifyCosts(data, costMap) {
  const expenseRows = data.filter(r => isExpense(r.MAIN_HEAD));
  let fixed = 0, variable = 0, semi = 0;

  expenseRows.forEach(row => {
    const key = row.HEAD || row.GROUP || "";
    const classification = costMap[key] || costMap[row.GROUP] || { type: "variable", fixedPct: 0 };
    const amt = Math.abs(parseFloat(row.AMOUNT) || 0);

    if (classification.type === "fixed") {
      fixed += amt;
    } else if (classification.type === "variable") {
      variable += amt;
    } else if (classification.type === "semi") {
      const fp = (classification.fixedPct || 50) / 100;
      fixed += amt * fp;
      variable += amt * (1 - fp);
      semi += amt;
    }
  });

  return { fixed, variable, semi, total: fixed + variable };
}

// ── BREAK EVEN ANALYSIS ──
export function calcBreakEven(revenue, fixedCosts, variableCosts) {
  if (revenue === 0) return { bepRevenue: 0, bepUnits: 0, contributionMargin: 0, marginOfSafety: 0 };

  const variableCostRatio = variableCosts / revenue;
  const contributionMarginRatio = 1 - variableCostRatio;
  const bepRevenue = contributionMarginRatio > 0 ? fixedCosts / contributionMarginRatio : 0;
  const marginOfSafety = revenue > 0 ? ((revenue - bepRevenue) / revenue) * 100 : 0;

  return {
    bepRevenue,
    contributionMarginRatio: contributionMarginRatio * 100,
    contributionMargin: revenue - variableCosts,
    marginOfSafety,
    variableCostRatio: variableCostRatio * 100,
  };
}

// ── PROFIT PROJECTION ENGINE ──
export function calcProjection(currentKPI, fixedCosts, variableCosts, targetProfit) {
  const currentRevenue = currentKPI.grossRevenue;
  const variableRatio = currentRevenue > 0 ? variableCosts / currentRevenue : 0;
  const contributionRatio = 1 - variableRatio;

  // Scenario 1: Revenue increase needed (costs stay same)
  const revenueNeeded = contributionRatio > 0
    ? (fixedCosts + targetProfit) / contributionRatio
    : 0;
  const revenueIncrease = revenueNeeded - currentRevenue;
  const revenueIncreasePct = currentRevenue > 0 ? (revenueIncrease / currentRevenue) * 100 : 0;

  // Scenario 2: Cost cut needed (revenue stays same)
  const maxAllowedCosts = currentRevenue - targetProfit;
  const costCutNeeded = (fixedCosts + variableCosts) - maxAllowedCosts;
  const costCutPct = (fixedCosts + variableCosts) > 0 ? (costCutNeeded / (fixedCosts + variableCosts)) * 100 : 0;

  // Scenario 3: Mixed (50% revenue increase + 50% cost cut)
  const mixedRevenue = currentRevenue + (revenueIncrease * 0.5);
  const mixedCostCut = costCutNeeded * 0.5;
  const mixedNewCosts = (fixedCosts + variableCosts) - mixedCostCut;
  const mixedProfit = mixedRevenue * contributionRatio - fixedCosts;

  // Profit at various revenue levels (for chart)
  const steps = 10;
  const minRev = currentRevenue * 0.5;
  const maxRev = Math.max(revenueNeeded * 1.2, currentRevenue * 1.5);
  const profitCurve = Array.from({ length: steps + 1 }, (_, i) => {
    const rev = minRev + (maxRev - minRev) * (i / steps);
    const varCost = rev * variableRatio;
    const profit = rev - varCost - fixedCosts;
    return { revenue: rev, profit, label: formatINR(rev, true) };
  });

  return {
    targetProfit,
    scenarios: {
      revenueOnly: { revenueNeeded, revenueIncrease, revenueIncreasePct, costCutNeeded: 0 },
      costOnly: { revenueNeeded: currentRevenue, revenueIncrease: 0, costCutNeeded, costCutPct },
      mixed: { revenueNeeded: mixedRevenue, revenueIncrease: revenueIncrease * 0.5, costCutNeeded: mixedCostCut, mixedProfit },
    },
    profitCurve,
  };
}

// ── FORMATTING ──
export function formatINR(val, short = false) {
  if (val === null || val === undefined || isNaN(val)) return "₹0";
  const abs = Math.abs(val);
  if (short) {
    if (abs >= 10000000) return `₹${(val / 10000000).toFixed(2)}Cr`;
    if (abs >= 100000) return `₹${(val / 100000).toFixed(2)}L`;
    if (abs >= 1000) return `₹${(val / 1000).toFixed(1)}K`;
    return `₹${val.toFixed(0)}`;
  }
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(val);
}

export function formatPct(val) {
  if (isNaN(val)) return "0.0%";
  return `${val >= 0 ? "+" : ""}${val.toFixed(1)}%`;
}

// ── GROUPING UTILITIES ──
export function groupBy(arr, key) {
  return arr.reduce((acc, row) => {
    const k = row[key] || "Unknown";
    if (!acc[k]) acc[k] = [];
    acc[k].push(row);
    return acc;
  }, {});
}

export function monthlyTrend(data) {
  const byMonth = groupBy(data, "MONTH");
  return MONTH_ORDER.filter(m => byMonth[m]).map(m => {
    const rows = byMonth[m];
    const kpi = calcKPIs(rows);
    return { month: m.slice(0, 3), revenue: kpi.grossRevenue, expenses: kpi.totalExpenses, profit: kpi.netProfit };
  });
}

// ── UNIQUE COST GROUPS from data ──
export function getCostGroups(data) {
  const expenseRows = data.filter(r => isExpense(r.MAIN_HEAD));
  const groups = {};
  expenseRows.forEach(row => {
    const key = row.GROUP || "Unknown";
    if (!groups[key]) groups[key] = { group: key, heads: new Set(), total: 0 };
    if (row.HEAD) groups[key].heads.add(row.HEAD);
    groups[key].total += Math.abs(parseFloat(row.AMOUNT) || 0);
  });
  return Object.values(groups).map(g => ({ ...g, heads: [...g.heads] }));
}
