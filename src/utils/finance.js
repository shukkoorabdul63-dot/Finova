// ── MONTH ORDER (Indian FY Apr-Mar) ──
export const MONTH_ORDER = ["April","May","June","July","August","September","October","November","December","January","February","March"];

// ── STOCK HEAD DETECTION ──
export function isOpeningStock(row) {
  const h = (row.HEAD||row.GROUP||row.SUBGROUP||"").toLowerCase();
  return h.includes("opening stock")||h.includes("op. stock")||h.includes("op stock")||h.includes("opening balance stock");
}
export function isClosingStock(row) {
  const h = (row.HEAD||row.GROUP||row.SUBGROUP||"").toLowerCase();
  return h.includes("closing stock")||h.includes("cl. stock")||h.includes("cl stock")||h.includes("closing balance stock");
}
export function isDepreciation(row) {
  const h=(row.HEAD||row.GROUP||"").toLowerCase();
  return h.includes("depreciation")||h.includes("amortisation")||h.includes("amortization");
}
export function isProvision(row) {
  const h=(row.HEAD||row.GROUP||"").toLowerCase();
  return h.includes("provision")||h.includes("reserve");
}

// ── MAIN HEAD CLASSIFICATION ──
// CRITICAL: Always check for "indirect" FIRST before "direct"
// "indirect income".includes("direct income") = TRUE — that's the bug we're fixing
export function isDirectIncome(mh) {
  if (!mh) return false;
  const m = mh.toLowerCase().trim();
  if (m.startsWith("indirect")) return false; // ← CRITICAL guard
  return m.startsWith("direct income")||m.startsWith("trading income")||m.startsWith("sales income")||m==="sales"||m==="direct income";
}
export function isDirectExpense(mh) {
  if (!mh) return false;
  const m = mh.toLowerCase().trim();
  if (m.startsWith("indirect")) return false; // ← CRITICAL guard
  return m.startsWith("direct expense")||m.startsWith("trading expense")||m.startsWith("cogs")||m.startsWith("cost of goods")||m==="direct expense"||m==="purchase";
}
export function isIndirectIncome(mh) {
  if (!mh) return false;
  const m = mh.toLowerCase().trim();
  return m.startsWith("indirect income")||m==="other income"||m==="non-operating income";
}
export function isIndirectExpense(mh) {
  if (!mh) return false;
  const m = mh.toLowerCase().trim();
  return m.startsWith("indirect expense")||m==="operating expense"||m==="other expense"||m==="indirect expense";
}
export function isIncome(mh) { return isDirectIncome(mh)||isIndirectIncome(mh); }
export function isExpense(mh) { return isDirectExpense(mh)||isIndirectExpense(mh); }

// ── SMART SUM: Opening Stock = first month only, Closing Stock = last month only ──
export function smartSum(rows, field="AMOUNT") {
  if (!rows||rows.length===0) return 0;
  const openingRows=rows.filter(isOpeningStock);
  const closingRows=rows.filter(isClosingStock);
  const normalRows=rows.filter(r=>!isOpeningStock(r)&&!isClosingStock(r));
  let total=normalRows.reduce((s,r)=>s+(parseFloat(r[field])||0),0);
  if (openingRows.length>0) {
    const months=MONTH_ORDER.filter(m=>openingRows.some(r=>r.MONTH===m));
    const first=months[0];
    total+=openingRows.filter(r=>r.MONTH===first).reduce((s,r)=>s+(parseFloat(r[field])||0),0);
  }
  if (closingRows.length>0) {
    const months=MONTH_ORDER.filter(m=>closingRows.some(r=>r.MONTH===m));
    const last=months[months.length-1];
    total+=closingRows.filter(r=>r.MONTH===last).reduce((s,r)=>s+(parseFloat(r[field])||0),0);
  }
  return total;
}

export function sumAmount(rows) { return rows.reduce((s,r)=>s+(parseFloat(r.AMOUNT)||0),0); }
export function sumBudget(rows) { return rows.reduce((s,r)=>s+(parseFloat(r.BUDGET)||0),0); }
export function sumCount(rows) { return rows.reduce((s,r)=>s+(parseFloat(r.COUNT)||0),0); }

