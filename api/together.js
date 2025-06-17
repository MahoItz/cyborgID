export default async function handler(req, res) {
  const { systemPrompt, userPrompt, temperature, provider, mode } = req.body;

  // Безопасный доступ к Together AI ключу из переменной окружения
  const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY;

  // Объект конфигураций провайдеров — дублируем тот, что был у тебя в JS
  const AI_PROVIDERS = {
    META_LLAMA: {
      name: "Meta Llama",
      url: "https://api.together.xyz/v1/chat/completions",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      }),
      models: {
        autofill: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
        summary: "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
      },
    },
    QWEN2: {
      name: "Qwen2",
      url: "https://api.together.xyz/v1/chat/completions",
      headers: (apiKey) => ({
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": req.headers.origin || "https://cyborg-id.vercel.app/", // fallback
        "X-Title": "Form Application",
      }),
      models: {
        autofill: "Qwen/Qwen2-VL-72B-Instruct",
        summary: "Qwen/Qwen2-VL-72B-Instruct",
      },
    },
  };

  // Проверка провайдера
  const selectedProvider = AI_PROVIDERS[provider];
  if (!selectedProvider) {
    return res.status(400).json({ error: "Invalid provider" });
  }

  // Получение модели
  const modelName = selectedProvider.models[mode || "autofill"];
  if (!modelName) {
    return res.status(400).json({ error: "Invalid mode or model not found" });
  }

  try {
    const response = await fetch(selectedProvider.url, {
      method: "POST",
      headers: selectedProvider.headers(TOGETHER_API_KEY),
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
      return res.status(response.status).json({ error: "Together AI request failed", details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
