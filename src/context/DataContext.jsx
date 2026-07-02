import { createContext, useContext, useState, useMemo } from "react";
import { MONTH_ORDER } from "../utils/finance";

const DataContext = createContext();

const EMPTY_FILTERS = { fy: [], month: [], company: [], branch: [], department: [] };

export function DataProvider({ children }) {
  const [rawData, setRawData] = useState([]);
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS });

  // Derived filter options — plain unique value lists, no "All" sentinel needed
  // since an empty selection array now means "no filter applied" (= all).
  const options = useMemo(() => {
    const unique = (key) => [...new Set(rawData.map(r => r[key]).filter(Boolean))].sort();
    return {
      fy: unique("FY"),
      month: [...new Set(rawData.map(r => r.MONTH).filter(Boolean))]
        .sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b)),
      company: unique("COMPANY"),
      branch: unique("BRANCH"),
      department: unique("DEPARTMENT"),
    };
  }, [rawData]);

  // Filtered data — a dimension only filters when at least one value is selected
  const data = useMemo(() => {
    return rawData.filter(row => {
      if (filters.fy.length && !filters.fy.includes(row.FY)) return false;
      if (filters.month.length && !filters.month.includes(row.MONTH)) return false;
      if (filters.company.length && !filters.company.includes(row.COMPANY)) return false;
      if (filters.branch.length && !filters.branch.includes(row.BRANCH)) return false;
      if (filters.department.length && !filters.department.includes(row.DEPARTMENT)) return false;
      return true;
    });
  }, [rawData, filters]);

  const updateFilter = (key, arr) => setFilters(f => ({ ...f, [key]: arr }));
  const resetFilters = () => setFilters({ ...EMPTY_FILTERS });

  return (
    <DataContext.Provider value={{ rawData, setRawData, data, filters, updateFilter, resetFilters, options }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
