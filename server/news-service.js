import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({ ignoreAttributes: false });

const FEEDS = [
  feed("경제"),
  feed("금리"),
  feed("환율"),
  feed("코스피 OR 코스닥"),
  feed("부동산 전세 주택"),
  feed("기업 실적 영업이익"),
  feed("물가 소비자물가지수"),
  feed("글로벌 경제 국채금리")
];

export async function getNews(limit = 80) {
  const batches = await Promise.all(FEEDS.map(readFeed));
  return dedupeArticles(batches.flat()).slice(0, limit);
}

function feed(query) {
  return {
    source: "Google News",
    url: `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`
  };
}

async function readFeed(feed) {
  const response = await fetch(feed.url);
  const xml = await response.text();
  const parsed = parser.parse(xml);
  const items = parsed.rss?.channel?.item || [];
  return items.map((item) => normalizeItem(item, feed.source));
}

function normalizeItem(item, fallbackSource) {
  const title = stripHtml(item.title || "");
  const summary = stripHtml(item.description || "").slice(0, 220);
  const textForCategory = `${title} ${summary}`;

  return {
    id: item.guid?.["#text"] || item.guid || item.link,
    title,
    source: item.source?.["#text"] || fallbackSource,
    publishedAt: toDate(item.pubDate),
    category: classifyCategory(textForCategory),
    summary,
    url: item.link
  };
}

function dedupeArticles(articles) {
  const seen = new Set();
  return articles
    .filter((article) => article.title && article.url)
    .filter((article) => {
      const key = `${article.title.replace(/\s+/g, "")}-${article.source}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

function stripHtml(value) {
  return String(value).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function toDate(value) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function classifyCategory(text) {
  const rules = [
    ["rate", ["기준금리", "금리", "대출", "한국은행", "연준"]],
    ["fx", ["환율", "달러", "엔화", "원화"]],
    ["stock", ["코스피", "코스닥", "주가", "증시", "순매수"]],
    ["realestate", ["부동산", "전세", "주택", "아파트", "LTV"]],
    ["company", ["기업", "영업이익", "매출", "실적"]],
    ["price", ["물가", "소비자물가지수", "인플레이션"]],
    ["global", ["미국", "중국", "글로벌", "국채"]]
  ];
  return rules.find(([, words]) => words.some((word) => text.includes(word)))?.[0] || "global";
}
