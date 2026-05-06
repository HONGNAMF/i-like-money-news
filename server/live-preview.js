import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getNews } from "./news-service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");
const app = express();
const PORT = process.env.PORT || 5180;

app.get("/api/news", async (_req, res) => {
  try {
    res.json(await getNews(80));
  } catch (error) {
    res.status(500).json({ error: "RSS_FETCH_FAILED", message: error.message });
  }
});

app.use(express.static(distDir));
app.get("*", (_req, res) => {
  res.sendFile(path.join(distDir, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Live preview running at http://127.0.0.1:${PORT}`);
});
