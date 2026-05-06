import {
  Bookmark,
  Brain,
  Check,
  ChevronDown,
  Clock3,
  ExternalLink,
  Filter,
  Gamepad2,
  Lightbulb,
  NotebookPen,
  RefreshCcw,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { BRANDS, CATEGORIES, GUIDE_BY_CATEGORY, TERM_DICTIONARY, TERM_KEYS } from "./economyData";
import { fetchArticles } from "./newsSources";

const STORAGE_KEY = "easy-econ-news-v3";
const LEGACY_STORAGE_KEY = "easy-econ-news-v2";
const INITIAL_VISIBLE_COUNT = 8;

function AppEnhanced() {
  const brand = useMemo(getBrand, []);
  const [articles, setArticles] = useState([]);
  const [articleSource, setArticleSource] = useState("loading");
  const [fetchState, setFetchState] = useState("loading");
  const [lastUpdatedAt, setLastUpdatedAt] = useState("");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [activeView, setActiveView] = useState("feed");
  const [category, setCategory] = useState("all");
  const [sortBy, setSortBy] = useState("latest");
  const [query, setQuery] = useState("");
  const [onlySaved, setOnlySaved] = useState(false);
  const [openedTerm, setOpenedTerm] = useState(null);
  const [data, setData] = usePersistentData();

  useEffect(() => {
    void loadArticles();
  }, []);

  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [category, sortBy, query, onlySaved]);

  async function loadArticles({ refresh = false } = {}) {
    setFetchState(refresh ? "refreshing" : "loading");
    try {
      const result = await fetchArticles({ bustCache: refresh });
      setArticles(result.articles);
      setArticleSource(result.source);
      setLastUpdatedAt(new Date().toISOString());
      setFetchState("ready");
    } catch {
      setArticleSource("sample");
      setFetchState("ready");
    }
  }

  const filteredArticles = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const next = articles.filter((article) => {
      const categoryMatches = category === "all" || article.category === category;
      const savedMatches = !onlySaved || Boolean(data.saved[article.id]);
      const memo = data.memos[article.id]?.content || "";
      const tags = (data.memos[article.id]?.tags || []).join(" ");
      const text = `${article.title} ${article.summary} ${article.source} ${memo} ${tags}`.toLowerCase();
      return categoryMatches && savedMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });

    return sortArticles(next, sortBy, data);
  }, [articles, category, data, onlySaved, query, sortBy]);

  const savedArticles = useMemo(
    () => sortArticles(articles.filter((article) => data.saved[article.id]), "saved", data),
    [articles, data]
  );

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const learnedList = useMemo(
    () => Object.values(data.learnedTerms).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [data.learnedTerms]
  );
  const memoCount = useMemo(
    () => Object.values(data.memos).filter((memo) => memo.content?.trim()).length,
    [data.memos]
  );
  const dashboard = useMemo(() => makeDashboard(filteredArticles, data), [filteredArticles, data]);
  const hasActiveFilters = category !== "all" || sortBy !== "latest" || onlySaved || query.trim().length > 0;

  function openTerm(term) {
    setOpenedTerm(term);
    setData((current) => ({
      ...current,
      learnedTerms: {
        ...current.learnedTerms,
        [term]: {
          term,
          count: (current.learnedTerms[term]?.count || 0) + 1,
          updatedAt: new Date().toISOString()
        }
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

  function resetFilters() {
    setCategory("all");
    setSortBy("latest");
    setOnlySaved(false);
    setQuery("");
  }

  return (
    <main className="appShell">
      <main className="app">
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          noteCount={savedArticles.length}
          brand={brand}
          articleSource={articleSource}
          fetchState={fetchState}
          lastUpdatedAt={lastUpdatedAt}
          onRefresh={() => void loadArticles({ refresh: true })}
        />

        <section className="hero">
          <div className="heroMain">
            <p className="eyebrow">copyright-safe economy archive</p>
            <h1>
              <BrandMark brand={brand} size="hero" />
              {brand.heroTitle}
            </h1>
            <p className="heroText">{brand.heroText}</p>
            <div className="heroStats">
              <StatTile label="지금 읽을 기사" value={filteredArticles.length} hint="필터 기준" />
              <StatTile label="저장한 기사" value={savedArticles.length} hint="내 노트로 이동 가능" />
              <StatTile label="작성한 메모" value={memoCount} hint="생각이 남아 있는 기사" />
            </div>
          </div>
          <div className="heroSide">
            <LearnedWidget learnedTerms={learnedList} openTerm={openTerm} />
            <BriefingPanel dashboard={dashboard} category={category} query={query} onReset={resetFilters} hasActiveFilters={hasActiveFilters} />
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
              sortBy={sortBy}
              setSortBy={setSortBy}
              onlySaved={onlySaved}
              setOnlySaved={setOnlySaved}
              hasActiveFilters={hasActiveFilters}
              onReset={resetFilters}
            />
            <section className="contentGrid">
              <div className="articleColumn">
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
                    onLoadMore={() => setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT)}
                  />
                </div>
              </div>
              <aside className="sidePanel">
                <FocusPanel article={dashboard.featured} onToggleSaved={toggleSaved} saved={data.saved} />
                <TermGame learnedTerms={learnedList} onOpenTerm={openTerm} />
                <IntegrationPlan articleSource={articleSource} fetchState={fetchState} lastUpdatedAt={lastUpdatedAt} />
              </aside>
            </section>
          </>
        ) : (
          <NotesPage
            articles={savedArticles}
            memos={data.memos}
            saved={data.saved}
            learnedTerms={learnedList}
            onOpenTerm={openTerm}
            onMemoChange={updateMemo}
            onToggleSaved={toggleSaved}
          />
        )}

        {openedTerm && <TermModal term={openedTerm} onClose={() => setOpenedTerm(null)} />}
      </main>
    </main>
  );
}

function Header({ activeView, setActiveView, noteCount, brand, articleSource, fetchState, lastUpdatedAt, onRefresh }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={() => setActiveView("feed")} type="button">
        <BrandMark brand={brand} />
        <span>{brand.name}</span>
        <span className="moneyLine">{brand.tagline}</span>
      </button>

      <div className="topbarActions">
        <div className={`livePill ${articleSource}`}>
          <span className="liveDot" aria-hidden="true" />
          <span>{articleSource === "live" ? "실시간 연결" : articleSource === "sample" ? "샘플 모드" : "불러오는 중"}</span>
          {lastUpdatedAt ? <em>{formatUpdatedTime(lastUpdatedAt)}</em> : null}
        </div>
        <button className="refreshButton" type="button" onClick={onRefresh} disabled={fetchState === "refreshing"}>
          <RefreshCcw size={16} className={fetchState === "refreshing" ? "spin" : ""} />
          {fetchState === "refreshing" ? "새로고침 중" : "새로고침"}
        </button>
        <nav className="navTabs" aria-label="주요 메뉴">
          <button className={activeView === "feed" ? "active" : ""} onClick={() => setActiveView("feed")} type="button">
            뉴스
          </button>
          <button className={activeView === "notes" ? "active" : ""} onClick={() => setActiveView("notes")} type="button">
            내 노트 <span>{noteCount}</span>
          </button>
        </nav>
      </div>
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

function StatTile({ label, value, hint }) {
  return (
    <div className="statTile">
      <strong>{value}</strong>
      <span>{label}</span>
      <small>{hint}</small>
    </div>
  );
}

function BriefingPanel({ dashboard, category, query, onReset, hasActiveFilters }) {
  const currentCategory = CATEGORIES.find((item) => item.id === category);
  const lead = query.trim()
    ? `“${query.trim()}” 검색 기준으로 흐름을 정리했어요.`
    : currentCategory && currentCategory.id !== "all"
      ? `${currentCategory.label} 카테고리 중심으로 지금 볼 만한 흐름이에요.`
      : "전체 흐름에서 많이 보이는 주제와 용어를 먼저 보여드릴게요.";

  return (
    <section className="briefingPanel">
      <div className="panelTitle">
        <TrendingUp size={19} />
        <strong>오늘의 브리핑</strong>
      </div>
      <p className="briefingLead">{lead}</p>
      <div className="briefingList">
        <div>
          <span className="briefingLabel">많이 보이는 카테고리</span>
          <strong>{dashboard.topCategories[0] ? `${dashboard.topCategories[0].label} ${dashboard.topCategories[0].count}건` : "아직 기사 없음"}</strong>
        </div>
        <div>
          <span className="briefingLabel">자주 나온 용어</span>
          <strong>{dashboard.topTerms.length ? dashboard.topTerms.map((item) => item.term).join(", ") : "핵심 용어를 아직 찾는 중이에요."}</strong>
        </div>
        <div>
          <span className="briefingLabel">메모가 붙은 기사</span>
          <strong>{dashboard.memoCount}건</strong>
        </div>
      </div>
      {hasActiveFilters ? (
        <button className="textButton" type="button" onClick={onReset}>
          필터 초기화
        </button>
      ) : null}
    </section>
  );
}

function Toolbar({
  category,
  setCategory,
  query,
  setQuery,
  articleSource,
  totalCount,
  sortBy,
  setSortBy,
  onlySaved,
  setOnlySaved,
  hasActiveFilters,
  onReset
}) {
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
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="제목, 요약, 메모, 태그 검색" />
      </label>

      <div className="toolbarExtras">
        <label className="sortBox">
          <Filter size={16} />
          <select value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
            <option value="latest">최신순</option>
            <option value="saved">저장 우선</option>
            <option value="memo">메모 우선</option>
            <option value="terms">용어 많은 순</option>
          </select>
        </label>
        <button className={`toggleChip ${onlySaved ? "active" : ""}`} type="button" onClick={() => setOnlySaved((value) => !value)}>
          저장한 기사만
        </button>
        {hasActiveFilters ? (
          <button className="textButton inline" type="button" onClick={onReset}>
            초기화
          </button>
        ) : null}
      </div>

      <div className={`sourceNotice ${articleSource}`}>
        <span>{articleSource === "live" ? "실시간 RSS 뉴스" : articleSource === "loading" ? "뉴스 불러오는 중" : "샘플 뉴스"}</span>
        <strong>{totalCount}개</strong>
      </div>
    </section>
  );
}

function ArticleCard({ article, memo, isSaved, onOpenTerm, onMemoChange, onToggleSaved }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const terms = useMemo(() => detectTerms(`${article.title} ${article.summary}`), [article.summary, article.title]);
  const categoryMeta = CATEGORIES.find((item) => item.id === article.category) || CATEGORIES[0];
  const memoText = memo?.content?.trim() || "";

  return (
    <article className="articleCard">
      <div className="cardTop">
        <div className="cardBadges">
          <span className={`categoryBadge ${categoryMeta.tone}`}>{categoryMeta.label}</span>
          {terms.length ? (
            <span className="miniStat">
              <Sparkles size={14} /> 용어 {terms.length}
            </span>
          ) : null}
        </div>
        <button className={`iconButton ${isSaved ? "saved" : ""}`} onClick={() => onToggleSaved(article.id)} type="button" aria-label="뉴스 저장">
          <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      <h2>{highlightTerms(article.title, onOpenTerm)}</h2>
      <div className="metaRow">
        <p className="meta">{article.source} · {formatArticleDate(article.publishedAt)}</p>
        {memoText ? <span className="statusPill">메모 있음</span> : null}
      </div>
      <p className="summary">{highlightTerms(article.summary, onOpenTerm)}</p>

      <section className="termSection">
        <p className="sectionLabel">
          <Sparkles size={15} /> 이 뉴스에 나온 경제 용어
        </p>
        <div className="termList">
          {terms.length ? terms.map((term) => (
            <button key={term} type="button" onClick={() => onOpenTerm(term)}>
              {term}
            </button>
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
          {(GUIDE_BY_CATEGORY[article.category] || GUIDE_BY_CATEGORY.global).map((question) => (
            <li key={question}>{question}</li>
          ))}
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

function FocusPanel({ article, onToggleSaved, saved }) {
  if (!article) {
    return (
      <section className="focusPanel">
        <div className="panelTitle">
          <Clock3 size={19} />
          <strong>지금 먼저 볼 기사</strong>
        </div>
        <p className="helperText">필터를 조금 풀면 지금 흐름에서 먼저 읽을 기사 하나를 골라드릴게요.</p>
      </section>
    );
  }

  const categoryMeta = CATEGORIES.find((item) => item.id === article.category) || CATEGORIES[0];

  return (
    <section className="focusPanel">
      <div className="panelTitle">
        <Clock3 size={19} />
        <strong>지금 먼저 볼 기사</strong>
      </div>
      <span className={`categoryBadge ${categoryMeta.tone}`}>{categoryMeta.label}</span>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      <div className="focusActions">
        <a href={article.url} target="_blank" rel="noreferrer">
          원문 보기 <ExternalLink size={16} />
        </a>
        <button type="button" onClick={() => onToggleSaved(article.id)}>
          {saved[article.id] ? "저장됨" : "저장"}
        </button>
      </div>
    </section>
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
          {learnedTerms.slice(0, 8).map((item) => (
            <button key={item.term} type="button" onClick={() => openTerm(item.term)}>
              {item.term}
              <span>{item.count}</span>
            </button>
          ))}
        </div>
      ) : (
        <p>뉴스 카드의 노란 용어를 눌러보면 여기에 차곡차곡 쌓여요.</p>
      )}
    </aside>
  );
}

function TermGame({ learnedTerms, onOpenTerm }) {
  const allTerms = useMemo(() => {
    const learned = learnedTerms.map((item) => item.term);
    return [...new Set([...learned, ...TERM_KEYS])];
  }, [learnedTerms]);
  const pool = allTerms.length ? allTerms : TERM_KEYS;
  const [round, setRound] = useState(() => makeRound(pool));
  const [selected, setSelected] = useState("");
  const [typed, setTyped] = useState("");
  const [mode, setMode] = useState("choice");
  const hasAnswered = mode === "choice" ? Boolean(selected) : typed.trim().length > 0;
  const isCorrect = mode === "choice" ? selected === round.answer : normalizeAnswer(typed) === normalizeAnswer(round.answer);

  useEffect(() => {
    setRound(makeRound(pool));
    setSelected("");
    setTyped("");
  }, [pool]);

  useEffect(() => {
    setSelected("");
    setTyped("");
  }, [mode]);

  function nextRound() {
    setRound(makeRound(pool));
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
        <button type="button" className={mode === "choice" ? "active" : ""} onClick={() => setMode("choice")}>
          4지선다
        </button>
        <button type="button" className={mode === "typing" ? "active" : ""} onClick={() => setMode("typing")}>
          직접입력
        </button>
      </div>
      {mode === "choice" ? (
        <div className="choices">
          {round.options.map((option) => (
            <button key={option} type="button" className={selected === option ? "picked" : ""} onClick={() => setSelected(option)}>
              {option}
            </button>
          ))}
        </div>
      ) : (
        <input className="answerInput" value={typed} onChange={(event) => setTyped(event.target.value)} placeholder="정답 용어 입력" />
      )}
      {hasAnswered ? (
        <div className={`result ${isCorrect ? "correct" : "wrong"}`}>
          {isCorrect ? <Check size={16} /> : <X size={16} />}
          {isCorrect ? "정답이에요!" : `정답은 ${round.answer}예요.`}
        </div>
      ) : null}
      <div className="gameActions">
        <button type="button" onClick={() => onOpenTerm(round.answer)}>
          풀이 보기
        </button>
        <button type="button" onClick={nextRound}>
          다음 문제
        </button>
      </div>
    </section>
  );
}

function NotesPage({ articles, memos, saved, learnedTerms, onOpenTerm, onMemoChange, onToggleSaved }) {
  const [tag, setTag] = useState("all");
  const [noteQuery, setNoteQuery] = useState("");
  const tags = useMemo(() => [...new Set(Object.values(memos).flatMap((memo) => memo.tags || []))], [memos]);
  const normalizedQuery = noteQuery.trim().toLowerCase();
  const visibleArticles = useMemo(() => {
    return articles.filter((article) => {
      const articleTags = memos[article.id]?.tags || [];
      const matchesTag = tag === "all" || articleTags.includes(tag);
      const text = `${article.title} ${article.summary} ${memos[article.id]?.content || ""} ${articleTags.join(" ")}`.toLowerCase();
      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
      return matchesTag && matchesQuery;
    });
  }, [articles, memos, normalizedQuery, tag]);

  return (
    <section className="notesPage">
      <div className="noteSummary">
        <div>
          <strong>{Object.keys(saved).length}</strong>
          <span>저장한 뉴스</span>
        </div>
        <div>
          <strong>{Object.values(memos).filter((memo) => memo.content?.trim()).length}</strong>
          <span>작성한 메모</span>
        </div>
        <div>
          <strong>{tags.length}</strong>
          <span>태그</span>
        </div>
        <div>
          <strong>{learnedTerms.length}</strong>
          <span>눌러본 용어</span>
        </div>
      </div>

      <div className="notesToolbar">
        <div className="categoryRail">
          <button className={`chip ${tag === "all" ? "selected" : ""}`} type="button" onClick={() => setTag("all")}>
            전체
          </button>
          {tags.map((item) => (
            <button key={item} className={`chip ${tag === item ? "selected" : ""}`} type="button" onClick={() => setTag(item)}>
              #{item}
            </button>
          ))}
        </div>
        <label className="searchBox">
          <Search size={18} />
          <input value={noteQuery} onChange={(event) => setNoteQuery(event.target.value)} placeholder="메모와 태그 안에서 찾기" />
        </label>
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
        <div className="emptyState">조건에 맞는 노트가 아직 없어요. 뉴스 화면에서 저장하거나 메모를 남겨보세요.</div>
      )}
    </section>
  );
}

function IntegrationPlan({ articleSource, fetchState, lastUpdatedAt }) {
  return (
    <section className="integrationPanel">
      <div className="panelTitle">
        <ExternalLink size={19} />
        <strong>연결 상태 안내</strong>
      </div>
      <p>
        {articleSource === "live"
          ? "지금은 RSS 서버에서 최신 경제뉴스를 불러오고 있어요."
          : "지금은 샘플 뉴스로 동작 중이에요. RSS 서버가 열리면 자동으로 실시간 뉴스로 전환돼요."}
      </p>
      <ul>
        <li>기사 전문은 저장하지 않고 제목, 요약, 언론사, 날짜, 링크만 다뤄요.</li>
        <li>새로고침 버튼으로 RSS를 다시 불러와 현재 흐름을 확인할 수 있어요.</li>
        <li>{fetchState === "refreshing" ? "실시간 뉴스 상태를 다시 확인하는 중이에요." : lastUpdatedAt ? `마지막 새로고침: ${formatUpdatedTime(lastUpdatedAt)}` : "첫 불러오기가 끝나면 갱신 시각이 보여요."}</li>
      </ul>
    </section>
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
          : "실시간 뉴스로 더 많이 보려면 RSS 서버를 함께 실행해주세요."}
      </span>
    </div>
  );
}

function TermModal({ term, onClose }) {
  const entry = TERM_DICTIONARY[term];

  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape") onClose();
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  return (
    <div className="modalBackdrop" onClick={onClose} role="presentation">
      <section className="termModal" onClick={(event) => event.stopPropagation()}>
        <button className="closeButton" type="button" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        <p className="eyebrow">경제 용어 풀이</p>
        <h3>{term}</h3>
        {entry.aliases?.length ? <p className="aliasLine">같이 쓰는 말: {entry.aliases.join(", ")}</p> : null}
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
  const [data, setData] = useState(() => loadStoredData());

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }, [data]);

  return [data, setData];
}

