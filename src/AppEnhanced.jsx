import {
  Bookmark,
  Brain,
  Camera,
  Compass,
  ExternalLink,
  Lightbulb,
  Lock,
  LogIn,
  NotebookPen,
  RefreshCcw,
  Search,
  Sparkles,
  Tag,
  UserPlus,
  X
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { AUTH_COPY, MARKET_MOOD_RULES, PROFILE_KEYWORD_SUGGESTIONS, THOUGHT_FEELINGS } from "./archiveMeta";
import { BRANDS, CATEGORIES, GUIDE_BY_CATEGORY, TERM_DICTIONARY, TERM_KEYS } from "./economyData";
import { fetchArticles } from "./newsSources";

const ARCHIVE_STORAGE_KEY = "like-money-news-archive-v5";
const SESSION_STORAGE_KEY = "like-money-news-session-v2";
const LEGACY_STORAGE_KEYS = ["like-money-news-archive-v4", "easy-econ-news-v3", "easy-econ-news-v2"];
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
  const [query, setQuery] = useState("");
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
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [category, query]);

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
    return articles.filter((article) => {
      const categoryMatches = category === "all" || article.category === category;
      const memo = memos[article.id];
      const memoText = memo
        ? [memo.content, memo.oneLine, memo.learned, memo.nextQuestion, ...(memo.tags || []), ...(memo.feelings || [])].join(" ")
        : "";
      const text = `${article.title} ${article.summary} ${article.source} ${memoText}`.toLowerCase();
      return categoryMatches && (!normalizedQuery || text.includes(normalizedQuery));
    });
  }, [articles, category, memos, query]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const savedArticles = useMemo(
    () => articles.filter((article) => saved[article.id] || hasMeaningfulMemo(memos[article.id])),
    [articles, memos, saved]
  );
  const learnedList = useMemo(
    () => Object.values(learnedTerms).sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || "")),
    [learnedTerms]
  );
  const profileSummary = useMemo(() => makeProfileSummary(currentUser), [currentUser]);

  function openTerm(term, article = null) {
    setOpenedTerm({ term, article });
    if (!memberMode) return;

    setStore((current) =>
      updateMember(current, memberKey, (member) => ({
        ...member,
        learnedTerms: {
          ...member.learnedTerms,
          [term]: {
            term,
            count: (member.learnedTerms[term]?.count || 0) + 1,
            updatedAt: new Date().toISOString()
          }
        }
      }))
    );
  }

  function handleLogin(nickname) {
    const normalized = normalizeNickname(nickname);
    if (!normalized) return { ok: false, message: "닉네임을 먼저 입력해주세요." };
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
    if (!normalized) return { ok: false, message: "닉네임을 먼저 입력해주세요." };
    if (store.users[normalized]) return { ok: false, message: "이미 사용 중인 닉네임입니다." };

    setStore((current) => ({
      ...current,
      users: {
        ...current.users,
        [normalized]: emptyMemberArchive(cleaned)
      }
    }));
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

  function saveMemo(article, draft) {
    if (!memberMode) return;

    const savedAt = new Date().toISOString();
    setStore((current) =>
      updateMember(current, memberKey, (member) => {
        const previous = normalizeMemo(member.memos[article.id]);
        const next = normalizeMemo({
          ...previous,
          articleId: article.id,
          articleTitle: article.title,
          articleSource: article.source,
          articleUrl: article.url,
          content: draft.content,
          oneLine: draft.oneLine,
          learned: draft.learned,
          nextQuestion: draft.nextQuestion,
          tags: toTags(draft.tags),
          feelings: draft.feelings,
          updatedAt: savedAt
        });
        const snapshot = makeSnapshot(next, savedAt);
        const history = [snapshot, ...(previous.history || []).filter((item) => !isSameSnapshot(item, snapshot))].slice(0, 6);
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
              ...next,
              history
            }
          }
        };
      })
    );
  }

  function toggleSaved(article) {
    if (!memberMode) return;

    setStore((current) =>
      updateMember(current, memberKey, (member) => {
        const nextSaved = { ...member.saved };
        if (nextSaved[article.id]) delete nextSaved[article.id];
        else {
          nextSaved[article.id] = {
            articleId: article.id,
            title: article.title,
            source: article.source,
            url: article.url,
            savedAt: new Date().toISOString()
          };
        }
        return { ...member, saved: nextSaved };
      })
    );
  }

  function toggleInterest(keyword) {
    if (!memberMode) return;
    setStore((current) =>
      updateMember(current, memberKey, (member) => {
        const interests = member.profile.interests.includes(keyword)
          ? member.profile.interests.filter((item) => item !== keyword)
          : [...member.profile.interests, keyword];
        return {
          ...member,
          profile: {
            ...member.profile,
            interests: normalizeInterests(interests)
          }
        };
      })
    );
  }

  function addInterest(keyword) {
    if (!memberMode) return false;
    const cleaned = cleanNickname(keyword);
    if (!cleaned) return false;
    setStore((current) =>
      updateMember(current, memberKey, (member) => ({
        ...member,
        profile: {
          ...member.profile,
          interests: normalizeInterests([...member.profile.interests, cleaned])
        }
      }))
    );
    return true;
  }

  function uploadProfilePhoto(file) {
    if (!memberMode || !file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const photo = typeof reader.result === "string" ? reader.result : "";
      setStore((current) =>
        updateMember(current, memberKey, (member) => ({
          ...member,
          profile: {
            ...member.profile,
            photo
          }
        }))
      );
    };
    reader.readAsDataURL(file);
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
          brand={brand}
          articleSource={articleSource}
          fetchState={fetchState}
          lastUpdatedAt={lastUpdatedAt}
          memberMode={memberMode}
          nickname={currentUser?.nickname || "둘러보기"}
          profilePhoto={currentUser?.profile?.photo || ""}
          onRefresh={() => void loadArticles({ refresh: true })}
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
              <StatTile label="오늘 읽을 기사" value={filteredArticles.length} hint="현재 필터 기준" />
              <StatTile label="저장한 뉴스" value={memberMode ? Object.keys(saved).length : 0} hint={memberMode ? "다시 볼 기사" : "로그인 후 저장"} />
              <StatTile label="남긴 기록" value={memberMode ? profileSummary.memoCount : 0} hint={memberMode ? "메모가 남은 기사" : "둘러보기 중"} />
            </div>
          </div>

          <aside className="learnedWidget briefingPanel">
            <div className="widgetTitle">
              <Brain size={20} />
              <strong>오늘의 흐름</strong>
            </div>
            <p className="helperText">지금 많이 보이는 키워드와 기록이 여기 쌓여요.</p>
            <div className="termList">
              {learnedList.length ? (
                learnedList.slice(0, 6).map((item) => (
                  <button key={item.term} type="button" onClick={() => openTerm(item.term)}>
                    {item.term}
                  </button>
                ))
              ) : (
                <span className="emptyText">용어를 눌러가며 읽으면 오늘 배운 흐름이 여기에 남아요.</span>
              )}
            </div>
            <div className="exampleBox">
              <strong>Sensefolio</strong>
              <span>투자 해석이 더 궁금하다면 Sensefolio로 자연스럽게 이어서 볼 수 있어요.</span>
              <a href="https://sensefolio-note.vercel.app/" target="_blank" rel="noreferrer">
                투자 해석 보러 가기
              </a>
            </div>
          </aside>
        </section>

        {!memberMode ? (
          <div className="emptyState">
            지금은 둘러보기 모드예요. 뉴스 읽기와 용어 풀이는 바로 볼 수 있고, 메모와 내 노트, 프로필은 로그인 후 사용할 수 있어요.
          </div>
        ) : null}

        <nav className="toolbar">
          <div className="categoryRail">
            {CATEGORIES.map((item) => (
              <button
                key={item.id}
                className={`chip ${category === item.id ? "selected" : ""}`}
                type="button"
                onClick={() => setCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
          <label className="searchBox">
            <Search size={18} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="기사 제목, 요약, 메모에서 검색"
            />
          </label>
        </nav>

        {activeView === "feed" ? (
          <section className="contentGrid">
            <div className="articleGrid">
              {visibleArticles.map((article) => (
                <ArticleCard
                  key={article.id}
                  article={article}
                  memo={normalizeMemo(memos[article.id])}
                  memberMode={memberMode}
                  isSaved={Boolean(saved[article.id])}
                  onOpenTerm={openTerm}
                  onSaveMemo={saveMemo}
                  onToggleSaved={toggleSaved}
                  onGoAuth={handleGoAuth}
                />
              ))}
              <LoadMoreArea
                remaining={filteredArticles.length - visibleArticles.length}
                totalCount={filteredArticles.length}
                onLoadMore={() => setVisibleCount((count) => count + INITIAL_VISIBLE_COUNT)}
              />
            </div>

            <aside className="sidePanel">
              <section className="integrationPanel">
                <div className="panelTitle">
                  <Sparkles size={18} />
                  <strong>읽기 가이드</strong>
                </div>
                <p>기사마다 왜 중요한지, 누구에게 닿는지, 다음에 무엇을 더 보면 좋을지 카드 안에서 바로 읽을 수 있게 했어요.</p>
              </section>
            </aside>
          </section>
        ) : null}

        {activeView === "notes" ? (
          memberMode ? (
            <NotesPage
              articles={savedArticles}
              memos={memos}
              onOpenTerm={openTerm}
              onSaveMemo={saveMemo}
              onToggleSaved={toggleSaved}
            />
          ) : (
            <LockedView onGoAuth={handleGoAuth} />
          )
        ) : null}

        {activeView === "profile" ? (
          memberMode ? (
            <ProfilePage
              user={currentUser}
              summary={profileSummary}
              onToggleInterest={toggleInterest}
              onAddInterest={addInterest}
              onUploadPhoto={uploadProfilePhoto}
            />
          ) : (
            <LockedView onGoAuth={handleGoAuth} />
          )
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

  function submitLogin(event) {
    event.preventDefault();
    const result = onLogin(loginNickname);
    setFeedback({ tone: result.ok ? "success" : "error", message: result.message });
  }

  function submitSignup(event) {
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
        <button className="browseButton" type="button" onClick={onBrowse}>
          <Compass size={18} />
          둘러보기
        </button>
        <p className="authHint">{AUTH_COPY.browseHint}</p>
      </div>

      <div className="authPanels">
        <form className="authCard" onSubmit={submitLogin}>
          <div className="panelTitle">
            <LogIn size={18} />
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

        <form className="authCard" onSubmit={submitSignup}>
          <div className="panelTitle">
            <UserPlus size={18} />
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
  brand,
  articleSource,
  fetchState,
  lastUpdatedAt,
  memberMode,
  nickname,
  profilePhoto,
  onRefresh,
  onGoAuth,
  onLogout
}) {
  return (
    <header className="topbar">
      <button className="brand" type="button" onClick={() => setActiveView("feed")}>
        <BrandMark brand={brand} />
        <span>{brand.name}</span>
        <span className="moneyLine">{brand.tagline}</span>
      </button>

      <div className="topbarActions">
        <div className={`sourceNotice ${articleSource}`}>
          {articleSource === "live" ? "실시간 RSS 연결" : articleSource === "sample" ? "샘플 뉴스" : "불러오는 중"}
          <span>{lastUpdatedAt ? formatUpdatedTime(lastUpdatedAt) : "방금"}</span>
        </div>
        <button className="refreshButton" type="button" onClick={onRefresh} disabled={fetchState === "refreshing"}>
          <RefreshCcw size={16} className={fetchState === "refreshing" ? "spin" : ""} />
          새로고침
        </button>
        <nav className="navTabs">
          <button className={activeView === "feed" ? "active" : ""} type="button" onClick={() => setActiveView("feed")}>
            뉴스
          </button>
          <button className={activeView === "notes" ? "active" : ""} type="button" onClick={() => setActiveView("notes")}>
            내 노트
          </button>
          <button className={activeView === "profile" ? "active" : ""} type="button" onClick={() => setActiveView("profile")}>
            프로필
          </button>
        </nav>
        {memberMode ? (
          <button className="avatarButton" type="button" onClick={onLogout}>
            <Avatar nickname={nickname} photo={profilePhoto} />
          </button>
        ) : (
          <button className="primaryButton small" type="button" onClick={onGoAuth}>
            로그인 / 회원가입
          </button>
        )}
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

function ArticleCard({ article, memo, memberMode, isSaved, onOpenTerm, onSaveMemo, onToggleSaved, onGoAuth }) {
  const [draft, setDraft] = useState(() => makeDraftFromMemo(memo));
  useEffect(() => {
    setDraft(makeDraftFromMemo(memo));
  }, [memo]);

  const terms = useMemo(() => detectTerms(`${article.title} ${article.summary}`), [article]);
  const mood = useMemo(() => inferMarketMood(article), [article]);
  const guide = useMemo(() => makeReadingGuide(article, mood), [article, mood]);
  const categoryMeta = CATEGORIES.find((item) => item.id === article.category);

  function setField(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function toggleFeeling(feeling) {
    const feelings = draft.feelings.includes(feeling)
      ? draft.feelings.filter((item) => item !== feeling)
      : [...draft.feelings, feeling];
    setField("feelings", feelings);
  }

  return (
    <article className="articleCard">
      <div className="cardTop">
        <span className={`categoryBadge ${categoryMeta?.tone || "neutral"}`}>{categoryMeta?.label || "경제"}</span>
        {memberMode ? (
          <button className={`iconButton ${isSaved ? "saved" : ""}`} type="button" onClick={() => onToggleSaved(article)}>
            <Bookmark size={18} fill={isSaved ? "currentColor" : "none"} />
          </button>
        ) : null}
      </div>

      <h2>{article.title}</h2>
      <p className="meta">
        {article.source} · {formatArticleDate(article.publishedAt)}
      </p>
      <p className="summary">{article.summary}</p>

      <section className="termSection">
        <p className="sectionLabel">
          <Sparkles size={15} /> 관련 경제 용어
        </p>
        <div className="termList">
          {terms.length ? (
            terms.map((term) => (
              <button key={term} type="button" onClick={() => onOpenTerm(term, article)}>
                {term}
              </button>
            ))
          ) : (
            <span className="emptyText">이번 카드에서는 눈에 띄는 경제 용어가 아직 많지 않아요.</span>
          )}
        </div>
      </section>

      <section className="guideList">
        <div className="panelTitle">
          <Lightbulb size={16} />
          <strong>{mood.label}</strong>
        </div>
        {guide.map((item) => (
          <p key={item.label}>
            <strong>{item.label}</strong> {item.text}
          </p>
        ))}
      </section>

      <section className="memoBox">
        {memberMode ? (
          <>
            <label>
              <NotebookPen size={16} /> 내 생각
              <textarea value={draft.content} onChange={(event) => setField("content", event.target.value)} placeholder="뉴스를 읽고 든 생각을 편하게 남겨보세요." />
            </label>
            <label>
              한 줄 메모
              <input value={draft.oneLine} onChange={(event) => setField("oneLine", event.target.value)} placeholder="예: 금리 기대가 다시 흔들리는 느낌" />
            </label>
            <label>
              오늘 새로 알게 된 것
              <textarea value={draft.learned} onChange={(event) => setField("learned", event.target.value)} placeholder="예: 국채금리가 오르면 성장주가 눌릴 수 있다는 점" />
            </label>
            <label>
              더 찾아보고 싶은 것
              <textarea value={draft.nextQuestion} onChange={(event) => setField("nextQuestion", event.target.value)} placeholder="예: 다음 FOMC 일정과 CPI 발표" />
            </label>
            <label className="tagInput">
              <Tag size={15} /> 관심 태그
              <input value={draft.tags} onChange={(event) => setField("tags", event.target.value)} placeholder="예: 금리, 미국경제, 엔화" />
            </label>
            <div className="termList">
              {THOUGHT_FEELINGS.map((feeling) => (
                <button
                  key={feeling.id}
                  type="button"
                  className={draft.feelings.includes(feeling.label) ? "selected" : ""}
                  onClick={() => toggleFeeling(feeling.label)}
                >
                  {feeling.label}
                </button>
              ))}
            </div>
            <div className="cardActions">
              <button type="button" onClick={() => onSaveMemo(article, draft)}>
                기록 저장
              </button>
              <a href={article.url} target="_blank" rel="noreferrer">
                원문 보기 <ExternalLink size={16} />
              </a>
            </div>
            {memo.history?.length ? (
              <div className="exampleBox">
                <strong>생각 변화</strong>
                {memo.history.slice(0, 2).map((snapshot) => (
                  <span key={snapshot.savedAt}>
                    {formatUpdatedTime(snapshot.savedAt)} · {snapshot.oneLine || snapshot.content || "짧은 메모 없음"}
                  </span>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <div className="emptyState">
            메모 저장과 내 생각 기록은 로그인 후 사용할 수 있어요.
            <button className="browseButton" type="button" onClick={onGoAuth}>
              <Lock size={16} />
              로그인하러 가기
            </button>
          </div>
        )}
      </section>
    </article>
  );
}

function NotesPage({ articles, memos, onOpenTerm, onSaveMemo, onToggleSaved }) {
  const [tag, setTag] = useState("all");
  const [query, setQuery] = useState("");
  const tags = [...new Set(Object.values(memos).flatMap((memo) => memo.tags || []))];

  const visibleArticles = articles.filter((article) => {
    const memo = memos[article.id];
    const tagMatches = tag === "all" || memo?.tags?.includes(tag);
    const text = `${article.title} ${memo?.content || ""} ${memo?.oneLine || ""}`.toLowerCase();
    return tagMatches && (!query.trim() || text.includes(query.trim().toLowerCase()));
  });

  return (
    <section className="notesPage">
      <label className="searchBox">
        <Search size={18} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="메모와 태그에서 검색" />
      </label>
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
      {visibleArticles.length ? (
        <div className="articleGrid notesGrid">
          {visibleArticles.map((article) => (
            <ArticleCard
              key={article.id}
              article={article}
              memo={normalizeMemo(memos[article.id])}
              memberMode={true}
              isSaved={true}
              onOpenTerm={onOpenTerm}
              onSaveMemo={onSaveMemo}
              onToggleSaved={onToggleSaved}
              onGoAuth={() => {}}
            />
          ))}
        </div>
      ) : (
        <div className="emptyState">아직 남겨진 메모가 없습니다. 오늘 읽은 경제뉴스에서 당신의 생각을 기록해보세요.</div>
      )}
    </section>
  );
}

function ProfilePage({ user, summary, onToggleInterest, onAddInterest, onUploadPhoto }) {
  const [customKeyword, setCustomKeyword] = useState("");

  return (
    <section className="profilePage">
      <div className="panelTitle">
        <Brain size={20} />
        <strong>{user.nickname} 님의 경제 아카이브</strong>
      </div>
      <div className="heroStats">
        <StatTile label="저장한 뉴스" value={summary.savedCount} hint="다시 볼 기사" />
        <StatTile label="작성한 메모" value={summary.memoCount} hint="생각이 남은 기록" />
        <StatTile label="배운 용어" value={summary.learnedCount} hint="용어 클릭 기준" />
      </div>

      <section className="authCard">
        <div className="panelTitle">
          <Camera size={18} />
          <strong>프로필 사진</strong>
        </div>
        <Avatar nickname={user.nickname} photo={user.profile.photo} large />
        <input type="file" accept="image/*" onChange={(event) => onUploadPhoto(event.target.files?.[0])} />
      </section>

      <section className="authCard">
        <div className="panelTitle">
          <Tag size={18} />
          <strong>관심 키워드</strong>
        </div>
        <div className="termList">
          {PROFILE_KEYWORD_SUGGESTIONS.map((keyword) => (
            <button
              key={keyword}
              type="button"
              className={user.profile.interests.includes(keyword) ? "selected" : ""}
              onClick={() => onToggleInterest(keyword)}
            >
              {keyword}
            </button>
          ))}
        </div>
        <label className="tagInput">
          직접 추가
          <input value={customKeyword} onChange={(event) => setCustomKeyword(event.target.value)} placeholder="예: 미국경제" />
        </label>
        <button
          className="primaryButton small"
          type="button"
          onClick={() => {
            if (onAddInterest(customKeyword)) setCustomKeyword("");
          }}
        >
          키워드 추가
        </button>
      </section>

      <section className="authCard">
        <div className="panelTitle">
          <NotebookPen size={18} />
          <strong>최근 기록</strong>
        </div>
        {summary.recentRecords.length ? (
          summary.recentRecords.map((record) => (
            <div key={record.articleId} className="exampleBox">
              <strong>{record.articleTitle}</strong>
              <span>{record.oneLine || record.content || "짧은 메모가 아직 없어요."}</span>
            </div>
          ))
        ) : (
          <p className="emptyText">첫 기록을 남기면 최근 메모가 여기에 보여요.</p>
        )}
      </section>
    </section>
  );
}

function TermModal({ entry, onClose }) {
  const dictionary = TERM_DICTIONARY[entry.term];
  const label = CATEGORIES.find((item) => item.id === entry.article?.category)?.label || "경제";
  const context = entry.article
    ? `이 기사에서는 ${entry.term}가 ${label} 흐름을 읽는 실마리로 쓰이고 있어요.`
    : "이 용어는 기사 속 분위기와 숫자를 해석할 때 자주 등장해요.";
  const impact = makeTermImpact(entry.term, entry.article);

  return (
    <div className="modalBackdrop" role="presentation" onClick={onClose}>
      <section className="termModal" onClick={(event) => event.stopPropagation()}>
        <button className="closeButton" type="button" onClick={onClose} aria-label="닫기">
          <X size={20} />
        </button>
        <p className="eyebrow">경제 용어 풀이</p>
        <h3>{entry.term}</h3>
        <p className="termShort">{dictionary?.short || `${entry.term}와 관련된 흐름을 함께 읽어보면 이해가 쉬워져요.`}</p>
        <p>{dictionary?.detail || context}</p>
        <div className="exampleBox">
          <strong>이 뉴스에서는</strong>
          <span>{context}</span>
        </div>
        <div className="exampleBox">
          <strong>시장에 어떤 영향을 줄 수 있을까?</strong>
          <span>{impact}</span>
        </div>
      </section>
    </div>
  );
}

function LockedView({ onGoAuth }) {
  return (
    <section className="notesPage">
      <div className="emptyState">
        이 공간은 로그인 후에 열려요. 뉴스를 읽고 남긴 생각을 내 노트와 프로필에 차곡차곡 쌓아보세요.
        <button className="browseButton" type="button" onClick={onGoAuth}>
          <Lock size={16} />
          로그인 / 회원가입
        </button>
      </div>
    </section>
  );
}

function Avatar({ nickname, photo, large = false }) {
  if (photo) {
    return <img className={large ? "avatarLarge" : "avatar"} src={photo} alt="" />;
  }
  return <span className={large ? "avatarLarge avatarFallback" : "avatar avatarFallback"}>{nickname?.slice(0, 1) || "나"}</span>;
}

function LoadMoreArea({ remaining, totalCount, onLoadMore }) {
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
      if (legacy) return normalizeLegacy(key, JSON.parse(legacy));
    }
  } catch {
    return emptyArchiveStore();
  }
  return emptyArchiveStore();
}

function normalizeLegacy(key, legacy) {
  if (key === "like-money-news-archive-v4") return normalizeArchiveStore(legacy);
  return {
    users: {
      guest: normalizeMember({
        nickname: "나의 노트",
        saved: legacy.saved,
        memos: legacy.memos,
        learnedTerms: legacy.learnedTerms
      })
    }
  };
}

function loadSession() {
  try {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!stored) return { mode: "signedOut" };
    const parsed = JSON.parse(stored);
    if (parsed?.mode === "member" && parsed?.nicknameKey) return parsed;
    if (parsed?.mode === "guest") return { mode: "guest" };
  } catch {
    return { mode: "signedOut" };
  }
  return { mode: "signedOut" };
}

function emptyArchiveStore() {
  return { users: {} };
}

function normalizeArchiveStore(store) {
  return {
    users: Object.fromEntries(Object.entries(store?.users || {}).map(([key, value]) => [key, normalizeMember(value)]))
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
      interests: PROFILE_KEYWORD_SUGGESTIONS.slice(0, 4)
    }
  });
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

function inferMarketMood(article) {
  const text = `${article.title} ${article.summary}`;
  const matched = MARKET_MOOD_RULES
    .map((rule) => ({
      ...rule,
      score: rule.keywords.reduce((count, keyword) => count + (text.includes(keyword) ? 1 : 0), 0)
    }))
    .sort((left, right) => right.score - left.score)[0];
  return matched?.score ? matched : MARKET_MOOD_RULES.find((rule) => rule.id === "wait");
}

function makeReadingGuide(article, mood) {
  const followups = GUIDE_BY_CATEGORY[article.category] || GUIDE_BY_CATEGORY.global;
  return [
    { label: "왜 중요할까?", text: `${mood.description} 이 흐름이 생활경제와 투자 심리를 함께 움직일 수 있어요.` },
    { label: "누구에게 영향을 줄까?", text: "대출, 저축, 소비, 적립식 투자처럼 일상과 가까운 선택에 연결될 수 있어요." },
    { label: "금리·환율·주식과 어떤 관련이 있을까?", text: "같은 뉴스라도 금리 기대와 환율, 증시 심리가 서로 얽혀서 움직일 수 있어요." },
    { label: "앞으로 무엇을 더 보면 좋을까?", text: followups[0] || "다음 관련 발표와 후속 기사 흐름을 같이 보면 좋아요." }
  ];
}

function makeTermImpact(term, article) {
  const category = article?.category || "global";
  if (["기준금리", "정책금리", "국채금리", "소비자물가지수", "CPI", "물가상승률", "인플레이션"].includes(term)) {
    return "금리 기대를 바꾸면서 대출 부담, 성장주 심리, 채권시장 방향까지 함께 흔들 수 있어요.";
  }
  if (["환율", "원달러환율", "달러원"].includes(term)) {
    return "수입물가와 해외 자산 심리에 연결되면서 생활비와 시장 분위기에 함께 영향을 줄 수 있어요.";
  }
  if (["유동성", "양적완화", "QE", "테이퍼링"].includes(term)) {
    return "시장에 돈이 풀리거나 줄어드는 흐름이라 자산 가격 기대를 크게 바꿀 수 있어요.";
  }
  if (category === "stock") return "투자 심리와 업종별 강약을 가르는 신호가 될 수 있어요.";
  if (category === "realestate") return "대출 규제와 매수 심리, 전세 흐름에 같이 번질 수 있어요.";
  return "기사 한 줄의 숫자를 시장 분위기로 번역해주는 단서가 될 수 있어요.";
}

function makeProfileSummary(user) {
  if (!user) {
    return { savedCount: 0, memoCount: 0, learnedCount: 0, recentRecords: [] };
  }
  const recentRecords = Object.values(user.memos)
    .filter((memo) => hasMeaningfulMemo(memo))
    .sort((left, right) => (right.updatedAt || "").localeCompare(left.updatedAt || ""))
    .slice(0, 4);
  return {
    savedCount: Object.keys(user.saved).length,
    memoCount: Object.values(user.memos).filter((memo) => hasMeaningfulMemo(memo)).length,
    learnedCount: Object.keys(user.learnedTerms).length,
    recentRecords
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
  return normalized.length ? normalized : PROFILE_KEYWORD_SUGGESTIONS.slice(0, 4);
}

function toTags(value) {
  return String(value || "")
    .split(",")
    .map((tag) => tag.trim().replace(/^#/, ""))
    .filter(Boolean);
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