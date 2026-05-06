export async function fetchArticles() {
  // Keep article bodies out of this layer. Store only title, short summary, source, date, and URL.
  const host = window.location.hostname || "127.0.0.1";
  const endpoints = [];

  if (window.location.protocol.startsWith("http")) {
    endpoints.push(`${window.location.origin}/api/news`);
  }

  endpoints.push(`${window.location.protocol}//${host}:4174/api/news`);
  endpoints.push("http://127.0.0.1:4174/api/news");

  for (const endpoint of endpoints) {
    try {
      const response = await fetch(endpoint, { signal: AbortSignal.timeout(4500) });
      if (!response.ok) continue;
      const articles = await response.json();
      if (Array.isArray(articles) && articles.length) {
        return { articles, source: "live" };
      }
    } catch {
      // Fall back to local sample data below.
    }
  }

  return { articles: DUMMY_ARTICLES, source: "sample" };
}

export const DUMMY_ARTICLES = [
  {
    id: "rate-001",
    title: "한국은행, 기준금리 동결하며 물가 흐름 더 지켜보기로",
    source: "경제데일리",
    publishedAt: "2026-04-29",
    category: "rate",
    summary:
      "한국은행은 기준금리를 유지하면서 소비자물가지수와 가계부채 추이를 함께 보겠다고 밝혔다. 시장은 하반기 완화 가능성에 주목하고 있다.",
    url: "https://news.google.com/search?q=%EA%B8%B0%EC%A4%80%EA%B8%88%EB%A6%AC%20%EB%AC%BC%EA%B0%80&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    id: "fx-001",
    title: "원달러 환율 1,390원대 등락, 수입 물가 부담 커지나",
    source: "머니브리프",
    publishedAt: "2026-04-28",
    category: "fx",
    summary:
      "달러 강세와 글로벌 긴축 경계감이 이어지며 환율이 높은 수준을 유지했다. 원자재를 수입하는 기업의 비용 부담과 물가상승률에 영향이 예상된다.",
    url: "https://news.google.com/search?q=%ED%99%98%EC%9C%A8%20%EC%88%98%EC%9E%85%EB%AC%BC%EA%B0%80&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    id: "stock-001",
    title: "코스피, 외국인 순매수에 상승 마감...반도체 대형주 강세",
    source: "시장노트",
    publishedAt: "2026-04-27",
    category: "stock",
    summary:
      "코스피가 외국인 순매수와 반도체 업종 실적 기대에 힘입어 올랐다. 투자자들은 PER과 영업이익 전망을 확인하며 종목별 차별화를 살피고 있다.",
    url: "https://news.google.com/search?q=%EC%BD%94%EC%8A%A4%ED%94%BC%20%EC%99%B8%EA%B5%AD%EC%9D%B8%20%EC%88%9C%EB%A7%A4%EC%88%98&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    id: "estate-001",
    title: "서울 전세가격 상승세, 주택담보대출 금리와 공급 부족이 변수",
    source: "부동산인사이트",
    publishedAt: "2026-04-26",
    category: "realestate",
    summary:
      "입주 물량이 줄어든 지역을 중심으로 전세가격이 오르고 있다. 주택담보대출 금리, LTV 규제, 매매가격 흐름이 함께 영향을 줄 전망이다.",
    url: "https://news.google.com/search?q=%EC%A0%84%EC%84%B8%EA%B0%80%EA%B2%A9%20%EC%A3%BC%ED%83%9D%EB%8B%B4%EB%B3%B4%EB%8C%80%EC%B6%9C&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    id: "company-001",
    title: "대형 유통사 영업이익 개선, 비용 절감과 온라인 매출 회복 효과",
    source: "비즈와치",
    publishedAt: "2026-04-25",
    category: "company",
    summary:
      "기업의 영업이익이 개선되며 주가에도 긍정적인 기대가 생겼다. 다만 매출 성장률과 부채비율, 배당 정책은 추가로 확인할 필요가 있다.",
    url: "https://news.google.com/search?q=%EC%98%81%EC%97%85%EC%9D%B4%EC%9D%B5%20%EA%B8%B0%EC%97%85%20%EC%8B%A4%EC%A0%81&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    id: "global-001",
    title: "미국 국채금리 상승에 글로벌 증시 흔들, 유동성 축소 우려",
    source: "글로벌마켓",
    publishedAt: "2026-04-24",
    category: "global",
    summary:
      "미국 국채금리가 오르면서 글로벌 증시가 변동성을 보였다. 시장은 연준의 긴축 기조와 유동성 흐름, 신용스프레드를 주시하고 있다.",
    url: "https://news.google.com/search?q=%EB%AF%B8%EA%B5%AD%20%EA%B5%AD%EC%B1%84%EA%B8%88%EB%A6%AC%20%EA%B8%80%EB%A1%9C%EB%B2%8C%20%EC%A6%9D%EC%8B%9C&hl=ko&gl=KR&ceid=KR:ko"
  },
  {
    id: "price-001",
    title: "생활 물가 부담 지속, 소비자물가지수보다 체감 물가가 더 높다",
    source: "생활경제",
    publishedAt: "2026-04-23",
    category: "price",
    summary:
      "식료품과 외식 가격 상승으로 체감 물가 부담이 이어지고 있다. 실질임금과 가처분소득이 줄면 소비심리도 약해질 수 있다.",
    url: "https://news.google.com/search?q=%EC%86%8C%EB%B9%84%EC%9E%90%EB%AC%BC%EA%B0%80%EC%A7%80%EC%88%98%20%EC%83%9D%ED%99%9C%EB%AC%BC%EA%B0%80&hl=ko&gl=KR&ceid=KR:ko"
  }
];
