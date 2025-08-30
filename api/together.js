export default async function handler(req, res) {
  const { systemPrompt, userPrompt, temperature, provider, mode, apiKey } = req.body;

  const OPENROUTER_API_KEY = apiKey || process.env.OPENROUTER_API_KEY;

  // Конфигурации провайдеров
  const AI_PROVIDERS = {
    META_LLAMA: {
      name: "Meta Llama",
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.origin || "https://cyborg-id.vercel.app/", // обязательно
        "X-Title": "Form Application",
      }),
      models: {
        autofill: "meta-llama/llama-3.3-70b-instruct", // модель OpenRouter
        summary: "meta-llama/llama-3.3-70b-instruct",
      },
    },
    QWEN2: {
      name: "Qwen3",
      url: "https://openrouter.ai/api/v1/chat/completions",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.origin || "https://cyborg-id.vercel.app/",
        "X-Title": "Form Application",
      }),
      models: {
        autofill: "qwen/qwen3-30b-a3b-thinking-2507",
        summary: "qwen/qwen3-30b-a3b-thinking-2507",
      },
    },
  };

  const selectedProvider = AI_PROVIDERS[provider];
  if (!selectedProvider) {
    return res.status(400).json({ error: "Invalid provider" });
  }

  const modelName = selectedProvider.models[mode || "autofill"];
  if (!modelName) {
    return res.status(400).json({ error: "Invalid mode or model not found" });
  }

  if (!OPENROUTER_API_KEY) {
    return res.status(500).json({ error: "Missing OpenRouter API key" });
  }

  try {
    const response = await fetch(selectedProvider.url, {
      method: "POST",
      headers: selectedProvider.headers(OPENROUTER_API_KEY),
      body: JSON.stringify({
        model: modelName,
        messages: [
          {
            role: "system",
            content: `You are ${systemPrompt} Answer with short messages 1–3 sentences. Ask questions, have a dialogue. No greetings allowed.`,
          },
          { role: "user", content: userPrompt },
        ],
        temperature: temperature,
        max_tokens: 500,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "OpenRouter request failed", details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
