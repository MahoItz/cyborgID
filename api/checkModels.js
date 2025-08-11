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

  try {
    const response = await fetch("https://api.together.xyz/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json(data);
    }

    // Collect available model ids
    const available = new Set(
      Array.isArray(data?.data) ? data.data.map((m) => m.id) : []
    );

    // Return availability for required models only
    const result = {};
    for (const model of REQUIRED_MODELS) {
      result[model] = available.has(model);
    }

    return res.status(200).json(result);
  } catch (err) {
    return res.status(500).json({ error: "Server error", message: err.message });
  }
}
