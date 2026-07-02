import { createContext, useContext, useState, useEffect } from "react";
import { loadPersisted, savePersisted } from "../utils/persist";

const UnitProfileContext = createContext();
const STORAGE_KEY = "finova_unit_profiles";

// profile: { id, name, countGroups: string[], lineItems: [{id,label,addGroups:[],subtractGroups:[]}] }
export function UnitProfileProvider({ children }) {
  const [profiles, setProfiles] = useState(() => loadPersisted(STORAGE_KEY, []));

  useEffect(() => { savePersisted(STORAGE_KEY, profiles); }, [profiles]);

  const addProfile = (name, countGroups = []) => {
    const p = { id: Date.now(), name, countGroups, lineItems: [] };
    setProfiles(prev => [...prev, p]);
    return p.id;
  };

  const removeProfile = (id) => setProfiles(prev => prev.filter(p => p.id !== id));

  const updateProfile = (id, patch) => setProfiles(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  // Adds a fully-formed line item and returns its id synchronously, so the
  // caller (the "add line items" modal) can track what was just added in
  // this session without waiting on a re-render.
  const addFullLineItem = (profileId, item) => {
    const id = Date.now() + Math.random();
    setProfiles(prev => prev.map(p => p.id === profileId
      ? { ...p, lineItems: [...p.lineItems, { id, addGroups: [], subtractGroups: [], ...item }] }
      : p));
    return id;
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
    <UnitProfileContext.Provider value={{ profiles, addProfile, removeProfile, updateProfile, addFullLineItem, updateLineItem, removeLineItem }}>
      {children}
    </UnitProfileContext.Provider>
  );
}

export const useUnitProfile = () => useContext(UnitProfileContext);