function loadStoredData() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return normalizeData(JSON.parse(current));

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy) return normalizeData(JSON.parse(legacy));
  } catch {
    return emptyData();
  }

  return emptyData();
}

function normalizeData(data) {
  if (!data || typeof data !== "object") return emptyData();
  return {
    saved: data.saved || {},
    memos: data.memos || {},
    learnedTerms: data.learnedTerms || {}
  };
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

  const aliases = terms
    .flatMap((term) => [term, ...(TERM_DICTIONARY[term].aliases || [])])
    .sort((a, b) => b.length - a.length);
  const pattern = new RegExp(`(${aliases.map(escapeRegExp).join("|")})`, "g");

  return text.split(pattern).map((part, index) => {
    const canonical = terms.find((term) => term === part || TERM_DICTIONARY[term].aliases?.includes(part));
    if (!canonical) return <span key={`${part}-${index}`}>{part}</span>;
    return (
      <button key={`${part}-${index}`} className="termHighlight" type="button" onClick={() => onOpenTerm(canonical)}>
        {part}
      </button>
    );
  });
}

function makeRound(pool) {
  const answer = pick(pool);
  const distractors = [...new Set([...TERM_KEYS.filter((term) => term !== answer && !pool.includes(term)), ...pool.filter((term) => term !== answer)])];
  return {
    answer,
    options: shuffle([answer, ...shuffle(distractors).slice(0, 3)])
  };
}

