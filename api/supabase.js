export default async function handler(req, res) {
  const SUPABASE_URL = "https://uomyodvgfgtvmbqjeazm.supabase.co";

  const SUPABASE_KEY =
    req.method === "DELETE" || req.method === "POST"
      ? process.env.SUPABASE_SERVICE_KEY
      : process.env.SUPABASE_ANON_KEY;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  // Загрузка пользователей
  if (req.method === "GET") {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?select=id,Full_Name,Resume&order=id.desc`,
      { method: "GET", headers }
    );
    const data = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: "Failed to fetch users", details: data });
    }

    return res.status(200).json(data);
  }

  // Добавление нового пользователя
  if (req.method === "POST") {
    try {
      const { fullName, summary } = req.body;

      if (!fullName || !summary) {
        return res.status(400).json({ error: "Missing fullName or summary" });
      }

      const submission = [
        {
          Full_Name: fullName,
          Resume: summary,
        },
      ];

      const response = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
        method: "POST",
        headers: {
          ...headers,
          Prefer: "return=representation",
        },
        body: JSON.stringify(submission),
      });

      const result = await response.json();

      if (!response.ok) {
        return res
          .status(response.status)
          .json({ error: "Insert failed", details: result });
      }

      return res.status(200).json(result);
    } catch (error) {
      return res.status(500).json({
        error: "Server error during insert",
        message: error.message,
      });
    }
  }

  // Удаление пользователя
  if (req.method === "DELETE") {
    try {
      const { user } = req.body;

      if (!user || typeof user !== "string") {
        return res.status(400).json({ error: "Invalid user name" });
      }

      const deleteUrl = `${SUPABASE_URL}/rest/v1/user_profiles?Full_Name=eq.${encodeURIComponent(
        user
      )}`;

      const deleteRes = await fetch(deleteUrl, {
        method: "DELETE",
        headers,
      });

      if (!deleteRes.ok) {
        return res
          .status(deleteRes.status)
          .json({ error: "Failed to delete user" });
      }

      return res.status(200).json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("DELETE ERROR:", error);
      return res.status(500).json({
        error: "Server error during deletion",
        message: error.message,
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}
