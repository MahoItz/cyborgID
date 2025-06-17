export default async function handler(req, res) {
  const SUPABASE_URL = "https://uomyodvgfgtvmbqjeazm.supabase.co";

  // Выбираем нужный ключ: для чтения — anon, для удаления — service
  const SUPABASE_KEY =
    req.method === "DELETE"
      ? process.env.SUPABASE_SERVICE_KEY
      : process.env.SUPABASE_ANON_KEY;

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json",
  };

  if (req.method === "GET") {
    // Получение списка пользователей
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

  if (req.method === "DELETE") {
    const { user } = await req.json();

    if (!user) {
      return res.status(400).json({ error: "User name is required" });
    }

    const deleteUrl = `${SUPABASE_URL}/rest/v1/user_profiles?Full_Name=eq.${encodeURIComponent(
      user
    )}`;

    const deleteRes = await fetch(deleteUrl, {
      method: "DELETE",
      headers,
    });

    const contentType = deleteRes.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!deleteRes.ok) {
      const errorData = isJson
        ? await deleteRes.json()
        : await deleteRes.text();
      return res.status(deleteRes.status).json({
        error: "Delete failed",
        details: errorData,
      });
    }

    return res.status(200).json({ message: "User deleted successfully" });
  }

  // Метод не разрешён
  return res.status(405).json({ error: "Method not allowed" });
}