function pick(list) {
  return list[Math.floor(Math.random() * list.length)] || TERM_KEYS[0];
}

function shuffle(list) {
  const next = [...list];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }
  return next;
}

function sortArticles(list, sortBy, data) {
  const next = [...list];

  return next.sort((left, right) => {
    const dateOrder = (right.publishedAt || "").localeCompare(left.publishedAt || "");

    if (sortBy === "saved") {
      const leftSaved = data.saved[left.id]?.savedAt || "";
      const rightSaved = data.saved[right.id]?.savedAt || "";
      return rightSaved.localeCompare(leftSaved) || dateOrder;
    }

    if (sortBy === "memo") {
      const leftMemo = data.memos[left.id]?.updatedAt || "";
      const rightMemo = data.memos[right.id]?.updatedAt || "";
      return rightMemo.localeCompare(leftMemo) || dateOrder;
    }

    if (sortBy === "terms") {
      const leftTerms = detectTerms(`${left.title} ${left.summary}`).length;
      const rightTerms = detectTerms(`${right.title} ${right.summary}`).length;
      return rightTerms - leftTerms || dateOrder;
    }

    return dateOrder;
  });
}

function makeDashboard(articles, data) {
  const topCategories = CATEGORIES.filter((item) => item.id !== "all")
    .map((item) => ({
      ...item,
      count: articles.filter((article) => article.category === item.id).length
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);

  const termCounter = new Map();
  articles.slice(0, 12).forEach((article) => {
    detectTerms(`${article.title} ${article.summary}`).forEach((term) => {
      termCounter.set(term, (termCounter.get(term) || 0) + 1);
    });
  });

  const topTerms = [...termCounter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));

  return {
    topCategories,
    topTerms,
    featured: articles[0] || null,
    memoCount: articles.filter((article) => data.memos[article.id]?.content?.trim()).length
  };
}

function toTags(value) {
  return value
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
}

function normalizeAnswer(value) {
  return value.trim().replace(/\s+/g, "").toLowerCase();
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function formatArticleDate(value) {
  if (!value) return "날짜 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("ko-KR", { month: "short", day: "numeric" }).format(date);
}

function formatUpdatedTime(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "방금";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getBrand() {
  const mode = new URLSearchParams(window.location.search).get("brand");
  return BRANDS[mode] || BRANDS.public;
}

export default AppEnhanced;
