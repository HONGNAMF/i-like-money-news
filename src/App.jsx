import {
  Bookmark,
  Brain,
  Check,
  ChevronDown,
  ExternalLink,
  Gamepad2,
  Lightbulb,
  NotebookPen,
  Search,
  Sparkles,
  Tag,
  Upload,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { fetchArticles } from "./newsSources";

const STORAGE_KEY = "easy-econ-news-v2";

const BRANDS = {
  public: {
    type: "emoji",
    mark: "🦀",
    name: "나는 돈이 좋아~",
    tagline: "읽고 이해하고 기록하는 경제 아카이브",
    heroTitle: "나는 돈이 좋아~",
    heroText: "경제뉴스를 읽고 끝내지 마세요. 어려운 단어를 내 언어로 이해하고, 시장 분위기를 천천히 느끼고, 오늘의 생각을 기록해보세요."
  },
  personal: {
    type: "image",
    mark: "/assets/money-crab.jpg",
    name: "나는 돈이 좋아~",
    tagline: "읽고 이해하고 기록하는 경제 아카이브",
    heroTitle: "나는 돈이 좋아~",
    heroText: "경제뉴스를 읽고 끝내지 마세요. 어려운 단어를 내 언어로 이해하고, 시장 분위기를 천천히 느끼고, 오늘의 생각을 기록해보세요."
  }
};

const CATEGORIES = [
  { id: "all", label: "전체", tone: "neutral" },
  { id: "rate", label: "금리", tone: "blue" },
  { id: "fx", label: "환율", tone: "mint" },
  { id: "stock", label: "주식", tone: "rose" },
  { id: "realestate", label: "부동산", tone: "amber" },
  { id: "company", label: "기업", tone: "violet" },
  { id: "price", label: "물가", tone: "coral" },
  { id: "global", label: "글로벌경제", tone: "teal" }
];

const GUIDE_BY_CATEGORY = {
  rate: [
    "대출 이자나 예금 이자에 어떤 변화가 생길까?",
    "은행, 부동산, 주식시장 중 어디가 먼저 반응할까?",
    "한국은행이 다음 회의에서 더 볼 지표는 무엇일까?",
    "내 소비나 저축 계획을 바꿔야 할 만큼 큰 변화일까?"
  ],
  fx: [
    "수입 물가, 해외여행, 해외직구 비용에 어떤 영향을 줄까?",
    "달러를 많이 쓰는 기업과 원자재 가격은 어떻게 반응할까?",
    "환율 변화가 물가상승률로 이어질 가능성은 얼마나 될까?",
    "미국 금리와 무역수지를 같이 봐야 하는 이유는 무엇일까?"
  ],
  stock: [
    "주가가 오른 이유가 실적 때문인지 기대감 때문인지 구분해보자.",
    "개인, 기관, 외국인 중 누가 사고 있는지 확인해보자.",
    "PER, 영업이익, 금리 중 어떤 요인이 더 중요해 보일까?",
    "내 관심 종목과 같은 업종에도 영향이 있을까?"
  ],
  realestate: [
    "전세와 매매 중 어느 시장에 먼저 영향이 갈까?",
    "금리, 공급, 대출 규제 중 핵심 변수는 무엇일까?",
    "무주택자, 집주인, 세입자에게 각각 어떤 의미일까?",
    "다음에 봐야 할 지표는 입주 물량, 거래량, 대출금리 중 무엇일까?"
  ],
  company: [
    "매출 증가와 비용 절감 중 무엇이 실적을 이끌었을까?",
    "영업이익 개선이 일회성인지 반복 가능한지 살펴보자.",
    "주주환원, 배당, 투자 계획에 변화가 있을까?",
    "같은 업종의 다른 기업에도 비슷한 흐름이 나타날까?"
  ],
  price: [
    "내가 자주 사는 품목 가격과 연결되는 뉴스일까?",
    "물가가 오르면 금리 결정에 어떤 압력이 생길까?",
    "실질임금과 소비심리에 어떤 영향을 줄까?",
    "일시적인 가격 상승인지 오래 갈 흐름인지 확인해보자."
  ],
  global: [
    "미국, 중국, 유럽 중 어느 나라의 변화가 핵심일까?",
    "국채금리, 환율, 원자재 가격 중 무엇이 함께 움직였을까?",
    "한국 기업과 내 투자자산에 간접 영향이 있을까?",
    "앞으로 볼 국제 일정이나 중앙은행 발표는 무엇일까?"
  ]
};

const TERM_DICTIONARY = {
  기준금리: {
    aliases: ["정책금리"],
    short: "한국은행 같은 중앙은행이 경제 전체 금리의 기준으로 삼는 금리예요.",
    detail: "기준금리가 오르면 대출 이자가 오르기 쉽고, 돈을 빌리기 부담스러워져 소비와 투자가 줄 수 있어요.",
    example: "기준금리가 오르면 변동금리 대출을 가진 사람의 월 이자가 늘 수 있어요."
  },
  환율: {
    aliases: ["원달러", "달러원"],
    short: "한 나라 돈을 다른 나라 돈으로 바꿀 때의 가격이에요.",
    detail: "원달러 환율이 오르면 같은 1달러를 사기 위해 더 많은 원화가 필요해요.",
    example: "환율이 오르면 해외여행과 수입품 가격이 비싸질 수 있어요."
  },
  물가상승률: {
    aliases: ["인플레이션"],
    short: "상품과 서비스 가격이 얼마나 올랐는지를 보여주는 비율이에요.",
    detail: "물가상승률이 높으면 같은 월급으로 살 수 있는 물건이 줄어드는 느낌을 받을 수 있어요.",
    example: "물가상승률이 3%라면 작년 10,000원 물건이 올해 10,300원 정도가 된 셈이에요."
  },
  소비자물가지수: {
    aliases: ["CPI"],
    short: "가계가 자주 사는 물건과 서비스 가격 변화를 모아 만든 지표예요.",
    detail: "식료품, 교통, 통신, 외식 등 생활과 가까운 가격을 묶어서 물가 흐름을 보여줘요.",
    example: "CPI가 예상보다 높으면 중앙은행이 금리를 내리기 어려워질 수 있어요."
  },
  코스피: {
    aliases: ["KOSPI"],
    short: "한국 대표 주식시장에 상장된 큰 기업들의 주가 흐름을 보여주는 지수예요.",
    detail: "삼성전자 같은 대형 기업의 움직임이 코스피에 큰 영향을 줘요.",
    example: "코스피가 올랐다는 말은 한국 대표 주식들이 전반적으로 강했다는 뜻이에요."
  },
  코스닥: {
    aliases: ["KOSDAQ"],
    short: "성장 기업과 중소형 기술 기업이 많이 모인 한국 주식시장이에요.",
    detail: "바이오, 게임, 2차전지처럼 성장 기대가 큰 업종의 변동성이 자주 나타나요.",
    example: "코스닥은 코스피보다 오르내림이 더 클 때가 많아요."
  },
  국채: {
    aliases: ["국고채"],
    short: "정부가 돈을 빌리기 위해 발행하는 채권이에요.",
    detail: "정부가 이자를 약속하고 돈을 빌리는 증서라서 비교적 안전한 자산으로 여겨져요.",
    example: "국채금리가 오르면 주식 같은 위험자산이 부담을 받을 수 있어요."
  },
  국채금리: {
    aliases: ["채권금리"],
    short: "정부 채권에 투자했을 때 기대할 수 있는 수익률이에요.",
    detail: "국채금리가 오르면 시장 전체 금리의 눈높이도 함께 올라가는 경우가 많아요.",
    example: "미국 국채금리가 오르면 전 세계 주식시장이 흔들릴 수 있어요."
  },
  영업이익: {
    short: "기업이 본업으로 벌어들인 이익이에요.",
    detail: "제품 판매나 서비스 제공 같은 핵심 사업에서 남긴 돈이라 기업 체력을 볼 때 중요해요.",
    example: "매출이 늘어도 비용이 더 크게 늘면 영업이익은 줄 수 있어요."
  },
  긴축: {
    aliases: ["통화긴축"],
    short: "금리를 올리거나 돈의 흐름을 줄여 과열된 경제를 식히는 정책이에요.",
    detail: "물가가 너무 빨리 오를 때 중앙은행이 긴축을 통해 소비와 투자를 천천히 만들 수 있어요.",
    example: "긴축이 길어지면 대출 부담이 커지고 주식시장에는 부담이 될 수 있어요."
  },
  완화: {
    aliases: ["통화완화"],
    short: "금리를 낮추거나 돈의 흐름을 늘려 경제를 살리는 정책이에요.",
    detail: "경기가 약할 때 대출과 투자를 쉽게 만들어 소비를 돕는 방향이에요.",
    example: "완화 기대가 커지면 성장주가 좋아지는 경우가 있어요."
  },
  유동성: {
    short: "시장에 돈이 얼마나 잘 돌고 있는지를 뜻해요.",
    detail: "유동성이 풍부하면 투자와 소비가 활발해지기 쉽고, 줄어들면 시장이 위축될 수 있어요.",
    example: "유동성이 줄면 기업이 돈을 구하기 어려워질 수 있어요."
  },
  외국인순매수: {
    aliases: ["외국인 순매수"],
    short: "외국인 투자자가 판 주식보다 산 주식이 더 많다는 뜻이에요.",
    detail: "외국인의 매수세는 대형주와 지수 흐름에 큰 영향을 줄 때가 많아요.",
    example: "외국인 순매수가 늘면 코스피가 힘을 받을 수 있어요."
  },
  PER: {
    aliases: ["주가수익비율"],
    short: "주가가 기업 이익에 비해 비싼지 보는 지표예요.",
    detail: "PER이 높으면 미래 성장 기대가 크거나, 현재 이익 대비 주가가 비싸다는 뜻일 수 있어요.",
    example: "PER 10배는 1년 이익의 10배 가격으로 회사가 평가된다는 뜻이에요."
  },
  ROE: {
    aliases: ["자기자본이익률"],
    short: "회사가 자기 돈으로 얼마나 효율적으로 이익을 냈는지 보는 지표예요.",
    detail: "ROE가 높으면 같은 자본으로 더 많은 이익을 내는 회사라고 볼 수 있어요.",
    example: "ROE 15%는 자기자본 100원으로 15원의 이익을 냈다는 뜻이에요."
  },
  EPS: {
    aliases: ["주당순이익"],
    short: "주식 한 주당 회사가 벌어들인 순이익이에요.",
    detail: "EPS가 늘면 회사의 이익 체력이 좋아졌다고 볼 수 있어요.",
    example: "EPS가 오르면 주가도 긍정적으로 반응할 가능성이 있어요."
  },
  배당: {
    aliases: ["배당금"],
    short: "회사가 번 돈의 일부를 주주에게 나눠주는 것이에요.",
    detail: "배당은 주가 차익과 별개로 주주가 받는 현금 수익이에요.",
    example: "배당이 늘면 안정적인 현금흐름을 원하는 투자자에게 매력적일 수 있어요."
  },
  주주환원: {
    short: "회사가 주주에게 이익을 돌려주는 활동이에요.",
    detail: "배당을 늘리거나 자사주를 사들이는 방식이 대표적이에요.",
    example: "주주환원 확대 발표 후 주가가 오르는 경우가 있어요."
  },
  자사주: {
    short: "회사가 자기 회사 주식을 직접 사서 보유하는 주식이에요.",
    detail: "자사주 매입은 시장에 유통되는 주식 수를 줄여 주가에 긍정적일 수 있어요.",
    example: "회사가 자사주를 소각하면 남은 주식의 가치가 높아질 수 있어요."
  },
  매출: {
    short: "기업이 제품이나 서비스를 팔아 벌어들인 전체 돈이에요.",
    detail: "매출은 규모를 보여주지만, 비용을 빼기 전이라 이익과는 달라요.",
    example: "매출은 늘었지만 비용이 더 늘면 이익은 줄 수 있어요."
  },
  부채비율: {
    short: "회사가 자기자본에 비해 빚을 얼마나 가지고 있는지 보여주는 비율이에요.",
    detail: "부채비율이 너무 높으면 금리 상승기에 이자 부담이 커질 수 있어요.",
    example: "부채비율이 낮은 회사는 경기 침체 때 버틸 힘이 상대적으로 좋을 수 있어요."
  },
  신용스프레드: {
    short: "안전한 채권과 위험한 채권의 금리 차이예요.",
    detail: "차이가 벌어지면 투자자들이 위험을 더 크게 느낀다는 신호일 수 있어요.",
    example: "신용스프레드가 커지면 기업 자금 조달이 어려워질 수 있어요."
  },
  양적완화: {
    aliases: ["QE"],
    short: "중앙은행이 채권을 사들여 시장에 돈을 푸는 정책이에요.",
    detail: "금리만으로 경기를 살리기 어려울 때 유동성을 직접 늘리는 방식이에요.",
    example: "양적완화가 시작되면 시장에 돈이 늘어 자산 가격이 오를 수 있어요."
  },
  테이퍼링: {
    short: "중앙은행이 돈을 푸는 속도를 서서히 줄이는 일이에요.",
    detail: "양적완화를 갑자기 멈추면 시장 충격이 크기 때문에 조금씩 줄이는 방식을 써요.",
    example: "테이퍼링 소식에 투자자들이 유동성 감소를 걱정할 수 있어요."
  },
  가계부채: {
    short: "가계가 은행이나 금융기관에서 빌린 돈이에요.",
    detail: "가계부채가 많으면 금리가 오를 때 소비 여력이 빠르게 줄 수 있어요.",
    example: "가계부채가 늘면 중앙은행은 금리 인하에 더 조심스러울 수 있어요."
  },
  실질임금: {
    short: "물가 변화를 반영한 실제 구매력 기준의 임금이에요.",
    detail: "월급이 올라도 물가가 더 많이 오르면 실질임금은 줄어든 것처럼 느껴져요.",
    example: "실질임금이 줄면 소비가 약해질 수 있어요."
  },
  가처분소득: {
    short: "세금과 필수 지출을 빼고 실제로 쓸 수 있는 돈이에요.",
    detail: "가처분소득이 줄면 외식, 여행, 쇼핑 같은 선택 소비가 줄어들 수 있어요.",
    example: "대출 이자가 늘면 가처분소득이 줄어드는 효과가 있어요."
  },
  소비심리: {
    short: "사람들이 앞으로 돈을 쓰려는 마음이 얼마나 강한지 보여주는 분위기예요.",
    detail: "소비심리가 나빠지면 기업 매출과 경기 흐름에도 부담이 생길 수 있어요.",
    example: "물가 부담이 커지면 소비심리가 위축될 수 있어요."
  },
  원자재: {
    short: "제품을 만들 때 필요한 기본 재료예요.",
    detail: "석유, 철광석, 구리, 곡물 같은 원자재 가격은 기업 비용과 물가에 영향을 줘요.",
    example: "원자재 가격이 오르면 식품이나 공산품 가격도 오를 수 있어요."
  },
  무역수지: {
    short: "수출한 금액에서 수입한 금액을 뺀 값이에요.",
    detail: "수출이 수입보다 많으면 흑자, 적으면 적자라고 해요.",
    example: "무역수지가 나빠지면 환율에 부담이 될 수 있어요."
  },
  경상수지: {
    short: "나라가 해외와 거래해서 벌고 쓴 돈의 종합 성적표예요.",
    detail: "상품 거래뿐 아니라 서비스, 이자, 배당 같은 돈 흐름까지 포함해요.",
    example: "경상수지 흑자는 나라 밖에서 들어오는 돈이 많다는 뜻이에요."
  },
  고용지표: {
    short: "취업자 수, 실업률처럼 일자리 상황을 보여주는 숫자예요.",
    detail: "고용이 강하면 소비가 버틸 가능성이 커지고, 중앙은행의 금리 판단에도 영향을 줘요.",
    example: "미국 고용지표가 강하면 금리 인하 기대가 줄어들 수 있어요."
  },
  실업률: {
    short: "일할 의사가 있지만 일자리를 찾지 못한 사람의 비율이에요.",
    detail: "실업률이 높아지면 가계 소비와 경기 흐름이 약해질 수 있어요.",
    example: "실업률이 크게 오르면 정부가 경기 부양책을 검토할 수 있어요."
  },
  GDP: {
    aliases: ["국내총생산"],
    short: "한 나라 안에서 일정 기간 만들어낸 상품과 서비스의 총액이에요.",
    detail: "경제 규모와 성장 속도를 볼 때 가장 많이 쓰는 지표예요.",
    example: "GDP 성장률이 둔화되면 경기 침체 우려가 커질 수 있어요."
  },
  경기침체: {
    short: "경제 활동이 전반적으로 줄어드는 상태예요.",
    detail: "기업 매출, 고용, 소비가 함께 약해질 때 경기침체라는 말을 써요.",
    example: "경기침체가 오면 기업은 채용과 투자를 줄일 수 있어요."
  },
  경기부양: {
    short: "정부나 중앙은행이 경기를 살리기 위해 쓰는 정책이에요.",
    detail: "금리 인하, 세금 감면, 재정 지출 확대 등이 대표적인 방식이에요.",
    example: "경기부양책이 나오면 건설과 소비 관련 업종이 관심을 받을 수 있어요."
  },
  재정정책: {
    short: "정부가 세금과 지출을 조절해 경제에 영향을 주는 정책이에요.",
    detail: "정부가 돈을 더 쓰면 경기를 돕지만, 재정 부담이 커질 수 있어요.",
    example: "재정정책이 확대되면 공공사업 관련 기업이 혜택을 볼 수 있어요."
  },
  통화정책: {
    short: "중앙은행이 금리와 돈의 양을 조절하는 정책이에요.",
    detail: "물가와 경기를 안정시키기 위해 기준금리, 유동성 공급 등을 조정해요.",
    example: "통화정책 회의 결과는 환율과 주식시장에 바로 영향을 줄 수 있어요."
  },
  채권: {
    short: "정부나 기업이 돈을 빌리고 이자를 약속하며 발행하는 증서예요.",
    detail: "채권 가격과 금리는 보통 반대로 움직여요.",
    example: "금리가 오르면 기존 채권 가격은 떨어질 수 있어요."
  },
  회사채: {
    short: "기업이 돈을 빌리기 위해 발행하는 채권이에요.",
    detail: "기업의 신용도가 낮을수록 더 높은 이자를 줘야 투자자를 모을 수 있어요.",
    example: "회사채 금리가 오르면 기업의 자금 조달 비용이 커져요."
  },
  ETF: {
    short: "주식처럼 사고팔 수 있는 펀드예요.",
    detail: "특정 지수나 업종을 따라가도록 만들어져 분산투자에 자주 쓰여요.",
    example: "코스피200 ETF를 사면 여러 대형주에 나누어 투자하는 효과가 있어요."
  },
  공매도: {
    short: "주가 하락을 예상하고 빌린 주식을 먼저 파는 투자 방식이에요.",
    detail: "나중에 더 싸게 사서 갚으면 차익이 생기지만, 주가가 오르면 손실이 커질 수 있어요.",
    example: "공매도가 늘면 해당 종목의 투자심리가 약해질 수 있어요."
  },
  변동성: {
    short: "가격이 얼마나 크게 오르내리는지를 뜻해요.",
    detail: "변동성이 높으면 기회도 있지만 손실 위험도 커져요.",
    example: "실적 발표 전후에는 주가 변동성이 커질 수 있어요."
  },
  안전자산: {
    short: "시장 불안 때 상대적으로 안정적이라고 여겨지는 자산이에요.",
    detail: "달러, 금, 국채 등이 대표적인 안전자산으로 언급돼요.",
    example: "불확실성이 커지면 투자자들이 안전자산으로 이동할 수 있어요."
  },
  위험자산: {
    short: "수익 기대가 높지만 가격 변동과 손실 위험도 큰 자산이에요.",
    detail: "주식, 고수익채권, 일부 가상자산 등이 위험자산으로 분류돼요.",
    example: "금리가 내려갈 것 같으면 위험자산 선호가 살아날 수 있어요."
  },
  환헤지: {
    short: "환율 변동으로 생길 손실을 줄이기 위한 장치예요.",
    detail: "해외 투자에서 환율이 불리하게 움직일 때 손실을 줄이기 위해 사용해요.",
    example: "환헤지 ETF는 환율 변화 영향을 일부 줄이도록 설계돼요."
  },
  LTV: {
    aliases: ["주택담보인정비율"],
    short: "집값 대비 얼마나 대출받을 수 있는지를 나타내는 비율이에요.",
    detail: "LTV 60%라면 5억 원 집을 담보로 최대 3억 원까지 대출받을 수 있다는 뜻이에요.",
    example: "LTV 규제가 강화되면 집을 살 때 필요한 현금이 늘어날 수 있어요."
  },
  DSR: {
    aliases: ["총부채원리금상환비율"],
    short: "소득 대비 갚아야 할 모든 대출 원리금 비율이에요.",
    detail: "DSR은 대출자의 상환 능력을 보려는 규제라서 대출 한도에 영향을 줘요.",
    example: "DSR 규제가 강하면 소득이 높지 않은 사람은 대출을 많이 받기 어려워요."
  },
  전세가격: {
    short: "전세 계약을 할 때 필요한 보증금 수준이에요.",
    detail: "입주 물량, 금리, 매매가격 기대에 따라 전세가격이 오르내릴 수 있어요.",
    example: "전세가격이 오르면 세입자의 주거비 부담이 커져요."
  },
  주택담보대출: {
    aliases: ["주담대"],
    short: "집을 담보로 은행에서 받는 대출이에요.",
    detail: "금리와 규제 변화에 따라 월 상환액과 대출 한도가 크게 달라질 수 있어요.",
    example: "주택담보대출 금리가 오르면 집을 사려는 수요가 줄 수 있어요."
  },
  분양가: {
    short: "새 아파트나 주택을 처음 공급할 때 정해지는 가격이에요.",
    detail: "분양가가 높으면 주변 집값과 청약 수요에도 영향을 줄 수 있어요.",
    example: "분양가가 예상보다 높으면 실수요자의 부담이 커져요."
  },
  청약: {
    short: "새 아파트를 분양받기 위해 신청하는 절차예요.",
    detail: "점수, 자격, 지역 조건 등에 따라 당첨 가능성이 달라져요.",
    example: "청약 경쟁률이 높으면 해당 지역의 주택 수요가 강하다는 신호일 수 있어요."
  }
};

Object.assign(TERM_DICTIONARY, {
  금리인상: term("금리가 올라가는 흐름이에요.", "대출 이자 부담은 커질 수 있고, 예금 이자는 좋아질 수 있어요.", "금리 인상기에는 대출이 많은 가계와 기업이 부담을 느낄 수 있어요.", ["금리 인상"]),
  금리인하: term("금리가 내려가는 흐름이에요.", "돈을 빌리기 쉬워져 소비와 투자가 살아날 수 있지만, 물가가 다시 자극될 수도 있어요.", "금리 인하 기대가 커지면 주식시장 분위기가 좋아질 때가 있어요.", ["금리 인하"]),
  금리동결: term("중앙은행이 기준금리를 그대로 두는 결정이에요.", "물가와 경기 사이에서 조금 더 지켜보겠다는 신호로 읽히는 경우가 많아요.", "금리 동결 후에는 다음 회의 힌트가 더 중요해져요.", ["금리 동결"]),
  연준: term("미국의 중앙은행 역할을 하는 기관이에요.", "미국 금리 결정은 달러, 환율, 전 세계 투자심리에 큰 영향을 줘요.", "연준이 금리를 오래 높게 유지하면 한국 증시도 부담을 받을 수 있어요.", ["Fed", "FRB"]),
  FOMC: term("미국 기준금리를 결정하는 회의예요.", "회의 결과와 발언이 전 세계 금융시장 방향을 흔드는 일이 많아요.", "FOMC 이후 환율과 국채금리가 크게 움직일 수 있어요."),
  ETF: term("주식처럼 사고팔 수 있는 묶음형 펀드예요.", "한 종목이 아니라 여러 자산에 나누어 투자하는 데 자주 쓰여요.", "반도체 ETF를 사면 여러 반도체 기업에 함께 투자하는 효과가 있어요."),
  공매도: term("가격 하락을 예상하고 빌린 주식을 먼저 파는 방식이에요.", "시장에서는 하락 압력이나 투자심리 위축 신호로 언급될 때가 있어요.", "공매도가 늘어난 종목은 변동성이 커질 수 있어요."),
  시가총액: term("회사 전체의 시장 가격이에요.", "주가에 발행 주식 수를 곱해 계산하고, 기업 규모를 비교할 때 많이 써요.", "시가총액이 큰 기업은 지수 움직임에도 큰 영향을 줘요.", ["시총"]),
  성장주: term("앞으로 크게 성장할 기대가 반영된 주식이에요.", "금리가 낮거나 미래 실적 기대가 클 때 관심을 받기 쉬워요.", "AI 성장 기대가 커지면 성장주가 강해질 수 있어요."),
  가치주: term("현재 이익이나 자산에 비해 싸다고 평가받는 주식이에요.", "경기가 안정적이거나 금리가 높은 시기에 다시 주목받는 경우가 있어요.", "은행주나 배당주가 가치주로 언급될 때가 많아요."),
  외국인매수: term("외국인 투자자가 한국 주식을 사들이는 흐름이에요.", "대형주와 지수 방향에 영향을 줄 수 있어 시장 분위기 판단에 자주 쓰여요.", "외국인 매수가 늘면 코스피가 힘을 받을 수 있어요.", ["외국인 매수", "외국인 순매수"]),
  기관매수: term("연기금, 펀드 같은 기관 투자자가 주식을 사는 흐름이에요.", "개인 투자자보다 장기 자금 성격이 있어 수급 판단에 참고돼요.", "기관 매수가 이어지면 특정 업종에 대한 기대를 볼 수 있어요.", ["기관 매수"]),
  반도체: term("전자기기의 핵심 부품을 만드는 산업이에요.", "한국 수출과 증시에 큰 비중을 차지해 경제뉴스에서 자주 등장해요.", "AI 수요가 늘면 고성능 반도체 기업의 기대가 커질 수 있어요."),
  AI관련주: term("AI 성장과 관련 있다고 여겨지는 기업들의 주식이에요.", "실적보다 기대감이 먼저 움직일 수 있어 변동성도 함께 커질 수 있어요.", "AI 관련주는 데이터센터, 반도체, 소프트웨어 기업과 함께 언급돼요.", ["AI 관련주", "AI"]),
  테마주: term("특정 이슈나 기대감으로 함께 움직이는 주식들이에요.", "실적보다 이야기와 기대가 가격을 움직일 때가 많아 주의가 필요해요.", "정책 발표 뒤 관련 테마주가 급등락할 수 있어요."),
  PPI: term("생산자가 판매하는 상품 가격 변화를 보여주는 지표예요.", "소비자물가보다 먼저 움직일 때가 있어 앞으로의 물가 압력을 보는 데 쓰여요.", "PPI가 오르면 나중에 소비자 가격도 오를 수 있어요.", ["생산자물가지수"]),
  스태그플레이션: term("경기는 나쁜데 물가는 계속 오르는 어려운 상황이에요.", "정책 선택이 까다로워져 시장이 특히 불안해할 수 있어요.", "성장은 둔화되는데 기름값이 오르면 스태그플레이션 우려가 나올 수 있어요."),
  디플레이션: term("물가가 전반적으로 내려가는 현상이에요.", "겉으로는 좋아 보이지만 소비와 투자가 얼어붙는 신호일 수 있어요.", "사람들이 더 싸질 때까지 소비를 미루면 경기가 약해질 수 있어요."),
  달러강세: term("달러 가치가 다른 통화보다 강해지는 흐름이에요.", "수입 물가와 환율, 외국인 자금 흐름에 영향을 줄 수 있어요.", "달러 강세가 이어지면 원달러 환율이 오를 수 있어요.", ["달러 강세"]),
  엔화약세: term("엔화 가치가 낮아지는 흐름이에요.", "일본 여행 비용, 수출 경쟁력, 환율 뉴스와 함께 자주 언급돼요.", "엔화 약세가 길어지면 일본 제품의 가격 경쟁력이 좋아질 수 있어요.", ["엔화 약세"]),
  고유가: term("국제 유가가 높은 상태예요.", "기름값, 물류비, 항공비, 생활 물가 부담으로 이어질 수 있어요.", "고유가가 이어지면 정유주는 관심을 받고 항공주는 부담을 느낄 수 있어요."),
  국제유가: term("세계 시장에서 거래되는 원유 가격이에요.", "물가와 기업 비용, 산유국 정책에 영향을 주기 때문에 중요해요.", "국제유가가 오르면 주유비와 배송비 부담이 커질 수 있어요.", ["유가"]),
  수출: term("국내에서 만든 상품이나 서비스를 해외에 파는 일이에요.", "한국 경제는 수출 비중이 커서 반도체, 자동차 수출 뉴스가 중요하게 다뤄져요.", "수출이 좋아지면 기업 실적과 환율에도 영향을 줄 수 있어요."),
  관세: term("수입품에 붙는 세금이에요.", "관세가 오르면 물건값이 비싸지고 나라 간 무역 갈등이 커질 수 있어요.", "미국이 관세를 올리면 관련 기업의 비용과 판매 전략이 바뀔 수 있어요."),
  부동산규제: term("집값과 대출, 거래를 관리하기 위한 정책이에요.", "DSR, LTV, 세금, 청약 제도와 함께 주택시장 분위기를 바꿀 수 있어요.", "규제가 완화되면 거래 기대가 살아날 수 있지만 지역별 차이는 커요.", ["부동산 규제"]),
  전세: term("큰 보증금을 맡기고 집을 빌려 사는 한국식 임대 방식이에요.", "금리와 입주 물량에 따라 전세가격이 크게 움직일 수 있어요.", "전세가격이 오르면 세입자의 주거비 부담이 커져요."),
  월세: term("매달 임대료를 내고 집을 빌리는 방식이에요.", "금리가 높아지면 전세보다 월세 선호가 늘어나는 경우가 있어요.", "월세가 오르면 매달 생활비 부담이 바로 커져요."),
  지원금: term("정부나 지자체가 부담을 덜어주기 위해 지급하는 돈이에요.", "소비를 돕거나 특정 계층의 생활비 부담을 줄이는 정책으로 쓰여요.", "지원금이 풀리면 단기적으로 소비가 늘 수 있어요."),
  소비쿠폰: term("정해진 곳에서 소비할 수 있도록 주는 쿠폰형 지원이에요.", "지역 상권이나 특정 업종 소비를 살리는 데 쓰일 수 있어요.", "소비쿠폰이 나오면 외식, 마트, 전통시장 매출이 늘 수 있어요."),
  민생지원금: term("생활비 부담을 덜기 위해 지급되는 지원금이에요.", "물가가 높거나 경기가 약할 때 소비를 지탱하는 정책으로 언급돼요.", "민생지원금은 가계 소비와 재정 부담을 함께 봐야 해요."),
  생활비: term("먹고 살고 이동하고 주거하는 데 들어가는 기본 비용이에요.", "물가, 월세, 전기요금, 교통비가 오르면 생활비 부담이 커져요.", "생활비가 늘면 저축과 소비 여력이 줄어들 수 있어요."),
  전기요금: term("전기를 사용한 만큼 내는 요금이에요.", "가계 생활비뿐 아니라 공장과 자영업자의 비용에도 영향을 줘요.", "전기요금 인상은 물가 부담으로 이어질 수 있어요.")
});

const PROFILE_EMOJIS = ["🦀", "🌱", "☁️", "📚", "🐟", "🐈", "🌙", "🍞"];

const MONTHLY_TOPIC_TEMPLATES = [
  {
    title: "금리 인하 기대감",
    keywords: ["기준금리", "금리인하", "연준", "FOMC", "국채금리"],
    description: "중앙은행이 언제 금리를 낮출지에 대한 기대가 시장의 큰 이야기가 되고 있어요.",
    reason: "금리가 내려가면 대출 부담과 투자 심리가 함께 달라질 수 있기 때문이에요.",
    mood: "🧊 관망 흐름"
  },
  {
    title: "반도체 회복 흐름",
    keywords: ["반도체", "AI", "AI관련주", "코스피", "수출"],
    description: "AI 수요와 수출 회복 기대가 반도체 업종을 다시 뉴스의 중심으로 데려오고 있어요.",
    reason: "한국 증시와 수출에서 반도체 비중이 크기 때문에 경기 분위기와 연결돼요.",
    mood: "🌱 성장 기대"
  },
  {
    title: "고유가와 생활 물가",
    keywords: ["고유가", "국제유가", "물가상승률", "생활비", "전기요금"],
    description: "기름값과 공공요금이 생활비 부담으로 이어질 수 있다는 걱정이 커지고 있어요.",
    reason: "물류비와 생산비가 오르면 소비자가 체감하는 가격도 올라갈 수 있어요.",
    mood: "⚠ 변동성 확대"
  },
  {
    title: "부동산 규제와 전월세",
    keywords: ["부동산규제", "DSR", "LTV", "전세", "월세"],
    description: "대출 규제와 전월세 흐름이 주거비와 거래 심리에 영향을 주고 있어요.",
    reason: "집을 사려는 사람, 세입자, 집주인의 판단이 모두 달라질 수 있기 때문이에요.",
    mood: "🧊 관망 흐름"
  }
];

const TERM_KEYS = Object.keys(TERM_DICTIONARY).sort((a, b) => b.length - a.length);

function App() {
  const brand = useMemo(getBrand, []);
  const [articles, setArticles] = useState([]);
  const [articleSource, setArticleSource] = useState("loading");
  const [visibleCount, setVisibleCount] = useState(6);
  const [activeView, setActiveView] = useState("feed");
  const [category, setCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [openedTerm, setOpenedTerm] = useState(null);
  const [data, setData] = usePersistentData();

  useEffect(() => {
    fetchArticles().then((result) => {
      setArticles(result.articles);
      setArticleSource(result.source);
    });
  }, []);

  useEffect(() => {
    setVisibleCount(6);
  }, [category, query]);

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return articles.filter((article) => {
      const categoryMatches = category === "all" || article.category === category;
      const memo = data.memos[article.id]?.content || "";
      const text = `${article.title} ${article.summary} ${memo}`.toLowerCase();
      return categoryMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [articles, category, data.memos, query]);

  const savedArticles = useMemo(
    () => articles.filter((article) => data.saved[article.id]),
    [articles, data.saved]
  );

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const monthlyTopics = useMemo(() => buildMonthlyTopics(articles), [articles]);
  const profile = data.profile || emptyData().profile;

  function openTerm(term) {
    setOpenedTerm(term);
    setData((current) => ({
      ...current,
      learnedTerms: {
        ...current.learnedTerms,
        [term]: { term, count: (current.learnedTerms[term]?.count || 0) + 1, updatedAt: new Date().toISOString() }
      }
    }));
  }

  function updateMemo(articleId, patch) {
    setData((current) => ({
      ...current,
      memos: {
        ...current.memos,
        [articleId]: {
          articleId,
          content: current.memos[articleId]?.content || "",
          tags: current.memos[articleId]?.tags || [],
          ...patch,
          updatedAt: new Date().toISOString()
        }
      }
    }));
  }

  function toggleSaved(articleId) {
    setData((current) => {
      const nextSaved = { ...current.saved };
      if (nextSaved[articleId]) delete nextSaved[articleId];
      else nextSaved[articleId] = { articleId, savedAt: new Date().toISOString() };
      return { ...current, saved: nextSaved };
    });
  }

  const learnedList = Object.values(data.learnedTerms).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  return (
    <main className="app">
      <Header activeView={activeView} setActiveView={setActiveView} noteCount={savedArticles.length} brand={brand} profile={profile} />
      <section className="hero">
        <div className="heroMain">
          <p className="eyebrow">personal economy archive</p>
          <h1><BrandMark brand={brand} size="hero" />{brand.heroTitle}</h1>
          <p className="heroText">
            {brand.heroText}
          </p>
          <div className="heroStats">
            <div className="statTile"><strong>{articles.length || "-"}</strong><span>오늘 읽을 뉴스</span><small>제목과 짧은 요약만 모았어요</small></div>
            <div className="statTile"><strong>{savedArticles.length}</strong><span>내 노트</span><small>다시 보고 싶은 생각</small></div>
            <div className="statTile"><strong>{learnedList.length}</strong><span>익힌 용어</span><small>눌러본 경제 키워드</small></div>
          </div>
        </div>
        <div className="heroSide">
          <ProfileCard profile={profile} onProfileChange={(profilePatch) => setData((current) => ({ ...current, profile: { ...current.profile, ...profilePatch } }))} brand={brand} />
          <LearnedWidget learnedTerms={learnedList} openTerm={openTerm} />
        </div>
      </section>

      {activeView === "feed" ? (
        <>
          <Toolbar
            category={category}
            setCategory={setCategory}
            query={query}
            setQuery={setQuery}
            articleSource={articleSource}
            totalCount={filteredArticles.length}
          />
          <MonthlyTopics topics={monthlyTopics} articles={articles} onOpenTerm={openTerm} />
          <section className="contentGrid">
            <div className="articleGrid">
              {visibleArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  memo={data.memos[article.id]}
                  isSaved={Boolean(data.saved[article.id])}
                  onOpenTerm={openTerm}
                  onMemoChange={updateMemo}
                  onToggleSaved={toggleSaved}
                />
              ))}
              <LoadMoreArea
                articleSource={articleSource}
                remaining={filteredArticles.length - visibleArticles.length}
                totalCount={filteredArticles.length}
                onLoadMore={() => setVisibleCount((count) => count + 8)}
              />
            </div>
            <aside className="sidePanel">
              <TermSearchPanel articles={articles} onOpenTerm={openTerm} />
              <TermGame learnedTerms={learnedList} onOpenTerm={openTerm} />
              <SensefolioPanel />
            </aside>
          </section>
        </>
      ) : (
        <NotesPage
          articles={savedArticles}
          memos={data.memos}
          saved={data.saved}
          onOpenTerm={openTerm}
          onMemoChange={updateMemo}
          onToggleSaved={toggleSaved}
        />
      )}

      {openedTerm && <TermModal term={openedTerm} articles={articles} onOpenTerm={openTerm} onClose={() => setOpenedTerm(null)} />}
    </main>
  );
}

function LoadMoreArea({ articleSource, remaining, totalCount, onLoadMore }) {
  if (remaining > 0) {
    return (
      <div className="loadMoreArea">
        <button className="loadMoreButton" type="button" onClick={onLoadMore}>
          뉴스 더 보기 ({remaining}개 남음)
        </button>
      </div>
    );
  }

  return (
    <div className="loadMoreArea done">
      <strong>현재 {totalCount}개를 모두 보고 있어요.</strong>
      <span>
        {articleSource === "live"
          ? "새 뉴스가 필요하면 잠시 뒤 새로고침해보세요."
          : "실시간으로 더 많이 보려면 HTML 말고 나는돈이좋아-이미지버전.bat을 열어주세요."}
      </span>
    </div>
  );
}

function Header({ activeView, setActiveView, noteCount, brand, profile }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setActiveView("feed")} type="button">
        <BrandMark brand={brand} />
        <span>{brand.name}</span>
        <span className="moneyLine">{brand.tagline}</span>
      </button>
      <nav className="navTabs" aria-label="주요 메뉴">
        <button className={activeView === "feed" ? "active" : ""} onClick={() => setActiveView("feed")} type="button">
          뉴스
        </button>
        <button className={activeView === "notes" ? "active" : ""} onClick={() => setActiveView("notes")} type="button">
          내 노트 <span>{noteCount}</span>
        </button>
      </nav>
      <button className="profileShortcut" type="button" onClick={() => document.getElementById("profile-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}>
        <Avatar profile={profile} compact />
        <span>{profile.name || "나의 경제 노트"}</span>
      </button>
    </header>
  );
}

function BrandMark({ brand, size = "nav" }) {
  if (brand.type === "image") {
    return (
      <span className={size === "hero" ? "heroImageMark" : "crabMark"} aria-hidden="true">
        <img src={brand.mark} alt="" />
      </span>
    );
  }

  return (
    <span className={size === "hero" ? "tinyCrab" : "crabMark"} aria-hidden="true">
      {brand.mark}
    </span>
  );
}

function Avatar({ profile, compact = false }) {
  const className = compact ? "avatar compact" : "avatar";
  if (profile.avatarType === "image" && profile.image) {
    return <span className={className}><img src={profile.image} alt="" /></span>;
  }
  if (profile.avatarType === "emoji" && profile.emoji) {
    return <span className={className}>{profile.emoji}</span>;
  }
  return <span className={className}><BrandMark brand={getBrand()} /></span>;
}

function ProfileCard({ profile, onProfileChange, brand }) {
  function handleImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onProfileChange({ avatarType: "image", image: reader.result });
    reader.readAsDataURL(file);
  }

  return (
    <section className="profileCard" id="profile-card">
      <div className="profileCardHeader">
        <div>
          <p className="eyebrow">profile</p>
          <h2>프로필 사진 바꾸기</h2>
        </div>
        <span className="profileHint">사진 또는 이모티콘</span>
      </div>
      <div className="profileIdentity">
        <Avatar profile={profile} />
        <div>
          <strong>{profile.name || "나의 경제 노트"}</strong>
          <p className="helperText">내 뉴스 아카이브에 표시될 프로필이에요. 사진을 올리면 바로 미리보기로 바뀝니다.</p>
        </div>
      </div>
      <label className="fieldLabel">
        별명
        <input
          className="softInput"
          value={profile.name || ""}
          onChange={(event) => onProfileChange({ name: event.target.value })}
          placeholder="예: 돈 공부하는 나"
        />
      </label>
      <p className="fieldLabelText">내 컴퓨터나 휴대폰에 있는 이미지를 선택하세요.</p>
      <div className="profileTools">
        <label className="uploadButton">
          <Upload size={16} />
          프로필 사진 선택
          <input type="file" accept="image/*" onChange={handleImage} />
        </label>
        <button className="ghostButton" type="button" onClick={() => onProfileChange({ avatarType: "brand", image: "", emoji: "" })}>
          기본 로고로
        </button>
      </div>
      <p className="fieldLabelText">사진 대신 가벼운 이모티콘을 써도 좋아요.</p>
      <div className="emojiPicker" aria-label="프로필 이모티콘 선택">
        {PROFILE_EMOJIS.map((emoji) => (
          <button key={emoji} className={profile.avatarType === "emoji" && profile.emoji === emoji ? "selected" : ""} type="button" onClick={() => onProfileChange({ avatarType: "emoji", emoji, image: "" })}>
            {emoji}
          </button>
        ))}
      </div>
      <p className="helperText">이 설정은 이 브라우저에 저장돼요. 배포용 사이트에서도 각자 자기 프로필을 따로 설정할 수 있습니다.</p>
    </section>
  );
}

