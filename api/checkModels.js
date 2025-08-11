export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.TOGETHER_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "Missing Together API key" });
  }

  // Models currently used in the application
  const REQUIRED_MODELS = [
    "meta-llama/Llama-3.3-70B-Instruct-Turbo-Free",
    "Qwen/Qwen2-VL-72B-Instruct",
  ];

  const result = {};

  try {
    for (const model of REQUIRED_MODELS) {
      try {
        const resp = await fetch(
          "https://api.together.xyz/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model,
              messages: [{ role: "user", content: "ping" }],
              max_tokens: 1,
            }),
          }
        );

        if (resp.ok) {
          result[model] = { available: true };
        } else {
          const errData = await resp.json().catch(() => ({}));
          result[model] = {
            available: false,
            error: errData?.error || resp.statusText,
          };
        }
      } catch (err) {
        result[model] = { available: false, error: err.message };
      }
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
