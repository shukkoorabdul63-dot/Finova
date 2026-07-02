import { createContext, useContext, useState, useEffect } from "react";
import { loadPersisted, savePersisted } from "../utils/persist";

const CostContext = createContext();
const STORAGE_KEY = "finova_cost_map";

export function CostProvider({ children }) {
  // costMap: { [groupName]: { type: "fixed"|"variable"|"semi", fixedPct: number } }
  const [costMap, setCostMap] = useState(() => loadPersisted(STORAGE_KEY, {}));

  useEffect(() => { savePersisted(STORAGE_KEY, costMap); }, [costMap]);

  const setClassification = (group, type, fixedPct = 50) => {
    setCostMap(prev => ({ ...prev, [group]: { type, fixedPct } }));
  };

  const bulkSet = (groups, type) => {
    setCostMap(prev => {
      const next = { ...prev };
      groups.forEach(g => { next[g] = { type, fixedPct: prev[g]?.fixedPct ?? 50 }; });
      return next;
    });
  };

  const setFixedPct = (group, pct) => {
    setCostMap(prev => ({
      ...prev,
      [group]: { ...prev[group], type: "semi", fixedPct: pct }
    }));
  };

  const getClassification = (group) => costMap[group] || { type: "variable", fixedPct: 50 };

  const reset = () => setCostMap({});
  const importCostMap = (map) => setCostMap(map && typeof map === "object" ? map : {});

  return (
    <CostContext.Provider value={{ costMap, setClassification, bulkSet, setFixedPct, getClassification, reset, importCostMap }}>
      {children}
    </CostContext.Provider>
  );
}

export const useCost = () => useContext(CostContext);
