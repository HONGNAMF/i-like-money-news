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
const REMEMBERED_MEMBER_KEY = "like-money-news-remembered-member";
const LEGACY_STORAGE_KEYS = ["like-money-news-archive-v4", "easy-econ-news-v3", "easy-econ-news-v2"];
const INITIAL_VISIBLE_COUNT = 8;
const PROFILE_EMOJIS = ["🦀", "🌱", "☁️", "📚", "🐟", "🐈", "🌙", "🍞"];
const MONTHLY_TOPIC_TEMPLATES = [
  {
    title: "금리 인하 기대감",
    terms: ["기준금리", "금리 인하", "연준", "FOMC"],
    mood: "🧊 관망 흐름",
    description: "물가가 조금씩 식는지, 중앙은행이 언제 금리를 낮출지에 관심이 모이고 있어요.",
    reason: "대출이자, 예금금리, 성장주 분위기까지 넓게 연결되기 때문이에요."
  },
  {
    title: "반도체 회복 흐름",
    terms: ["반도체", "AI 관련주", "코스피", "외국인 매수"],
    mood: "🌱 성장 기대",
    description: "AI 수요와 메모리 업황 회복 기대가 한국 증시의 대표 흐름으로 자주 언급돼요.",
    reason: "반도체는 한국 수출과 코스피에 미치는 비중이 커서 시장 심리를 움직이기 쉬워요."
  },
  {
    title: "고유가와 생활 물가 부담",
    terms: ["고유가", "물가상승률", "환율", "생활비"],
    mood: "⚠ 변동성 확대",
    description: "기름값과 원자재 가격은 생활비, 물류비, 기업 비용에 함께 영향을 줘요.",
    reason: "물가가 다시 오르면 금리 인하 기대가 늦어질 수 있어 시장이 민감하게 봐요."
  },
  {
    title: "부동산 규제와 대출 조건",
    terms: ["부동산 규제", "DSR", "LTV", "전세"],
    mood: "🧊 관망 흐름",
    description: "대출 규제와 전월세 흐름은 실수요자의 부담과 매수 심리에 바로 닿아요.",
    reason: "집을 사려는 사람뿐 아니라 전세, 월세를 사는 사람의 생활비와도 연결돼요."
  }
];

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
  const trendingTerms = useMemo(() => extractTrendingTerms(articles).slice(0, 12), [articles]);
  const monthlyTopics = useMemo(() => buildMonthlyTopics(articles), [articles]);

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

    rememberMember(normalized);
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
    rememberMember(normalized);
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
    forgetMember();
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

  function selectProfileEmoji(emoji) {
    if (!memberMode) return;
    setStore((current) =>
      updateMember(current, memberKey, (member) => ({
        ...member,
        profile: {
          ...member.profile,
          photo: "",
          avatarEmoji: emoji,
          avatarType: "emoji"
        }
      }))
    );
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
          profileEmoji={currentUser?.profile?.avatarEmoji || ""}
          onRefresh={() => void loadArticles({ refresh: true })}
          onGoAuth={handleGoAuth}
          onLogout={handleLogout}
        />

        <section className="hero">
          <div className="heroMain">
            <p className="eyebrow">{AUTH_COPY.eyebrow}</p>
            <h1>
              <BrandMark brand={brand} size="hero" />
              경제뉴스를 쉽게 읽고, 내 생각으로 남기는 공간
            </h1>
            <p className="heroText">
              기사 제목과 짧은 요약을 천천히 읽고, 낯선 경제 용어를 풀어보고, 오늘의 생각을 내 언어로 기록해보세요.
            </p>
            <div className="readingFlow">
              <div>
                <strong>읽고</strong>
                <span>여러 언론사의 경제뉴스를 짧은 요약으로 먼저 살펴봐요.</span>
              </div>
              <div>
                <strong>이해하고</strong>
                <span>뉴스에 나온 경제 용어와 시장 분위기를 쉬운 말로 풀어봐요.</span>
              </div>
              <div>
                <strong>남기기</strong>
                <span>오늘 느낀 점과 더 찾아볼 질문을 나만의 노트에 저장해요.</span>
              </div>
            </div>
            <div className="heroStats">
              <StatTile label="오늘 읽을 기사" value={filteredArticles.length} hint="현재 필터 기준" />
              <StatTile label="저장한 뉴스" value={memberMode ? Object.keys(saved).length : 0} hint={memberMode ? "다시 볼 기사" : "로그인 후 저장"} />
              <StatTile label="남긴 기록" value={memberMode ? profileSummary.memoCount : 0} hint={memberMode ? "메모가 남은 기사" : "둘러보기 중"} />
            </div>
          </div>

          <aside className="learnedWidget briefingPanel">
            <div className="widgetTitle">
              <Brain size={20} />
              <strong>오늘 눈에 띄는 키워드</strong>
            </div>
            <p className="helperText">뉴스에서 자주 보이는 단어를 눌러보면 쉬운 설명으로 이어져요.</p>
            <div className="termList">
              {learnedList.length ? (
                learnedList.slice(0, 6).map((item) => (
                  <button key={item.term} type="button" onClick={() => openTerm(item.term)}>
                    {item.term}
                  </button>
                ))
              ) : trendingTerms.length ? (
                trendingTerms.slice(0, 8).map((term) => (
                  <button key={term} type="button" onClick={() => openTerm(term)}>
                    {term}
                  </button>
                ))
              ) : (
                <span className="emptyText">뉴스를 불러오면 자주 등장하는 키워드가 여기에 보여요.</span>
              )}
            </div>
            <div className="exampleBox">
              <strong>Sensefolio</strong>
              <span>뉴스 너머의 투자 해석이 궁금할 때 이어서 볼 수 있어요.</span>
              <a href="https://sensefolio-note.vercel.app/" target="_blank" rel="noreferrer">
                Sensefolio 보기
              </a>
            </div>
          </aside>
        </section>

        {!memberMode ? (
          <div className="emptyState">
            지금은 둘러보기 모드예요. 뉴스 읽기와 용어 풀이는 바로 볼 수 있고, 메모와 내 노트, 프로필은 로그인 후 사용할 수 있어요.
          </div>
        ) : (
          <ProfilePhotoBanner
            user={currentUser}
            onUploadPhoto={uploadProfilePhoto}
            onSelectEmoji={selectProfileEmoji}
            onOpenProfile={() => setActiveView("profile")}
          />
        )}

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
              placeholder="궁금한 뉴스, 메모, 키워드를 찾아보세요"
            />
          </label>
        </nav>

        {activeView === "feed" ? (
          <>
            <TermSearchPanel articles={articles} trendingTerms={trendingTerms} onOpenTerm={openTerm} />
            <MonthlyTopics topics={monthlyTopics} onOpenTerm={openTerm} />
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
                    <strong>천천히 읽는 방법</strong>
                  </div>
                  <p>기사마다 왜 중요한지, 누구에게 닿는지, 다음에 무엇을 더 보면 좋을지 카드 안에서 바로 확인할 수 있어요.</p>
                </section>
                <section className="sensePanel">
                  <div className="panelTitle">
                    <Compass size={18} />
                    <strong>투자 해석이 궁금하다면</strong>
                  </div>
                  <p>뉴스를 읽은 뒤 시장 해석까지 더 보고 싶을 때 Sensefolio로 이어갈 수 있어요.</p>
                  <a href="https://sensefolio-note.vercel.app/" target="_blank" rel="noreferrer">
                    Sensefolio 보기 <ExternalLink size={15} />
                  </a>
                </section>
              </aside>
            </section>
          </>
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
              onSelectEmoji={selectProfileEmoji}
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
  const [loginNickname, setLoginNickname] = useState(() => getRememberedMember() || "");
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

function ProfilePhotoBanner({ user, onUploadPhoto, onSelectEmoji, onOpenProfile }) {
  return (
    <section className="profilePhotoBanner">
      <div className="profileIdentity">
        <Avatar nickname={user.nickname} photo={user.profile.photo} emoji={user.profile.avatarEmoji} large />
        <div>
          <p className="eyebrow">profile photo</p>
          <h2>프로필 사진을 바로 설정할 수 있어요</h2>
          <p className="helperText">사진을 올리면 상단 프로필과 내 경제 아카이브에 바로 반영돼요. 다음에 들어와도 로그인 정보와 함께 기억됩니다.</p>
        </div>
      </div>
      <div className="profileBannerActions">
        <label className="uploadButton standout">
          <Camera size={17} />
          프로필 사진 올리기
          <input type="file" accept="image/*" onChange={(event) => onUploadPhoto(event.target.files?.[0])} />
        </label>
        <div className="emojiPicker compact">
          {PROFILE_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={user.profile.avatarEmoji === emoji && !user.profile.photo ? "selected" : ""}
              onClick={() => onSelectEmoji(emoji)}
              aria-label={`${emoji} 아바타 선택`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <button className="ghostButton" type="button" onClick={onOpenProfile}>
          프로필 자세히 보기
        </button>
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
  profileEmoji,
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
            <Avatar nickname={nickname} photo={profilePhoto} emoji={profileEmoji} />
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

function TermSearchPanel({ articles, trendingTerms, onOpenTerm }) {
  const [termQuery, setTermQuery] = useState("");
  const result = useMemo(() => makeTermSearchResult(termQuery, articles), [articles, termQuery]);
  const suggestions = result.suggestions.length ? result.suggestions : trendingTerms.slice(0, 8);

  return (
    <section className="termSearchPanel wide">
      <div className="sectionHeader compactHeader">
        <div>
          <p className="eyebrow">easy keyword search</p>
          <h2>궁금한 경제 용어를 바로 풀어보세요</h2>
          <span>등록된 사전뿐 아니라 뉴스 제목과 요약에서 자주 보이는 단어까지 함께 찾아요.</span>
        </div>
      </div>
      <div className="termSearchGrid">
        <div className="termSearchInputCard">
          <label className="searchBox full">
            <Search size={18} />
            <input
              value={termQuery}
              onChange={(event) => setTermQuery(event.target.value)}
              placeholder="예: 코스피, 고유가, 부동산 규제, AI 관련주"
            />
          </label>
          <div className="keywordCloud">
            <strong>자주 찾는 키워드</strong>
            <div className="termList compact">
              {suggestions.map((term) => (
                <button key={term} type="button" onClick={() => setTermQuery(term)}>
                  {term}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="termResultCard">
          <p className="eyebrow">search result</p>
          <h3>{result.term}</h3>
          <p className="termShort">{result.short}</p>
          <div className="termGuideStack">
            <div className="guideCard">
              <strong>왜 중요할까?</strong>
              <p>{result.why}</p>
            </div>
            <div className="guideCard">
              <strong>요즘 왜 자주 나올까?</strong>
              <p>{result.recent}</p>
            </div>
            <div className="guideCard">
              <strong>시장과 생활에는?</strong>
              <p>{result.impact}</p>
            </div>
          </div>
          <div className="keywordCloud">
            <strong>관련 키워드</strong>
            <div className="termList compact">
              {result.relatedTerms.map((term) => (
                <button key={term} type="button" onClick={() => onOpenTerm(term)}>
                  {term}
                </button>
              ))}
            </div>
          </div>
          <div className="relatedNews">
            <strong>{result.term} 관련 뉴스</strong>
            {result.relatedArticles.length ? (
              result.relatedArticles.map((article) => (
                <a key={article.id} href={article.url} target="_blank" rel="noreferrer">
                  {article.title}
                </a>
              ))
            ) : (
              <span className="emptyText">관련 뉴스가 아직 적어요. 다른 키워드도 함께 검색해보세요.</span>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MonthlyTopics({ topics, onOpenTerm }) {
  return (
    <section className="monthlyTopics">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">monthly topics</p>
          <h2>이번 달 자주 언급되는 경제 토픽</h2>
          <span>뉴스를 하나씩 보기 전에, 지금 사람들이 많이 이야기하는 흐름을 먼저 잡아보세요.</span>
        </div>
      </div>
      <div className="topicGrid">
        {topics.map((topic) => (
          <article className="topicCard" key={topic.title}>
            <span className="moodPill">{topic.mood}</span>
            <h3>{topic.title}</h3>
            <p>{topic.description}</p>
            <div className="topicReason">
              <strong>왜 화제일까?</strong>
              <span>{topic.reason}</span>
            </div>
            <div className="termList compact">
              {topic.terms.map((term) => (
                <button key={term} type="button" onClick={() => onOpenTerm(term)}>
                  {term}
                </button>
              ))}
            </div>
            <div className="relatedMini">
              <strong>관련 뉴스</strong>
              {topic.relatedArticles.length ? (
                topic.relatedArticles.map((article) => (
                  <a key={article.id} href={article.url} target="_blank" rel="noreferrer">
                    {article.title}
                  </a>
                ))
              ) : (
                <span className="emptyText">새 뉴스가 들어오면 자동으로 연결돼요.</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
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
            <span className="emptyText">눈에 띄는 용어가 적다면 위 검색창에서 직접 찾아볼 수 있어요.</span>
          )}
        </div>
      </section>

      <section className="termGuideStack">
        <div className="panelTitle">
          <Lightbulb size={16} />
          <strong>{mood.label}</strong>
        </div>
        {guide.map((item) => (
          <p className="guideCard" key={item.label}>
            <strong>{item.label}</strong> {item.text}
          </p>
        ))}
      </section>

      <section className="memoBox">
        {memberMode ? (
          <>
            <label>
              <NotebookPen size={16} /> 오늘의 기록
              <textarea value={draft.content} onChange={(event) => setField("content", event.target.value)} placeholder="오늘 이 뉴스를 읽고 든 생각을 편하게 남겨보세요." />
            </label>
            <label>
              한 줄 기록
              <input value={draft.oneLine} onChange={(event) => setField("oneLine", event.target.value)} placeholder="예: 금리 기대가 다시 흔들리는 느낌" />
            </label>
            <label>
              새롭게 알게 된 것
              <textarea value={draft.learned} onChange={(event) => setField("learned", event.target.value)} placeholder="예: 국채금리가 오르면 성장주가 눌릴 수 있다는 점" />
            </label>
            <label>
              나중에 다시 보고 싶은 질문
              <textarea value={draft.nextQuestion} onChange={(event) => setField("nextQuestion", event.target.value)} placeholder="예: 다음 FOMC 일정과 CPI 발표" />
            </label>
            <label className="tagInput">
              <Tag size={15} /> 기록 태그
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
                내 기록 저장
              </button>
              <a href={article.url} target="_blank" rel="noreferrer">
                언론사 원문 읽기 <ExternalLink size={16} />
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
            지금은 읽기 모드예요. 로그인하면 이 기사에 대한 생각과 태그를 내 노트에 저장할 수 있어요.
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

function ProfilePage({ user, summary, onToggleInterest, onAddInterest, onUploadPhoto, onSelectEmoji }) {
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

      <section className="authCard profileAvatarPanel">
        <div className="panelTitle">
          <Camera size={18} />
          <strong>프로필 꾸미기</strong>
        </div>
        <div className="profileIdentity">
          <Avatar nickname={user.nickname} photo={user.profile.photo} emoji={user.profile.avatarEmoji} large />
          <div>
            <strong>{user.nickname}</strong>
            <p className="fieldLabelText">사진을 올리거나, 가벼운 이모티콘 아바타를 골라보세요.</p>
          </div>
        </div>
        <label className="uploadButton">
          <Camera size={16} />
          프로필 사진 올리기
          <input type="file" accept="image/*" onChange={(event) => onUploadPhoto(event.target.files?.[0])} />
        </label>
        <div className="keywordCloud">
          <strong>이모티콘으로 쓰기</strong>
          <div className="emojiPicker">
            {PROFILE_EMOJIS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className={user.profile.avatarEmoji === emoji && !user.profile.photo ? "selected" : ""}
                onClick={() => onSelectEmoji(emoji)}
                aria-label={`${emoji} 아바타 선택`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
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
          <input value={customKeyword} onChange={(event) => setCustomKeyword(event.target.value)} placeholder="예: 고유가, AI 산업, 전기요금" />
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
  const relatedTerms = makeRelatedTerms(entry.term, entry.article ? [entry.article] : []).slice(0, 5);

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
        <div className="termGuideStack">
          <div className="guideCard">
            <strong>왜 중요할까?</strong>
            <p>{makeWhyImportant(entry.term)}</p>
          </div>
          <div className="guideCard">
            <strong>이 뉴스에서는</strong>
            <p>{context}</p>
          </div>
          <div className="guideCard">
            <strong>시장과 생활에는?</strong>
            <p>{impact}</p>
          </div>
        </div>
        <div className="exampleBox">
          <strong>예시 문장</strong>
          <span>{dictionary?.example || `${entry.term} 흐름을 보면 이 뉴스가 내 생활과 어떻게 연결되는지 조금 더 쉽게 보일 수 있어요.`}</span>
        </div>
        <div className="termList modalTerms">
          {relatedTerms.map((term) => (
            <button key={term} type="button">
              {term}
            </button>
          ))}
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

function Avatar({ nickname, photo, emoji, large = false }) {
  if (photo) {
    return <img className={large ? "avatarLarge" : "avatar"} src={photo} alt="" />;
  }
  return <span className={large ? "avatarLarge avatarFallback" : "avatar avatarFallback"}>{emoji || nickname?.slice(0, 1) || "나"}</span>;
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
    if (!stored) {
      const remembered = getRememberedMember();
      return remembered ? { mode: "member", nicknameKey: remembered } : { mode: "guest" };
    }
    const parsed = JSON.parse(stored);
    if (parsed?.mode === "member" && parsed?.nicknameKey) return parsed;
    if (parsed?.mode === "guest") return { mode: "guest" };
  } catch {
    return { mode: "guest" };
  }
  return { mode: "guest" };
}

function rememberMember(nicknameKey) {
  try {
    localStorage.setItem(REMEMBERED_MEMBER_KEY, nicknameKey);
  } catch {
    // If storage is unavailable, the normal session state still works in memory.
  }
}

function forgetMember() {
  try {
    localStorage.removeItem(REMEMBERED_MEMBER_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function getRememberedMember() {
  try {
    return normalizeNickname(localStorage.getItem(REMEMBERED_MEMBER_KEY) || "");
  } catch {
    return "";
  }
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
      avatarEmoji: String(member?.profile?.avatarEmoji || "🦀"),
      avatarType: String(member?.profile?.avatarType || "emoji"),
      interests: normalizeInterests(member?.profile?.interests)
    }
  };
}

function emptyMemberArchive(nickname) {
  return normalizeMember({
    nickname,
    profile: {
      avatarEmoji: "🦀",
      avatarType: "emoji",
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

function makeTermSearchResult(query, articles) {
  const term = findCanonicalTerm(query) || extractTrendingTerms(articles)[0] || "코스피";
  const dictionary = TERM_DICTIONARY[term];
  const relatedTerms = makeRelatedTerms(term, articles).slice(0, 6);
  const relatedArticles = getRelatedArticles(term, articles).slice(0, 3);

  return {
    term,
    short: dictionary?.short || `${term}은 최근 경제뉴스에서 맥락을 함께 봐야 이해가 쉬운 키워드예요.`,
    why: makeWhyImportant(term),
    recent: makeRecentReason(term, relatedArticles),
    impact: makeLifeImpact(term),
    relatedTerms,
    relatedArticles,
    suggestions: searchTermSuggestions(query).slice(0, 10)
  };
}

function findCanonicalTerm(query) {
  const cleaned = cleanNickname(query).toLowerCase();
  if (!cleaned) return "";
  return TERM_KEYS.find((term) => {
    const entry = TERM_DICTIONARY[term];
    return [term, ...(entry.aliases || [])].some((word) => word.toLowerCase().includes(cleaned) || cleaned.includes(word.toLowerCase()));
  }) || query.trim();
}

function searchTermSuggestions(query) {
  const cleaned = cleanNickname(query).toLowerCase();
  if (!cleaned) return TERM_KEYS.slice(0, 10);
  return TERM_KEYS.filter((term) => {
    const entry = TERM_DICTIONARY[term];
    return [term, ...(entry.aliases || [])].some((word) => word.toLowerCase().includes(cleaned));
  });
}

function extractTrendingTerms(articles) {
  const counts = new Map();
  for (const article of articles) {
    for (const term of detectTerms(`${article.title} ${article.summary}`)) {
      counts.set(term, (counts.get(term) || 0) + 1);
    }
  }
  return [...counts.entries()].sort((left, right) => right[1] - left[1]).map(([term]) => term);
}

function buildMonthlyTopics(articles) {
  return MONTHLY_TOPIC_TEMPLATES.map((topic) => ({
    ...topic,
    relatedArticles: articles
      .filter((article) => topic.terms.some((term) => `${article.title} ${article.summary}`.includes(term)))
      .slice(0, 2)
  }));
}

function getRelatedArticles(term, articles) {
  const canonical = findCanonicalTerm(term) || term;
  const words = [canonical, ...(TERM_DICTIONARY[canonical]?.aliases || [])].filter(Boolean);
  return articles.filter((article) => words.some((word) => `${article.title} ${article.summary}`.includes(word)));
}

function makeRelatedTerms(term, articles) {
  const monthly = MONTHLY_TOPIC_TEMPLATES.find((topic) => topic.terms.includes(term));
  const fromNews = extractTrendingTerms(getRelatedArticles(term, articles));
  const fallback = monthly?.terms || ["금리", "환율", "코스피", "물가상승률", "반도체", "고유가"];
  return [...new Set([...(monthly?.terms || []), ...fromNews, ...fallback].filter((item) => item !== term))];
}

function makeWhyImportant(term) {
  if (["코스피", "코스닥", "반도체", "ETF", "외국인 매수"].includes(term)) {
    return "국내 증시 분위기와 투자 심리를 읽을 때 자주 쓰이는 단서예요.";
  }
  if (["기준금리", "금리 인상", "금리 인하", "국채금리", "FOMC", "연준"].includes(term)) {
    return "대출이자, 예금금리, 주식과 부동산 심리를 함께 움직일 수 있어요.";
  }
  if (["고유가", "물가상승률", "CPI", "PPI", "생활비", "전기요금"].includes(term)) {
    return "내가 실제로 쓰는 생활비와 기업 비용에 직접 닿는 흐름이라 중요해요.";
  }
  if (["환율", "달러 강세", "엔화 약세", "관세", "수출"].includes(term)) {
    return "수입물가, 여행 비용, 수출 기업 실적과 연결돼 넓게 영향을 줄 수 있어요.";
  }
  return "뉴스 속 숫자와 분위기를 내 생활과 시장 흐름으로 연결해주는 키워드예요.";
}

function makeRecentReason(term, relatedArticles) {
  if (relatedArticles.length) {
    return "관련 뉴스가 계속 이어지고 있어 시장이 같은 단어를 반복해서 확인하는 중이에요.";
  }
  if (["AI 관련주", "반도체"].includes(term)) return "AI 투자와 데이터센터 수요가 커지면서 산업 기대감이 자주 언급돼요.";
  if (["고유가", "환율"].includes(term)) return "글로벌 불확실성과 원자재 가격 변화가 물가 걱정으로 이어지기 쉬워요.";
  if (["부동산 규제", "DSR", "LTV"].includes(term)) return "대출 조건과 주거비 부담이 실수요자의 선택에 바로 연결되기 때문이에요.";
  return "최근 정책, 산업 변화, 시장 심리가 겹치면 뉴스에서 반복해서 등장할 수 있어요.";
}

function makeLifeImpact(term) {
  if (["기준금리", "금리 인상", "금리 인하", "국채금리"].includes(term)) {
    return "대출 이자와 예금 이자, 주식시장 분위기에 영향을 줄 수 있어요.";
  }
  if (["환율", "달러 강세", "엔화 약세"].includes(term)) {
    return "해외여행, 해외직구, 수입 제품 가격과 연결돼 생활비에 영향을 줄 수 있어요.";
  }
  if (["고유가", "전기요금", "생활비", "물가상승률"].includes(term)) {
    return "주유비, 장바구니 물가, 공공요금 부담으로 체감될 수 있어요.";
  }
  if (["부동산 규제", "DSR", "LTV", "전세", "월세"].includes(term)) {
    return "집을 사거나 빌릴 때 필요한 현금과 매달 부담이 달라질 수 있어요.";
  }
  return "투자 판단뿐 아니라 소비, 저축, 일자리 분위기까지 넓게 이어질 수 있어요.";
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
