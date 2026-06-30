import { useState, useRef, useEffect, useMemo } from "react";
import { useData } from "../context/DataContext";
import { useAI } from "../context/AIContext";
import { AI_MODELS, callAI, parseAIResponse } from "../utils/aiEngine";
import { calcKPIs, formatINR, sumAmount } from "../utils/finance";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#7c6af7","#22d3a5","#f97316","#3b82f6","#ec4899","#a855f7","#14b8a6","#f59e0b","#ef4444","#06b6d4","#84cc16"];

const SUGGESTIONS = [
  "Which branch has the highest net profit?",
  "Show a bar chart of branch-wise revenue",
  "What is the gross margin percentage?",
  "Show monthly profit trend as a line chart",
  "Compare department-wise performance",
  "Create a pie chart of expense breakdown",
  "Which month had the highest revenue?",
  "What are the top 5 expense categories?",
];

function buildDataContext(data) {
  if (!data || data.length === 0) return "No financial data has been loaded yet.";
  const kpi = calcKPIs(data);
  const branches = [...new Set(data.map(r => r.BRANCH).filter(Boolean))];
  const depts = [...new Set(data.map(r => r.DEPARTMENT).filter(Boolean))];
  const fys = [...new Set(data.map(r => r.FY).filter(Boolean))];
  const months = [...new Set(data.map(r => r.MONTH).filter(Boolean))];
  const companies = [...new Set(data.map(r => r.COMPANY).filter(Boolean))];

  const branchSummary = branches.map(b => {
    const rows = data.filter(r => r.BRANCH === b);
    const k = calcKPIs(rows);
    return `${b}: Revenue=${formatINR(k.grossRevenue,true)}, NetProfit=${formatINR(k.netProfit,true)}, Margin=${k.netMargin.toFixed(1)}%, Count=${k.totalCount}`;
  }).join("\n");

  const deptSummary = depts.map(d => {
    const rows = data.filter(r => r.DEPARTMENT === d);
    const k = calcKPIs(rows);
    return `${d}: Revenue=${formatINR(k.grossRevenue,true)}, NetProfit=${formatINR(k.netProfit,true)}`;
  }).join("\n");

  const mhSummary = [...new Set(data.map(r => r.MAIN_HEAD).filter(Boolean))].map(mh =>
    `${mh}: ${formatINR(sumAmount(data.filter(r => r.MAIN_HEAD === mh)), true)}`
  ).join("\n");

  const monthSummary = months.map(m => {
    const rows = data.filter(r => r.MONTH === m);
    const k = calcKPIs(rows);
    return `${m}: Revenue=${formatINR(k.grossRevenue,true)}, Profit=${formatINR(k.netProfit,true)}`;
  }).join("\n");

  return `FINANCIAL DATA SUMMARY\n======================\nRows: ${data.length.toLocaleString()}\nFY: ${fys.join(", ")||"N/A"}\nMonths: ${months.join(", ")||"N/A"}\nCompanies: ${companies.join(", ")||"N/A"}\nBranches: ${branches.join(", ")||"N/A"}\nDepartments: ${depts.join(", ")||"N/A"}\n\nKPIs\n====\nGross Revenue: ${formatINR(kpi.grossRevenue)}\nCOGS: ${formatINR(kpi.cogs)}\nGross Profit: ${formatINR(kpi.grossProfit)} (${kpi.grossMargin.toFixed(1)}%)\nIndirect Income: ${formatINR(kpi.indirectIncome)}\nIndirect Expense: ${formatINR(kpi.indirectExpense)}\nNet Profit: ${formatINR(kpi.netProfit)} (${kpi.netMargin.toFixed(1)}%)\nCount: ${kpi.totalCount.toLocaleString()}\n\nBY BRANCH\n=========\n${branchSummary||"None"}\n\nBY DEPARTMENT\n=============\n${deptSummary||"None"}\n\nBY MAIN HEAD\n============\n${mhSummary||"None"}\n\nBY MONTH\n========\n${monthSummary||"None"}`;
}

function buildSystemPrompt(dataContext, chartModeOn) {
  const chartBlock = chartModeOn ? `\n\nCHART GENERATION:\nWhen user asks for a chart/graph/visualization, include this EXACT block:\n<<<CHART>>>\n{"chartType":"bar","title":"Chart Title","data":[{"name":"Label","value":123}],"xKey":"name","yKey":"value","color":"#7c6af7"}\n<<<END_CHART>>>\nchartType options: "bar","line","area","pie","donut"\nUse REAL numbers from the data summary. One chart per response only.` : "";
  return `You are Finova AI, an expert financial analyst. Answer questions about the user's financial data accurately. Use Indian number formatting (Lakhs/Crores). Be concise but insightful.${chartBlock}\n\nDATA:\n${dataContext}`;
}

