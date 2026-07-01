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

function detectDelimiter(firstLine) {
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semis = (firstLine.match(/;/g) || []).length;
  if (tabs > commas && tabs > semis) return "\t";
  if (semis > commas) return ";";
  return ",";
}

// Parse a numeric string safely: strips thousand-separator commas, currency
// symbols, Tally-style Dr/Cr suffixes, and surrounding whitespace before
// converting to a float. Treats common "nil value" placeholders as 0 instead
// of failing — Tally exports often use "-", "--", "NIL", or a blank cell to
// mean zero.
function parseNumber(raw) {
  if (raw === undefined || raw === null) return 0;
  let s = String(raw).trim();
  if (s === "" || s === "-" || s === "--" || /^nil$/i.test(s) || /^n\/?a$/i.test(s)) return 0;
  s = s.replace(/\s*(dr|cr)\.?$/i, "");
  const parenMatch = s.match(/^\((.*)\)$/);
  if (parenMatch) s = "-" + parenMatch[1];
  s = s.replace(/[₹,\s]/g, "");
  if (s === "" || s === "-") return 0;
  const n = parseFloat(s);
  return isNaN(n) ? NaN : n;
}

// ── TRUE STREAMING CSV TOKENIZER (RFC-4180 aware) ──
// Reads the ENTIRE text as one continuous character stream and only treats
// an unquoted newline as a row boundary. This is essential: some exports
// (Tally/Excel) embed a real line-break inside a quoted cell (e.g. a ledger
// name someone pasted multi-line text into). A naive "split by line first"
// parser slices that single record into two broken halves and scrambles
// every column from that point in the row — this tokenizer never does that,
// because quote state is tracked across the whole file, not per line.
function createCSVTokenizer(delimiter) {
  let field = "";
  let row = [];
  let inQuotes = false;
  const rows = [];

  function feed(chunk) {
    const len = chunk.length;
    for (let i = 0; i < len; i++) {
      const ch = chunk[i];
      if (inQuotes) {
        if (ch === '"') {
          if (chunk[i + 1] === '"') { field += '"'; i++; }
          else { inQuotes = false; }
        } else {
          field += ch;
        }
        continue;
      }
      if (ch === '"') { inQuotes = true; continue; }
      if (ch === delimiter) { row.push(field); field = ""; continue; }
      if (ch === "\r") { continue; }
      if (ch === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
      field += ch;
    }
  }
  function finish() {
    if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }
  }
  return { feed, finish, rows };
}

function mapHeaderIndexes(headerCells) {
  const raw = headerCells.map(h =>
    h.trim().replace(/^"|"$/g, "").toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "")
  );
  const colIndex = {};
  for (const [canonical, variants] of Object.entries(HEADER_MAP)) {
    for (const v of variants) {
      const idx = raw.indexOf(v);
      if (idx !== -1 && colIndex[canonical] === undefined) { colIndex[canonical] = idx; break; }
    }
  }
  return { raw, colIndex };
}

function buildRow(cols, colIndex) {
  const amt = parseNumber(cols[colIndex.AMOUNT]);
  if (isNaN(amt)) return null;
  const row = { AMOUNT: amt };
  for (const [key, idx] of Object.entries(colIndex)) {
    if (key === "AMOUNT") continue;
    row[key] = (cols[idx] !== undefined ? cols[idx] : "").trim();
  }
  if (row.MONTH) row.MONTH = normalizeMonth(row.MONTH);
  if (row.FY) row.FY = normalizeFY(row.FY);
  row.BUDGET = parseNumber(cols[colIndex.BUDGET]) || 0;
  row.COUNT = parseNumber(cols[colIndex.COUNT]) || 0;
  return row;
}

// Chunked async parser with progress callback. Feeds the tokenizer in large
// character slices (not line slices) so quote state correctly survives
// across chunk boundaries, then yields to the browser between slices so
// large files (1L+ rows) don't freeze the UI.
export async function parseCSVChunked(text, onProgress) {
  if (!text || !text.trim()) throw new Error("File is empty");

  const firstLineEnd = text.indexOf("\n");
  const firstLine = (firstLineEnd === -1 ? text : text.slice(0, firstLineEnd)).replace(/\r$/, "");
  const delimiter = detectDelimiter(firstLine);

  const tokenizer = createCSVTokenizer(delimiter);
  const CHUNK_CHARS = 300000;
  const total = text.length;

  for (let pos = 0; pos < total; pos += CHUNK_CHARS) {
    tokenizer.feed(text.slice(pos, pos + CHUNK_CHARS));
    if (onProgress) onProgress(Math.min(99, Math.round(((pos + CHUNK_CHARS) / total) * 100)));
    await new Promise(r => setTimeout(r, 0));
  }
  tokenizer.finish();

  const allRows = tokenizer.rows.filter(r => !(r.length === 1 && r[0].trim() === ""));
  if (allRows.length < 2) throw new Error("File must have headers and at least one row of data");

  const { raw, colIndex } = mapHeaderIndexes(allRows[0]);
  if (colIndex.AMOUNT === undefined) {
    throw new Error(`Could not find AMOUNT column. Found columns: ${raw.slice(0, 10).join(", ")}`);
  }

  const rows = [];
  let skippedRows = 0;
  for (let r = 1; r < allRows.length; r++) {
    const built = buildRow(allRows[r], colIndex);
    if (built === null) { skippedRows++; continue; }
    rows.push(built);
  }

  if (onProgress) onProgress(100);
  rows._skippedRows = skippedRows;
  return rows;
}

// Legacy sync parser (kept for compatibility) — same tokenizer, no chunking.
export function parseCSV(text) {
  if (!text || !text.trim()) throw new Error("CSV must have headers and at least one row");
  const firstLineEnd = text.indexOf("\n");
  const firstLine = (firstLineEnd === -1 ? text : text.slice(0, firstLineEnd)).replace(/\r$/, "");
  const delimiter = detectDelimiter(firstLine);

  const tokenizer = createCSVTokenizer(delimiter);
  tokenizer.feed(text);
  tokenizer.finish();

  const allRows = tokenizer.rows.filter(r => !(r.length === 1 && r[0].trim() === ""));
  if (allRows.length < 2) throw new Error("CSV must have headers and at least one row");

  const { colIndex } = mapHeaderIndexes(allRows[0]);
  if (colIndex.AMOUNT === undefined) throw new Error("Could not find AMOUNT column in CSV");

  const rows = [];
  for (let r = 1; r < allRows.length; r++) {
    const built = buildRow(allRows[r], colIndex);
    if (built !== null) rows.push(built);
  }
  return rows;
}
