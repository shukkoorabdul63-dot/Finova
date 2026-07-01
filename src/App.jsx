import { useState } from "react";
import { DataProvider } from "./context/DataContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CostProvider } from "./context/CostContext";
import { AIProvider } from "./context/AIContext";
import { FormatProvider } from "./context/FormatContext";
import { CategoryProvider } from "./context/CategoryContext";
import { UnitProfileProvider } from "./context/UnitProfileContext";
import Sidebar from "./components/Sidebar";
import TopBar from "./components/TopBar";
import Dashboard from "./pages/Dashboard";
import Counts from "./pages/Counts";
import PnL from "./pages/PnL";
import BranchAnalysis from "./pages/BranchAnalysis";
import YearOverYear from "./pages/YearOverYear";
import CashFlow from "./pages/CashFlow";
import AIChat from "./pages/AIChat";
import CostClassifier from "./pages/CostClassifier";
import BreakEven from "./pages/BreakEven";
import BudgetVsActual from "./pages/BudgetVsActual";
import Projection from "./pages/Projection";
import ChartBuilder from "./pages/ChartBuilder";
import UploadModal from "./components/UploadModal";

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [showUpload, setShowUpload] = useState(false);

  const pages = {
    dashboard: <Dashboard />,
    counts: <Counts />,
    pnl: <PnL />,
    branch: <BranchAnalysis />,
    yoy: <YearOverYear />,
    cashflow: <CashFlow />,
    costs: <CostClassifier />,
    breakeven: <BreakEven />,
    budget: <BudgetVsActual />,
    projection: <Projection />,
    chartbuilder: <ChartBuilder />,
    ai: <AIChat />,
  };

  return (
    <ThemeProvider>
      <FormatProvider>
        <DataProvider>
          <CostProvider>
            <CategoryProvider>
              <UnitProfileProvider>
                <AIProvider>
                  <div className="app-shell">
                    <Sidebar page={page} setPage={setPage} />
                    <div className="main-area">
                      <TopBar onUpload={() => setShowUpload(true)} />
                      <div className="page-content">{pages[page]}</div>
                    </div>
                    {showUpload && <UploadModal onClose={() => setShowUpload(false)} />}
                  </div>
                </AIProvider>
              </UnitProfileProvider>
            </CategoryProvider>
          </CostProvider>
        </DataProvider>
      </FormatProvider>
    </ThemeProvider>
  );
}