// ── KPI CALCULATION ──
export function calcKPIs(data, excludedGroups=[]) {
  const filtered = excludedGroups.length>0 ? data.filter(r=>!excludedGroups.includes(r.GROUP)) : data;
  const diRows=filtered.filter(r=>isDirectIncome(r.MAIN_HEAD));
  const deRows=filtered.filter(r=>isDirectExpense(r.MAIN_HEAD));
  const iiRows=filtered.filter(r=>isIndirectIncome(r.MAIN_HEAD));
  const ieRows=filtered.filter(r=>isIndirectExpense(r.MAIN_HEAD));

  const grossRevenue=smartSum(diRows);
  const cogs=smartSum(deRows);
  const grossProfit=grossRevenue-cogs;
  const indirectIncome=smartSum(iiRows);
  const indirectExpense=smartSum(ieRows);
  const netProfit=grossProfit+indirectIncome-indirectExpense;
  const totalExpenses=cogs+indirectExpense;
  const totalIncome=grossRevenue+indirectIncome;
  const totalCount=sumCount(filtered);

  const budgetRevenue=sumBudget(diRows);
  const budgetExpense=sumBudget(deRows)+sumBudget(ieRows);
  const budgetProfit=budgetRevenue-budgetExpense;

  // Get unique MAIN HEAD labels for dynamic KPI display
  const mainHeadSums={};
  const mainHeads=[...new Set(filtered.map(r=>r.MAIN_HEAD).filter(Boolean))];
  mainHeads.forEach(mh=>{
    mainHeadSums[mh]=smartSum(filtered.filter(r=>r.MAIN_HEAD===mh));
  });

  // Data quality
  const unclassifiedCount=filtered.filter(r=>r.MAIN_HEAD&&!isDirectIncome(r.MAIN_HEAD)&&!isDirectExpense(r.MAIN_HEAD)&&!isIndirectIncome(r.MAIN_HEAD)&&!isIndirectExpense(r.MAIN_HEAD)).length;
  const blankMainHeadCount=filtered.filter(r=>!r.MAIN_HEAD).length;

  return {
    grossRevenue,cogs,grossProfit,
    grossMargin:grossRevenue?(grossProfit/grossRevenue)*100:0,
    indirectIncome,indirectExpense,
    netProfit,
    netMargin:grossRevenue?(netProfit/grossRevenue)*100:0,
    totalExpenses,totalIncome,totalCount,
    budgetRevenue,budgetExpense,budgetProfit,
    revenueVariance:grossRevenue-budgetRevenue,
    profitVariance:netProfit-budgetProfit,
    mainHeadSums,mainHeads,
    unclassifiedCount,blankMainHeadCount,
  };
}

// ── COST CLASSIFICATION ──
export function classifyCosts(data,costMap) {
  const expenseRows=data.filter(r=>isExpense(r.MAIN_HEAD));
  let fixed=0,variable=0,semi=0;
  expenseRows.forEach(row=>{
    const key=row.HEAD||row.GROUP||"";
    const c=costMap[key]||costMap[row.GROUP]||{type:"variable",fixedPct:0};
    const amt=Math.abs(parseFloat(row.AMOUNT)||0);
    if(c.type==="fixed") fixed+=amt;
    else if(c.type==="variable") variable+=amt;
    else if(c.type==="semi"){const fp=(c.fixedPct||50)/100;fixed+=amt*fp;variable+=amt*(1-fp);semi+=amt;}
  });
  return {fixed,variable,semi,total:fixed+variable};
}

// ── BREAK EVEN ──
export function calcBreakEven(revenue,fixedCosts,variableCosts) {
  if(revenue===0) return {bepRevenue:0,bepUnits:0,contributionMargin:0,marginOfSafety:0,contributionMarginRatio:0,variableCostRatio:0};
  const vcRatio=variableCosts/revenue;
  const cmRatio=1-vcRatio;
  const bepRevenue=cmRatio>0?fixedCosts/cmRatio:0;
  return {bepRevenue,contributionMarginRatio:cmRatio*100,contributionMargin:revenue-variableCosts,marginOfSafety:revenue>0?((revenue-bepRevenue)/revenue)*100:0,variableCostRatio:vcRatio*100};
}