function Toolbar({ category, setCategory, query, setQuery, articleSource, totalCount }) {
  return (
    <section className="toolbar">
      <div className="categoryRail">
        {CATEGORIES.map((item) => (
          <button
            key={item.id}
            className={`chip ${category === item.id ? "selected" : ""}`}
            onClick={() => setCategory(item.id)}
            type="button"
          >
            {item.label}
          </button>
        ))}
      </div>
      <label className="searchBox">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="궁금한 뉴스, 메모, 키워드를 찾아보세요" />
      </label>
      <div className={`sourceNotice ${articleSource}`}>
        {articleSource === "live" ? "새 뉴스 연결됨" : articleSource === "loading" ? "뉴스를 모으는 중" : "샘플로 둘러보기"}
        <span>{totalCount}개</span>
      </div>
    </section>
  );
}

function MonthlyTopics({ topics, articles, onOpenTerm }) {
  return (
    <section className="monthlyTopics">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">monthly mood</p>
          <h2>이번 달 자주 언급되는 경제 토픽</h2>
        </div>
        <span>뉴스를 흐름으로 읽어보세요</span>
      </div>
      <div className="topicGrid">
        {topics.map((topic) => {
          const related = getRelatedArticles(topic.title, articles, topic.keywords).slice(0, 2);
          return (
            <article className="topicCard" key={topic.title}>
              <span className="moodPill">{topic.mood}</span>
              <h3>{topic.title}</h3>
              <p>{topic.description}</p>
              <div className="topicReason">
                <strong>왜 화제일까?</strong>
                <span>{topic.reason}</span>
              </div>
              <div className="termList compact">
                {topic.keywords.slice(0, 4).map((keyword) => (
                  <button key={keyword} type="button" onClick={() => onOpenTerm(keyword)}>{keyword}</button>
                ))}
              </div>
              {related.length > 0 && (
                <div className="relatedMini">
                  <strong>관련 뉴스</strong>
                  {related.map((article) => <a key={article.id} href={article.url} target="_blank" rel="noreferrer">{article.title}</a>)}
                </div>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ArticleCard({ article, memo, isSaved, onOpenTerm, onMemoChange, onToggleSaved }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const terms = useMemo(() => detectTerms(`${article.title} ${article.summary}`), [article]);
  const categoryMeta = CATEGORIES.find((item) => item.id === article.category);
  const mood = getMarketMood(article);

  return (
    <article className="articleCard">
      <div className="cardTop">
        <div className="cardBadges">
          <span className={`categoryBadge ${categoryMeta?.tone || "neutral"}`}>{categoryMeta?.label}</span>
          <span className="moodPill">{mood.label}</span>
        </div>
        <button className={`iconButton ${isSaved ? "saved" : ""}`} onClick={() => onToggleSaved(article.id)} type="button" aria-label="뉴스 저장">
          <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>
      <h2>{highlightTerms(article.title, onOpenTerm)}</h2>
      <p className="meta">{article.source} · {article.publishedAt}</p>
      <p className="summary">{highlightTerms(article.summary, onOpenTerm)}</p>

      <section className="termSection">
        <p className="sectionLabel"><Sparkles size={15} /> 이 뉴스에 나온 경제 용어</p>
        <div className="termList">
          {terms.length ? terms.map((term) => (
            <button key={term} type="button" onClick={() => onOpenTerm(term)}>{term}</button>
          )) : <span className="emptyText">아직 표시할 용어가 없어요. 궁금한 단어는 오른쪽 검색창에 직접 적어보세요.</span>}
        </div>
      </section>

      <button className="guideToggle" type="button" onClick={() => setGuideOpen((value) => !value)}>
        <Lightbulb size={17} />
        뉴스 읽기 가이드
        <ChevronDown className={guideOpen ? "rotated" : ""} size={18} />
      </button>
      {guideOpen && (
        <ol className="guideList">
          {(GUIDE_BY_CATEGORY[article.category] || GUIDE_BY_CATEGORY.global).map((question) => <li key={question}>{question}</li>)}
        </ol>
      )}

      <section className="memoBox">
        <label>
          <NotebookPen size={16} />
          오늘의 기록
          <textarea
            value={memo?.content || ""}
            onChange={(event) => onMemoChange(article.id, { content: event.target.value })}
            placeholder="새롭게 알게 된 것, 나중에 다시 보고 싶은 생각, 오늘 느낀 시장 분위기를 편하게 남겨보세요."
          />
        </label>
        <label className="tagInput">
          <Tag size={15} />
          태그
          <input
            value={(memo?.tags || []).join(", ")}
            onChange={(event) => onMemoChange(article.id, { tags: toTags(event.target.value) })}
            placeholder="예: 금리공부, 생활비, 반도체"
          />
        </label>
      </section>

      <div className="cardActions">
        <a href={article.url} target="_blank" rel="noreferrer">
          언론사 원문 읽기 <ExternalLink size={16} />
        </a>
        <button type="button" onClick={() => onToggleSaved(article.id)}>
          {isSaved ? "내 노트에 담김" : "내 노트에 담기"}
        </button>
      </div>
    </article>
  );
}

function LearnedWidget({ learnedTerms, openTerm }) {
  return (
    <aside className="learnedWidget">
      <div className="widgetTitle">
        <Brain size={20} />
        <strong>최근 눌러본 경제 키워드</strong>
      </div>
      {learnedTerms.length ? (
        <div className="learnedTerms">
          {learnedTerms.slice(0, 6).map((item) => (
            <button key={item.term} type="button" onClick={() => openTerm(item.term)}>
              {item.term}<span>{item.count}</span>
            </button>
          ))}
        </div>
      ) : (
        <p>뉴스를 읽다가 노란 키워드를 눌러보면 여기에 차곡차곡 쌓여요.</p>
      )}
    </aside>
  );
}

function TermSearchPanel({ articles, onOpenTerm }) {
  const [termQuery, setTermQuery] = useState("");
  const trimmed = termQuery.trim();
  const suggestions = useMemo(() => {
    const base = trimmed ? searchTerms(trimmed) : ["기준금리", "CPI", "코스피", "고유가", "부동산규제", "ETF", "환율", "반도체"];
    return base.slice(0, 8);
  }, [trimmed]);
  const selectedTerm = trimmed || suggestions[0];
  const insight = selectedTerm ? getTermInsight(selectedTerm, articles) : null;

  return (
    <section className="termSearchPanel">
      <div className="panelTitle">
        <Search size={20} />
        <strong>궁금한 경제 단어 찾기</strong>
      </div>
      <p>뉴스에서 본 단어를 그대로 적어보세요. 사전에 없는 표현도 경제뉴스 맥락에 맞춰 쉽게 풀어볼게요.</p>
      <label className="searchBox full">
        <Search size={17} />
        <input value={termQuery} onChange={(event) => setTermQuery(event.target.value)} placeholder="예: 고유가, AI 관련주, 민생지원금" />
      </label>
      <div className="termList">
        {suggestions.map((term) => (
          <button key={term} type="button" onClick={() => {
            setTermQuery(term);
            onOpenTerm(term);
          }}>{term}</button>
        ))}
      </div>
      {insight && (
        <div className="termPreview">
          <strong>{insight.term}</strong>
          <p>{insight.short}</p>
          <button className="termButton" type="button" onClick={() => onOpenTerm(insight.term)}>자세히 보기</button>
        </div>
      )}
    </section>
  );
}

function TermGame({ learnedTerms, onOpenTerm }) {
  const allTerms = useMemo(() => {
    const learned = learnedTerms.map((item) => findCanonicalTerm(item.term)).filter(Boolean);
    return [...new Set([...learned, ...TERM_KEYS])];
  }, [learnedTerms]);
  const [round, setRound] = useState(() => makeRound(allTerms));
  const [selected, setSelected] = useState("");
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState("choice");
  const isCorrect = selected ? selected === round.answer : normalizeAnswer(typed) === normalizeAnswer(round.answer);
  const hasAnswered = selected || typed.trim().length > 0;

  useEffect(() => {
    setRound(makeRound(allTerms));
    setSelected("");
    setTyped("");
  }, [allTerms]);

  function nextRound() {
    setRound(makeRound(allTerms));
    setSelected("");
    setTyped("");
  }

  return (
    <section className="gamePanel">
      <div className="panelTitle">
        <Gamepad2 size={20} />
        <strong>경제용어 맞추기</strong>
      </div>
      <p className="quizPrompt">{TERM_DICTIONARY[round.answer].short}</p>
      <div className="segmented">
        <button type="button" className={mode === "choice" ? "active" : ""} onClick={() => setMode("choice")}>4지선다</button>
        <button type="button" className={mode === "typing" ? "active" : ""} onClick={() => setMode("typing")}>직접입력</button>
      </div>
      {mode === "choice" ? (
        <div className="choices">
          {round.options.map((option) => (
            <button
              key={option}
              type="button"
              className={selected === option ? "picked" : ""}
              onClick={() => setSelected(option)}
            >
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input className="answerInput" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="정답 용어 입력" />
      )}
      {hasAnswered && (
        <div className={`result ${isCorrect ? "correct" : "wrong"}`}>
          {isCorrect ? <Check size={16} /> : <X size={16} />}
          {isCorrect ? "정답이에요!" : `정답은 ${round.answer}예요.`}
        </div>
      )}
      <div className="gameActions">
        <button type="button" onClick={() => onOpenTerm(round.answer)}>풀이 보기</button>
        <button type="button" onClick={nextRound}>다음 문제</button>
      </div>
    </section>
  );
}

function NotesPage({ articles, memos, saved, onOpenTerm, onMemoChange, onToggleSaved }) {
  const [tag, setTag] = useState("all");
  const tags = [...new Set(Object.values(memos).flatMap((memo) => memo.tags || []))];
  const visibleArticles = tag === "all" ? articles : articles.filter((article) => memos[article.id]?.tags?.includes(tag));

  return (
    <section className="notesPage">
      <div className="noteSummary">
        <div><strong>{Object.keys(saved).length}</strong><span>저장한 뉴스</span></div>
        <div><strong>{Object.values(memos).filter((memo) => memo.content).length}</strong><span>작성한 메모</span></div>
        <div><strong>{tags.length}</strong><span>태그</span></div>
      </div>
      <div className="categoryRail">
        <button className={`chip ${tag === "all" ? "selected" : ""}`} type="button" onClick={() => setTag("all")}>전체</button>
        {tags.map((item) => (
          <button key={item} className={`chip ${tag === item ? "selected" : ""}`} type="button" onClick={() => setTag(item)}>#{item}</button>
        ))}
      </div>
      {visibleArticles.length ? (
        <div className="articleGrid notesGrid">
          {visibleArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              memo={memos[article.id]}
              isSaved={Boolean(saved[article.id])}
              onOpenTerm={onOpenTerm}
              onMemoChange={onMemoChange}
              onToggleSaved={onToggleSaved}
            />
          ))}
        </div>
      ) : (
        <div className="emptyState">
          <UserRound size={26} />
          <strong>아직 남겨진 경제 기록이 없어요.</strong>
          <p>오늘 읽은 뉴스에서 마음에 걸린 문장, 새롭게 알게 된 단어, 나중에 다시 보고 싶은 생각을 가볍게 남겨보세요.</p>
        </div>
      )}
    </section>
  );
}

function SensefolioPanel() {
  return (
    <section className="sensePanel">
      <div className="panelTitle">
        <ExternalLink size={19} />
        <strong>투자 해석이 더 궁금하다면</strong>
      </div>
      <p>뉴스를 읽고 난 뒤, 시장 해석과 투자 관점까지 이어서 보고 싶다면 Sensefolio에서 조금 더 깊게 살펴볼 수 있어요.</p>
      <a className="primaryButton soft" href="https://sensefolio-note.vercel.app/" target="_blank" rel="noreferrer">
        Sensefolio 보기 <ExternalLink size={16} />
      </a>
    </section>
  );
}

function TermModal({ term, articles, onOpenTerm, onClose }) {
  const entry = getTermInsight(term, articles);
  const related = getRelatedArticles(term, articles, entry.related).slice(0, 3);
  return (
    <div className="modalBackdrop" onClick={onClose} role="presentation">
      <section className="termModal" onClick={(event) => event.stopPropagation()}>
        <button className="closeButton" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        <p className="eyebrow">경제 키워드 노트</p>
        <h3>{entry.term}</h3>
        <p className="termShort">{entry.short}</p>
        <div className="termGuideStack">
          <div className="guideCard"><strong>왜 중요할까?</strong><p>{entry.why}</p></div>
          <div className="guideCard"><strong>요즘 왜 자주 보일까?</strong><p>{entry.recent}</p></div>
          <div className="guideCard"><strong>시장과 생활에는?</strong><p>{entry.impact}</p></div>
        </div>
        <div className="exampleBox">
          <strong>예시로 읽기</strong>
          <span>{entry.example}</span>
        </div>
        <div className="termList modalTerms">
          {entry.related.map((keyword) => (
            <button key={keyword} type="button" onClick={() => onOpenTerm(keyword)}>{keyword}</button>
          ))}
        </div>
        {related.length > 0 && (
          <div className="relatedNews">
            <strong>{entry.term} 관련 뉴스</strong>
            {related.map((article) => <a key={article.id} href={article.url} target="_blank" rel="noreferrer">{article.title}</a>)}
          </div>
        )}
      </section>
    </div>
  );
}

function usePersistentData() {
  const [data, setData] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || emptyData();
    } catch {
      return emptyData();
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  return [data, setData];
}

function emptyData() {
  return {
    saved: {},
    memos: {},
    learnedTerms: {},
    profile: {
      name: "",
      avatarType: "brand",
      emoji: "",
      image: ""
    }
  };
}

function detectTerms(text) {
  return TERM_KEYS.filter((term) => {
    const entry = TERM_DICTIONARY[term];
    return [term, ...(entry.aliases || [])].some((word) => text.includes(word));
  });
}

function highlightTerms(text, onOpenTerm) {
  const terms = detectTerms(text);
  if (!terms.length) return text;
  const pattern = new RegExp(`(${terms.flatMap((term) => [term, ...(TERM_DICTIONARY[term].aliases || [])]).map(escapeRegExp).join("|")})`, "g");
  return text.split(pattern).map((part, index) => {
    const canonical = terms.find((term) => term === part || TERM_DICTIONARY[term].aliases?.includes(part));
    if (!canonical) return <span key={`${part}-${index}`}>{part}</span>;
    return <button key={`${part}-${index}`} className="termHighlight" type="button" onClick={() => onOpenTerm(canonical)}>{part}</button>;
  });
}

function makeRound(pool) {
  const answer = pick(pool);
  const options = shuffle([answer, ...shuffle(TERM_KEYS.filter((term) => term !== answer)).slice(0, 3)]);
  return { answer, options };
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function shuffle(list) {
  return [...list].sort(() => Math.random() - 0.5);
}

function toTags(value) {
  return value.split(",").map((tag) => tag.trim().replace(/^#/, "")).filter(Boolean);
}

function normalizeAnswer(value) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function term(short, detail, example, aliases = []) {
  return {
    aliases,
    short,
    detail,
    example,
    why: detail,
    recent: "최근 뉴스에서 정책, 금리, 업종 흐름과 함께 자주 언급되는 키워드예요.",
    impact: "시장 심리와 생활비, 투자 판단에 간접적으로 영향을 줄 수 있어요."
  };
}

function searchTerms(query) {
  const normalized = normalizeAnswer(query);
  const matches = TERM_KEYS.filter((term) => {
    const entry = TERM_DICTIONARY[term];
    return normalizeAnswer(term).includes(normalized) || entry.aliases?.some((alias) => normalizeAnswer(alias).includes(normalized));
  });
  return matches.length ? matches : [query, ...inferRelatedKeywords(query)].slice(0, 8);
}

function getTermInsight(rawTerm, articles = []) {
  const canonical = findCanonicalTerm(rawTerm);
  const entry = canonical ? TERM_DICTIONARY[canonical] : null;
  const termName = canonical || rawTerm;
  const related = [...new Set([...(entry?.aliases || []), ...inferRelatedKeywords(termName)])].filter((item) => item && normalizeAnswer(item) !== normalizeAnswer(termName)).slice(0, 6);
  const relatedCount = getRelatedArticles(termName, articles, related).length;

  if (entry) {
    return {
      term: termName,
      short: entry.short,
      why: entry.why || entry.detail,
      recent: relatedCount ? `최근 가져온 뉴스 중 ${relatedCount}건에서 이 흐름과 연결되는 표현이 보여요.` : entry.recent || "경제뉴스에서 자주 등장하는 기본 키워드예요.",
      impact: entry.impact || entry.detail,
      example: entry.example,
      related: related.length ? related : inferRelatedKeywords(termName)
    };
  }

  const guessed = inferTermType(termName);
  return {
    term: termName,
    short: `${termName}은/는 최근 뉴스 맥락에서 흐름을 이해하기 위해 따로 살펴볼 만한 경제 키워드예요.`,
    why: guessed.why,
    recent: relatedCount ? `현재 뉴스 목록에서 관련 기사 ${relatedCount}건이 보여요. 새로 등장한 정책명이나 산업 표현도 이렇게 연결해서 볼 수 있어요.` : "아직 사전에 고정된 단어가 아니어도, 뉴스에서 반복해서 보이면 중요한 흐름일 수 있어요.",
    impact: guessed.impact,
    example: `"${termName}"이라는 단어가 보이면, 어떤 업종·정책·생활비와 연결되는지 함께 읽어보면 좋아요.`,
    related
  };
}

function findCanonicalTerm(value) {
  const normalized = normalizeAnswer(value);
  return TERM_KEYS.find((term) => normalizeAnswer(term) === normalized || TERM_DICTIONARY[term].aliases?.some((alias) => normalizeAnswer(alias) === normalized));
}

function inferRelatedKeywords(value) {
  const text = String(value);
  if (/금리|연준|FOMC|국채|채권/.test(text)) return ["기준금리", "연준", "국채금리", "환율", "코스피"];
  if (/반도체|AI|삼성|하이닉스|테마/.test(text)) return ["반도체", "AI관련주", "코스피", "수출", "외국인매수"];
  if (/유가|원유|기름|물가|전기|생활/.test(text)) return ["고유가", "국제유가", "물가상승률", "생활비", "환율"];
  if (/부동산|전세|월세|DSR|LTV|주택/.test(text)) return ["부동산규제", "DSR", "LTV", "전세", "월세"];
  if (/환율|달러|엔화|수출|관세/.test(text)) return ["환율", "달러강세", "수출", "관세", "원자재"];
  if (/지원금|쿠폰|민생|소비/.test(text)) return ["민생지원금", "소비쿠폰", "생활비", "소비심리", "물가상승률"];
  return ["금리", "환율", "물가상승률", "코스피", "생활비"];
}

function inferTermType(value) {
  const text = String(value);
  if (/정책|지원|쿠폰|규제|관세/.test(text)) {
    return {
      why: "정책 키워드는 돈의 흐름과 사람들의 선택을 바꿀 수 있어서 중요해요.",
      impact: "가계 부담, 기업 비용, 특정 업종의 기대감에 영향을 줄 수 있어요."
    };
  }
  if (/AI|반도체|배터리|산업|기업/.test(text)) {
    return {
      why: "산업 키워드는 기업 실적과 증시 분위기를 이해하는 단서가 돼요.",
      impact: "관련 업종의 투자심리, 수출 기대, 고용 흐름에 영향을 줄 수 있어요."
    };
  }
  return {
    why: "경제뉴스에서 반복되는 단어는 시장이 지금 무엇을 걱정하거나 기대하는지 보여줘요.",
    impact: "금리, 환율, 물가, 주식시장, 생활비 중 어디와 연결되는지 함께 보면 이해가 쉬워져요."
  };
}

function getRelatedArticles(term, articles, related = []) {
  const words = [term, ...related].filter(Boolean).map(normalizeAnswer);
  return articles.filter((article) => {
    const text = normalizeAnswer(`${article.title} ${article.summary}`);
    return words.some((word) => word && text.includes(word));
  });
}

function getMarketMood(article) {
  const text = `${article.title} ${article.summary}`;
  if (/급등|과열|랠리|테마|강세/.test(text)) return { label: "🔥 과열" };
  if (/기대|회복|성장|수요|개선|호조/.test(text)) return { label: "🌱 성장 기대" };
  if (/둔화|침체|부진|하락|위축|부담/.test(text)) return { label: "🌧 경기 둔화 우려" };
  if (/변동성|불확실|우려|갈등|급락|압박/.test(text)) return { label: "⚠ 변동성 확대" };
  return { label: "🧊 관망 흐름" };
}

function buildMonthlyTopics(articles) {
  return MONTHLY_TOPIC_TEMPLATES.map((topic) => {
    const relatedCount = getRelatedArticles(topic.title, articles, topic.keywords).length;
    return {
      ...topic,
      reason: relatedCount ? `${topic.reason} 현재 뉴스 목록에서도 관련 흐름이 ${relatedCount}건 이어지고 있어요.` : topic.reason
    };
  });
}

function getBrand() {
  const mode = new URLSearchParams(window.location.search).get("brand");
  return BRANDS[mode] || BRANDS.public;
}

export default App;
