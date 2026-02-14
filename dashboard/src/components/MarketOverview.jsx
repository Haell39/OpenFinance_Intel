import React, { useMemo } from "react";
import RiskMatrix from "./RiskMatrix";
import { Star } from "lucide-react";

const MarketOverview = ({
  events,
  isDark,
  language,
  watchlist = [],
  toggleWatchlist,
}) => {
  const t = {
    pt: {
      pulseTitle: "Pulso de Mercado IA",
      pulseText:
        "Mercados operam com cautela aguardando dados de inflação nos EUA. Setor de Energia mostra resiliência com alta do petróleo, enquanto Tech sofre leve correção. No Brasil, atenção voltada para declarações fiscais e movimento do Dólar.",
      updated: "Atualizado há",
      confidence: "Confiança IA",
      riskTitle: "Matriz de Risco & Oportunidade",
      axis: "X: Sentimento | Y: Impacto",
      topBullish: "Top Otimista",
      topBearish: "Top Pessimista",
      noBullish: "Sem sinais de alta",
      noBearish: "Sem sinais de baixa",
    },
    en: {
      pulseTitle: "AI Market Pulse",
      pulseText:
        "Markets cautious ahead of US inflation data. Energy sector shows resilience with oil rally, while Tech sees mild correction. In Brazil, eyes on fiscal statements and Dollar movement.",
      updated: "Updated",
      confidence: "AI Confidence",
      riskTitle: "Risk & Opportunity Matrix",
      axis: "X: Sentiment | Y: Impact",
      topBullish: "Top Bullish",
      topBearish: "Top Bearish",
      noBullish: "No bullish signals",
      noBearish: "No bearish signals",
    },
  };

  const strings = language === "pt" ? t.pt : t.en;

  // Logic for Widget 3: Top Signals
  const { bullish, bearish } = useMemo(() => {
    const sorted = [...events].sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp),
    );

    const bulls = sorted
      .filter((e) => e.analytics?.sentiment?.label === "Bullish")
      .slice(0, 5);
    const bears = sorted
      .filter((e) => e.analytics?.sentiment?.label === "Bearish")
      .slice(0, 5);

    return { bullish: bulls, bearish: bears };
  }, [events]);

  // Theme Helpers
  const cardClass =
    "bg-white dark:bg-gray-950 border border-zinc-200 dark:border-gray-800 rounded-lg shadow-sm transition-colors duration-300";
  const textHead = "text-slate-800 dark:text-slate-200";
  const textBody = "text-slate-600 dark:text-slate-300";

  const isSaved = (event) =>
    watchlist.some((w) => w.id === event.id || w._id === event._id);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-zinc-50 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-gray-800 transition-colors duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-7xl mx-auto">
        {/* WIDGET 1: AI MARKET PULSE (Full Width) */}
        <div className={`${cardClass} md:col-span-3 p-4`}>
          <div className="flex items-center gap-2 mb-2">
            <span className="animate-pulse text-blue-500">●</span>
            <h2
              className={`text-sm font-bold ${textHead} uppercase tracking-wider`}
            >
              {strings.pulseTitle}
            </h2>
          </div>
          <p className={`${textBody} text-sm leading-relaxed font-medium`}>
            {strings.pulseText}
            <span className="text-slate-400 dark:text-slate-500 text-xs ml-2 block mt-1 font-mono">
              {strings.updated} 2 min • {strings.confidence}: 94%
            </span>
          </p>
        </div>

        {/* WIDGET 2: RISK MATRIX (2 Cols) */}
        <div
          className={`${cardClass} md:col-span-2 p-1 flex flex-col h-[400px]`}
        >
          <div className="p-3 border-b border-zinc-100 dark:border-gray-900 flex justify-between items-center">
            <h3 className={`text-xs font-bold ${textHead} uppercase`}>
              {strings.riskTitle}
            </h3>
            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600">
              {strings.axis}
            </span>
          </div>
          <div className="flex-1 w-full overflow-hidden">
            <RiskMatrix events={events} isDark={isDark} />
          </div>
        </div>

        {/* WIDGET 3: TOP SIGNALS (1 Col) */}
        <div className="md:col-span-1 flex flex-col gap-4">
          {/* Bullish Section */}
          <div
            className={`${cardClass} flex-1 p-3 overflow-hidden flex flex-col`}
          >
            <h3 className="text-xs font-bold text-green-600 dark:text-green-500 uppercase mb-3 flex items-center gap-2">
              <span>▲</span> {strings.topBullish}
            </h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {bullish.length === 0 && (
                <span className={`text-xs ${textBody} italic`}>
                  {strings.noBullish}
                </span>
              )}
              {bullish.map((event) => (
                <div
                  key={event.id}
                  className="pl-2 border-l-2 border-green-500 dark:border-green-600 relative group"
                >
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-1 rounded">
                        SCORE: {event.impact === "high" ? "HI" : "MD"}
                      </span>
                      {toggleWatchlist && (
                        <button
                          onClick={() => toggleWatchlist(event)}
                          className={`${
                            isSaved(event)
                              ? "text-yellow-400"
                              : "text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 hover:text-yellow-400"
                          } transition-all`}
                        >
                          <Star
                            size={10}
                            fill={isSaved(event) ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  <a
                    href={event.link || event.source?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 leading-tight block line-clamp-2"
                  >
                    {event.title}
                  </a>
                </div>
              ))}
            </div>
          </div>

          {/* Bearish Section */}
          <div
            className={`${cardClass} flex-1 p-3 overflow-hidden flex flex-col`}
          >
            <h3 className="text-xs font-bold text-red-600 dark:text-red-500 uppercase mb-3 flex items-center gap-2">
              <span>▼</span> {strings.topBearish}
            </h3>
            <div className="space-y-2 overflow-y-auto pr-1 custom-scrollbar">
              {bearish.length === 0 && (
                <span className={`text-xs ${textBody} italic`}>
                  {strings.noBearish}
                </span>
              )}
              {bearish.map((event) => (
                <div
                  key={event.id}
                  className="pl-2 border-l-2 border-red-500 dark:border-red-600 relative group"
                >
                  <div className="flex justify-between items-baseline mb-0.5">
                    <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                      {new Date(event.timestamp).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-mono bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-1 rounded">
                        SCORE: {event.impact === "high" ? "HI" : "MD"}
                      </span>
                      {toggleWatchlist && (
                        <button
                          onClick={() => toggleWatchlist(event)}
                          className={`${
                            isSaved(event)
                              ? "text-yellow-400"
                              : "text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 hover:text-yellow-400"
                          } transition-all`}
                        >
                          <Star
                            size={10}
                            fill={isSaved(event) ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                  <a
                    href={event.link || event.source?.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 leading-tight block line-clamp-2"
                  >
                    {event.title}
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
