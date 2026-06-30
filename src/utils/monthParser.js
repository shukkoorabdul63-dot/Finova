const MONTH_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const LOOKUP = {};
MONTH_FULL.forEach((m, i) => {
  LOOKUP[m.toLowerCase()] = m;
  LOOKUP[MONTH_SHORT[i].toLowerCase()] = m;
  LOOKUP[String(i + 1)] = m;
  LOOKUP[String(i + 1).padStart(2, '0')] = m;
});

export const MONTH_ORDER = MONTH_FULL;

export function parseMonth(raw) {
  if (raw === null || raw === undefined || raw === '') return '';
  const s = String(raw).trim();
  if (!s) return '';

  // Direct lookup (April, Apr, 4, 04)
  const lo = s.toLowerCase().replace(/[.\s]+/g, '');
  if (LOOKUP[lo]) return LOOKUP[lo];

  // "Apr-24", "Apr-2024", "April-24", "April-2024"
  const mYear = s.match(/^([a-zA-Z]+)[-\/\s](\d{2,4})$/);
  if (mYear && LOOKUP[mYear[1].toLowerCase()]) return LOOKUP[mYear[1].toLowerCase()];

  // "01-04-2024" or "01/04/2024" — Indian DD-MM-YYYY format
  const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{2,4})$/);
  if (dmy) {
    const m = LOOKUP[dmy[2].padStart(2, '0')];
    if (m) return m;
  }

  // "2024-04-01" ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (iso) {
    const m = LOOKUP[iso[2].padStart(2, '0')];
    if (m) return m;
  }

  // "04-2024" or "04/2024" MM-YYYY
  const my = s.match(/^(\d{1,2})[-\/](\d{4})$/);
  if (my) {
    const m = LOOKUP[my[1].padStart(2, '0')];
    if (m) return m;
  }

  // "2024-04" YYYY-MM
  const ym = s.match(/^(\d{4})[-\/](\d{1,2})$/);
  if (ym) {
    const m = LOOKUP[ym[2].padStart(2, '0')];
    if (m) return m;
  }

  // "April 2024" or "April 24"
  const mSpace = s.match(/^([a-zA-Z]+)\s+(\d{2,4})$/);
  if (mSpace && LOOKUP[mSpace[1].toLowerCase()]) return LOOKUP[mSpace[1].toLowerCase()];

  // Last resort: try JS Date parser
  try {
    const d = new Date(s);
    if (!isNaN(d.getTime())) return MONTH_FULL[d.getMonth()];
  } catch (_) {}

  return s; // return as-is if can't parse
}

export function parseFYFromDate(raw) {
  const s = String(raw || '').trim();
  let month = 0, year = 0;

  // DD-MM-YYYY (Indian)
  const dmy = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
  if (dmy) { month = parseInt(dmy[2]); year = parseInt(dmy[3]); }

  // YYYY-MM-DD
  const ymd = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/);
  if (ymd) { month = parseInt(ymd[2]); year = parseInt(ymd[1]); }

  // Apr-24, Apr-2024
  const my = s.match(/^([a-zA-Z]+)[-\/\s](\d{2,4})$/);
  if (my) {
    const mName = LOOKUP[my[1].toLowerCase()];
    if (mName) {
      month = MONTH_FULL.indexOf(mName) + 1;
      year = parseInt(my[2]);
      if (year < 100) year += 2000;
    }
  }

  if (!month || !year) return '';
  // Indian FY: Apr(4) to Mar(3)
  return month >= 4
    ? `${year}-${String(year + 1).slice(2)}`
    : `${year - 1}-${String(year).slice(2)}`;
}
