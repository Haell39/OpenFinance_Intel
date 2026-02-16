import { useEffect, useState } from "react";
import { createSource, fetchEvents } from "./api/events.js";
import MarketOverview from "./components/MarketOverview.jsx";
import IntelligenceFeed from "./components/IntelligenceFeed.jsx";
import Watchlist from "./components/Watchlist.jsx";
import Sparkline from "./components/Sparkline.jsx";
import Sidebar from "./components/Sidebar.jsx";

// Mock Data for "Analysis" / KPI Bar
const INITIAL_MARKET_SIGNALS = [
  {
    id: "loading",
    title: "Carregando Mercado...",
    type: "financial",
    trend: "neutral",
    data: [10, 10, 10, 10, 10, 10, 10], // Mock initial
  },
];

const SOURCE_TYPE_OPTIONS = ["financial", "geopolitical", "odds"];

async function fetchTickerData() {
  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL",
    );
    const data = await res.json();

    // Helper to generate mock sparkline data
    const mockSpark = (trend) => {
      const base = 10;
      const volatility = 0.5;
      const points = [];
      let current = base;
      for (let i = 0; i < 10; i++) {
        const change = (Math.random() - 0.5) * volatility;
        const trendBias = trend === "up" ? 0.2 : trend === "down" ? -0.2 : 0;
        current += change + trendBias;
        points.push(current);
      }
      return points;
    };

    return [
      {
        id: "usd",
        title: `Dólar: R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`,
        type: "financial",
        trend: parseFloat(data.USDBRL.pctChange) > 0 ? "up" : "down",
        data: mockSpark(parseFloat(data.USDBRL.pctChange) > 0 ? "up" : "down"),
      },
      {
        id: "eur",
        title: `Euro: R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`,
        type: "financial",
        trend: parseFloat(data.EURBRL.pctChange) > 0 ? "up" : "down",
        data: mockSpark(parseFloat(data.EURBRL.pctChange) > 0 ? "up" : "down"),
      },
      {
        id: "btc",
        title: `Bitcoin: R$ ${(parseFloat(data.BTCBRL.bid) / 1000).toFixed(1)}k`,
        type: "financial",
        trend: parseFloat(data.BTCBRL.pctChange) > 0 ? "up" : "down",
        data: mockSpark(parseFloat(data.BTCBRL.pctChange) > 0 ? "up" : "down"),
      },
      {
        id: "selic",
        title: "Selic Meta: 11.25%",
        type: "financial",
        trend: "neutral",
        data: [11.25, 11.25, 11.25, 11.25, 11.25, 11.25, 11.25],
      },
    ];
  } catch (e) {
    console.error("Failed to fetch ticker", e);
    return [];
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState("overview");

  // Theme State: Default 'light' (Silver), persist in localStorage
  const [isDark, setIsDark] = useState(() => {
    const saved = localStorage.getItem("theme");
    return saved === "dark";
  });

  // Language State: Default 'pt', persist in localStorage
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("language") || "pt";
  });

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  useEffect(() => {
    localStorage.setItem("language", language);
  }, [language]);

  const toggleTheme = () => setIsDark(!isDark);
  const toggleLanguage = () =>
    setLanguage((prev) => (prev === "pt" ? "en" : "pt"));

  const [impact, setImpact] = useState("all");
  const [type, setType] = useState("all");
  const [sortBy, setSortBy] = useState("timestamp");
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  // Watchlist Logic
  const [watchlist, setWatchlist] = useState(() => {
    try {
      const saved = localStorage.getItem("watchlist");
      if (!saved) return [];
      const parsed = JSON.parse(saved);
      // Clean up legacy/invalid items without IDs
      const valid = parsed.filter((i) => i.id || i._id);
      return valid;
    } catch (e) {
      console.error("Failed to parse watchlist", e);
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("watchlist", JSON.stringify(watchlist));
  }, [watchlist]);

  const toggleWatchlist = (event) => {
    // Front-end Guard: Prevent saving items without valid ID
    const evtId = event?.id || event?._id;
    if (!evtId) {
      console.warn(
        "Attempted to toggle watchlist item without valid ID:",
        event,
      );
      return;
    }

    setWatchlist((prev) => {
      // Check existence using strict String comparison to handle int/string mismatches
      const exists = prev.find((i) => {
        const iId = i.id || i._id;
        return String(iId) === String(evtId);
      });

      if (exists) {
        // Remove item
        return prev.filter((i) => {
          const iId = i.id || i._id;
          return String(iId) !== String(evtId);
        });
      }

      // Add item
      return [event, ...prev];
    });
  };

  // Real-time & Ticker State
  const [marketSignals, setMarketSignals] = useState(INITIAL_MARKET_SIGNALS);
  const [refreshInterval, setRefreshInterval] = useState(0); // 0 = off
  const [lastUpdated, setLastUpdated] = useState(new Date()); // New State
  const [timeSinceUpdate, setTimeSinceUpdate] = useState("0s"); // New State

  // Source Modal State
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("financial");
  const [sourceStatus, setSourceStatus] = useState("idle");
  const [sourceError, setSourceError] = useState("");
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [activeTabSource, setActiveTabSource] = useState("recommended"); // recommended, rss, twitter

  const loadEvents = () => {
    setStatus("loading");
    return fetchEvents({ impact, type, region: "all" })
      .then((data) => {
        // Sorting logic
        const sorted = [...data].sort((a, b) => {
          if (sortBy === "urgency") {
            const scoreA =
              (a.urgency === "urgent" ? 1000 : 0) +
              (a.impact === "high" ? 100 : 0);
            const scoreB =
              (b.urgency === "urgent" ? 1000 : 0) +
              (b.impact === "high" ? 100 : 0);
            return (
              scoreB - scoreA || new Date(b.timestamp) - new Date(a.timestamp)
            );
          }
          if (sortBy === "impact") {
            const score = (ev) =>
              ev.impact === "high" ? 3 : ev.impact === "medium" ? 2 : 1;
            return (
              score(b) - score(a) ||
              new Date(b.timestamp) - new Date(a.timestamp)
            );
          }
          return new Date(b.timestamp) - new Date(a.timestamp);
        });

        setEvents(sorted);
        setStatus("ready");
        setLastUpdated(new Date()); // Update timestamp on success
      })
      .catch((err) => {
        setError(err.message || "Failed to load events");
        setStatus("error");
      });
  };

  useEffect(() => {
    fetchTickerData().then((data) => {
      if (data.length) setMarketSignals(data);
    });

    // Timer for "X seconds ago"
    const timer = setInterval(() => {
      const diff = Math.floor((new Date() - lastUpdated) / 1000);
      setTimeSinceUpdate(diff < 60 ? `${diff}s` : `${Math.floor(diff / 60)}m`);
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Auto-Refresh Logic
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        loadEvents();
        fetchTickerData().then((data) => {
          if (data.length) setMarketSignals(data);
        });
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, impact, type, sortBy]);

  useEffect(() => {
    loadEvents();
  }, [impact, type, sortBy]);

  const handleCreateSource = (event) => {
    event.preventDefault();
    setSourceStatus("loading");

    let finalUrl = sourceUrl.trim();
    let finalSourceType = sourceType;

    // Twitter/X Logic
    if (activeTabSource === "twitter") {
      finalSourceType = "social_media";
      // Remove @ or # if present
      const cleanInput = finalUrl.replace(/^[@#]/, "");
      finalUrl = `https://nitter.privacydev.net/${cleanInput}/rss`;
    }

    // Google News Logic
    if (activeTabSource === "google") {
      finalSourceType = "news";
      const query = encodeURIComponent(finalUrl);
      finalUrl = `https://news.google.com/rss/search?q=${query}+when:1d&hl=pt-BR&gl=BR&ceid=BR:pt-419`;
    }

    createSource({
      url: finalUrl,
      eventType: sourceType,
      sourceType: finalSourceType,
    })
      .then(() => {
        setSourceStatus("success");
        return loadEvents();
      })
      .catch((err) => {
        setSourceError(err.message);
        setSourceStatus("error");
      });
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-300 dark:bg-gray-950 text-slate-900 dark:text-slate-200 transition-colors duration-300">
      {/* 1. LEFT SIDEBAR (Fixed) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isDark={isDark}
        toggleTheme={toggleTheme}
        language={language}
      />

      {/* 2. MAIN CONTENT AREA (Flexible) */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-200 dark:bg-slate-900 relative transition-colors duration-300">
        {/* HEADER / TICKER */}
        <header className="header shrink-0 border-b border-zinc-300 dark:border-gray-800 bg-zinc-100/90 dark:bg-gray-950/50 backdrop-blur-md z-50 px-4 h-14 flex items-center justify-between transition-colors duration-300">
          {/* Left: Ticker */}
          <div className="header-left flex items-center gap-6 overflow-hidden">
            <div className="status-bar hidden md:flex gap-6 overflow-x-auto no-scrollbar">
              {marketSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="status-card flex items-center gap-3 shrink-0"
                >
                  <div className="flex flex-col">
                    <span className="text-[9px] text-slate-600 dark:text-slate-500 font-bold tracking-wider leading-none">
                      {(signal.id || "").toString().toUpperCase()}
                    </span>
                    <span
                      className={`font-mono text-sm font-bold leading-tight ${
                        signal.trend === "up"
                          ? "text-green-700 dark:text-green-400"
                          : signal.trend === "down"
                            ? "text-red-700 dark:text-red-400"
                            : "text-slate-800 dark:text-slate-200"
                      }`}
                    >
                      {signal.title.split(": ")[1] || signal.title}
                    </span>
                  </div>
                  {/* Sparkline */}
                  {signal.data && (
                    <div className="opacity-80 hover:opacity-100 transition-opacity">
                      <Sparkline
                        data={signal.data}
                        color={
                          signal.trend === "up"
                            ? isDark
                              ? "#22c55e"
                              : "#15803d"
                            : signal.trend === "down"
                              ? isDark
                                ? "#ef4444"
                                : "#b91c1c"
                              : "#64748b"
                        }
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Right: Controls */}
          <div className="header-right flex items-center gap-4">
            <button
              onClick={toggleLanguage}
              className="bg-zinc-200 dark:bg-gray-900 border border-zinc-400 dark:border-gray-700 text-xs font-bold rounded text-slate-700 dark:text-slate-400 px-2 py-1 transition-colors hover:text-blue-600 hover:border-blue-400"
            >
              {language === "pt" ? "🇧🇷 PT" : "🇺🇸 EN"}
            </button>

            <select
              className="bg-zinc-200 dark:bg-gray-900 border border-zinc-400 dark:border-gray-700 text-xs rounded text-slate-700 dark:text-slate-400 px-2 py-1 outline-none focus:border-blue-500 transition-colors"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
            >
              <option value={0}>
                {language === "pt" ? "Auto: Off" : "Auto: Off"}
              </option>
              <option value={60000}>1m</option>
              <option value={300000}>5m</option>
            </select>

            <div className="hidden md:flex items-center text-[10px] text-slate-600 dark:text-slate-500 gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-600 dark:bg-green-500/50 animate-pulse"></span>
              <strong>{timeSinceUpdate}</strong>
            </div>

            <button
              className="bg-blue-700 hover:bg-blue-800 dark:bg-blue-600 dark:hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded transition-colors shadow-lg shadow-blue-500/20"
              onClick={() => setShowSourceModal(true)}
            >
              + Fonte
            </button>
            <button
              className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
              title="Force Refresh"
              onClick={() => {
                setStatus("loading");
                loadEvents();
                fetchTickerData().then((data) => setMarketSignals(data));
              }}
            >
              ⚡
            </button>
          </div>
        </header>

        {/* CONTENT TABS */}
        <main className="flex-1 relative overflow-hidden flex bg-zinc-200 dark:bg-slate-900 transition-colors duration-300">
          {/* TAB: MARKET OVERVIEW (Bento Grid) */}
          {activeTab === "overview" && (
            <div className="w-full h-full">
              {status === "loading" && (
                <div className="h-full flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                  <div className="text-slate-500 font-mono text-sm animate-pulse">
                    Carregando Terminal...
                  </div>
                </div>
              )}
              {status === "ready" && (
                <MarketOverview
                  events={events}
                  isDark={isDark}
                  language={language}
                  watchlist={watchlist}
                  toggleWatchlist={toggleWatchlist}
                />
              )}
            </div>
          )}

          {/* TAB: FEED (Narrative Engine) */}
          {activeTab === "feed" && (
            <div className="w-full h-full">
              <IntelligenceFeed
                isDark={isDark}
                language={language}
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
              />
            </div>
          )}

          {/* TAB: WATCHLIST (Real) */}
          {activeTab === "watchlist" && (
            <div className="w-full h-full">
              <Watchlist
                watchlist={watchlist}
                toggleWatchlist={toggleWatchlist}
                isDark={isDark}
                language={language}
              />
            </div>
          )}
        </main>
      </div>

      {/* Add Source Modal */}
      {showSourceModal && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setShowSourceModal(false)}
        >
          <div
            className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-lg shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center p-4 border-b border-slate-800">
              <h2 className="text-lg font-bold text-slate-100">
                {language === "pt" ? "Adicionar Fonte" : "Add Source"}
              </h2>
              <button
                className="text-slate-400 hover:text-white"
                onClick={() => setShowSourceModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="flex border-b border-slate-800">
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTabSource === "recommended" ? "text-blue-400 border-b-2 border-blue-500 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTabSource("recommended")}
              >
                {language === "pt" ? "⭐ Sugestões" : "⭐ Suggestions"}
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTabSource === "rss" ? "text-blue-400 border-b-2 border-blue-500 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTabSource("rss")}
              >
                🔗 RSS
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTabSource === "twitter" ? "text-blue-400 border-b-2 border-blue-500 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTabSource("twitter")}
              >
                🐦 Twitter
              </button>
              <button
                className={`flex-1 py-2 text-sm font-medium transition-colors ${activeTabSource === "google" ? "text-blue-400 border-b-2 border-blue-500 bg-slate-800/50" : "text-slate-500 hover:text-slate-300"}`}
                onClick={() => setActiveTabSource("google")}
              >
                🌍 Google
              </button>
            </div>

            <div className="p-4">
              {activeTabSource === "recommended" && (
                <div className="space-y-2">
                  {[
                    {
                      name: "InfoMoney",
                      url: "https://www.infomoney.com.br/feed/",
                      desc: language === "pt" ? "Mercados" : "Markets",
                      type: "financial",
                    },
                    {
                      name: "Valor Econômico",
                      url: "https://valor.globo.com/rss",
                      desc: "Macro",
                      type: "financial",
                    },
                    {
                      name: "G1 Economia",
                      url: "https://g1.globo.com/rss/g1/economia/",
                      desc: language === "pt" ? "Geral" : "General",
                      type: "financial",
                    },
                    {
                      name: "Banco Central",
                      url: "https://www.bcb.gov.br/rss/ultimasnoticias",
                      desc: language === "pt" ? "Oficial" : "Official",
                      type: "financial",
                    },
                  ].map((src, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center p-3 bg-slate-800/50 rounded hover:bg-slate-800 cursor-pointer transition-colors border border-transparent hover:border-slate-600"
                      onClick={() => {
                        setSourceUrl(src.url);
                        setSourceType(src.type);
                        setActiveTabSource("rss"); // Switch to input view
                      }}
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-200">
                          {src.name}
                        </div>
                        <div className="text-xs text-slate-500">{src.desc}</div>
                      </div>
                      <span className="text-blue-400 text-xs">
                        {language === "pt" ? "Selecionar →" : "Select →"}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {(activeTabSource === "rss" ||
                activeTabSource === "twitter" ||
                activeTabSource === "google") && (
                <form onSubmit={handleCreateSource}>
                  <input
                    type={activeTabSource === "rss" ? "url" : "text"}
                    className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-white mb-3 focus:border-blue-500 outline-none"
                    placeholder={
                      activeTabSource === "twitter"
                        ? language === "pt"
                          ? "Usuário (@elonmusk) ou Hashtag (#Bitcoin)"
                          : "User (@elonmusk) or Hashtag (#Bitcoin)"
                        : activeTabSource === "google"
                          ? language === "pt"
                            ? "Tópico (ex: Fusão de Empresas, Petróleo)"
                            : "Topic (e.g. M&A, Oil)"
                          : language === "pt"
                            ? "URL do Feed RSS (ex: https://site.com/rss)"
                            : "RSS Feed URL (e.g. https://site.com/rss)"
                    }
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    required
                  />

                  <div className="flex gap-2 mb-3">
                    <select
                      className="flex-1 bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-300 outline-none"
                      value={sourceType}
                      onChange={(e) => setSourceType(e.target.value)}
                    >
                      {SOURCE_TYPE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt === "financial"
                            ? language === "pt"
                              ? "Financeiro"
                              : "Financial"
                            : opt === "geopolitical"
                              ? language === "pt"
                                ? "Geopolítico"
                                : "Geopolitical"
                              : language === "pt"
                                ? "Odds/Outros"
                                : "Odds/Other"}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 rounded text-sm transition-colors"
                    disabled={sourceStatus === "loading"}
                  >
                    {sourceStatus === "loading"
                      ? language === "pt"
                        ? "Adicionando..."
                        : "Adding..."
                      : activeTabSource === "twitter"
                        ? language === "pt"
                          ? "Monitorar Twitter"
                          : "Monitor Twitter"
                        : activeTabSource === "google"
                          ? language === "pt"
                            ? "Monitorar Tópico no Google"
                            : "Monitor Google Topic"
                          : language === "pt"
                            ? "Adicionar Fonte RSS"
                            : "Add RSS Feed"}
                  </button>

                  {sourceStatus === "success" && (
                    <p className="text-green-400 text-xs mt-2 text-center">
                      {language === "pt"
                        ? "✅ Fonte adicionada com sucesso!"
                        : "✅ Source added successfully!"}
                    </p>
                  )}
                  {sourceStatus === "error" && (
                    <p className="text-red-400 text-xs mt-2 text-center">
                      ❌ {sourceError}
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
