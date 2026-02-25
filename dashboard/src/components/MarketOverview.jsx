import React, { useMemo } from "react";
import OpportunityRadar from "./OpportunityRadar";
import KeyMetrics from "./KeyMetrics";
import { Star, Zap, TrendingUp, TrendingDown, Minus } from "lucide-react";

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
      topBullish: "Top Bullish",
      topBearish: "Top Bearish",
      noBullish: "No bullish signals",
      noBearish: "No bearish signals",
    },
  };

  const strings = language === "pt" ? t.pt : t.en;

  // --- Top Signals: top 5 highest-impact events sorted by score desc ---
  const topSignals = useMemo(() => {
    return [...events]
      .filter((e) => e.analytics?.score != null)
      .sort((a, b) => (b.analytics?.score ?? 0) - (a.analytics?.score ?? 0))
      .slice(0, 5);
  }, [events]);

  // --- Sector Heatmap: avg sentiment polarity per sector ---
  const SECTORS = [
    "Macro",
    "Market",
    "Crypto",
    "Tech",
    "Commodities",
    "Social",
  ];
  const SECTOR_ICONS = {
    Macro: "\uD83C\uDFDB\uFE0F",
    Market: "\uD83D\uDCC8",
    Crypto: "\u20BF",
    Tech: "\uD83D\uDCBB",
    Commodities: "\uD83D\uDEE2\uFE0F",
    Social: "\uD83C\uDF10",
  };

  const sectorData = useMemo(() => {
    return SECTORS.map((sector) => {
      const sectorEvents = events.filter((e) => e.sector === sector);
      if (sectorEvents.length === 0)
        return { sector, polarity: 0, count: 0, label: "neutral" };
      const avg =
        sectorEvents.reduce(
          (sum, e) => sum + (e.analytics?.sentiment?.polarity ?? 0),
          0,
        ) / sectorEvents.length;
      const label = avg > 0.08 ? "bull" : avg < -0.08 ? "risk" : "neutral";
      return { sector, polarity: avg, count: sectorEvents.length, label };
    });
  }, [events]);

  // Logic for Widget 3: Top Signals (bullish/bearish lists)
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
    "bg-zinc-50 dark:bg-gray-950 border border-zinc-300 dark:border-gray-800 rounded-lg shadow-sm transition-colors duration-300";
  const textHead = "text-slate-800 dark:text-slate-200";
  const textBody = "text-slate-600 dark:text-slate-300";

  const isSaved = (event) =>
    watchlist.some((w) => w.id === event.id || w._id === event._id);

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-zinc-200 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-gray-800 transition-colors duration-300">
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

        {/* ─── LEFT COLUMN: Widget 2 + Radar ─── */}
        <div className="md:col-span-2 flex flex-col gap-4">
          {/* WIDGET 2: TOP SINAIS AGORA + MAPA DE CALOR */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card A: Top Sinais Agora */}
            <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-amber-500" />
                <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {language === "pt" ? "Top Sinais Agora" : "Top Signals Now"}
                </h2>
              </div>

              {topSignals.length === 0 ? (
                <p className="text-xs text-slate-400 italic mt-2">
                  {language === "pt"
                    ? "Aguardando eventos..."
                    : "Waiting for events..."}
                </p>
              ) : (
                <div className="flex flex-col gap-3">
                  {topSignals.map((event, idx) => {
                    const score = event.analytics?.score ?? 0;
                    const pct = Math.min(Math.round((score / 10) * 100), 100);
                    const sentiment =
                      event.analytics?.sentiment?.label ?? "Neutral";
                    const isHigh = event.impact === "high";
                    const isBull = sentiment === "Bullish";
                    const isBear = sentiment === "Bearish";

                    const badgeColor = isBull
                      ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700"
                      : isBear
                        ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-300 dark:border-red-700"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500 border-zinc-300 dark:border-zinc-600";

                    const barColor = isBull
                      ? "bg-emerald-500"
                      : isBear
                        ? "bg-red-500"
                        : "bg-zinc-400";
                    const SentIcon = isBull
                      ? TrendingUp
                      : isBear
                        ? TrendingDown
                        : Minus;

                    return (
                      <div
                        key={event.id || idx}
                        className="flex flex-col gap-1"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border flex items-center gap-1 ${badgeColor}`}
                          >
                            <SentIcon size={9} />
                            {isHigh
                              ? language === "pt"
                                ? "ALTO"
                                : "HIGH"
                              : language === "pt"
                                ? "MÉDIO"
                                : "MED"}
                            {" · "}
                            {event.sector}
                          </span>
                          <span className="text-[10px] font-bold tabular-nums text-slate-500 dark:text-slate-400">
                            {pct}%
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-2 leading-snug">
                          {event.title}
                        </p>
                        <div className="h-1 bg-zinc-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full ${barColor} rounded-full`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card B: Mapa de Calor Setorial */}
            <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-xl p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🗺️</span>
                <h2 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  {language === "pt" ? "Mapa de Calor" : "Sector Heatmap"}
                </h2>
              </div>

              <div className="grid grid-cols-2 gap-2 flex-1">
                {sectorData.map(({ sector, polarity, count, label }) => {
                  const isBull = label === "bull";
                  const isRisk = label === "risk";

                  const tileClass = isBull
                    ? "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-300 dark:border-emerald-700"
                    : isRisk
                      ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700"
                      : "bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700";

                  const scoreColor = isBull
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isRisk
                      ? "text-red-600 dark:text-red-400"
                      : "text-zinc-500 dark:text-zinc-400";

                  const labelText = isBull
                    ? language === "pt"
                      ? "ALTA"
                      : "BULL"
                    : isRisk
                      ? language === "pt"
                        ? "RISCO"
                        : "RISK"
                      : language === "pt"
                        ? "NEUTRO"
                        : "NEUTRAL";

                  return (
                    <div
                      key={sector}
                      className={`rounded-lg border p-2.5 flex flex-col gap-0.5 transition-all hover:scale-[1.02] ${tileClass}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm">{SECTOR_ICONS[sector]}</span>
                        <span
                          className={`text-[9px] font-bold uppercase ${scoreColor}`}
                        >
                          {labelText}
                        </span>
                      </div>
                      <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {sector}
                      </span>
                      <span
                        className={`text-[10px] font-mono font-bold tabular-nums ${scoreColor}`}
                      >
                        {polarity >= 0 ? "+" : ""}
                        {polarity.toFixed(2)}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {count} {language === "pt" ? "eventos" : "events"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* RADAR DE OPORTUNIDADES */}
          <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-lg p-4 shadow-sm min-h-[300px]">
            <OpportunityRadar
              events={events}
              isDark={isDark}
              language={language}
            />
          </div>
        </div>

        {/* ─── RIGHT COLUMN: Bullish/Bearish + Key Metrics ─── */}
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

          {/* Key Metrics */}
          <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-lg p-4 shadow-sm min-h-[300px]">
            <KeyMetrics events={events} isDark={isDark} language={language} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketOverview;
