import cors from "cors";
import express from "express";
import { getNews } from "./news-service.js";

const app = express();
const PORT = process.env.PORT || 4174;

app.use(cors());

app.get("/api/news", async (_req, res) => {
  try {
    res.json(await getNews(80));
  } catch (error) {
    res.status(500).json({ error: "RSS_FETCH_FAILED", message: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`RSS proxy server running at http://127.0.0.1:${PORT}`);
});
