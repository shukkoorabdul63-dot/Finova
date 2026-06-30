# Finova — Deployment Guide

## What is Finova?
A universal financial dashboard that accepts CSV/Excel uploads and provides:
- KPI cards (Revenue, COGS, Gross Profit, Net Profit, Margins)
- Performance trend charts
- Monthly P&L statement (drill down by MAIN HEAD → GROUP → SUBGROUP)
- Branch Analysis with department breakdown
- Year over Year comparison
- Cash Flow tracking
- **Finova AI** — Claude-powered chat to query your financial data

---

## Data Format

Your CSV/Excel must have **AMOUNT** column. All others are optional:

| Column | Example | Notes |
|--------|---------|-------|
| FY | 2024-25 | Financial year |
| MONTH | April | Full month name |
| COMPANY | AM Wings Honda | Multi-company support |
| BRANCH | AMP | Branch code or name |
| DEPARTMENT | SALES | e.g. SALES, SERVICE, SPARE |
| MAIN HEAD | Direct Income | Trading / Direct Income / Indirect Income / Direct Expense / Indirect Expense |
| GROUP | Vehicle Sales | Group under main head |
| SUBGROUP | New Cars | Optional sub-grouping |
| HEAD | Maruti Swift | Specific ledger |
| **AMOUNT** | 150000 | **Required** |
| COUNT | 5 | Flexible: vouchers / units / jobs |

---

## Deployment on Vercel (Free)

### Step 1 — Push to GitHub
1. Go to [github.com](https://github.com) → **New repository**
2. Name it `finova` → Create
3. Upload all files from this zip (drag & drop in GitHub UI)
   OR use Git:
   ```bash
   cd finova
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/finova.git
   git push -u origin main
   ```

### Step 2 — Deploy on Vercel
1. Go to [vercel.com](https://vercel.com) → Sign up with GitHub
2. Click **Add New → Project**
3. Import your `finova` GitHub repo
4. Settings will auto-detect (Vite framework)
5. Click **Deploy**
6. Done! You'll get a URL like `finova-xyz.vercel.app`

### Step 3 — Set up Claude AI (for Finova AI feature)
The AI chat uses Claude API. To enable it:

1. Go to [console.anthropic.com](https://console.anthropic.com)
2. Create an API key
3. In Vercel → Your Project → Settings → **Environment Variables**
4. Add: `VITE_ANTHROPIC_API_KEY = your_key_here`

> **Note:** For a production app, you should proxy the API call through a backend (Next.js API route or Express) to keep the API key secret. For internal team use, the current setup works fine.

---

## Running Locally

```bash
# Unzip and enter folder
cd finova

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

---

## Customization

### Rename from "Finova"
- `index.html` → change `<title>`
- `src/components/Sidebar.jsx` → change logo text
- `src/pages/AIChat.jsx` → change AI name

### Add more KPI cards
Edit `src/pages/Dashboard.jsx` → `kpi-grid` section

### Change color accent
Edit `src/index.css` → `--accent: #7c6af7` (change hex)

---

## Tech Stack
- React 18 + Vite
- Recharts (charts)
- SheetJS/xlsx (Excel parsing)
- Claude API (AI chat)
- Deployed on Vercel

---

Built with ❤️ using Claude
