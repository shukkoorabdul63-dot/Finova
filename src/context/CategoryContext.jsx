import { createContext, useContext, useState, useEffect } from "react";
import { loadPersisted, savePersisted } from "../utils/persist";

const CategoryContext = createContext();
const STORAGE_KEY = "finova_category_links";

// linkMap: { [salesGroup]: string[] of linked COGS groups }
export function CategoryProvider({ children }) {
  const [linkMap, setLinkMap] = useState(() => loadPersisted(STORAGE_KEY, {}));

  useEffect(() => { savePersisted(STORAGE_KEY, linkMap); }, [linkMap]);

  const toggleLink = (salesGroup, cogsGroup) => {
    setLinkMap(prev => {
      const current = prev[salesGroup] || [];
      const next = current.includes(cogsGroup)
        ? current.filter(g => g !== cogsGroup)
        : [...current, cogsGroup];
      return { ...prev, [salesGroup]: next };
    });
  };

  const setLinks = (salesGroup, cogsGroups) => {
    setLinkMap(prev => ({ ...prev, [salesGroup]: cogsGroups }));
  };

  const autoSuggest = (salesGroups, cogsGroups) => {
    const suggested = {};
    salesGroups.forEach(sg => {
      const sgWords = sg.toLowerCase().split(/[\s\-_]+/).filter(w => w.length > 2);
      const matches = cogsGroups.filter(cg => {
        const cgLower = cg.toLowerCase();
        return sgWords.some(w => cgLower.includes(w));
      });
      if (matches.length > 0) suggested[sg] = matches;
    });
    setLinkMap(suggested);
  };

  const reset = () => setLinkMap({});

  return (
    <CategoryContext.Provider value={{ linkMap, toggleLink, setLinks, autoSuggest, reset }}>
      {children}
    </CategoryContext.Provider>
  );
}

export const useCategory = () => useContext(CategoryContext);
