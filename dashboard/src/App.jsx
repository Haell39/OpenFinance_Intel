import { useEffect, useState } from "react";
import { createSource, fetchEvents, fetchGeoSummary } from "./api/events.js";
import { MapVisualization } from "./components/MapVisualization.jsx";

const IMPACT_OPTIONS = ["all", "high", "medium", "low"];
const TYPE_OPTIONS = ["all", "financial", "geopolitical", "odds"];
const SOURCE_TYPE_OPTIONS = ["financial", "geopolitical", "odds"];
const SORT_OPTIONS = ["timestamp", "urgency"];

function formatTimestamp(value) {
  if (!value) {
    return "-";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

function impactClass(impact) {
  if (impact === "high") return "impact impact-high";
  if (impact === "medium") return "impact impact-medium";
  if (impact === "low") return "impact impact-low";
  return "impact";
}

function urgencyClass(urgency) {
  if (urgency === "urgent") return "urgency urgency-high";
  return "urgency urgency-normal";
}

function urgencyScore(event) {
  // Scoring for sorting: urgent events get higher score
  let score = 0;
  if (event.urgency === "urgent") score += 1000;
  if (event.impact === "high") score += 100;
  if (event.impact === "medium") score += 50;
  return score;
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
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceType, setSourceType] = useState("financial");
  const [sourceStatus, setSourceStatus] = useState("idle");
  const [sourceError, setSourceError] = useState("");
  const [showSourceModal, setShowSourceModal] = useState(false);

  const loadGeoData = () => {
    fetchGeoSummary()
      .then((data) => {
        setGeoData(data);
      })
      .catch((err) => {
        console.error("Failed to load geo data:", err);
      });
  };

  const loadEvents = () => {
    setStatus("loading");
    setError("");

    return fetchEvents({ impact, type, region: selectedRegion })
      .then((data) => {
        // Apply sorting
        if (sortBy === "urgency") {
          data.sort((a, b) => urgencyScore(b) - urgencyScore(a));
        } else if (sortBy === "timestamp") {
          data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        }
        setEvents(data);
        setStatus("ready");
      })
      .catch((err) => {
        setError(err.message || "Failed to load events");
        setStatus("error");
      });
  };

  // Load initial geo data on mount
  useEffect(() => {
    loadGeoData();
  }, []);

  // Load events when filters/sort change
  useEffect(() => {
    loadEvents();
  }, [impact, type, selectedRegion, sortBy]);

  const handleCreateSource = (event) => {
    event.preventDefault();
    setSourceStatus("loading");
    setSourceError("");

    createSource({ url: sourceUrl.trim(), eventType: sourceType })
      .then(() => {
        setSourceStatus("success");
        // Reload both events and geo data
        loadGeoData();
        return loadEvents();
      })
      .catch((err) => {
        setSourceError(err.message || "Failed to create source");
        setSourceStatus("error");
      });
  };

  const handleRegionClick = (region) => {
    setSelectedRegion(region === selectedRegion ? "all" : region);
  };

  return (
    <div className="page">
      <header className="header">
        <div className="header-left">
          <div className="logo">🔍</div>
          <h1>SentinelWatch</h1>
        </div>
        <div className="header-center">
          <input
            type="text"
            className="search-input"
            placeholder="Buscar eventos..."
          />
        </div>
        <div className="header-right">
          <select
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            className="filter-select"
          >
            {IMPACT_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Impact: {option}
              </option>
            ))}
          </select>
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
            className="filter-select"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                Type: {option}
              </option>
            ))}
          </select>
          <button className="filter-btn">⚙️ Filters</button>
          <button
            className="filter-btn add-source-btn"
            onClick={() => setShowSourceModal(true)}
          >
            ➕ Fonte
          </button>
        </div>
      </header>

      {status === "loading" && <p className="state">Carregando eventos...</p>}
      {status === "error" && <p className="state error">{error}</p>}

      <div
        className={`main-container ${selectedRegion !== "all" ? "sidebar-open" : ""}`}
      >
        <div className="map-section-fullscreen">
          <div className="map-overlay-controls">
            <h2>🗺️ Brasil - Eventos por Estado</h2>
            <p className="map-hint">Clique em um estado para ver eventos</p>
          </div>
          <MapVisualization
            geoData={geoData}
            selectedRegion={selectedRegion}
            onRegionClick={handleRegionClick}
          />
        </div>

        {selectedRegion !== "all" && (
          <div className="events-sidebar">
            <div className="sidebar-header">
              <div>
                <h2>Eventos em {selectedRegion}</h2>
                <span className="events-count-badge">
                  {events.length} evento{events.length !== 1 ? "s" : ""}
                </span>
              </div>
              <button
                className="close-sidebar-btn"
                onClick={() => setSelectedRegion("all")}
                title="Fechar sidebar"
              >
                ✕
              </button>
            </div>
            <div className="events-scroll">
              {events.map((event) => (
                <div
                  className={`event-card ${impactClass(event.impact)}`}
                  key={event.id || event.title}
                >
                  <div className="event-card-header">
                    <span className={impactClass(event.impact)}>
                      {event.impact || "-"}
                    </span>
                    <span className={urgencyClass(event.urgency)}>
                      {event.urgency || "-"}
                    </span>
                    <span className="type-badge">{event.type || "-"}</span>
                  </div>
                  <div className="event-card-body">
                    <h3 className="event-title">{event.title || "-"}</h3>
                    <p className="event-description">
                      {event.description || ""}
                    </p>
                    {event.keywords?.length ? (
                      <div className="keywords">
                        {event.keywords.map((keyword) => (
                          <span className="keyword" key={keyword}>
                            {keyword}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {event.entities?.locations?.length ? (
                      <div className="entities">
                        <span className="entity-label">📍 </span>
                        {event.entities.locations.map((loc) => (
                          <span className="entity" key={loc}>
                            {loc}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    <div className="event-meta">
                      <span className="event-timestamp">
                        🕐 {formatTimestamp(event.timestamp)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
              {status === "ready" && events.length === 0 && (
                <div className="empty-state">
                  <p>📭</p>
                  <p>Nenhum evento em {selectedRegion}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {showSourceModal && (
        <div
          className="modal-overlay"
          onClick={() => setShowSourceModal(false)}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Cadastrar Fonte de Dados</h2>
              <button
                className="modal-close"
                onClick={() => setShowSourceModal(false)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              <div className="sources-grid">
                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl("https://feeds.reuters.com/finance/markets");
                    setSourceType("geopolitical");
                  }}
                >
                  <div className="source-number">1️⃣</div>
                  <div className="source-name">Reuters</div>
                  <div className="source-desc">Mercados e geopolítica</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl(
                      "https://www.bloomberg.com/feed/podcast/etf-report.xml",
                    );
                    setSourceType("financial");
                  }}
                >
                  <div className="source-number">2️⃣</div>
                  <div className="source-name">Bloomberg</div>
                  <div className="source-desc">Macro e política monetária</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl("https://feeds.ft.com/markets");
                    setSourceType("financial");
                  }}
                >
                  <div className="source-number">3️⃣</div>
                  <div className="source-name">Financial Times</div>
                  <div className="source-desc">Economia global</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl(
                      "https://www.economist.com/international/rss.xml",
                    );
                    setSourceType("geopolitical");
                  }}
                >
                  <div className="source-number">4️⃣</div>
                  <div className="source-name">The Economist</div>
                  <div className="source-desc">Geopolítica global</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl("https://feeds.cnbc.com/cnbc/financials/");
                    setSourceType("financial");
                  }}
                >
                  <div className="source-number">5️⃣</div>
                  <div className="source-name">CNBC</div>
                  <div className="source-desc">Mercados financeiros</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl("https://www.infomoney.com.br/feed/");
                    setSourceType("financial");
                  }}
                >
                  <div className="source-number">6️⃣</div>
                  <div className="source-name">InfoMoney</div>
                  <div className="source-desc">Mercado Brasil</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl("https://www.valor.com.br/feed");
                    setSourceType("financial");
                  }}
                >
                  <div className="source-number">7️⃣</div>
                  <div className="source-name">Valor Econômico</div>
                  <div className="source-desc">Macro e empresas</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl("https://www.bcb.gov.br/feed");
                    setSourceType("financial");
                  }}
                >
                  <div className="source-number">8️⃣</div>
                  <div className="source-name">Banco Central</div>
                  <div className="source-desc">Juros e política</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl("https://www.imf.org/rss/feed.xml");
                    setSourceType("geopolitical");
                  }}
                >
                  <div className="source-number">9️⃣</div>
                  <div className="source-name">IMF</div>
                  <div className="source-desc">Crises globais</div>
                </div>

                <div
                  className="source-item"
                  onClick={() => {
                    setSourceUrl(
                      "https://api.twitter.com/2/tweets/search/stream",
                    );
                    setSourceType("financial");
                  }}
                >
                  <div className="source-number">🔟</div>
                  <div className="source-name">Reuters Twitter</div>
                  <div className="source-desc">Early signals</div>
                </div>
              </div>

              <div className="custom-source">
                <h3>Ou cadastre um feed RSS customizado:</h3>
                <form
                  onSubmit={handleCreateSource}
                  className="source-form-custom"
                >
                  <input
                    type="url"
                    className="text-input"
                    value={sourceUrl}
                    onChange={(e) => setSourceUrl(e.target.value)}
                    placeholder="https://exemplo.com/feed.xml"
                    required
                  />
                  <select
                    value={sourceType}
                    onChange={(e) => setSourceType(e.target.value)}
                    className="type-select"
                  >
                    {SOURCE_TYPE_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                  <button type="submit" className="primary-button">
                    {sourceStatus === "loading"
                      ? "Cadastrando..."
                      : "Cadastrar"}
                  </button>
                  {sourceStatus === "success" && (
                    <span style={{ color: "#10b981" }}>
                      ✅ Fonte adicionada!
                    </span>
                  )}
                  {sourceStatus === "error" && (
                    <span style={{ color: "#ef4444" }}>❌ {sourceError}</span>
                  )}
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
