import {
  Bookmark,
  Brain,
  Camera,
  ChevronDown,
  Clock3,
  Compass,
  ExternalLink,
  Filter,
  Lightbulb,
  Lock,
  LogIn,
  NotebookPen,
  PenSquare,
  RefreshCcw,
  Search,
  Sparkles,
  Tag,
  TrendingUp,
  UserPlus,
  UserRound,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AUTH_COPY, MARKET_MOOD_RULES, PROFILE_KEYWORD_SUGGESTIONS, THOUGHT_FEELINGS } from "./archiveMeta";
import { BRANDS, CATEGORIES, GUIDE_BY_CATEGORY, TERM_DICTIONARY, TERM_KEYS } from "./economyData";
import { fetchArticles } from "./newsSources";

const ARCHIVE_STORAGE_KEY = "like-money-news-archive-v4";
const SESSION_STORAGE_KEY = "like-money-news-session-v1";
const LEGACY_STORAGE_KEYS = ["easy-econ-news-v3", "easy-econ-news-v2"];
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
  const [store, setStore] = useArchiveStore();
  const [session, setSession] = useSessionState();

  const memberKey = session.mode === "member" ? session.nicknameKey : "";
  const currentUser = memberKey ? store.users[memberKey] || null : null;
  const memberMode = Boolean(currentUser);
  const memos = memberMode ? currentUser.memos : {};
  const saved = memberMode ? currentUser.saved : {};
  const learnedTerms = memberMode ? currentUser.learnedTerms : {};

  useEffect(() => {
    void loadArticles();
  }, []);

  useEffect(() => {
    if (session.mode === "member" && !currentUser) {
      setSession({ mode: "signedOut" });
      setActiveView("feed");
    }
  }, [currentUser, session.mode, setSession]);

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
      const savedMatches = !onlySaved || Boolean(saved[article.id]);
      const memo = memos[article.id];
      const searchableMemo = memo
        ? [memo.content, memo.oneLine, memo.learned, memo.nextQuestion, ...(memo.tags || []), ...(memo.feelings || [])].join(" ")
        : "";
      const text = `${article.title} ${article.summary} ${article.source} ${searchableMemo}`.toLowerCase();
      return categoryMatches && savedMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });

    return sortArticles(next, sortBy, saved, memos);
  }, [articles, category, memos, onlySaved, query, saved, sortBy]);

  const archiveArticles = useMemo(() => {
    return sortArticles(
      articles.filter((article) => saved[article.id] || hasMeaningfulMemo(memos[article.id])),
      "memo",
      saved,
      memos
    );
  }, [articles, memos, saved]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const learnedList = useMemo(
    () => Object.values(learnedTerms).sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || "")),
    [learnedTerms]
  );
  const memoCount = useMemo(
    () => Object.values(memos).filter((memo) => hasMeaningfulMemo(memo)).length,
    [memos]
  );
  const dashboard = useMemo(() => makeDashboard(filteredArticles, memos), [filteredArticles, memos]);
  const profileSummary = useMemo(() => makeProfileSummary(currentUser), [currentUser]);
  const hasActiveFilters = category !== "all" || sortBy !== "latest" || onlySaved || query.trim().length > 0;

  function openTerm(term, article = null) {
    setOpenedTerm({ term, article });
    if (!memberMode) return;

    setStore((current) => updateMember(current, memberKey, (member) => ({
      ...member,
      learnedTerms: {
        ...member.learnedTerms,
        [term]: {
          term,
          count: (member.learnedTerms[term]?.count || 0) + 1,
          updatedAt: new Date().toISOString()
        }
      }
    })));
  }

  function handleLogin(nickname) {
    const normalized = normalizeNickname(nickname);
    if (!normalized) {
      return { ok: false, message: "닉네임을 먼저 입력해주세요." };
    }

    if (!store.users[normalized]) {
      return { ok: false, message: "등록되지 않은 닉네임입니다. 회원가입을 먼저 해주세요." };
    }

    setSession({ mode: "member", nicknameKey: normalized });
    setActiveView("feed");
    return { ok: true, message: `${store.users[normalized].nickname} 님의 기록을 다시 열었어요.` };
  }

  function handleSignup(nickname) {
    const cleaned = cleanNickname(nickname);
    const normalized = normalizeNickname(cleaned);

    if (!normalized) {
      return { ok: false, message: "닉네임을 먼저 입력해주세요." };
    }

    if (store.users[normalized]) {
      return { ok: false, message: "이미 사용 중인 닉네임입니다." };
    }

    setStore((current) => {
      const seed = !current.legacyAssigned && current.legacySeed ? current.legacySeed : null;
      const nextUser = mergeMemberArchive(emptyMemberArchive(cleaned), seed);
      nextUser.nickname = cleaned;
      nextUser.createdAt = new Date().toISOString();

      return {
        ...current,
        users: {
          ...current.users,
          [normalized]: nextUser
        },
        legacySeed: seed ? null : current.legacySeed,
        legacyAssigned: current.legacyAssigned || Boolean(seed)
      };
    });
    setSession({ mode: "member", nicknameKey: normalized });
    setActiveView("feed");
    return { ok: true, message: `${cleaned} 님의 첫 경제 아카이브를 만들었어요.` };
  }

  function handleBrowse() {
    setSession({ mode: "guest" });
    setActiveView("feed");
  }

  function handleGoAuth() {
    setSession({ mode: "signedOut" });
    setActiveView("feed");
  }

  function handleLogout() {
    setSession({ mode: "signedOut" });
    setActiveView("feed");
  }

  function handleSaveMemo(article, draft) {
    if (!memberMode) return;

    const savedAt = new Date().toISOString();
    setStore((current) => updateMember(current, memberKey, (member) => {
      const previousMemo = member.memos[article.id] || emptyMemo(article);
      const nextMemo = normalizeMemo({
        ...previousMemo,
        articleId: article.id,
        articleTitle: article.title,
        articleSource: article.source,
        articleUrl: article.url,
        content: draft.content,
        oneLine: draft.oneLine,
        learned: draft.learned,
        nextQuestion: draft.nextQuestion,
        tags: toTags(draft.tags),
        feelings: [...new Set(draft.feelings || [])],
        updatedAt: savedAt
      });
      const snapshot = makeSnapshot(nextMemo, savedAt);
      const history = [snapshot, ...(previousMemo.history || []).filter((item) => !isSameSnapshot(item, snapshot))].slice(0, 6);

      return {
        ...member,
        saved: {
          ...member.saved,
          [article.id]: member.saved[article.id] || {
            articleId: article.id,
            title: article.title,
            source: article.source,
            url: article.url,
            savedAt
          }
        },
        memos: {
          ...member.memos,
          [article.id]: {
            ...nextMemo,
            history
          }
        }
      };
    })));
  }

  function toggleSaved(article) {
    if (!memberMode) return;

    setStore((current) => updateMember(current, memberKey, (member) => {
      const nextSaved = { ...member.saved };
      if (nextSaved[article.id]) {
        delete nextSaved[article.id];
      } else {
        nextSaved[article.id] = {
          articleId: article.id,
          title: article.title,
          source: article.source,
          url: article.url,
          savedAt: new Date().toISOString()
        };
      }
      return { ...member, saved: nextSaved };
    })));
  }

  function toggleInterest(keyword) {
    if (!memberMode) return;

    setStore((current) => updateMember(current, memberKey, (member) => {
      const hasKeyword = member.profile.interests.includes(keyword);
      const interests = hasKeyword
        ? member.profile.interests.filter((item) => item !== keyword)
        : [...member.profile.interests, keyword];

      return {
        ...member,
        profile: {
          ...member.profile,
          interests: normalizeInterests(interests)
        }
      };
    })));
  }

  function addInterest(keyword) {
    if (!memberMode) return false;
    const cleaned = cleanNickname(keyword);
    if (!cleaned) return false;

    setStore((current) => updateMember(current, memberKey, (member) => ({
      ...member,
      profile: {
        ...member.profile,
        interests: normalizeInterests([...member.profile.interests, cleaned])
      }
    })));
    return true;
  }

  function uploadProfilePhoto(file) {
    if (!memberMode || !file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const photo = typeof reader.result === "string" ? reader.result : "";
      setStore((current) => updateMember(current, memberKey, (member) => ({
        ...member,
        profile: {
          ...member.profile,
          photo
        }
      })));
    };
    reader.readAsDataURL(file);
  }

  function resetFilters() {
    setCategory("all");
    setSortBy("latest");
    setOnlySaved(false);
    setQuery("");
  }

  if (session.mode === "signedOut") {
    return (
      <main className="appShell authShell">
        <main className="app authApp">
          <AuthScreen brand={brand} onLogin={handleLogin} onSignup={handleSignup} onBrowse={handleBrowse} />
        </main>
      </main>
    );
  }

  return (
    <main className="appShell">
      <main className="app">
        <Header
          activeView={activeView}
          setActiveView={setActiveView}
          noteCount={archiveArticles.length}
          brand={brand}
          articleSource={articleSource}
          fetchState={fetchState}
          lastUpdatedAt={lastUpdatedAt}
          onRefresh={() => void loadArticles({ refresh: true })}
          memberMode={memberMode}
          nickname={currentUser?.nickname || "둘러보기"}
          profilePhoto={currentUser?.profile?.photo || ""}
          onGoAuth={handleGoAuth}
          onLogout={handleLogout}
        />

        <section className="hero">
          <div className="heroMain">
            <p className="eyebrow">{AUTH_COPY.eyebrow}</p>
            <h1>
              <BrandMark brand={brand} size="hero" />
              경제뉴스를 읽고 끝내지 마세요.
            </h1>
            <p className="heroText">
              어려운 단어를 이해하고, 시장 분위기를 느끼고, 내 언어로 생각을 남기는 조용한 경제 아카이브예요.
            </p>
            <div className="heroStats">
              <StatTile label="오늘 읽을 기사" value={filteredArticles.length} hint="필터 기준" />
              <StatTile label="저장한 뉴스" value={memberMode ? Object.keys(saved).length : 0} hint={memberMode ? "내 노트에서 다시 보기" : "로그인 후 저장 가능"} />
              <StatTile label="남긴 기록" value={memberMode ? memoCount : 0} hint={memberMode ? "생각이 남아 있는 기사" : "둘러보기 중"} />
            </div>
          </div>
          <div className="heroSide">
            <LearnedWidget learnedTerms={learnedList} memberMode={memberMode} openTerm={openTerm} />
            <BriefingPanel
              dashboard={dashboard}
              category={category}
              query={query}
              memberMode={memberMode}
              onReset={resetFilters}
              hasActiveFilters={hasActiveFilters}
            />
          </div>
        </section>

        {!memberMode ? <BrowseBanner onGoAuth={handleGoAuth} /> : null}

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
                      memo={memos[article.id]}
                      isSaved={Boolean(saved[article.id])}
                      memberMode={memberMode}
                      onOpenTerm={openTerm}
                      onSaveMemo={handleSaveMemo}
                      onToggleSaved={toggleSaved}
                      onGoAuth={handleGoAuth}
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
                <FocusPanel article={dashboard.featured} memberMode={memberMode} saved={saved} onToggleSaved={toggleSaved} onGoAuth={handleGoAuth} />
                <SensefolioPanel />
                <IntegrationPanel articleSource={articleSource} fetchState={fetchState} lastUpdatedAt={lastUpdatedAt} />
              </aside>
            </section>
          </>
        ) : null}

        {activeView === "notes" ? (
          <NotesPage
            articles={archiveArticles}
            memos={memos}
            saved={saved}
            learnedTerms={learnedList}
            memberMode={memberMode}
            onOpenTerm={openTerm}
            onSaveMemo={handleSaveMemo}
            onToggleSaved={toggleSaved}
            onGoAuth={handleGoAuth}
            onGoFeed={() => setActiveView("feed")}
          />
        ) : null}

        {activeView === "profile" ? (
          <ProfilePage
            user={currentUser}
            summary={profileSummary}
            memberMode={memberMode}
            onToggleInterest={toggleInterest}
            onAddInterest={addInterest}
            onUploadPhoto={uploadProfilePhoto}
            onOpenTerm={openTerm}
            onGoAuth={handleGoAuth}
            onGoFeed={() => setActiveView("feed")}
          />
        ) : null}

        {openedTerm ? <TermModal entry={openedTerm} onClose={() => setOpenedTerm(null)} /> : null}
      </main>
    </main>
  );
}

