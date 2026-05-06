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
    tagline: "경제뉴스를 쉽게 읽는 노트",
    heroTitle: "나는 돈이 좋아~",
    heroText: "경제뉴스를 읽고, 어려운 용어를 쉽게 익히고, 내 생각까지 남기는 돈 공부 노트입니다."
  },
  personal: {
    type: "image",
    mark: "/assets/money-crab.jpg",
    name: "나는 돈이 좋아~",
    tagline: "경제뉴스를 쉽게 읽는 노트",
    heroTitle: "나는 돈이 좋아~",
    heroText: "경제뉴스를 읽고, 어려운 용어를 쉽게 익히고, 내 생각까지 남기는 돈 공부 노트입니다."
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
      <Header activeView={activeView} setActiveView={setActiveView} noteCount={savedArticles.length} brand={brand} />
      <section className="hero">
        <div>
          <p className="eyebrow">copyright-safe economy archive</p>
          <h1><BrandMark brand={brand} size="hero" />{brand.heroTitle}</h1>
          <p className="heroText">
            {brand.heroText}
          </p>
        </div>
        <LearnedWidget learnedTerms={learnedList} openTerm={openTerm} />
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
              <TermGame learnedTerms={learnedList} onOpenTerm={openTerm} />
              <IntegrationPlan />
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

      {openedTerm && <TermModal term={openedTerm} onClose={() => setOpenedTerm(null)} />}
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

function Header({ activeView, setActiveView, noteCount, brand }) {
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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 요약, 메모 검색" />
      </label>
      <div className={`sourceNotice ${articleSource}`}>
        {articleSource === "live" ? "실시간 RSS 뉴스" : articleSource === "loading" ? "뉴스 불러오는 중" : "샘플 뉴스"}
        <span>{totalCount}개</span>
      </div>
    </section>
  );
}

function ArticleCard({ article, memo, isSaved, onOpenTerm, onMemoChange, onToggleSaved }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const terms = useMemo(() => detectTerms(`${article.title} ${article.summary}`), [article]);
  const categoryMeta = CATEGORIES.find((item) => item.id === article.category);

  return (
    <article className="articleCard">
      <div className="cardTop">
        <span className={`categoryBadge ${categoryMeta?.tone || "neutral"}`}>{categoryMeta?.label}</span>
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
          )) : <span className="emptyText">감지된 용어가 아직 없어요.</span>}
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
          내 생각
          <textarea
            value={memo?.content || ""}
            onChange={(event) => onMemoChange(article.id, { content: event.target.value })}
            placeholder="한 줄 평이나 더 찾아보고 싶은 점을 적어보세요."
          />
        </label>
        <label className="tagInput">
          <Tag size={15} />
          태그
          <input
            value={(memo?.tags || []).join(", ")}
            onChange={(event) => onMemoChange(article.id, { tags: toTags(event.target.value) })}
            placeholder="예: 금리공부, 내대출, 관심종목"
          />
        </label>
      </section>

      <div className="cardActions">
        <a href={article.url} target="_blank" rel="noreferrer">
          원문 보기 <ExternalLink size={16} />
        </a>
        <button type="button" onClick={() => onToggleSaved(article.id)}>
          {isSaved ? "저장됨" : "노트에 저장"}
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
        <strong>오늘 배운 용어</strong>
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
        <p>뉴스 카드의 노란 용어를 눌러보면 여기에 기록돼요.</p>
      )}
    </aside>
  );
}

function TermGame({ learnedTerms, onOpenTerm }) {
  const allTerms = useMemo(() => {
    const learned = learnedTerms.map((item) => item.term);
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
        <div className="emptyState">저장한 뉴스가 아직 없어요. 마음에 드는 뉴스를 노트에 저장해보세요.</div>
      )}
    </section>
  );
}

function IntegrationPlan() {
  return (
    <section className="integrationPanel">
      <div className="panelTitle">
        <ExternalLink size={19} />
        <strong>API 연동 구조</strong>
      </div>
      <p>`나는돈이좋아.bat`으로 열면 RSS 서버에서 최신 경제뉴스를 가져옵니다. HTML만 더블클릭하면 샘플 뉴스로 보일 수 있어요.</p>
      <ul>
        <li>기사 전문 저장 금지</li>
        <li>요약은 220자 안팎</li>
        <li>원문 링크는 언론사 URL 유지</li>
      </ul>
    </section>
  );
}

function TermModal({ term, onClose }) {
  const entry = TERM_DICTIONARY[term];
  return (
    <div className="modalBackdrop" onClick={onClose} role="presentation">
      <section className="termModal" onClick={(event) => event.stopPropagation()}>
        <button className="closeButton" type="button" onClick={onClose} aria-label="닫기"><X size={20} /></button>
        <p className="eyebrow">경제 용어 풀이</p>
        <h3>{term}</h3>
        <p className="termShort">{entry.short}</p>
        <p>{entry.detail}</p>
        <div className="exampleBox">
          <strong>예시</strong>
          <span>{entry.example}</span>
        </div>
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
  return { saved: {}, memos: {}, learnedTerms: {} };
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

function getBrand() {
  const mode = new URLSearchParams(window.location.search).get("brand");
  return BRANDS[mode] || BRANDS.public;
}

export default App;
