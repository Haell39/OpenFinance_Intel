import { useEffect, useState } from "react";
import { createSource, fetchEvents, fetchGeoSummary } from "./api/events.js";
import { MapVisualization } from "./components/MapVisualization.jsx";
import ImpactBoard from "./components/ImpactBoard.jsx";
import EventCard from "./components/EventCard.jsx";

// Mock Data for "Analysis" / KPI Bar
const INITIAL_MARKET_SIGNALS = [
  {
    id: 1,
    title: "Carregando Mercado...",
    type: "financial",
    trend: "neutral",
  },
];

const IMPACT_OPTIONS = ["all", "high", "medium", "low"];
const TYPE_OPTIONS = ["all", "financial", "geopolitical", "odds"];
const SOURCE_TYPE_OPTIONS = ["financial", "geopolitical", "odds"];

async function fetchTickerData() {
  try {
    const res = await fetch(
      "https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL",
    );
    const data = await res.json();
    return [
      {
        id: "usd",
        title: `Dólar: R$ ${parseFloat(data.USDBRL.bid).toFixed(2)}`,
        type: "financial",
        trend: parseFloat(data.USDBRL.pctChange) > 0 ? "up" : "down",
      },
      {
        id: "eur",
        title: `Euro: R$ ${parseFloat(data.EURBRL.bid).toFixed(2)}`,
        type: "financial",
        trend: parseFloat(data.EURBRL.pctChange) > 0 ? "up" : "down",
      },
      {
        id: "btc",
        title: `Bitcoin: R$ ${(parseFloat(data.BTCBRL.bid) / 1000).toFixed(1)}k`,
        type: "financial",
        trend: parseFloat(data.BTCBRL.pctChange) > 0 ? "up" : "down",
      },
      {
        id: "selic",
        title: "Selic Meta: 11.25%",
        type: "financial",
        trend: "neutral",
      },
    ];
  } catch (e) {
    console.error("Failed to fetch ticker", e);
    return [];
  }
}

