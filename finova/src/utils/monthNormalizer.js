export const MONTH_NAMES = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// Build lookup maps
const SHORT_TO_FULL = {};
const FULL_TO_IDX = {};
MONTH_SHORT.forEach((s, i) => { SHORT_TO_FULL[s.toLowerCase()] = MONTH_NAMES[i]; });
MONTH_NAMES.forEach((m, i) => { FULL_TO_IDX[m.toLowerCase()] = i; });

function pad(n) { return String(parseInt(n)).padStart(2, "0"); }

function numToMonth(n) {
  const idx = parseInt(n) - 1;
  return (idx >= 0 && idx < 12) ? MONTH_NAMES[idx] : null;
}

export function normalizeMonth(raw) {
  if (!raw) return "";
  const s = String(raw).trim();

  // Already full name: "April", "april", "APRIL"
  const lower = s.toLowerCase();
  if (FULL_TO_IDX[lower] !== undefined) return MONTH_NAMES[FULL_TO_IDX[lower]];

  // Short name: "Apr", "apr"
  if (SHORT_TO_FULL[lower]) return SHORT_TO_FULL[lower];

  // "Apr-24", "Apr-2024", "Apr 24", "Apr/2024"
  const m1 = s.match(/^([A-Za-z]{3,})[-\s\/](\d{2,4})$/);
  if (m1) {
    const full = MONTH_NAMES.find(m => m.toLowerCase() === m1[1].toLowerCase());
    if (full) return full;
    const short = SHORT_TO_FULL[m1[1].toLowerCase()];
    if (short) return short;
  }

  // DD-MM-YYYY or DD/MM/YYYY (Indian format)
  const m2 = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (m2) {
    const month = numToMonth(m2[2]); // second segment = month in DD/MM/YYYY
    if (month) return month;
  }

  // YYYY-MM-DD (ISO format)
  const m3 = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (m3) {
    const month = numToMonth(m3[2]);
    if (month) return month;
  }

  // MM/YYYY or MM-YYYY
  const m4 = s.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (m4) {
    const month = numToMonth(m4[1]);
    if (month) return month;
  }

  // "01-Apr-2024" or "01-Apr-24" (Tally style)
  const m5 = s.match(/^(\d{1,2})[-\s]([A-Za-z]{3,})[-\s](\d{2,4})$/);
  if (m5) {
    const full = MONTH_NAMES.find(m => m.toLowerCase() === m5[2].toLowerCase());
    if (full) return full;
    const short = SHORT_TO_FULL[m5[2].toLowerCase()];
    if (short) return short;
  }

  // Pure number "04", "4"
  if (/^\d{1,2}$/.test(s)) {
    const month = numToMonth(s);
    if (month) return month;
  }

  return s; // Return as-is if nothing matched
}

// Normalize FY format to "YYYY-YY" style: "2024-25", "FY2024", "24-25", etc.
export function normalizeFY(raw) {
  if (!raw) return "";
  const s = String(raw).trim();

  // Already correct: "2024-25"
  if (/^\d{4}-\d{2}$/.test(s)) return s;

  // "2024-2025"
  const m1 = s.match(/^(\d{4})-(\d{4})$/);
  if (m1) return `${m1[1]}-${m1[2].slice(2)}`;

  // "FY2024", "FY 2024"
  const m2 = s.match(/^FY\s*(\d{4})$/i);
  if (m2) { const y = parseInt(m2[1]); return `${y}-${String(y+1).slice(2)}`; }

  // "24-25"
  const m3 = s.match(/^(\d{2})-(\d{2})$/);
  if (m3) return `20${m3[1]}-${m3[2]}`;

  // "2024"
  if (/^\d{4}$/.test(s)) { const y = parseInt(s); return `${y}-${String(y+1).slice(2)}`; }

  return s;
}