function AuthScreen({ brand, onLogin, onSignup, onBrowse }) {
  const [loginNickname, setLoginNickname] = useState("");
  const [signupNickname, setSignupNickname] = useState("");
  const [feedback, setFeedback] = useState({ tone: "", message: "" });

  function handleSubmitLogin(event) {
    event.preventDefault();
    const result = onLogin(loginNickname);
    setFeedback({ tone: result.ok ? "success" : "error", message: result.message });
  }

  function handleSubmitSignup(event) {
    event.preventDefault();
    const result = onSignup(signupNickname);
    setFeedback({ tone: result.ok ? "success" : "error", message: result.message });
  }

  return (
    <section className="authLayout">
      <div className="authHero">
        <p className="eyebrow">{AUTH_COPY.eyebrow}</p>
        <h1>
          <BrandMark brand={brand} size="hero" />
          {AUTH_COPY.title}
        </h1>
        <p className="heroText">{AUTH_COPY.description}</p>
        <div className="authStoryGrid">
          <AuthStoryCard title="읽고" text="기사 제목과 짧은 요약으로 부담 없이 오늘의 경제 흐름을 훑어볼 수 있어요." />
          <AuthStoryCard title="이해하고" text="카드마다 자동으로 잡힌 경제 용어와 읽기 가이드를 보며 맥락을 따라갈 수 있어요." />
          <AuthStoryCard title="남기고" text="내 생각, 새롭게 배운 점, 다음에 더 볼 포인트까지 조용히 기록할 수 있어요." />
        </div>
        <button className="browseButton" type="button" onClick={onBrowse}>
          <Compass size={18} />
          둘러보기
        </button>
        <p className="authHint">{AUTH_COPY.browseHint}</p>
      </div>

      <div className="authPanels">
        <form className="authCard" onSubmit={handleSubmitLogin}>
          <div className="panelTitle">
            <LogIn size={19} />
            <strong>로그인</strong>
          </div>
          <p className="helperText">{AUTH_COPY.loginHint}</p>
          <label className="fieldLabel">
            닉네임
            <input value={loginNickname} onChange={(event) => setLoginNickname(event.target.value)} placeholder="예: 머니노트" />
          </label>
          <button className="primaryButton" type="submit">
            로그인
          </button>
        </form>

        <form className="authCard" onSubmit={handleSubmitSignup}>
          <div className="panelTitle">
            <UserPlus size={19} />
            <strong>회원가입</strong>
          </div>
          <p className="helperText">{AUTH_COPY.signupHint}</p>
          <label className="fieldLabel">
            새 닉네임
            <input value={signupNickname} onChange={(event) => setSignupNickname(event.target.value)} placeholder="예: 오늘의금리노트" />
          </label>
          <button className="primaryButton soft" type="submit">
            닉네임으로 시작하기
          </button>
        </form>

        {feedback.message ? <p className={`authFeedback ${feedback.tone}`}>{feedback.message}</p> : null}
      </div>
    </section>
  );
}

