import { useState, useRef } from "react";
import { useData } from "../context/DataContext";
import { parseCSVChunked } from "../utils/csvParser";
import { calcKPIs } from "../utils/finance";
import * as XLSX from "xlsx";

export default function UploadModal({ onClose }) {
  const { setRawData } = useData();
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const [qualityWarning, setQualityWarning] = useState(null);
  const fileRef = useRef();

  async function handleFile(file) {
    if (!file) return;
    setStatus("loading");
    setProgress(0);
    setQualityWarning(null);
    setMessage(`Reading ${file.name}...`);

    try {
      let csvText;
      const name = file.name.toLowerCase();

      if (name.endsWith(".csv")) {
        csvText = await file.text();
      } else if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
        setMessage("Converting Excel to CSV...");
        const ab = await file.arrayBuffer();
        const wb = XLSX.read(ab);
        const ws = wb.Sheets[wb.SheetNames[0]];
        csvText = XLSX.utils.sheet_to_csv(ws);
      } else {
        throw new Error("Please upload a .csv, .xlsx, or .xls file");
      }

      setMessage("Parsing data...");
      const rows = await parseCSVChunked(csvText, (pct) => {
        setProgress(pct);
        setMessage(`Parsing... ${pct}%`);
      });

      if (rows.length === 0) throw new Error("No valid rows found. Check your AMOUNT column.");

      // Data quality check
      const kpi = calcKPIs(rows);
      const issues = [];
      if (kpi.blankMainHeadCount > 0) issues.push(`${kpi.blankMainHeadCount.toLocaleString("en-IN")} rows have a blank MAIN HEAD — they're excluded from P&L`);
      if (kpi.unclassifiedCount > 0) issues.push(`${kpi.unclassifiedCount.toLocaleString("en-IN")} rows have a MAIN HEAD that doesn't match Direct/Indirect Income/Expense — they're excluded from P&L`);
      if (rows._skippedRows > 0) issues.push(`${rows._skippedRows.toLocaleString("en-IN")} rows were skipped (invalid/missing AMOUNT)`);

      setRawData(rows);

      if (issues.length > 0) {
        setQualityWarning(issues);
        setStatus("warning");
        setMessage(`✓ ${rows.length.toLocaleString("en-IN")} rows loaded — but see warnings below`);
      } else {
        setStatus("success");
        setMessage(`✓ ${rows.length.toLocaleString("en-IN")} rows loaded successfully`);
        setProgress(100);
        setTimeout(onClose, 1200);
      }
    } catch (e) {
      setStatus("error");
      setMessage(`Error: ${e.message}`);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Import Financial Data</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div
          className={`drop-zone ${dragOver ? "drag-over" : ""} ${status === "warning" ? "success" : status}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          onClick={() => status === "idle" && fileRef.current.click()}
        >
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }}
            onChange={e => handleFile(e.target.files[0])} />

          {status === "loading" && <div className="upload-spinner">⟳</div>}
          {(status === "success" || status === "warning") && <div className="upload-success">✓</div>}
          {status === "error" && <div className="upload-error">✕</div>}
          {status === "idle" && <div className="upload-icon">↑</div>}

          <div className="drop-label">{status === "idle" ? "Drop your CSV or Excel file here" : message}</div>
          {status === "idle" && <div className="drop-sub">or click to browse • supports .csv, .xlsx, .xls</div>}

          {status === "loading" && (
            <div className="progress-bar-wrap">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>

        {qualityWarning && (
          <div className="quality-warning">
            <div className="quality-warning-title">⚠ Data Quality Warnings</div>
            {qualityWarning.map((w, i) => <div key={i} className="quality-warning-item">• {w}</div>)}
            <button className="upload-btn" style={{ marginTop: "0.75rem", fontSize: 12, padding: "5px 14px" }} onClick={onClose}>
              Continue Anyway
            </button>
          </div>
        )}

        {!qualityWarning && (
          <div className="schema-hint">
            <div className="schema-title">Supported columns (AMOUNT required, rest optional):</div>
            <div className="schema-cols">
              {["FY","MONTH","COMPANY","BRANCH","DEPARTMENT","MAIN HEAD","GROUP","SUBGROUP","HEAD","AMOUNT","BUDGET","COUNT"].map(c => (
                <span key={c} className={`schema-tag ${c === "AMOUNT" ? "required" : ""}`}>{c}</span>
              ))}
            </div>
            <div className="schema-note">
              Month formats accepted: April • Apr • 04 • 4 • Apr-24 • Apr-2024 • 01-04-2024 • 2024-04-01<br/>
              MAIN HEAD must contain: Direct Income, Direct Expense, Indirect Income, or Indirect Expense
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
