import { getNews } from "../server/news-service.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
    return;
  }

  try {
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    res.status(200).json(await getNews(80));
  } catch (error) {
    res.status(500).json({ error: "RSS_FETCH_FAILED", message: error.message });
  }
}
