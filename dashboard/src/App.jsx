import { useEffect, useState } from "react";
import { createSource, fetchEvents, fetchGeoSummary } from "./api/events.js";
import { MapVisualization } from "./components/MapVisualization.jsx";

// Mock Data for "Analysis" / KPI Bar
// Initial Mock Data (replaced by API)
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

function formatTimestamp(value) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  // Format: "dd/mm HH:MM"
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");

  return `${day}/${month} ${hours}:${minutes}`;
}

function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;
  return formatTimestamp(value);
}

function impactClass(impact) {
  if (impact === "high") return "impact-high";
  if (impact === "medium") return "impact-medium";
  if (impact === "low") return "impact-low";
  return "";
}

function getEventLink(event) {
  if (event?.link) return event.link;
  if (event?.source?.url) return event.source.url;
  return null;
}

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
    <div className="page">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo-container">
            <span className="logo-icon">👁️</span>
            <span className="brand-name">OpenFinance Intel</span>
          </div>
          <div className="status-bar">
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

        <div className="header-right">
          <select
            className="glass-input"
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
            style={{
              display: "flex",
              alignItems: "center",
              marginRight: 15,
              fontSize: "12px",
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ marginRight: 5 }}>●</span>
            Atualizado há: <strong>{timeSinceUpdate}</strong>
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
              // In a real app, this might trigger a backend scrape job too.
              // For now, it reloads data fresh from DB and Ticker.
              loadEvents();
              loadGeoData();
              fetchTickerData().then((data) => setMarketSignals(data));
            }}
          >
            ⚡
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="main-container">
        {/* Left Panel: Event Stream */}
        <div className="event-stream">
          <div className="stream-header">
            <div className="stream-controls">
              <select
                className="glass-input"
                value={impact}
                onChange={(e) => setImpact(e.target.value)}
              >
                <option value="all">Impacto: Todos</option>
                <option value="high">Alto</option>
                <option value="medium">Médio</option>
                <option value="low">Baixo</option>
              </select>
              <select
                className="glass-input"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="all">Tipo: Todos</option>
                <option value="financial">Financeiro</option>
                <option value="geopolitical">Geopolítico</option>
                <option value="odds">Odds</option>
              </select>
            </div>
            <div className="stream-controls">
              <button
                className={`btn ${sortBy === "timestamp" ? "primary" : ""}`}
                onClick={() => setSortBy("timestamp")}
              >
                Recentes
              </button>
              <button
                className={`btn ${sortBy === "urgency" ? "primary" : ""}`}
                onClick={() => setSortBy("urgency")}
              >
                Urgentes
              </button>
            </div>
          </div>

          <div className="stream-scroll">
            {status === "loading" && (
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                  color: "var(--text-secondary)",
                }}
              >
                Carregando...
              </div>
            )}
            {status === "error" && (
              <div
                style={{
                  textAlign: "center",
                  padding: 20,
                  color: "var(--status-urgent)",
                }}
              >
                {error}
              </div>
            )}

            {status === "ready" && events.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--text-tertiary)",
                }}
              >
                📭 Nenhum evento encontrado
              </div>
            )}

            {events.map((event) => (
              <div
                key={event.id || Math.random()}
                className={`event-card ${impactClass(event.impact)}`}
              >
                <div className="card-header">
                  <div className="badges">
                    {event.urgency === "urgent" && (
                      <span className="badge urgent">URGENTE</span>
                    )}
                    {event.impact && (
                      <span className={`badge impact-${event.impact}`}>
                        {event.impact}
                      </span>
                    )}
                    <span className="badge normal">{event.type}</span>
                  </div>
                  <span className="time-ago">{timeAgo(event.timestamp)}</span>
                </div>

                <h3 className="card-title">{event.title}</h3>
                {event.description && (
                  <p className="card-desc">{event.description}</p>
                )}

                <div className="card-footer">
                  <div className="badges">
                    {event.location?.country !== "GLOBAL" && (
                      <span className="badge normal">
                        📍 {event.location?.country}
                      </span>
                    )}
                    {event.location?.country === "GLOBAL" && (
                      <span className="badge normal">🌍 Global</span>
                    )}
                  </div>

                  {getEventLink(event) && (
                    <a
                      href={getEventLink(event)}
                      target="_blank"
                      rel="noreferrer"
                      className="btn"
                      style={{ fontSize: "11px", padding: "4px 8px" }}
                    >
                      Ler Fonte ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel: Map */}
        <div className="map-view">
          <div className="map-overlay">
            <div className="overlay-card">
              <h3>Filtro Geográfico</h3>
              <p style={{ fontSize: "13px", margin: 0 }}>
                {selectedRegion === "all"
                  ? "Exibindo Todo o Mundo"
                  : `Filtrando por: ${selectedRegion}`}
              </p>
              {selectedRegion !== "all" && (
                <button
                  className="btn primary"
                  style={{ marginTop: 8, width: "100%" }}
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
      </div>

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
