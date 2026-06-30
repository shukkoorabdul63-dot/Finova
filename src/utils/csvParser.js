import { normalizeMonth, normalizeFY } from "./monthNormalizer.js";

const HEADER_MAP = {
  "MAIN_HEAD": ["MAIN_HEAD","MAINHEAD","MAIN HEAD","MAIN-HEAD","CATEGORY","TYPE"],
  "SUBGROUP":  ["SUBGROUP","SUB_GROUP","SUB GROUP","SUB-GROUP"],
  "FY":        ["FY","FINANCIAL_YEAR","FINANCIAL YEAR","YEAR","F.Y."],
  "MONTH":     ["MONTH","MON","DATE","PERIOD"],
  "COMPANY":   ["COMPANY","FIRM","ORGANISATION","ORGANIZATION","ENTITY"],
  "BRANCH":    ["BRANCH","LOCATION","UNIT","CENTRE","CENTER"],
  "DEPARTMENT":["DEPARTMENT","DEPT","DIVISION","SEGMENT"],
  "GROUP":     ["GROUP","GRP","CATEGORY","HEAD_GROUP"],
  "HEAD":      ["HEAD","LEDGER","ACCOUNT","PARTICULARS","DESCRIPTION"],
  "AMOUNT":    ["AMOUNT","VALUE","AMT","DEBIT","CREDIT","NET_AMOUNT","NET AMOUNT"],
  "BUDGET":    ["BUDGET","BUDGETED","BUDGET_AMOUNT","BUDGET AMOUNT"],
  "COUNT":     ["COUNT","VOUCHER_COUNT","VOUCHER COUNT","QTY","QUANTITY","UNITS","NOS"],
};

function splitCSVLine(line) {
  const result = [];
  let cur = "", inQ = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') { inQ = !inQ; continue; }
    if (line[i] === "," && !inQ) { result.push(cur); cur = ""; continue; }
    cur += line[i];
  }
  result.push(cur);
  return result;
}

function detectDelimiter(line) {
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  const semis = (line.match(/;/g) || []).length;
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

function parseHeaders(headerLine, delimiter) {
  const raw = headerLine.split(delimiter).map(h => 
    h.trim().replace(/^"|"$/g, "").toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
  );
  const colIndex = {};
  for (const [canonical, variants] of Object.entries(HEADER_MAP)) {
    for (const v of variants) {
      const idx = raw.indexOf(v);
      if (idx !== -1 && colIndex[canonical] === undefined) {
        colIndex[canonical] = idx;
        break;
      }
    }
  }
  return { raw, colIndex };
}

// Parse a numeric string safely: strips thousand-separator commas, currency
// symbols, and surrounding whitespace before converting to a float.
function parseNumber(raw) {
  if (raw === undefined || raw === null || raw === "") return NaN;
  const cleaned = String(raw).replace(/[₹,\s]/g, "").replace(/^\((.*)\)$/, "-$1"); // (123) → -123 (accounting negative)
  return parseFloat(cleaned);
}

// Chunked async CSV parser with progress callback — quote-aware so commas
// inside quoted text fields (descriptions, ledger names) never shift columns.
export async function parseCSVChunked(text, onProgress) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error("File must have headers and at least one row of data");

  // Detect delimiter from first line
  const delimiter = detectDelimiter(lines[0]);
  const { raw, colIndex } = parseHeaders(lines[0], delimiter);

  if (colIndex.AMOUNT === undefined) {
    throw new Error(`Could not find AMOUNT column. Found columns: ${raw.slice(0,10).join(", ")}`);
  }

  const rows = [];
  let skippedRows = 0;
  const CHUNK = 2000;
  const total = lines.length;

  for (let i = 1; i < total; i += CHUNK) {
    const end = Math.min(i + CHUNK, total);
    for (let j = i; j < end; j++) {
      const line = lines[j].trim();
      if (!line) continue;

      // Quote-aware split (handles commas inside quoted text fields)
      const cols = delimiter === "," ? splitCSVLine(line) : line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ""));

      const amt = parseNumber(cols[colIndex.AMOUNT]);
      if (isNaN(amt)) { skippedRows++; continue; }

      const row = { AMOUNT: amt };
      for (const [key, idx] of Object.entries(colIndex)) {
        if (key === "AMOUNT") continue;
        row[key] = cols[idx]?.trim() || "";
      }

      // Normalize month and FY
      if (row.MONTH) row.MONTH = normalizeMonth(row.MONTH);
      if (row.FY) row.FY = normalizeFY(row.FY);
      row.BUDGET = parseNumber(cols[colIndex.BUDGET]) || 0;
      row.COUNT = parseNumber(cols[colIndex.COUNT]) || 0;

      rows.push(row);
    }

    if (onProgress) onProgress(Math.round((end / total) * 100));
    // Yield to browser to prevent freezing
    await new Promise(r => setTimeout(r, 0));
  }

  rows._skippedRows = skippedRows;
  return rows;
}

// Legacy sync parser (kept for compatibility)
export function parseCSV(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw new Error("CSV must have headers and at least one row");
  const delimiter = detectDelimiter(lines[0]);
  const { colIndex } = parseHeaders(lines[0], delimiter);
  if (colIndex.AMOUNT === undefined) throw new Error("Could not find AMOUNT column in CSV");

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = line.split(delimiter).map(c => c.trim().replace(/^"|"$/g, ""));
    const amt = parseFloat(cols[colIndex.AMOUNT]);
    if (isNaN(amt)) continue;
    const row = { AMOUNT: amt };
    for (const [key, idx] of Object.entries(colIndex)) {
      if (key === "AMOUNT") continue;
      row[key] = cols[idx]?.trim() || "";
    }
    if (row.MONTH) row.MONTH = normalizeMonth(row.MONTH);
    if (row.FY) row.FY = normalizeFY(row.FY);
    row.BUDGET = parseFloat(cols[colIndex.BUDGET]) || 0;
    row.COUNT = parseFloat(cols[colIndex.COUNT]) || 0;
    rows.push(row);
  }
  return rows;
}