// ── PROJECTION ──
export function calcProjection(currentKPI,fixedCosts,variableCosts,targetProfit) {
  const currentRevenue=currentKPI.grossRevenue;
  const variableRatio=currentRevenue>0?variableCosts/currentRevenue:0;
  const contributionRatio=1-variableRatio;
  const revenueNeeded=contributionRatio>0?(fixedCosts+targetProfit)/contributionRatio:0;
  const revenueIncrease=revenueNeeded-currentRevenue;
  const revenueIncreasePct=currentRevenue>0?(revenueIncrease/currentRevenue)*100:0;
  const maxAllowedCosts=currentRevenue-targetProfit;
  const costCutNeeded=(fixedCosts+variableCosts)-maxAllowedCosts;
  const costCutPct=(fixedCosts+variableCosts)>0?(costCutNeeded/(fixedCosts+variableCosts))*100:0;
  const mixedRevenue=currentRevenue+(revenueIncrease*0.5);
  const mixedCostCut=costCutNeeded*0.5;
  const mixedProfit=mixedRevenue*contributionRatio-fixedCosts;
  const maxRev=Math.max(revenueNeeded*1.2,currentRevenue*1.5);
  const profitCurve=Array.from({length:11},(_,i)=>{
    const rev=(maxRev/10)*i;
    const profit=rev-(rev*variableRatio)-fixedCosts;
    return {revenue:rev,profit,label:formatINR(rev,true)};
  });
  return {targetProfit,scenarios:{
    revenueOnly:{revenueNeeded,revenueIncrease,revenueIncreasePct,costCutNeeded:0},
    costOnly:{revenueNeeded:currentRevenue,revenueIncrease:0,costCutNeeded,costCutPct},
    mixed:{revenueNeeded:mixedRevenue,revenueIncrease:revenueIncrease*0.5,costCutNeeded:mixedCostCut,mixedProfit},
  },profitCurve};
}

// ── NUMBER FORMATTING ──
// format: "full" | "lakhs" | "crores" | "thousands" | "short"
export function formatAmount(val, format="lakhs") {
  if(val===null||val===undefined||isNaN(val)) return "₹0";
  const abs=Math.abs(val);
  const neg=val<0;
  let str;
  switch(format) {
    case "full":
      str=new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",minimumFractionDigits:2,maximumFractionDigits:2}).format(val);
      return str;
    case "thousands":
      str=`₹${(abs/1000).toFixed(2)}K`;
      return neg?`-${str}`:str;
    case "lakhs":
      if(abs>=10000000) { str=`₹${(abs/10000000).toFixed(2)}Cr`; return neg?`-${str}`:str; }
      str=`₹${(abs/100000).toFixed(2)}L`;
      return neg?`-${str}`:str;
    case "crores":
      str=`₹${(abs/10000000).toFixed(2)}Cr`;
      return neg?`-${str}`:str;
    case "short":
    default:
      if(abs>=10000000){str=`₹${(abs/10000000).toFixed(2)}Cr`;return neg?`-${str}`:str;}
      if(abs>=100000){str=`₹${(abs/100000).toFixed(2)}L`;return neg?`-${str}`:str;}
      if(abs>=1000){str=`₹${(abs/1000).toFixed(1)}K`;return neg?`-${str}`:str;}
      return `₹${val.toFixed(0)}`;
  }
}

// Legacy alias kept for backward compatibility
export function formatINR(val, short=false) {
  if(short) return formatAmount(val,"short");
  return new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(val||0);
}

export function formatPct(val) {
  if(isNaN(val)) return "0.0%";
  return `${val>=0?"+":""}${val.toFixed(1)}%`;
}

// ── UTILITIES ──
export function groupBy(arr,key) {
  return arr.reduce((acc,row)=>{
    const k=row[key]||"Unknown";
    if(!acc[k]) acc[k]=[];
    acc[k].push(row);
    return acc;
  },{});
}

export function monthlyTrend(data) {
  const byMonth=groupBy(data,"MONTH");
  return MONTH_ORDER.filter(m=>byMonth[m]).map(m=>{
    const rows=byMonth[m];
    const kpi=calcKPIs(rows);
    return {month:m.slice(0,3),revenue:kpi.grossRevenue,expenses:kpi.totalExpenses,profit:kpi.netProfit};
  });
}

export function getCostGroups(data) {
  const expenseRows=data.filter(r=>isExpense(r.MAIN_HEAD));
  const groups={};
  expenseRows.forEach(row=>{
    const key=row.GROUP||"Unknown";
    if(!groups[key]) groups[key]={group:key,heads:new Set(),total:0};
    if(row.HEAD) groups[key].heads.add(row.HEAD);
    groups[key].total+=Math.abs(parseFloat(row.AMOUNT)||0);
  });
  return Object.values(groups).map(g=>({...g,heads:[...g.heads]}));
}
