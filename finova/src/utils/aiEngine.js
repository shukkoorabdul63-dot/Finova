// Multi-AI Engine for Finova
// Supports Gemini (default/free), Groq/Llama (free), OpenAI GPT, Claude

export const AI_MODELS = [
  {
    id: "gemini-flash",
    name: "Gemini 1.5 Flash",
    provider: "google",
    providerLabel: "Google",
    model: "gemini-1.5-flash",
    free: true,
    default: true,
    color: "#4285F4",
    icon: "G",
    keyLabel: "Google AI Studio API Key",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "gemini-pro",
    name: "Gemini 1.5 Pro",
    provider: "google",
    providerLabel: "Google",
    model: "gemini-1.5-pro",
    free: true,
    color: "#4285F4",
    icon: "G",
    keyLabel: "Google AI Studio API Key",
    keyUrl: "https://aistudio.google.com/app/apikey",
  },
  {
    id: "llama-groq",
    name: "Llama 3.1 8B",
    provider: "groq",
    providerLabel: "Groq",
    model: "llama-3.1-8b-instant",
    free: true,
    color: "#F55036",
    icon: "L",
    keyLabel: "Groq API Key",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "mixtral-groq",
    name: "Mixtral 8x7B",
    provider: "groq",
    providerLabel: "Groq",
    model: "mixtral-8x7b-32768",
    free: true,
    color: "#F55036",
    icon: "M",
    keyLabel: "Groq API Key",
    keyUrl: "https://console.groq.com/keys",
  },
  {
    id: "gpt4o-mini",
    name: "GPT-4o Mini",
    provider: "openai",
    providerLabel: "OpenAI",
    model: "gpt-4o-mini",
    free: false,
    color: "#10A37F",
    icon: "O",
    keyLabel: "OpenAI API Key",
    keyUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude",
    name: "Claude Sonnet",
    provider: "anthropic",
    providerLabel: "Anthropic",
    model: "claude-sonnet-4-6",
    free: false,
    color: "#D4763B",
    icon: "C",
    keyLabel: "Anthropic API Key",
    keyUrl: "https://console.anthropic.com/",
  },
];

export function getModelById(id) {
  return AI_MODELS.find(m => m.id === id) || AI_MODELS[0];
}

export async function callAI({ modelId, apiKey, messages, systemPrompt }) {
  const model = getModelById(modelId);
  if (!apiKey) throw new Error(`Please add your ${model.keyLabel} in AI settings`);

  switch (model.provider) {
    case "google": return callGemini(model.model, apiKey, messages, systemPrompt);
    case "groq": return callGroq(model.model, apiKey, messages, systemPrompt);
    case "openai": return callOpenAI(model.model, apiKey, messages, systemPrompt);
    case "anthropic": return callClaude(apiKey, messages, systemPrompt);
    default: throw new Error("Unknown provider");
  }
}

async function callGemini(model, apiKey, messages, systemPrompt) {
  const contents = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: 2000 },
      }),
    }
  );
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message || `Gemini error ${res.status}`);
  }
  const data = await res.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "No response received.";
}

async function callGroq(model, apiKey, messages, systemPrompt) {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message || `Groq error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response received.";
}

async function callOpenAI(model, apiKey, messages, systemPrompt) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 2000,
      messages: [{ role: "system", content: systemPrompt }, ...messages],
    }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message || `OpenAI error ${res.status}`);
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "No response received.";
}

async function callClaude(apiKey, messages, systemPrompt) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01",
      "x-api-key": apiKey,
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages,
    }),
  });
  if (!res.ok) {
    const e = await res.json();
    throw new Error(e.error?.message || `Claude error ${res.status}`);
  }
  const data = await res.json();
  return data.content?.[0]?.text || "No response received.";
}

// Parse AI response for embedded chart JSON
export function parseAIResponse(text) {
  if (!text) return { type: "text", text: "" };
  const chartRegex = /<<<CHART>>>([\s\S]*?)<<<END_CHART>>>/;
  const match = text.match(chartRegex);
  if (match) {
    try {
      const chartConfig = JSON.parse(match[1].trim());
      const textContent = text.replace(chartRegex, "").trim();
      return { type: "chart", text: textContent, chart: chartConfig };
    } catch {
      return { type: "text", text };
    }
  }
  return { type: "text", text };
}
