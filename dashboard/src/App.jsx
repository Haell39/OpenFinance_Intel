import { useEffect, useState } from "react";
import { fetchEvents } from "./api/events.js";

const IMPACT_OPTIONS = ["all", "high", "medium", "low"];
const TYPE_OPTIONS = ["all", "financial", "geopolitical"];

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

export default function App() {
  const [impact, setImpact] = useState("all");
  const [type, setType] = useState("all");
  const [events, setEvents] = useState([]);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;
    setStatus("loading");
    setError("");

    fetchEvents({ impact, type })
      .then((data) => {
        if (!isMounted) return;
        setEvents(data);
        setStatus("ready");
      })
      .catch((err) => {
        if (!isMounted) return;
        setError(err.message || "Failed to load events");
        setStatus("error");
      });

    return () => {
      isMounted = false;
    };
  }, [impact, type]);

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>SentinelWatch</h1>
          <p>Minimal UI for end-to-end event flow.</p>
        </div>
        <div className="filters">
          <label>
            Impact
            <select value={impact} onChange={(e) => setImpact(e.target.value)}>
              {IMPACT_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <label>
            Type
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      {status === "loading" && <p className="state">Loading events...</p>}
      {status === "error" && <p className="state error">{error}</p>}

      <div className="content-grid">
        <div className="events-list">
          <h2>Eventos</h2>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Evento</th>
                  <th>Tipo</th>
                  <th>Impacto</th>
                  <th>Urgência</th>
                  <th>Localização</th>
                  <th>Data/Hora</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event) => (
                  <tr key={event.id || event.title}>
                    <td>
                      <div className="title">{event.title || "-"}</div>
                      <div className="description">
                        {event.description || ""}
                      </div>
                    </td>
                    <td>
                      <span className="type-badge">{event.type || "-"}</span>
                    </td>
                    <td>
                      <span className={impactClass(event.impact)}>
                        {event.impact || "-"}
                      </span>
                    </td>
                    <td>
                      <span className={urgencyClass(event.urgency)}>
                        {event.urgency || "-"}
                      </span>
                    </td>
                    <td>
                      {event.location?.region || "-"},{" "}
                      {event.location?.country || ""}
                    </td>
                    <td className="timestamp">
                      {formatTimestamp(event.timestamp)}
                    </td>
                  </tr>
                ))}
                {status === "ready" && events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="state">
                      Nenhum evento ainda. Cadastre uma fonte na API para gerar
                      eventos.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="map-placeholder">
          <h2>Visão de Mapa</h2>
          <div className="map-box">
            <p className="placeholder-text">🗺️</p>
            <p className="placeholder-desc">
              Visualização geográfica em desenvolvimento.
              <br />
              Eventos serão exibidos no mapa do Brasil por região.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
