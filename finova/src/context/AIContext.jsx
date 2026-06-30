import { createContext, useContext, useState } from "react";
import { AI_MODELS } from "../utils/aiEngine.js";

const AIContext = createContext();

const PROVIDER_MAP = {
  "gemini-flash": "google",
  "gemini-pro": "google",
  "llama-groq": "groq",
  "mixtral-groq": "groq",
  "gpt4o-mini": "openai",
  "claude": "anthropic",
};

function loadKeys() {
  try { return JSON.parse(localStorage.getItem("finova_api_keys") || "{}"); }
  catch { return {}; }
}

export function AIProvider({ children }) {
  const [selectedModel, setSelectedModel] = useState("gemini-flash");
  const [apiKeys, setApiKeys] = useState(loadKeys);
  const [chartModeOn, setChartModeOn] = useState(true);

  const setApiKey = (provider, key) => {
    const updated = { ...apiKeys, [provider]: key };
    setApiKeys(updated);
    try { localStorage.setItem("finova_api_keys", JSON.stringify(updated)); } catch {}
  };

  const getApiKey = (modelId) => {
    const provider = PROVIDER_MAP[modelId] || "google";
    return apiKeys[provider] || "";
  };

  const getCurrentModel = () => AI_MODELS.find(m => m.id === selectedModel) || AI_MODELS[0];

  return (
    <AIContext.Provider value={{
      selectedModel, setSelectedModel,
      apiKeys, setApiKey, getApiKey,
      chartModeOn, setChartModeOn,
      getCurrentModel,
    }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAI = () => useContext(AIContext);
