export default async function handler(req, res) {
  const { systemPrompt, userPrompt, temperature } = req.body;

  const togetherResponse = await fetch("https://api.together.xyz/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.TOGETHER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "Qwen/Qwen2.5-72B-Instruct-Turbo",
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

  const data = await togetherResponse.json();
  res.status(200).json(data);
}