import React, { useState, useEffect } from "react";
import { fetchNarratives } from "../api/events";
import {
  Newspaper,
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  ChevronRight,
  Loader,
  AlertTriangle,
  Star,
  RefreshCw,
} from "lucide-react";

const IntelligenceFeed = ({
  isDark,
  language,
  watchlist = [],
  toggleWatchlist,
}) => {
  const t = {
    pt: {
      activeNarratives: "Narrativas Ativas",
      newsCount: "notícias",
      decoding: "Decodificando Narrativas...",
      error: "Falha ao carregar inteligência.",
      retry: "Tentar Novamente",
      selectPrompt: "Selecione uma narrativa para visualizar a linha do tempo",
      marketConsensus: "Consenso de Mercado",
      bullish: "Otimista",
      bearish: "Pessimista",
      neutral: "Neutro",
      macro: "Macroeconomia",
      market: "Mercado & Ações",
      tech: "Tech & IA",
      crypto: "Cripto",
      commodities: "Commodities",
      highImpact: "Alto Impacto",
      news: "Notícia",
    },
    en: {
      activeNarratives: "Active Narratives",
      newsCount: "news",
      decoding: "Decoding Narratives...",
      error: "Failed to load intelligence feed.",
      retry: "Try Again",
      selectPrompt: "Select a narrative to view the timeline",
      marketConsensus: "Market Consensus",
      bullish: "Bullish",
      bearish: "Bearish",
      neutral: "Neutral",
      macro: "Macroeconomics",
      market: "Stocks & Market",
      tech: "Tech & AI",
      crypto: "Crypto",
      commodities: "Commodities",
      highImpact: "High Impact",
      news: "News",
    },
  };
  const strings = language === "pt" ? t.pt : t.en;

  const translateSentiment = (sentiment) => {
    if (!sentiment) return strings.neutral;
    if (sentiment === "Bullish") return strings.bullish;
    if (sentiment === "Bearish") return strings.bearish;
    return strings.neutral;
  };

  const translateSector = (sector) => {
    if (!sector) return "";
    const map = {
      Macro: strings.macro,
      Market: strings.market,
      Tech: strings.tech,
      Crypto: strings.crypto,
      Commodities: strings.commodities,
    };
    return map[sector] || sector;
  };

  const [narratives, setNarratives] = useState([]);
  const [selectedNarrative, setSelectedNarrative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Auto-Refresh Logic (60s)
  useEffect(() => {
    loadNarratives();
    const interval = setInterval(loadNarratives, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNarratives = async () => {
    try {
      // Don't set loading to true on background refresh if we have data
      if (narratives.length === 0) setLoading(true);

      const data = await fetchNarratives();
      setNarratives(data);
      setLastUpdated(new Date());

      // Update selected narrative if it exists (to get new events)
      if (selectedNarrative) {
        const updated = data.find((n) => n.id === selectedNarrative.id);
        if (updated) setSelectedNarrative(updated);
      }
    } catch (err) {
      console.error(err);
      if (narratives.length === 0)
        setError("Failed to load intelligence feed.");
    } finally {
      setLoading(false);
    }
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment === "Bullish") return "green";
    if (sentiment === "Bearish") return "red";
    return "gray";
  };

  const getSentimentIcon = (sentiment) => {
    if (sentiment === "Bullish")
      return <TrendingUp size={16} className="text-green-500" />;
    if (sentiment === "Bearish")
      return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-400" />;
  };

  const isSaved = (item) => {
    if (!item) return false;
    // Strict ID check to avoid matching undefined/null keys
    const itemId = item.id || item._id;
    if (!itemId) return false;

    return watchlist.some((w) => {
      const wId = w.id || w._id;
      return wId && String(wId) === String(itemId);
    });
  };

  // Helper to adapt Narrative to EventCard format for Watchlist
  const saveNarrative = (n) => {
    if (!toggleWatchlist) return;
    const adapted = {
      id: n.id,
      title: n.title,
      // Use the first event's link as the primary link for the narrative
      link: n.events[0]?.link || n.events[0]?.source?.url,
      timestamp: n.events[0]?.timestamp || new Date().toISOString(), // Use latest event
      description: `${n.event_count} ${strings.newsCount} - ${n.sector}`,
      source: { name: "Narrative Engine" },
      analytics: {
        sentiment: { label: n.overall_sentiment },
      },
      location: { country: "INTL" }, // Default
      isNarrative: true,
    };
    toggleWatchlist(adapted);
  };

  if (loading && narratives.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 text-slate-500 dark:text-slate-400">
        <Loader className="animate-spin" size={32} />
        <span className="font-mono text-sm">{strings.decoding}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 text-red-500">
        <AlertTriangle size={32} />
        <span className="font-mono text-sm">{strings.error}</span>
        <button
          onClick={loadNarratives}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
        >
          {strings.retry}
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-200 dark:bg-slate-950 transition-colors duration-300">
      {/* LEFT COLUMN: MASTER LIST */}
      <div className="w-[30%] min-w-[300px] h-full overflow-y-auto border-r border-zinc-300 dark:border-slate-800 bg-zinc-50 dark:bg-slate-900/50">
        <div className="p-4 border-b border-zinc-300 dark:border-slate-800 sticky top-0 bg-zinc-50/95 dark:bg-slate-900/95 backdrop-blur z-10 flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Newspaper size={14} /> {strings.activeNarratives}
          </h2>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-mono hidden md:block">
              {lastUpdated.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <button
              onClick={loadNarratives}
              className="text-slate-500 hover:text-blue-600 transition-colors"
            >
              <RefreshCw size={12} />
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          {narratives.map((narrative) => {
            const isSelected = selectedNarrative?.id === narrative.id;
            // Tailwind dynamic classes need full strings typically
            let borderClass = "border-l-4 border-zinc-300 dark:border-gray-700";
            if (narrative.overall_sentiment === "Bullish")
              borderClass = "border-l-4 border-green-500";
            if (narrative.overall_sentiment === "Bearish")
              borderClass = "border-l-4 border-red-500";

            return (
              <div
                key={narrative.id}
                onClick={() => setSelectedNarrative(narrative)}
                className={`
                            group cursor-pointer p-4 border-b border-zinc-200 dark:border-slate-800/50 
                            transition-all duration-200 hover:bg-zinc-100 dark:hover:bg-slate-800/50
                            ${isSelected ? "bg-zinc-200 dark:bg-slate-800" : ""}
                            ${borderClass}
                        `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                    {translateSector(narrative.sector)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    {narrative.event_count} {strings.newsCount}
                  </span>
                </div>
                <h3
                  className={`text-sm font-bold leading-tight mb-2 ${isSelected ? "text-blue-700 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}
                >
                  {language === "en"
                    ? narrative.title
                        .replace("Movimentação em", "Activity in")
                        .replace(
                          "Sem movimentação relevante em",
                          "No relevant activity in",
                        )
                        .replace("Avanços em", "Advances in")
                        .replace(
                          "Resultados Corporativos & B3 em",
                          "Earnings & B3 in",
                        )
                        .replace(
                          "Adoção Institucional & ETFs em",
                          "Institutional Adoption & ETFs in",
                        )
                        .replace(
                          "Rali do Petróleo & OPEP em",
                          "Oil Rally & OPEC in",
                        )
                        .replace(
                          "Incerteza com Juros & Fed em",
                          "Rate Uncertainty & Fed in",
                        )
                    : narrative.title}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium bg-zinc-200 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                    {getSentimentIcon(narrative.overall_sentiment)}
                    <span>
                      {translateSentiment(narrative.overall_sentiment)}
                    </span>
                  </div>
                  {isSelected && (
                    <ChevronRight size={14} className="text-blue-600" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAIL TIMELINE */}
      <div className="w-[70%] h-full overflow-y-auto bg-zinc-100 dark:bg-slate-950 p-6 relative">
        {!selectedNarrative ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <div className="w-20 h-20 border-2 border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center mb-4 border-dashed">
              <Newspaper size={32} />
            </div>
            <p className="text-lg font-light">{strings.selectPrompt}</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* HEADER */}
            <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-widest">
                  {translateSector(selectedNarrative.sector)}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {selectedNarrative.id.split("-").pop()}
                </span>
                <div className="flex-1"></div>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
                {language === "en"
                  ? selectedNarrative.title
                      .replace("Movimentação em", "Activity in")
                      .replace(
                        "Sem movimentação relevante em",
                        "No relevant activity in",
                      )
                      .replace("Avanços em", "Advances in")
                      .replace(
                        "Resultados Corporativos & B3 em",
                        "Earnings & B3 in",
                      )
                      .replace(
                        "Adoção Institucional & ETFs em",
                        "Institutional Adoption & ETFs in",
                      )
                      .replace(
                        "Rali do Petróleo & OPEP em",
                        "Oil Rally & OPEC in",
                      )
                      .replace(
                        "Incerteza com Juros & Fed em",
                        "Rate Uncertainty & Fed in",
                      )
                  : selectedNarrative.title}
              </h1>

              {/* SENTIMENT METER */}
              <div className="bg-zinc-200 dark:bg-slate-900 rounded-full h-1.5 w-full max-w-sm overflow-hidden flex">
                <div
                  className={`h-full opacity-80 ${
                    selectedNarrative.overall_sentiment === "Bullish"
                      ? "bg-green-500"
                      : selectedNarrative.overall_sentiment === "Bearish"
                        ? "bg-red-500"
                        : "bg-slate-400"
                  }`}
                  style={{ width: "100%" }}
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                {strings.marketConsensus}:{" "}
                <strong
                  className={
                    selectedNarrative.overall_sentiment === "Bullish"
                      ? "text-green-600"
                      : selectedNarrative.overall_sentiment === "Bearish"
                        ? "text-red-500"
                        : "text-slate-500"
                  }
                >
                  {translateSentiment(selectedNarrative.overall_sentiment)}
                </strong>
              </p>
            </div>

            {/* TIMELINE */}
            <div className="relative border-l-2 border-zinc-200 dark:border-slate-800 ml-3 space-y-8 pb-10">
              {selectedNarrative.events.map((event, index) => {
                const time = new Date(event.timestamp).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                });
                const date = new Date(event.timestamp).toLocaleDateString([], {
                  day: "2-digit",
                  month: "short",
                });
                const eventSentiment =
                  event.analytics?.sentiment?.label || "Neutral";

                let dotColor = "bg-slate-300 dark:bg-slate-700";
                if (eventSentiment === "Bullish") dotColor = "bg-green-500";
                if (eventSentiment === "Bearish") dotColor = "bg-red-500";

                return (
                  <div key={index} className="pl-6 relative group">
                    {/* Timeline Dot */}
                    <div
                      className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-zinc-50 dark:border-slate-950 ${dotColor} shadow-sm`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1 justify-between">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
                        <Clock size={12} />
                        <span>
                          {date} {time}
                        </span>
                      </div>

                      {/* Watchlist Star for Event */}
                      {toggleWatchlist && (
                        <button
                          onClick={() => toggleWatchlist(event)}
                          className={`opacity-0 group-hover:opacity-100 transition-opacity ${isSaved(event) ? "opacity-100 text-yellow-400" : "text-slate-300 hover:text-yellow-400"}`}
                        >
                          <Star
                            size={14}
                            fill={isSaved(event) ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>

                    <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                      <a
                        href={event.link || event.source?.url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {event.title}
                      </a>
                    </h4>

                    {event.description && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mt-1 bg-white dark:bg-slate-900/50 p-3 rounded border border-zinc-100 dark:border-slate-800/50 shadow-sm">
                        {event.description.length > 200
                          ? event.description.substring(0, 200) + "..."
                          : event.description}
                      </p>
                    )}

                    <div className="mt-2 flex gap-2">
                      {event.impact === "high" && (
                        <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 px-1.5 py-0.5 rounded font-bold uppercase">
                          High Impact
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 border border-zinc-200 dark:border-slate-700 px-1.5 py-0.5 rounded uppercase">
                        {event.source?.source_type || "News"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default IntelligenceFeed;
