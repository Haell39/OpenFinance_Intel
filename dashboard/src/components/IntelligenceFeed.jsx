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
} from "lucide-react";

const IntelligenceFeed = ({ isDark }) => {
  const [narratives, setNarratives] = useState([]);
  const [selectedNarrative, setSelectedNarrative] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadNarratives();
  }, []);

  const loadNarratives = async () => {
    try {
      setLoading(true);
      const data = await fetchNarratives();
      setNarratives(data);
      if (data.length > 0) {
        // Optional: Auto-select first one on load?
        // Let's keep it empty state as requested by user.
      }
    } catch (err) {
      setError("Failed to load intelligence feed.");
      console.error(err);
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

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 text-slate-500 dark:text-slate-400">
        <Loader className="animate-spin" size={32} />
        <span className="font-mono text-sm">Decodificando Narrativas...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center space-y-4 text-red-500">
        <AlertTriangle size={32} />
        <span className="font-mono text-sm">{error}</span>
        <button
          onClick={loadNarratives}
          className="px-4 py-2 bg-slate-200 dark:bg-slate-800 rounded hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors text-xs font-bold"
        >
          Tentar Novamente
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-zinc-50 dark:bg-slate-950 transition-colors duration-300">
      {/* LEFT COLUMN: MASTER LIST */}
      <div className="w-[30%] min-w-[300px] h-full overflow-y-auto border-r border-zinc-200 dark:border-slate-800 bg-white dark:bg-slate-900/50">
        <div className="p-4 border-b border-zinc-200 dark:border-slate-800 sticky top-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur z-10">
          <h2 className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Newspaper size={14} /> Narrativas Ativas
          </h2>
        </div>

        <div className="flex flex-col">
          {narratives.map((narrative) => {
            const isSelected = selectedNarrative?.id === narrative.id;
            const sentimentColor = getSentimentColor(
              narrative.overall_sentiment,
            );

            // Tailwind dynamic classes need full strings typically, but standard colors work fine in interpolation for simple cases or use style.
            // Using border classes explicitly for safety
            let borderClass = "border-l-4 border-gray-300 dark:border-gray-700";
            if (narrative.overall_sentiment === "Bullish")
              borderClass = "border-l-4 border-green-500";
            if (narrative.overall_sentiment === "Bearish")
              borderClass = "border-l-4 border-red-500";

            return (
              <div
                key={narrative.id}
                onClick={() => setSelectedNarrative(narrative)}
                className={`
                            group cursor-pointer p-4 border-b border-zinc-100 dark:border-slate-800/50 
                            transition-all duration-200 hover:bg-zinc-50 dark:hover:bg-slate-800/50
                            ${isSelected ? "bg-zinc-100 dark:bg-slate-800" : ""}
                            ${borderClass}
                        `}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                    {narrative.sector}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {narrative.event_count} news
                  </span>
                </div>
                <h3
                  className={`text-sm font-bold leading-tight mb-2 ${isSelected ? "text-blue-600 dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}
                >
                  {narrative.title}
                </h3>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium bg-zinc-100 dark:bg-slate-900 px-2 py-0.5 rounded-full">
                    {getSentimentIcon(narrative.overall_sentiment)}
                    <span>{narrative.overall_sentiment}</span>
                  </div>
                  {isSelected && (
                    <ChevronRight size={14} className="text-blue-500" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* RIGHT COLUMN: DETAIL TIMELINE */}
      <div className="w-[70%] h-full overflow-y-auto bg-zinc-50 dark:bg-slate-950 p-6 relative">
        {!selectedNarrative ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
            <div className="w-20 h-20 border-2 border-slate-300 dark:border-slate-700 rounded-full flex items-center justify-center mb-4 border-dashed">
              <Newspaper size={32} />
            </div>
            <p className="text-lg font-light">
              Selecione uma narrativa para visualizar a linha do tempo
            </p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {/* HEADER */}
            <div className="mb-8 pb-6 border-b border-zinc-200 dark:border-slate-800">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 uppercase tracking-widest">
                  {selectedNarrative.sector}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  ID: {selectedNarrative.id.split("-").pop()}
                </span>
              </div>
              <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 mb-4 tracking-tight">
                {selectedNarrative.title}
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
                  style={{ width: "100%" }} // Simple full bar for MVP, could use logic for intensity
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 font-mono">
                Consenso de Mercado:{" "}
                <strong
                  className={
                    selectedNarrative.overall_sentiment === "Bullish"
                      ? "text-green-600"
                      : selectedNarrative.overall_sentiment === "Bearish"
                        ? "text-red-500"
                        : "text-slate-500"
                  }
                >
                  {selectedNarrative.overall_sentiment}
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
                  <div key={index} className="pl-6 relative">
                    {/* Timeline Dot */}
                    <div
                      className={`absolute -left-[9px] top-1.5 w-4 h-4 rounded-full border-4 border-zinc-50 dark:border-slate-950 ${dotColor} shadow-sm`}
                    />

                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                      <div className="flex items-center gap-2 text-xs font-mono text-slate-400 shrink-0">
                        <Clock size={12} />
                        <span>
                          {date} {time}
                        </span>
                      </div>
                      <h4 className="text-base font-semibold text-slate-700 dark:text-slate-200 leading-snug">
                        {event.title}
                      </h4>
                    </div>

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