export default function App() {
  const [viewMode, setViewMode] = useState("board"); // 'board' | 'map'
  const [impact, setImpact] = useState("all");
  const [type, setType] = useState("all");
  const [selectedRegion, setSelectedRegion] = useState("all");
  const [sortBy, setSortBy] = useState("timestamp");
  const [events, setEvents] = useState([]);
  const [geoData, setGeoData] = useState({});
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

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
  const [activeTab, setActiveTab] = useState("recommended"); // recommended, rss, twitter

  const loadGeoData = () => {
    fetchGeoSummary()
      .then(setGeoData)
      .catch((err) => console.error("Failed to load geo data:", err));
  };

  const loadEvents = () => {
    setStatus("loading");
    return fetchEvents({ impact, type, region: selectedRegion })
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
    loadGeoData();
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
        loadGeoData();
        fetchTickerData().then((data) => {
          if (data.length) setMarketSignals(data);
        });
      }, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval, impact, type, selectedRegion, sortBy]);
  useEffect(() => {
    loadEvents();
  }, [impact, type, selectedRegion, sortBy]);

  const handleCreateSource = (event) => {
    event.preventDefault();
    setSourceStatus("loading");

    let finalUrl = sourceUrl.trim();
    let finalSourceType = sourceType;

    // Twitter/X Logic
    if (activeTab === "twitter") {
      finalSourceType = "social_media";
      // Remove @ or # if present
      const cleanInput = finalUrl.replace(/^[@#]/, "");
      finalUrl = `https://nitter.privacydev.net/${cleanInput}/rss`;
    }

    // Google News Logic
    if (activeTab === "google") {
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
        loadGeoData();
        return loadEvents();
      })
      .catch((err) => {
        setSourceError(err.message);
        setSourceStatus("error");
      });
  };

  return (
    <div className="page h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="header shrink-0">
        <div className="header-left">
          <div className="logo-container">
            <span className="logo-icon">👁️</span>
            <span className="brand-name">OpenFinance Intel</span>
          </div>
          <div className="status-bar hidden md:flex">
            {marketSignals.map((signal) => (
              <div key={signal.id} className="status-card">
                {signal.trend === "down"
                  ? "📉"
                  : signal.trend === "up"
                    ? "📈"
                    : "⚖️"}
                {signal.title}
              </div>
            ))}
          </div>
        </div>

        <div className="header-right flex items-center">
          {/* View Switching Toggle */}
          <div className="bg-slate-800 p-1 rounded-lg flex mr-4 border border-slate-700">
            <button
              onClick={() => setViewMode("board")}
              className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === "board" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
            >
              Analista (Board)
            </button>
            <button
              onClick={() => setViewMode("map")}
              className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === "map" ? "bg-blue-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}
            >
              Geopolítica (Mapa)
            </button>
          </div>

          <select
            className="glass-input hidden md:block"
            style={{ marginRight: 8, padding: "6px 10px" }}
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
          >
            <option value={0}>Auto: Off</option>
            <option value={60000}>1 min</option>
            <option value={300000}>5 min</option>
            <option value={600000}>10 min</option>
          </select>

          <div
            className="hidden md:flex"
            style={{
              alignItems: "center",
              marginRight: 15,
              fontSize: "12px",
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ marginRight: 5 }}>●</span>
            <strong>{timeSinceUpdate}</strong>
          </div>

          <button
            className="btn primary"
            onClick={() => setShowSourceModal(true)}
          >
            + Novo Evento
          </button>
          <button
            className="btn-icon"
            title="Force Refresh (Busca Imediata)"
            onClick={() => {
              setStatus("loading");
              loadEvents();
              loadGeoData();
              fetchTickerData().then((data) => setMarketSignals(data));
            }}
          >
            ⚡
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <main className="flex-1 relative overflow-hidden bg-slate-900">
        {/* VIEW: IMPACT BOARD */}
        {viewMode === "board" && (
          <div className="h-full w-full">
            {status === "loading" && (
              <div className="text-center p-10 text-slate-500">
                Carregando Board...
              </div>
            )}
            {status === "ready" && <ImpactBoard events={events} />}
          </div>
        )}

        {/* VIEW: GEO MAP */}
        {viewMode === "map" && (
          <div className="h-full w-full relative">
            <div className="absolute top-4 left-4 z-[500]">
              <div className="bg-slate-800/90 p-4 rounded border border-slate-700 shadow-xl backdrop-blur">
                <h3 className="font-bold text-slate-200 mb-1">
                  Filtro Geográfico
                </h3>
                <p className="text-xs text-slate-400 mb-2">
                  {selectedRegion === "all"
                    ? "Exibindo Todo o Mundo"
                    : `Filtrando por: ${selectedRegion}`}
                </p>
                {selectedRegion !== "all" && (
                  <button
                    className="btn primary w-full text-xs"
                    onClick={() => setSelectedRegion("all")}
                  >
                    Limpar Filtro
                  </button>
                )}
              </div>
            </div>

            <MapVisualization
              geoData={geoData}
              selectedRegion={selectedRegion}
              onRegionClick={(uf) =>
                setSelectedRegion(uf === selectedRegion ? "all" : uf)
              }
            />
          </div>
        )}
      </main>

      {/* Add Source Modal */}
      {showSourceModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSourceModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 style={{ margin: 0 }}>Adicionar Fonte</h2>
              <button
                className="modal-close"
                onClick={() => setShowSourceModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-tabs">
              <button
                className={`tab-btn ${activeTab === "recommended" ? "active" : ""}`}
                onClick={() => setActiveTab("recommended")}
              >
                ⭐ Sugestões
              </button>
              <button
                className={`tab-btn ${activeTab === "rss" ? "active" : ""}`}
                onClick={() => setActiveTab("rss")}
              >
                🔗 RSS
              </button>
              <button
                className={`tab-btn ${activeTab === "twitter" ? "active" : ""}`}
                onClick={() => setActiveTab("twitter")}
              >
                🐦 Twitter/X
              </button>
              <button
                className={`tab-btn ${activeTab === "google" ? "active" : ""}`}
                onClick={() => setActiveTab("google")}
              >
                🌍 Google News
              </button>
            </div>

            {activeTab === "recommended" && (
              <div className="sources-grid">
                {[
                  {
                    name: "InfoMoney",
                    url: "https://www.infomoney.com.br/feed/",
                    desc: "Mercados",
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
                    desc: "Geral",
                    type: "financial",
                  },
                  {
                    name: "Banco Central",
                    url: "https://www.bcb.gov.br/rss/ultimasnoticias",
                    desc: "Oficial",
                    type: "financial",
                  },
                ].map((src, i) => (
                  <div
                    key={i}
                    className="source-item"
                    onClick={() => {
                      setSourceUrl(src.url);
                      setSourceType(src.type);
                      setActiveTab("rss"); // Switch to input view
                    }}
                  >
                    <div className="source-name">{src.name}</div>
                    <div className="source-desc">{src.desc}</div>
                  </div>
                ))}
              </div>
            )}

            {(activeTab === "rss" ||
              activeTab === "twitter" ||
              activeTab === "google") && (
              <form onSubmit={handleCreateSource} style={{ marginTop: 16 }}>
                <input
                  type={activeTab === "rss" ? "url" : "text"}
                  className="glass-input"
                  style={{ width: "100%", marginBottom: 12 }}
                  placeholder={
                    activeTab === "twitter"
                      ? "Usuário (@elonmusk) ou Hashtag (#Bitcoin)"
                      : activeTab === "google"
                        ? "Tópico (ex: Fusão de Empresas, Petróleo)"
                        : "URL do Feed RSS (ex: https://site.com/rss)"
                  }
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  required
                />

                <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                  <select
                    className="glass-input"
                    style={{ flex: 1 }}
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                  >
                    {SOURCE_TYPE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt === "financial"
                          ? "Financeiro"
                          : opt === "geopolitical"
                            ? "Geopolítico"
                            : "Odds/Outros"}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  type="submit"
                  className="btn primary"
                  style={{ width: "100%" }}
                  disabled={sourceStatus === "loading"}
                >
                  {sourceStatus === "loading"
                    ? "Adicionando..."
                    : activeTab === "twitter"
                      ? "Monitorar Twitter"
                      : activeTab === "google"
                        ? "Monitorar Tópico no Google"
                        : "Adicionar Fonte RSS"}
                </button>

                {sourceStatus === "success" && (
                  <p
                    style={{
                      color: "var(--status-low)",
                      fontSize: 13,
                      marginTop: 8,
                    }}
                  >
                    ✅ Fonte adicionada com sucesso!
                  </p>
                )}
                {sourceStatus === "error" && (
                  <p
                    style={{
                      color: "var(--status-urgent)",
                      fontSize: 13,
                      marginTop: 8,
                    }}
                  >
                    ❌ {sourceError}
                  </p>
                )}
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
