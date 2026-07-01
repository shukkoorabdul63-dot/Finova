import { createContext, useContext, useState } from "react";

const UnitProfileContext = createContext();

// profile: { id, name, countGroups: string[], lineItems: [{id,label,addGroups:[],subtractGroups:[]}] }
export function UnitProfileProvider({ children }) {
  const [profiles, setProfiles] = useState([]);

  const addProfile = (name, countGroups = []) => {
    const p = { id: Date.now(), name, countGroups, lineItems: [] };
    setProfiles(prev => [...prev, p]);
    return p.id;
  };

  const removeProfile = (id) => setProfiles(prev => prev.filter(p => p.id !== id));

  const updateProfile = (id, patch) => setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const addLineItem = (profileId, label = "New Item") => {
    setProfiles(prev => prev.map(p => p.id === profileId
      ? { ...p, lineItems: [...p.lineItems, { id: Date.now(), label, addGroups: [], subtractGroups: [] }] }
      : p));
  };

  const updateLineItem = (profileId, itemId, patch) => {
    setProfiles(prev => prev.map(p => p.id === profileId
      ? { ...p, lineItems: p.lineItems.map(li => li.id === itemId ? { ...li, ...patch } : li) }
      : p));
  };

  const removeLineItem = (profileId, itemId) => {
    setProfiles(prev => prev.map(p => p.id === profileId
      ? { ...p, lineItems: p.lineItems.filter(li => li.id !== itemId) }
      : p));
  };

  return (
    <UnitProfileContext.Provider value={{ profiles, addProfile, removeProfile, updateProfile, addLineItem, updateLineItem, removeLineItem }}>
      {children}
    </UnitProfileContext.Provider>
  );
}

export const useUnitProfile = () => useContext(UnitProfileContext);