function DynamicChart({ config }) {
  if (!config || !config.data || config.data.length === 0) return null;
  const { chartType, title, data, xKey="name", yKey="value", color="#7c6af7" } = config;
  const fmt = v => formatINR(v, true);
  const tt = { contentStyle: { background:"var(--card-bg)", border:"1px solid var(--border)", borderRadius:8, color:"var(--text)", fontSize:12 }};
  const ax = { tick:{fill:"var(--text-muted)",fontSize:10}, axisLine:false, tickLine:false };

  if (chartType === "pie" || chartType === "donut") {
    return (
      <div className="ai-chart-wrap">
        {title && <div className="ai-chart-title">{title}</div>}
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" outerRadius={90} innerRadius={chartType==="donut"?50:0}
              dataKey={yKey} nameKey={xKey} label={({name,percent})=>`${name} ${(percent*100).toFixed(0)}%`} labelLine={false} fontSize={10}>
              {data.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
            </Pie>
            <Tooltip formatter={v=>fmt(v)} {...tt}/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    );
  }
  if (chartType === "line") return (
    <div className="ai-chart-wrap">
      {title && <div className="ai-chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{top:5,right:10,left:0,bottom:5}}>
          <XAxis dataKey={xKey} {...ax}/><YAxis tickFormatter={fmt} {...ax} width={60}/>
          <Tooltip formatter={v=>fmt(v)} {...tt}/>
          <Line type="monotone" dataKey={yKey} stroke={color} strokeWidth={2.5} dot={false}/>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
  if (chartType === "area") return (
    <div className="ai-chart-wrap">
      {title && <div className="ai-chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{top:5,right:10,left:0,bottom:5}}>
          <defs><linearGradient id="aig" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={color} stopOpacity={0.3}/><stop offset="95%" stopColor={color} stopOpacity={0}/></linearGradient></defs>
          <XAxis dataKey={xKey} {...ax}/><YAxis tickFormatter={fmt} {...ax} width={60}/>
          <Tooltip formatter={v=>fmt(v)} {...tt}/>
          <Area type="monotone" dataKey={yKey} stroke={color} fill="url(#aig)" strokeWidth={2}/>
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
  return (
    <div className="ai-chart-wrap">
      {title && <div className="ai-chart-title">{title}</div>}
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{top:5,right:10,left:0,bottom:5}}>
          <XAxis dataKey={xKey} {...ax}/><YAxis tickFormatter={fmt} {...ax} width={60}/>
          <Tooltip formatter={v=>fmt(v)} {...tt}/>
          <Bar dataKey={yKey} fill={color} radius={[4,4,0,0]}/>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function AISettingsPanel({ onClose }) {
  const { selectedModel, setSelectedModel, apiKeys, setApiKey, chartModeOn, setChartModeOn } = useAI();
  const [localKeys, setLocalKeys] = useState({...apiKeys});
  const providersSeen = new Set();
  return (
    <div className="ai-settings">
      <div className="ai-settings-header">
        <span>⚙ AI Settings</span>
        <button onClick={()=>{ Object.entries(localKeys).forEach(([p,k])=>setApiKey(p,k)); onClose(); }} className="upload-btn" style={{padding:"4px 12px",fontSize:12}}>Save & Close</button>
      </div>
      <div className="settings-section">
        <div className="settings-label">Model</div>
        <div className="model-grid">
          {AI_MODELS.map(m=>(
            <button key={m.id} className={`model-btn ${selectedModel===m.id?"active":""}`} onClick={()=>setSelectedModel(m.id)}>
              <span className="model-icon" style={{background:m.color}}>{m.icon}</span>
              <div><div className="model-name">{m.name}</div><div className="model-provider">{m.providerLabel} • {m.free?"🆓 Free":"💳 Paid"}</div></div>
            </button>
          ))}
        </div>
      </div>
      <div className="settings-section">
        <div className="settings-label">API Keys</div>
        {AI_MODELS.filter(m=>{ if(providersSeen.has(m.provider)) return false; providersSeen.add(m.provider); return true; }).map(m=>(
          <div key={m.provider} className="key-row">
            <div className="key-label"><span className="model-icon-sm" style={{background:m.color}}>{m.icon}</span> {m.keyLabel} <a href={m.keyUrl} target="_blank" rel="noreferrer" className="key-link">Get →</a></div>
            <input type="password" className="key-input" placeholder={`Paste ${m.providerLabel} API key...`}
              value={localKeys[m.provider]||""} onChange={e=>setLocalKeys(k=>({...k,[m.provider]:e.target.value}))}/>
          </div>
        ))}
      </div>
      <div className="settings-section">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div><div className="settings-label">AI Chart Generation</div><div style={{fontSize:11,color:"var(--text-muted)"}}>AI builds charts when you describe them</div></div>
          <button className={`toggle-pill ${chartModeOn?"on":""}`} onClick={()=>setChartModeOn(!chartModeOn)}>{chartModeOn?"ON":"OFF"}</button>
        </div>
      </div>
    </div>
  );
}

export default function AIChat() {
  const { data } = useData();
  const { selectedModel, getApiKey, chartModeOn, getCurrentModel } = useAI();
  const [messages, setMessages] = useState([
    { role:"assistant", type:"text", text:"Hi! I'm Finova AI. Ask me anything about your financial data, or ask me to generate charts — just say something like \"show me a bar chart of branch revenue\"!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const bottomRef = useRef();
  const currentModel = getCurrentModel();
  const dataContext = useMemo(()=>buildDataContext(data),[data]);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages]);

  async function send(text) {
    const userMsg = text || input.trim();
    if (!userMsg || loading) return;
    setInput("");
    setMessages(m=>[...m,{role:"user",type:"text",text:userMsg}]);
    setLoading(true);
    const apiKey = getApiKey(selectedModel);
    const systemPrompt = buildSystemPrompt(dataContext, chartModeOn);
    const history = messages.slice(-8).map(m=>({role:m.role==="user"?"user":"assistant",content:m.text}));
    try {
      const raw = await callAI({ modelId:selectedModel, apiKey, messages:[...history,{role:"user",content:userMsg}], systemPrompt });
      const parsed = parseAIResponse(raw);
      setMessages(m=>[...m,{role:"assistant",...parsed}]);
    } catch(e) {
      setMessages(m=>[...m,{role:"assistant",type:"text",text:`⚠ ${e.message}\n\nClick ⚙ to add your API key.`}]);
    }
    setLoading(false);
  }

  return (
    <div className="page ai-page">
      <div className="page-header" style={{marginBottom:"0.5rem"}}>
        <h1>Finova AI <span className="badge">BETA</span></h1>
        <div style={{display:"flex",gap:"0.5rem",alignItems:"center"}}>
          {data.length>0?<span className="row-count">{data.length.toLocaleString()} rows</span>:<span className="row-count warning">⚠ No data</span>}
          <div className="model-indicator" style={{background:currentModel.color+"22",color:currentModel.color,border:`1px solid ${currentModel.color}44`}}>
            {currentModel.icon} {currentModel.name}
          </div>
          <button className="icon-btn" onClick={()=>setShowSettings(s=>!s)} title="Settings">⚙</button>
        </div>
      </div>

      {showSettings && <AISettingsPanel onClose={()=>setShowSettings(false)}/>}

      <div className="chat-container">
        <div className="chat-messages">
          {messages.map((m,i)=>(
            <div key={i} className={`chat-msg ${m.role==="user"?"user":"assistant"}`}>
              {m.role==="assistant" && <div className="chat-avatar" style={{background:currentModel.color+"22",borderColor:currentModel.color+"88"}}><span style={{color:currentModel.color}}>{currentModel.icon}</span></div>}
              <div className="chat-bubble-wrap">
                {m.text && <div className="chat-bubble">{m.text}</div>}
                {m.type==="chart" && m.chart && <DynamicChart config={m.chart}/>}
              </div>
            </div>
          ))}
          {loading && (
            <div className="chat-msg assistant">
              <div className="chat-avatar" style={{background:currentModel.color+"22",borderColor:currentModel.color+"88"}}><span style={{color:currentModel.color}}>{currentModel.icon}</span></div>
              <div className="chat-bubble typing"><span></span><span></span><span></span></div>
            </div>
          )}
          <div ref={bottomRef}/>
        </div>
        {messages.length<=1 && <div className="suggestions">{SUGGESTIONS.map(s=><button key={s} className="suggestion-chip" onClick={()=>send(s)}>{s}</button>)}</div>}
        <div className="chat-input-row">
          <input className="chat-input" value={input} onChange={e=>setInput(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
            placeholder={chartModeOn?"Ask anything or say 'show me a chart of...'":"Ask anything about your data..."}
            disabled={loading}/>
          <button className="send-btn" onClick={()=>send()} disabled={loading||!input.trim()}>{loading?"⟳":"↑"}</button>
        </div>
      </div>
    </div>
  );
}