function Header({
  activeView,
  setActiveView,
  noteCount,
  brand,
  articleSource,
  fetchState,
  lastUpdatedAt,
  onRefresh,
  memberMode,
  nickname,
  profilePhoto,
  onGoAuth,
  onLogout
}) {
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
            내 노트 <span>{memberMode ? noteCount : "잠금"}</span>
          </button>
          <button className={activeView === "profile" ? "active" : ""} onClick={() => setActiveView("profile")} type="button">
            프로필
          </button>
        </nav>
        {memberMode ? (
          <div className="profileTools">
            <button className="profileShortcut" type="button" onClick={() => setActiveView("profile")}>
              <Avatar photo={profilePhoto} label={nickname} />
              <span>{nickname}</span>
            </button>
            <button className="ghostButton" type="button" onClick={onLogout}>
              로그아웃
            </button>
          </div>
        ) : (
          <button className="ghostButton authAction" type="button" onClick={onGoAuth}>
            <LogIn size={16} />
            로그인 / 회원가입
          </button>
        )}
      </div>
    </header>
  );
}

function BrowseBanner({ onGoAuth }) {
  return (
    <section className="modeBanner">
      <div>
        <strong>지금은 둘러보기 모드예요.</strong>
        <p>뉴스와 용어 풀이는 자유롭게 볼 수 있지만, 메모 저장과 프로필 기록은 로그인 후에 차곡차곡 쌓여요.</p>
      </div>
      <button className="primaryButton small" type="button" onClick={onGoAuth}>
        <PenSquare size={16} />
        기록 시작하기
      </button>
    </section>
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

function BriefingPanel({ dashboard, category, query, memberMode, onReset, hasActiveFilters }) {
  const currentCategory = CATEGORIES.find((item) => item.id === category);
  const lead = query.trim()
    ? `“${query.trim()}”와 연결된 기사만 모아 지금의 흐름을 정리했어요.`
    : currentCategory && currentCategory.id !== "all"
      ? `${currentCategory.label} 흐름 안에서 지금 눈여겨볼 포인트를 골라봤어요.`
      : "오늘은 어떤 경제 흐름이 반복해서 등장하는지부터 차분히 훑어보면 좋아요.";

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
          <span className="briefingLabel">자주 나온 경제 용어</span>
          <strong>{dashboard.topTerms.length ? dashboard.topTerms.map((item) => item.term).join(", ") : "핵심 용어를 읽는 중이에요."}</strong>
        </div>
        <div>
          <span className="briefingLabel">시장 분위기</span>
          <strong>{dashboard.topMood ? dashboard.topMood.label : "🧊 관망 흐름"}</strong>
        </div>
        <div>
          <span className="briefingLabel">내 기록 상태</span>
          <strong>{memberMode ? `${dashboard.memoCount}개의 기사에 메모가 있어요.` : "둘러보기 중이라 메모는 아직 비어 있어요."}</strong>
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

function LearnedWidget({ learnedTerms, memberMode, openTerm }) {
  return (
    <aside className="learnedWidget">
      <div className="widgetTitle">
        <Brain size={20} />
        <strong>{memberMode ? "최근 펼쳐본 용어" : "이런 용어를 눌러볼 수 있어요"}</strong>
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
        <p>{memberMode ? "노란색 용어를 누르면 여기에 차곡차곡 쌓여요." : "기사 속 노란 용어를 눌러 쉬운 설명과 시장 해석을 같이 볼 수 있어요."}</p>
      )}
    </aside>
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

function ArticleCard({ article, memo, isSaved, memberMode, onOpenTerm, onSaveMemo, onToggleSaved, onGoAuth }) {
  const [guideOpen, setGuideOpen] = useState(false);
  const [draft, setDraft] = useState(makeDraftFromMemo(memo));
  const terms = useMemo(() => detectTerms(`${article.title} ${article.summary}`), [article.summary, article.title]);
  const categoryMeta = CATEGORIES.find((item) => item.id === article.category) || CATEGORIES[0];
  const mood = useMemo(() => inferMarketMood(article), [article]);
  const guideItems = useMemo(() => makeReadingGuide(article, mood), [article, mood]);
  const hasMemo = hasMeaningfulMemo(memo);
  const history = memo?.history || [];
  const latestHistory = history[0] || null;
  const previousHistory = history[1] || null;

  useEffect(() => {
    setDraft(makeDraftFromMemo(memo));
  }, [memo]);

  function updateDraft(key, value) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function toggleFeeling(feelingId) {
    setDraft((current) => ({
      ...current,
      feelings: current.feelings.includes(feelingId)
        ? current.feelings.filter((item) => item !== feelingId)
        : [...current.feelings, feelingId]
    }));
  }

  return (
    <article className="articleCard">
      <div className="cardTop">
        <div className="cardBadges">
          <span className={`categoryBadge ${categoryMeta.tone}`}>{categoryMeta.label}</span>
          <span className="moodBadge">{mood.label}</span>
          {terms.length ? (
            <span className="miniStat">
              <Sparkles size={14} /> 용어 {terms.length}
            </span>
          ) : null}
        </div>
        <button
          className={`iconButton ${isSaved ? "saved" : ""}`}
          onClick={() => (memberMode ? onToggleSaved(article) : onGoAuth())}
          type="button"
          aria-label="뉴스 저장"
        >
          <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
        </button>
      </div>

      <h2>{highlightTerms(article.title, (term) => onOpenTerm(term, article))}</h2>
      <div className="metaRow">
        <p className="meta">{article.source} · {formatArticleDate(article.publishedAt)}</p>
        {hasMemo ? <span className="statusPill">기록 있음</span> : null}
      </div>
      <p className="summary">{highlightTerms(article.summary, (term) => onOpenTerm(term, article))}</p>

      <section className="termSection">
        <p className="sectionLabel">
          <Sparkles size={15} /> 이 뉴스에 나온 경제 용어
        </p>
        <div className="termList">
          {terms.length ? (
            terms.map((term) => (
              <button key={term} type="button" onClick={() => onOpenTerm(term, article)}>
                {term}
              </button>
            ))
          ) : (
            <span className="emptyText">감지된 용어가 아직 없어요.</span>
          )}
        </div>
      </section>

      <section className="moodSection">
        <p className="sectionLabel">
          <TrendingUp size={15} /> 시장 분위기 태그
        </p>
        <div className="moodDetail">
          <strong>{mood.label}</strong>
          <span>{mood.description}</span>
        </div>
      </section>

      <button className="guideToggle" type="button" onClick={() => setGuideOpen((value) => !value)}>
        <Lightbulb size={17} />
        뉴스 읽기 가이드
        <ChevronDown className={guideOpen ? "rotated" : ""} size={18} />
      </button>
      {guideOpen ? (
        <div className="guideGrid">
          {guideItems.map((item) => (
            <div key={item.label} className="guideCard">
              <strong>{item.label}</strong>
              <p>{item.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      <section className="memoBox">
        <div className="memoHeading">
          <p className="sectionLabel">
            <NotebookPen size={16} /> 내 생각 기록
          </p>
          {!memberMode ? (
            <button className="textButton" type="button" onClick={onGoAuth}>
              로그인 후 저장
            </button>
          ) : null}
        </div>

        {memberMode ? (
          <>
            <label className="fieldLabel">
              내 생각
              <textarea
                value={draft.content}
                onChange={(event) => updateDraft("content", event.target.value)}
                placeholder="이 뉴스가 왜 중요하게 느껴졌는지, 내 시선으로 짧게 남겨보세요."
              />
            </label>
            <div className="memoGrid">
              <label className="fieldLabel">
                한 줄 메모
                <input
                  value={draft.oneLine}
                  onChange={(event) => updateDraft("oneLine", event.target.value)}
                  placeholder="예: 금리 기대가 시장 심리를 바꾸는 중"
                />
              </label>
              <label className="fieldLabel">
                오늘 새로 알게 된 것
                <input
                  value={draft.learned}
                  onChange={(event) => updateDraft("learned", event.target.value)}
                  placeholder="예: CPI가 높으면 금리 인하 기대가 약해질 수 있다"
                />
              </label>
              <label className="fieldLabel">
                더 찾아보고 싶은 것
                <input
                  value={draft.nextQuestion}
                  onChange={(event) => updateDraft("nextQuestion", event.target.value)}
                  placeholder="예: 다음 FOMC 전까지 미국 국채금리 흐름 보기"
                />
              </label>
              <label className="fieldLabel">
                관심 태그
                <input
                  value={draft.tags}
                  onChange={(event) => updateDraft("tags", event.target.value)}
                  placeholder="예: 금리, 반도체, 내대출"
                />
              </label>
            </div>

            <div className="feelingSection">
              <p className="sectionLabel small">
                <Tag size={15} /> 지금의 느낌
              </p>
              <div className="feelingList">
                {THOUGHT_FEELINGS.map((feeling) => (
                  <button
                    key={feeling.id}
                    className={`feelingChip ${draft.feelings.includes(feeling.id) ? "active" : ""}`}
                    type="button"
                    onClick={() => toggleFeeling(feeling.id)}
                  >
                    {feeling.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="memoActions">
              <button className="primaryButton small" type="button" onClick={() => onSaveMemo(article, draft)}>
                생각 저장하기
              </button>
              <span className="helperText inline">저장할 때마다 생각 변화가 기록돼요.</span>
            </div>

            {latestHistory ? (
              <div className="historyBox">
                <div className="panelTitle compact">
                  <Brain size={17} />
                  <strong>생각 변화</strong>
                </div>
                <div className="historyGrid">
                  {previousHistory ? (
                    <div className="historyCard muted">
                      <span>{formatUpdatedTime(previousHistory.savedAt)}</span>
                      <strong>{previousHistory.oneLine || "이전 기록"}</strong>
                      <p>{previousHistory.content || previousHistory.learned || previousHistory.nextQuestion || "이전 생각이 여기에 남아 있어요."}</p>
                    </div>
                  ) : (
                    <div className="historyCard muted">
                      <span>{formatUpdatedTime(latestHistory.savedAt)}</span>
                      <strong>처음 남긴 기록</strong>
                      <p>이 카드에 첫 생각을 남겼어요. 다음 저장부터 변화가 비교돼요.</p>
                    </div>
                  )}
                  <div className="historyCard current">
                    <span>{formatUpdatedTime(latestHistory.savedAt)}</span>
                    <strong>{latestHistory.oneLine || "현재 기록"}</strong>
                    <p>{latestHistory.content || latestHistory.learned || latestHistory.nextQuestion || "현재 저장된 생각이에요."}</p>
                  </div>
                </div>
              </div>
            ) : null}
          </>
        ) : (
          <div className="lockedMemo">
            <Lock size={16} />
            <p>둘러보기 모드에서는 메모와 프로필이 저장되지 않아요. 로그인하면 나만의 뉴스 노트가 차곡차곡 쌓입니다.</p>
          </div>
        )}
      </section>

      <div className="cardActions">
        <a href={article.url} target="_blank" rel="noreferrer">
          원문 보기 <ExternalLink size={16} />
        </a>
        <button type="button" onClick={() => (memberMode ? onToggleSaved(article) : onGoAuth())}>
          {memberMode ? (isSaved ? "저장됨" : "노트에 저장") : "로그인 후 저장"}
        </button>
      </div>
    </article>
  );
}

function FocusPanel({ article, memberMode, saved, onToggleSaved, onGoAuth }) {
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

  const mood = inferMarketMood(article);
  const categoryMeta = CATEGORIES.find((item) => item.id === article.category) || CATEGORIES[0];

  return (
    <section className="focusPanel">
      <div className="panelTitle">
        <Clock3 size={19} />
        <strong>지금 먼저 볼 기사</strong>
      </div>
      <div className="cardBadges compactWrap">
        <span className={`categoryBadge ${categoryMeta.tone}`}>{categoryMeta.label}</span>
        <span className="moodBadge">{mood.label}</span>
      </div>
      <h3>{article.title}</h3>
      <p>{article.summary}</p>
      <div className="focusActions">
        <a href={article.url} target="_blank" rel="noreferrer">
          원문 보기 <ExternalLink size={16} />
        </a>
        <button type="button" onClick={() => (memberMode ? onToggleSaved(article) : onGoAuth())}>
          {memberMode ? (saved[article.id] ? "저장됨" : "저장") : "로그인 후 저장"}
        </button>
      </div>
    </section>
  );
}

function SensefolioPanel() {
  return (
    <section className="sensePanel">
      <div className="panelTitle">
        <TrendingUp size={19} />
        <strong>투자 해석이 더 궁금하다면</strong>
      </div>
      <p>Like Money News에서 흐름을 읽었다면, 투자 관점의 해석은 Sensefolio에서 더 깊게 이어볼 수 있어요.</p>
      <a href="https://sensefolio-note.vercel.app/" target="_blank" rel="noreferrer">
        Sensefolio 보기 <ExternalLink size={16} />
      </a>
    </section>
  );
}

function NotesPage({ articles, memos, saved, learnedTerms, memberMode, onOpenTerm, onSaveMemo, onToggleSaved, onGoAuth, onGoFeed }) {
  const [tag, setTag] = useState("all");
  const [noteQuery, setNoteQuery] = useState("");
  const tags = useMemo(() => [...new Set(Object.values(memos).flatMap((memo) => memo.tags || []))], [memos]);
  const normalizedQuery = noteQuery.trim().toLowerCase();
  const visibleArticles = useMemo(() => {
    return articles.filter((article) => {
      const memo = memos[article.id];
      const articleTags = memo?.tags || [];
      const matchesTag = tag === "all" || articleTags.includes(tag);
      const text = [
        article.title,
        article.summary,
        memo?.content || "",
        memo?.oneLine || "",
        memo?.learned || "",
        memo?.nextQuestion || "",
        articleTags.join(" ")
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery = !normalizedQuery || text.includes(normalizedQuery);
      return matchesTag && matchesQuery;
    });
  }, [articles, memos, normalizedQuery, tag]);

  if (!memberMode) {
    return <LockedView title="내 노트는 로그인 후에 열려요" description="저장한 뉴스, 메모, 생각 변화 기록은 닉네임으로 로그인하면 다시 이어서 볼 수 있어요." onGoAuth={onGoAuth} onGoFeed={onGoFeed} />;
  }

  return (
    <section className="notesPage">
      <div className="noteSummary">
        <div>
          <strong>{Object.keys(saved).length}</strong>
          <span>저장한 뉴스</span>
        </div>
        <div>
          <strong>{Object.values(memos).filter((memo) => hasMeaningfulMemo(memo)).length}</strong>
          <span>작성한 메모</span>
        </div>
        <div>
          <strong>{tags.length}</strong>
          <span>관심 태그</span>
        </div>
        <div>
          <strong>{learnedTerms.length}</strong>
          <span>열어본 용어</span>
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
              memberMode={memberMode}
              onOpenTerm={onOpenTerm}
              onSaveMemo={onSaveMemo}
              onToggleSaved={onToggleSaved}
              onGoAuth={onGoAuth}
            />
          ))}
        </div>
      ) : (
        <div className="emptyState">
          아직 남겨진 메모가 없습니다. 오늘 읽은 경제뉴스에서 당신의 생각을 기록해보세요.
        </div>
      )}
    </section>
  );
}

function ProfilePage({ user, summary, memberMode, onToggleInterest, onAddInterest, onUploadPhoto, onOpenTerm, onGoAuth, onGoFeed }) {
  const [interestInput, setInterestInput] = useState("");

  if (!memberMode || !user) {
    return <LockedView title="프로필은 로그인 후에 만들어져요" description="프로필 사진, 관심 키워드, 최근 기록까지 나만의 경제 아카이브를 차분히 쌓아갈 수 있어요." onGoAuth={onGoAuth} onGoFeed={onGoFeed} />;
  }

  function handleInterestSubmit(event) {
    event.preventDefault();
    const inserted = onAddInterest(interestInput);
    if (inserted) setInterestInput("");
  }

  return (
    <section className="profilePage">
      <div className="profileLayout">
        <section className="profileCard">
          <div className="profileIdentity">
            <Avatar photo={user.profile.photo} label={user.nickname} large />
            <div>
              <p className="eyebrow">my archive</p>
              <h2>{user.nickname}</h2>
              <p className="helperText">경제뉴스를 읽고, 이해하고, 생각을 남기는 개인 아카이브예요.</p>
            </div>
          </div>
          <label className="uploadButton">
            <Camera size={16} />
            프로필 사진 업로드
            <input type="file" accept="image/*" onChange={(event) => onUploadPhoto(event.target.files?.[0])} />
          </label>
          <div className="profileStats">
            <div>
              <strong>{summary.savedCount}</strong>
              <span>저장한 뉴스 수</span>
            </div>
            <div>
              <strong>{summary.memoCount}</strong>
              <span>작성한 메모 수</span>
            </div>
            <div>
              <strong>{summary.learnedCount}</strong>
              <span>최근 본 용어 수</span>
            </div>
          </div>
        </section>

        <section className="interestPanel">
          <div className="panelTitle">
            <Tag size={18} />
            <strong>관심 키워드</strong>
          </div>
          <p className="helperText">지금 눈에 들어오는 주제를 눌러두면 내 프로필에 관심 흐름이 쌓여요.</p>
          <div className="interestChips">
            {PROFILE_KEYWORD_SUGGESTIONS.map((keyword) => (
              <button
                key={keyword}
                className={`feelingChip ${user.profile.interests.includes(keyword) ? "active" : ""}`}
                type="button"
                onClick={() => onToggleInterest(keyword)}
              >
                {keyword}
              </button>
            ))}
          </div>
          <form className="interestForm" onSubmit={handleInterestSubmit}>
            <input value={interestInput} onChange={(event) => setInterestInput(event.target.value)} placeholder="직접 키워드 추가" />
            <button className="primaryButton small" type="submit">
              추가
            </button>
          </form>
        </section>
      </div>

      <div className="profileDetails">
        <section className="recentPanel">
          <div className="panelTitle">
            <NotebookPen size={18} />
            <strong>최근 기록</strong>
          </div>
          {summary.recentRecords.length ? (
            <div className="recentList">
              {summary.recentRecords.map((record) => (
                <article key={`${record.articleId}-${record.updatedAt}`} className="recentRecord">
                  <span>{formatUpdatedTime(record.updatedAt)}</span>
                  <strong>{record.articleTitle}</strong>
                  <p>{record.oneLine || record.content || record.learned || record.nextQuestion || "기록이 남아 있어요."}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="emptyState compact">아직 남겨진 메모가 없습니다. 오늘 읽은 뉴스에서 첫 기록을 남겨보세요.</div>
          )}
        </section>

        <section className="recentPanel">
          <div className="panelTitle">
            <Sparkles size={18} />
            <strong>최근 관심 경제 키워드</strong>
          </div>
          <div className="interestChips">
            {summary.recentKeywords.length ? (
              summary.recentKeywords.map((keyword) => (
                <button key={keyword} className="termButton" type="button" onClick={() => onOpenTerm(keyword)}>
                  {keyword}
                </button>
              ))
            ) : (
              <p className="helperText">메모와 관심 키워드가 쌓이면 여기에 현재의 관심사가 보이기 시작해요.</p>
            )}
          </div>
        </section>

        <SensefolioPanel />
      </div>
    </section>
  );
}

function LockedView({ title, description, onGoAuth, onGoFeed }) {
  return (
    <section className="lockedView">
      <Lock size={24} />
      <strong>{title}</strong>
      <p>{description}</p>
      <div className="lockedActions">
        <button className="primaryButton small" type="button" onClick={onGoAuth}>
          <LogIn size={16} />
          로그인 / 회원가입
        </button>
        <button className="ghostButton" type="button" onClick={onGoFeed}>
          뉴스로 돌아가기
        </button>
      </div>
    </section>
  );
}

function IntegrationPanel({ articleSource, fetchState, lastUpdatedAt }) {
  return (
    <section className="integrationPanel">
      <div className="panelTitle">
        <ExternalLink size={19} />
        <strong>읽기 흐름 안내</strong>
      </div>
      <p>
        {articleSource === "live"
          ? "지금은 RSS로 최신 경제뉴스를 불러오고 있어요. 기사 본문 전체 대신 제목, 요약, 링크 중심으로 정리합니다."
          : "지금은 샘플 뉴스로 동작 중이에요. RSS나 뉴스 API가 연결되면 같은 구조로 바로 확장할 수 있어요."}
      </p>
      <ul>
        <li>기사 전문을 저장하지 않고 제목, 요약, 언론사, 날짜, 링크 중심으로만 다룹니다.</li>
        <li>용어 풀이는 사전이 아니라 뉴스 해석 보조 흐름으로 설계되어 있어요.</li>
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
          : "실시간 뉴스가 연결되면 같은 구조로 더 많은 기사를 볼 수 있어요."}
      </span>
    </div>
  );
}

function TermModal({ entry, onClose }) {
  const article = entry.article;
  const term = entry.term;
  const dictionaryEntry = TERM_DICTIONARY[term];

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
        {dictionaryEntry.aliases?.length ? <p className="aliasLine">같이 쓰는 말: {dictionaryEntry.aliases.join(", ")}</p> : null}
        <p className="termShort">{dictionaryEntry.short}</p>
        <div className="termGuideStack">
          <div className="guideCard tone">
            <strong>쉽게 말하면</strong>
            <p>{dictionaryEntry.detail}</p>
          </div>
          <div className="guideCard tone">
            <strong>이 뉴스에서는</strong>
            <p>{makeTermContext(term, article)}</p>
          </div>
          <div className="guideCard tone">
            <strong>시장에 어떤 영향을 줄 수 있을까?</strong>
            <p>{makeTermImpact(term, article)}</p>
          </div>
        </div>
        <div className="exampleBox">
          <strong>예시</strong>
          <span>{dictionaryEntry.example}</span>
        </div>
      </section>
    </div>
  );
}

function Avatar({ photo, label, large = false }) {
  if (photo) {
    return <img className={large ? "avatar avatarLarge" : "avatar"} src={photo} alt="" />;
  }

  return (
    <span className={large ? "avatar avatarLarge fallback" : "avatar fallback"} aria-hidden="true">
      {String(label || "나").trim().slice(0, 1)}
    </span>
  );
}

function AuthStoryCard({ title, text }) {
  return (
    <div className="authStoryCard">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function useArchiveStore() {
  const [store, setStore] = useState(() => loadArchiveStore());

  useEffect(() => {
    localStorage.setItem(ARCHIVE_STORAGE_KEY, JSON.stringify(store));
  }, [store]);

  return [store, setStore];
}

function useSessionState() {
  const [session, setSession] = useState(() => loadSession());

  useEffect(() => {
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }, [session]);

  return [session, setSession];
}

function loadArchiveStore() {
  try {
    const current = localStorage.getItem(ARCHIVE_STORAGE_KEY);
    if (current) return normalizeArchiveStore(JSON.parse(current));

    for (const key of LEGACY_STORAGE_KEYS) {
      const legacy = localStorage.getItem(key);
      if (legacy) {
        return normalizeArchiveStore({
          users: {},
          legacySeed: JSON.parse(legacy),
          legacyAssigned: false
        });
      }
    }
  } catch {
    return emptyArchiveStore();
  }

  return emptyArchiveStore();
}

function loadSession() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return { mode: "signedOut" };
    const parsed = JSON.parse(stored);
    if (parsed?.mode === "member" && parsed?.nicknameKey) return { mode: "member", nicknameKey: parsed.nicknameKey };
    if (parsed?.mode === "guest") return { mode: "guest" };
  } catch {
    return { mode: "signedOut" };
  }

  return { mode: "signedOut" };
}

function emptyArchiveStore() {
  return {
    users: {},
    legacySeed: null,
    legacyAssigned: false
  };
}

function normalizeArchiveStore(store) {
  const entries = Object.entries(store?.users || {}).map(([key, value]) => [key, normalizeMember(value)]);
  return {
    users: Object.fromEntries(entries),
    legacySeed: store?.legacySeed ? normalizeMember(store.legacySeed) : null,
    legacyAssigned: Boolean(store?.legacyAssigned)
  };
}

function normalizeMember(member) {
  return {
    nickname: cleanNickname(member?.nickname || "나의 노트"),
    createdAt: member?.createdAt || new Date().toISOString(),
    saved: member?.saved || {},
    memos: Object.fromEntries(Object.entries(member?.memos || {}).map(([key, value]) => [key, normalizeMemo(value)])),
    learnedTerms: member?.learnedTerms || {},
    profile: {
      photo: String(member?.profile?.photo || ""),
      interests: normalizeInterests(member?.profile?.interests)
    }
  };
}

function emptyMemberArchive(nickname) {
  return normalizeMember({
    nickname,
    profile: {
      interests: PROFILE_KEYWORD_SUGGESTIONS.slice(0, 3)
    }
  });
}

function mergeMemberArchive(base, seed) {
  if (!seed) return base;
  const normalizedSeed = normalizeMember(seed);
  return normalizeMember({
    ...base,
    saved: { ...base.saved, ...normalizedSeed.saved },
    memos: { ...base.memos, ...normalizedSeed.memos },
    learnedTerms: { ...base.learnedTerms, ...normalizedSeed.learnedTerms },
    profile: {
      ...base.profile,
      interests: normalizeInterests([...(base.profile?.interests || []), ...(normalizedSeed.profile?.interests || [])])
    }
  });
}

function normalizeMemo(memo) {
  return {
    articleId: memo?.articleId || "",
    articleTitle: memo?.articleTitle || "",
    articleSource: memo?.articleSource || "",
    articleUrl: memo?.articleUrl || "",
    content: String(memo?.content || ""),
    oneLine: String(memo?.oneLine || ""),
    learned: String(memo?.learned || ""),
    nextQuestion: String(memo?.nextQuestion || ""),
    tags: Array.isArray(memo?.tags) ? memo.tags.filter(Boolean) : [],
    feelings: Array.isArray(memo?.feelings) ? memo.feelings.filter(Boolean) : [],
    updatedAt: memo?.updatedAt || "",
    history: Array.isArray(memo?.history) ? memo.history.map(normalizeSnapshot).filter(hasSnapshotText) : []
  };
}

function emptyMemo(article) {
  return normalizeMemo({
    articleId: article.id,
    articleTitle: article.title,
    articleSource: article.source,
    articleUrl: article.url
  });
}

function normalizeSnapshot(snapshot) {
  return {
    content: String(snapshot?.content || ""),
    oneLine: String(snapshot?.oneLine || ""),
    learned: String(snapshot?.learned || ""),
    nextQuestion: String(snapshot?.nextQuestion || ""),
    tags: Array.isArray(snapshot?.tags) ? snapshot.tags.filter(Boolean) : [],
    feelings: Array.isArray(snapshot?.feelings) ? snapshot.feelings.filter(Boolean) : [],
    savedAt: snapshot?.savedAt || ""
  };
}

function makeDraftFromMemo(memo) {
  return {
    content: memo?.content || "",
    oneLine: memo?.oneLine || "",
    learned: memo?.learned || "",
    nextQuestion: memo?.nextQuestion || "",
    tags: (memo?.tags || []).join(", "),
    feelings: memo?.feelings || []
  };
}

function makeSnapshot(memo, savedAt) {
  return normalizeSnapshot({
    content: memo.content,
    oneLine: memo.oneLine,
    learned: memo.learned,
    nextQuestion: memo.nextQuestion,
    tags: memo.tags,
    feelings: memo.feelings,
    savedAt
  });
}

function isSameSnapshot(left, right) {
  return JSON.stringify(normalizeSnapshot(left)) === JSON.stringify(normalizeSnapshot(right));
}

function hasSnapshotText(snapshot) {
  return Boolean(snapshot?.content || snapshot?.oneLine || snapshot?.learned || snapshot?.nextQuestion || snapshot?.tags?.length || snapshot?.feelings?.length);
}

function hasMeaningfulMemo(memo) {
  if (!memo) return false;
  return Boolean(memo.content || memo.oneLine || memo.learned || memo.nextQuestion || memo.tags?.length || memo.feelings?.length);
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
    .sort((left, right) => right.length - left.length);
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

function inferMarketMood(article) {
  const text = `${article.title} ${article.summary}`;
  const matched = MARKET_MOOD_RULES
    .map((rule) => ({
      ...rule,
      score: rule.keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0)
    }))
    .sort((left, right) => right.score - left.score)[0];

  if (matched?.score) return matched;

  const fallbackByCategory = {
    rate: MARKET_MOOD_RULES.find((rule) => rule.id === "rate"),
    fx: MARKET_MOOD_RULES.find((rule) => rule.id === "volatility"),
    stock: MARKET_MOOD_RULES.find((rule) => rule.id === "growth"),
    realestate: MARKET_MOOD_RULES.find((rule) => rule.id === "rate"),
    company: MARKET_MOOD_RULES.find((rule) => rule.id === "growth"),
    price: MARKET_MOOD_RULES.find((rule) => rule.id === "slowdown"),
    global: MARKET_MOOD_RULES.find((rule) => rule.id === "wait")
  };

  return fallbackByCategory[article.category] || MARKET_MOOD_RULES[4];
}

function makeReadingGuide(article, mood) {
  const followup = GUIDE_BY_CATEGORY[article.category] || GUIDE_BY_CATEGORY.global;
  const map = {
    rate: {
      why: `금리 뉴스는 대출 이자, 예적금, 성장주 분위기를 함께 움직이기 쉬워요. 지금 카드에서는 ${mood.label.replace(/[🔥🌱🌧⚠🧊🏦 ]/g, "")} 흐름도 함께 읽어볼 수 있어요.`,
      who: "대출이 있는 사람, 부동산을 보는 사람, 성장주에 관심 있는 투자자에게 바로 연결돼요.",
      relation: "기준금리 기대가 낮아지면 성장주에 숨통이 트일 수 있고, 높아지면 환율과 소비 심리에도 부담이 커질 수 있어요.",
      watch: followup[1] || "다음 금통위, 소비자물가, 국채금리 흐름을 함께 보면 좋아요."
    },
    fx: {
      why: "환율 뉴스는 수입물가와 해외 자산 심리를 동시에 건드리기 때문에 생활경제와 투자 흐름이 같이 흔들릴 수 있어요.",
      who: "해외여행을 준비하는 사람, 달러 자산을 보는 사람, 수입 원가가 중요한 기업에 영향을 줘요.",
      relation: "환율이 오르면 수입물가 부담이 커지고, 국내 금리와 주식시장 심리에도 영향을 줄 수 있어요.",
      watch: followup[2] || "달러 방향, 수출입 지표, 물가 흐름을 같이 보면 맥락이 더 선명해져요."
    },
    stock: {
      why: "주식 뉴스는 단순 가격보다 지금 시장이 무엇을 기대하고 있는지 보여주는 단서가 되기 쉬워요.",
      who: "직접 투자자뿐 아니라 퇴직연금, ETF, 적립식 투자로 시장에 참여하는 사람 모두와 연결돼요.",
      relation: "금리 기대가 낮아지면 성장주가 강해질 수 있고, 환율과 외국인 수급도 지수 방향에 영향을 줘요.",
      watch: followup[0] || "외국인 수급, 실적 시즌, 국채금리 방향을 이어서 보면 좋아요."
    },
    realestate: {
      why: "부동산 뉴스는 금리와 대출 규제, 공급 부족이 같이 얽혀 있어서 생활 결정에 바로 닿는 경우가 많아요.",
      who: "실거주를 준비하는 사람, 전세를 구하는 사람, 대출 비중이 큰 가구에게 영향이 커요.",
      relation: "금리가 높으면 주담대 부담이 커지고, 환율과 건설 원가도 공급 측 심리에 영향을 줄 수 있어요.",
      watch: followup[1] || "대출 규제, 입주 물량, 전세가율 변화를 함께 보면 좋아요."
    },
    company: {
      why: "기업 뉴스는 실적이 시장 기대보다 좋은지, 그리고 그 흐름이 이어질지 판단하는 출발점이 돼요.",
      who: "해당 기업 투자자뿐 아니라 같은 업종 종목을 보는 사람에게도 파급될 수 있어요.",
      relation: "영업이익과 매출은 주가 기대를 바꾸고, 금리 수준은 기업 가치 평가에 영향을 줘요.",
      watch: followup[2] || "다음 분기 가이던스, 영업이익률, 주주환원 계획을 같이 체크해보세요."
    },
    price: {
      why: "물가 뉴스는 생활비와 금리 기대를 동시에 건드리기 때문에 경제 흐름을 읽는 핵심 출발점이에요.",
      who: "가계 지출이 많은 사람, 대출이 있는 사람, 소비주와 성장주를 보는 사람에게 모두 닿아요.",
      relation: "물가가 높게 유지되면 금리 부담이 길어질 수 있고, 주식시장도 긴축 우려를 더 크게 반영할 수 있어요.",
      watch: followup[0] || "CPI, 실질임금, 소비심리 지표를 이어서 살펴보세요."
    },
    global: {
      why: "해외 뉴스는 한국 경제와 바로 멀어 보여도 금리, 환율, 수출기업 심리를 통해 다시 연결돼요.",
      who: "해외 자산 투자자뿐 아니라 수출주와 환율 영향을 받는 생활 소비자에게도 닿아요.",
      relation: "미국 금리와 달러 방향은 한국 주식과 환율에 빠르게 번질 수 있어요.",
      watch: followup[1] || "미국 국채금리, 달러 인덱스, 국내 증시 반응을 같이 보면 좋아요."
    }
  };

  const guide = map[article.category] || map.global;
  return [
    { label: "왜 중요할까?", text: guide.why },
    { label: "누구에게 영향을 줄까?", text: guide.who },
    { label: "금리·환율·주식과 어떤 관련이 있을까?", text: guide.relation },
    { label: "앞으로 무엇을 더 보면 좋을까?", text: guide.watch }
  ];
}

function makeTermContext(term, article) {
  if (!article) {
    return "이 용어는 기사 속 숫자나 분위기를 해석할 때 자주 등장해요. 제목과 요약에서 어떤 장면에 붙었는지 함께 읽어보면 훨씬 이해가 쉬워져요.";
  }

  const categoryLabel = CATEGORIES.find((item) => item.id === article.category)?.label || "경제";
  return `이 기사에서는 ${term}가 ${categoryLabel} 흐름을 설명하는 실마리로 쓰이고 있어요. 제목과 요약 안에서 ${term}가 왜 시장 분위기를 바꾸는지에 집중해서 읽어보면 좋아요.`;
}

function makeTermImpact(term, article) {
  const category = article?.category || "global";

  if (["기준금리", "정책금리", "국채금리", "소비자물가지수", "CPI", "물가상승률", "인플레이션"].includes(term)) {
    return "금리 기대를 바꾸면서 대출 부담, 성장주 심리, 채권시장 방향까지 함께 흔들 수 있어요.";
  }

  if (["환율", "원달러환율", "달러원"].includes(term)) {
    return "수입물가와 해외 소비 비용이 달라질 수 있고, 외국인 수급과 주식시장 심리에도 연결될 수 있어요.";
  }

  if (["코스피", "코스닥", "외국인순매수", "외국인 순매수"].includes(term)) {
    return "시장 참여자들이 지금 어떤 업종과 자산을 선호하는지 보여주는 신호가 될 수 있어요.";
  }

  if (["유동성", "양적완화", "QE", "테이퍼링"].includes(term)) {
    return "시중에 돈이 풀리거나 줄어드는 흐름을 뜻해서 주식과 부동산 같은 자산 가격 기대를 바꿀 수 있어요.";
  }

  if (["영업이익", "매출", "PER", "ROE", "EPS"].includes(term)) {
    return "기업의 체력과 기대 주가를 읽는 단서가 되어 같은 업종의 투자 심리까지 움직일 수 있어요.";
  }

  const relation = {
    rate: "대출 부담과 예적금 매력, 성장주 심리에 함께 연결될 수 있어요.",
    fx: "환율과 수입물가, 수출기업 실적 기대를 함께 바꿀 수 있어요.",
    stock: "주가 기대와 투자 심리, 업종별 강약을 가르는 신호가 될 수 있어요.",
    realestate: "대출 규제와 매수 심리, 전세 흐름에 영향을 줄 수 있어요.",
    company: "해당 기업뿐 아니라 비슷한 업종의 실적 기대까지 자극할 수 있어요.",
    price: "물가와 금리 기대를 연결하면서 소비 심리에 영향을 줄 수 있어요.",
    global: "한국 시장에도 번질 수 있는 해외 변수로 읽힐 수 있어요."
  };

  return relation[category] || relation.global;
}

function sortArticles(list, sortBy, saved, memos) {
  const next = [...list];

  return next.sort((left, right) => {
    const dateOrder = (right.publishedAt || "").localeCompare(left.publishedAt || "");

    if (sortBy === "saved") {
      const leftSaved = saved[left.id]?.savedAt || "";
      const rightSaved = saved[right.id]?.savedAt || "";
      return rightSaved.localeCompare(leftSaved) || dateOrder;
    }

    if (sortBy === "memo") {
      const leftMemo = memos[left.id]?.updatedAt || "";
      const rightMemo = memos[right.id]?.updatedAt || "";
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

function makeDashboard(articles, memos) {
  const topCategories = CATEGORIES.filter((item) => item.id !== "all")
    .map((item) => ({
      ...item,
      count: articles.filter((article) => article.category === item.id).length
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 3);

  const termCounter = new Map();
  const moodCounter = new Map();

  articles.slice(0, 12).forEach((article) => {
    detectTerms(`${article.title} ${article.summary}`).forEach((term) => {
      termCounter.set(term, (termCounter.get(term) || 0) + 1);
    });

    const mood = inferMarketMood(article);
    moodCounter.set(mood.label, { ...mood, count: (moodCounter.get(mood.label)?.count || 0) + 1 });
  });

  const topTerms = [...termCounter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([term, count]) => ({ term, count }));

  const topMood = [...moodCounter.values()].sort((left, right) => right.count - left.count)[0] || null;

  return {
    topCategories,
    topTerms,
    topMood,
    featured: articles[0] || null,
    memoCount: articles.filter((article) => hasMeaningfulMemo(memos[article.id])).length
  };
}

function makeProfileSummary(user) {
  if (!user) {
    return {
      savedCount: 0,
      memoCount: 0,
      learnedCount: 0,
      recentRecords: [],
      recentKeywords: []
    };
  }

  const recentRecords = Object.values(user.memos)
    .filter((memo) => hasMeaningfulMemo(memo))
    .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""))
    .slice(0, 5)
    .map((memo) => ({
      articleId: memo.articleId,
      articleTitle: memo.articleTitle || "제목이 없는 기록",
      updatedAt: memo.updatedAt,
      oneLine: memo.oneLine,
      content: memo.content,
      learned: memo.learned,
      nextQuestion: memo.nextQuestion
    }));

  const keywordCounter = new Map();
  user.profile.interests.forEach((keyword) => keywordCounter.set(keyword, (keywordCounter.get(keyword) || 0) + 3));
  Object.values(user.learnedTerms).forEach((item) => keywordCounter.set(item.term, (keywordCounter.get(item.term) || 0) + item.count));
  Object.values(user.memos).forEach((memo) => {
    (memo.tags || []).forEach((tag) => keywordCounter.set(tag, (keywordCounter.get(tag) || 0) + 2));
    detectTerms(`${memo.articleTitle} ${memo.content} ${memo.learned}`).forEach((term) => {
      keywordCounter.set(term, (keywordCounter.get(term) || 0) + 1);
    });
  });

  const recentKeywords = [...keywordCounter.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 10)
    .map(([term]) => term);

  return {
    savedCount: Object.keys(user.saved).length,
    memoCount: Object.values(user.memos).filter((memo) => hasMeaningfulMemo(memo)).length,
    learnedCount: Object.keys(user.learnedTerms).length,
    recentRecords,
    recentKeywords
  };
}

function updateMember(store, memberKey, updater) {
  const member = normalizeMember(store.users[memberKey]);
  return {
    ...store,
    users: {
      ...store.users,
      [memberKey]: normalizeMember(updater(member))
    }
  };
}

function normalizeNickname(value) {
  return cleanNickname(value).toLowerCase();
}

function cleanNickname(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeInterests(interests) {
  const list = Array.isArray(interests) ? interests : [];
  const normalized = [...new Set(list.map((item) => cleanNickname(item)).filter(Boolean))];
  return normalized.length ? normalized : PROFILE_KEYWORD_SUGGESTIONS.slice(0, 3);
}

function toTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
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
