export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const result = {};

  // Check Supabase Service Key
  const SUPABASE_URL = "https://uomyodvgfgtvmbqjeazm.supabase.co";
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseKey) {
    result.supabase = { ok: false, error: "Missing SUPABASE_SERVICE_KEY" };
  } else {
    try {
      const response = await fetch(
        `${SUPABASE_URL}/rest/v1/user_profiles?select=id&limit=1`,
        {
          headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
          },
        }
      );
      result.supabase = { ok: response.ok, status: response.status };
    } catch (err) {
      result.supabase = { ok: false, error: err.message };
    }
  }

  // Check Together AI Key
  const togetherKey = process.env.TOGETHER_API_KEY;
  if (!togetherKey) {
    result.together = { ok: false, error: "Missing TOGETHER_API_KEY" };
  } else {
    try {
      const response = await fetch("https://api.together.xyz/v1/models", {
        headers: { Authorization: `Bearer ${togetherKey}` },
      });
      result.together = { ok: response.ok, status: response.status };
    } catch (err) {
      result.together = { ok: false, error: err.message };
    }
  }

  return res.status(200).json(result);
}
