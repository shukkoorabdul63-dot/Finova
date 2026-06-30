import { createContext, useContext, useState, useMemo } from "react";

const DataContext = createContext();

export function DataProvider({ children }) {
  const [rawData, setRawData] = useState([]);
  const [filters, setFilters] = useState({
    fy: "All",
    month: "All",
    company: "All",
    branch: "All",
    department: "All",
    mainHead: "All",
  });

  // Derived filter options
  const options = useMemo(() => {
    const unique = (key) => ["All", ...new Set(rawData.map(r => r[key]).filter(Boolean))];
    return {
      fy: unique("FY"),
      month: unique("MONTH"),
      company: unique("COMPANY"),
      branch: unique("BRANCH"),
      department: unique("DEPARTMENT"),
      mainHead: unique("MAIN_HEAD"),
    };
  }, [rawData]);

  // Filtered data
  const data = useMemo(() => {
    return rawData.filter(row => {
      if (filters.fy !== "All" && row.FY !== filters.fy) return false;
      if (filters.month !== "All" && row.MONTH !== filters.month) return false;
      if (filters.company !== "All" && row.COMPANY !== filters.company) return false;
      if (filters.branch !== "All" && row.BRANCH !== filters.branch) return false;
      if (filters.department !== "All" && row.DEPARTMENT !== filters.department) return false;
      if (filters.mainHead !== "All" && row.MAIN_HEAD !== filters.mainHead) return false;
      return true;
    });
  }, [rawData, filters]);

  const updateFilter = (key, val) => setFilters(f => ({ ...f, [key]: val }));
  const resetFilters = () => setFilters({ fy: "All", month: "All", company: "All", branch: "All", department: "All", mainHead: "All" });

  return (
    <DataContext.Provider value={{ rawData, setRawData, data, filters, updateFilter, resetFilters, options }}>
      {children}
    </DataContext.Provider>
  );
}

export const useData = () => useContext(DataContext);
