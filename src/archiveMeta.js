export const AUTH_COPY = {
  eyebrow: "personal economy archive",
  title: "오늘의 경제뉴스를 읽고, 당신의 생각을 남겨보세요.",
  description:
    "Like Money News는 경제뉴스를 쉽게 읽고, 어려운 단어를 이해하고, 내 언어로 생각을 기록하기 위한 조용한 아카이브입니다.",
  loginHint: "이미 만든 닉네임이 있다면 바로 이어서 읽을 수 있어요.",
  signupHint: "처음이라면 닉네임 하나로 가볍게 나만의 경제 노트를 시작해보세요.",
  browseHint: "가입 전에도 뉴스와 용어 설명은 편하게 둘러볼 수 있어요."
};

export const THOUGHT_FEELINGS = [
  { id: "hard", label: "🤔 아직 어렵다" },
  { id: "interest", label: "🌱 흥미롭다" },
  { id: "positive", label: "📈 긍정적으로 보인다" },
  { id: "anxious", label: "⚠ 불안하다" },
  { id: "learned", label: "💡 새롭게 알게 됐다" },
  { id: "study", label: "🧠 더 공부 필요" }
];

export const MARKET_MOOD_RULES = [
  {
    id: "heat",
    label: "🔥 과열",
    description: "기대감이 너무 빠르게 가격에 반영되는 흐름일 수 있어요.",
    keywords: ["급등", "랠리", "사상 최고", "과열", "폭등"]
  },
  {
    id: "growth",
    label: "🌱 성장 기대",
    description: "실적 개선이나 정책 기대가 시장에 긍정적으로 읽히는 분위기예요.",
    keywords: ["회복", "개선", "성장", "확대", "반등", "기대"]
  },
  {
    id: "slowdown",
    label: "🌧 경기 둔화 우려",
    description: "소비와 투자 심리가 식을 가능성을 경계하는 흐름이에요.",
    keywords: ["둔화", "침체", "부진", "감소", "하락", "약세"]
  },
  {
    id: "volatility",
    label: "⚠ 변동성 확대",
    description: "방향성보다 흔들림이 커지는 장면으로 볼 수 있어요.",
    keywords: ["변동성", "불확실성", "충격", "경계", "리스크", "우려"]
  },
  {
    id: "wait",
    label: "🧊 관망 흐름",
    description: "중요한 발표를 앞두고 판단을 미루는 분위기예요.",
    keywords: ["동결", "관망", "대기", "숨 고르기", "주시", "지켜보기"]
  },
  {
    id: "rate",
    label: "🏦 금리 부담",
    description: "금리 레벨이 소비와 투자에 부담으로 작용할 수 있어요.",
    keywords: ["금리", "대출", "기준금리", "긴축", "국채금리"]
  }
];

export const PROFILE_KEYWORD_SUGGESTIONS = [
  "금리",
  "엔화",
  "반도체",
  "미국경제",
  "AI",
  "부동산",
  "코스피",
  "물가",
  "환율",
  "2차전지"
];
