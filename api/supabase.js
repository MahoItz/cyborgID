export default async function handler(req, res) {
  const SUPABASE_URL = "https://uomyodvgfgtvmbqjeazm.supabase.co";
  const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    // Загрузка пользователей
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/user_profiles?select=id,Full_Name,Resume&order=id.desc`,
      { method: "GET", headers }
    );
    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: "Failed to fetch users", details: data });
    }

    return res.status(200).json(data);
  }

  if (req.method === "DELETE") {
    // Удаление пользователя по имени
    const { user } = await req.json();

    const deleteUrl = `${SUPABASE_URL}/rest/v1/user_profiles?Full_Name=eq.${encodeURIComponent(
      user
    )}`;

    const deleteRes = await fetch(deleteUrl, {
      method: "DELETE",
      headers,
    });

    if (!deleteRes.ok) {
      const errorData = await deleteRes.json();
      return res.status(deleteRes.status).json({ error: "Delete failed", details: errorData });
    }

    return res.status(200).json({ message: "User deleted" });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
