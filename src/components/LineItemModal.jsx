import { useState } from "react";
import { useUnitProfile } from "../context/UnitProfileContext";

function GroupPicker({ title, colorClass, groups, selected, onToggle, search, setSearch }) {
  const filtered = search ? groups.filter(g => g.toLowerCase().includes(search.toLowerCase())) : groups;
  return (
    <div className="unit-picker-col">
      <div className={`unit-group-label ${colorClass}`}>{title} ({selected.length})</div>
      <input className="msd-search" style={{ marginTop: "0.4rem" }} placeholder="Search groups..."
        value={search} onChange={e => setSearch(e.target.value)} />
      <div className="unit-picker-list" style={{ marginTop: "0.4rem" }}>
        {filtered.length === 0 && <div className="msd-empty">No matches</div>}
        {filtered.map(g => (
          <label key={g} className={`unit-picker-item ${selected.includes(g) ? "active" : ""}`}>
            <input type="checkbox" checked={selected.includes(g)} onChange={() => onToggle(g)} />
            <span>{g}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export default function LineItemModal({ profileId, profileName, groups, editingItem, onClose }) {
  const { addFullLineItem, updateLineItem, removeLineItem } = useUnitProfile();
  const isEditMode = !!editingItem;

  const [label, setLabel] = useState(editingItem?.label || "");
  const [addGroups, setAddGroups] = useState(editingItem?.addGroups || []);
  const [subtractGroups, setSubtractGroups] = useState(editingItem?.subtractGroups || []);
  const [addSearch, setAddSearch] = useState("");
  const [subSearch, setSubSearch] = useState("");
  const [sessionItems, setSessionItems] = useState([]);

  function toggleAdd(g) { setAddGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]); }
  function toggleSub(g) { setSubtractGroups(prev => prev.includes(g) ? prev.filter(x => x !== g) : [...prev, g]); }

  function resetForm() {
    setLabel(""); setAddGroups([]); setSubtractGroups([]); setAddSearch(""); setSubSearch("");
  }

  const isValid = label.trim().length > 0 && (addGroups.length > 0 || subtractGroups.length > 0);

  function handleSaveNext() {
    if (!isValid) return;
    const id = addFullLineItem(profileId, { label: label.trim(), addGroups, subtractGroups });
    setSessionItems(prev => [...prev, { id, label: label.trim() }]);
    resetForm();
  }

  function handleSaveFinish() {
    if (isValid) {
      const id = addFullLineItem(profileId, { label: label.trim(), addGroups, subtractGroups });
      setSessionItems(prev => [...prev, { id, label: label.trim() }]);
    }
    onClose();
  }

  function handleSaveEdit() {
    if (!isValid) return;
    updateLineItem(profileId, editingItem.id, { label: label.trim(), addGroups, subtractGroups });
    onClose();
  }

  function removeSessionItem(id) {
    removeLineItem(profileId, id);
    setSessionItems(prev => prev.filter(s => s.id !== id));
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="unit-modal" onClick={e => e.stopPropagation()}>
        <div className="unit-modal-header">
          <h2>{isEditMode ? `Edit Line Item — ${profileName}` : `Add Line Items — ${profileName}`}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!isEditMode && sessionItems.length > 0 && (
          <div className="unit-session-list">
            {sessionItems.map((s, i) => (
              <span key={s.id} className="unit-session-chip">
                {i + 1}. {s.label}
                <button onClick={() => removeSessionItem(s.id)}>✕</button>
              </span>
            ))}
          </div>
        )}

        <input
          className="unit-modal-label-input"
          placeholder={`Line item label e.g. "GP / Vehicle", "Labour Income"...`}
          value={label}
          onChange={e => setLabel(e.target.value)}
          autoFocus
        />

        <div className="unit-picker-grid">
          <GroupPicker title="+ ADD GROUPS" colorClass="pos" groups={groups} selected={addGroups} onToggle={toggleAdd} search={addSearch} setSearch={setAddSearch} />
          <GroupPicker title="− SUBTRACT GROUPS" colorClass="neg" groups={groups} selected={subtractGroups} onToggle={toggleSub} search={subSearch} setSearch={setSubSearch} />
        </div>

        <div className="unit-modal-actions">
          <button onClick={onClose}>Cancel</button>
          {isEditMode ? (
            <button className="primary" disabled={!isValid} onClick={handleSaveEdit}>✓ Save Changes</button>
          ) : (
            <>
              <button disabled={!isValid} onClick={handleSaveNext}>✓ Save &amp; Add Next</button>
              <button className="primary" onClick={handleSaveFinish}>✓ Save &amp; Finish</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
