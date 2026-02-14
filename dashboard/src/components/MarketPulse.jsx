import React from "react";

const MarketPulse = ({ events }) => {
  // 1. Calculate Sector Sentiment
  const sectorStats = events.reduce((acc, event) => {
    const sector = event.sector || "Global";
    if (!acc[sector]) acc[sector] = { total: 0, bullish: 0, bearish: 0 };

    acc[sector].total++;
    const sentiment = event.analytics?.sentiment?.label;
    if (sentiment === "Bullish") acc[sector].bullish++;
    if (sentiment === "Bearish") acc[sector].bearish++;

    return acc;
  }, {});

  // 2. Calculate Global Pulse
  const totalVolume = events.length;
  const highImpact = events.filter(
    (e) => e.impact === "high" || e.urgency === "urgent",
  ).length;

  return (
    <div className="h-full bg-slate-900 border-l border-slate-700/50 p-4 w-72 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
      {/* HEADER */}
      <div>
        <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest border-b border-slate-700 pb-2 mb-4">
          Market Pulse ⚡
        </h2>

        <div className="grid grid-cols-2 gap-2 mb-2">
          <div className="bg-slate-800 p-2 rounded text-center">
            <span className="block text-xl font-mono text-blue-400">
              {totalVolume}
            </span>
            <span className="text-[10px] text-slate-500 uppercase">
              Vol. Total
            </span>
          </div>
          <div className="bg-slate-800 p-2 rounded text-center">
            <span className="block text-xl font-mono text-red-500 animate-pulse">
              {highImpact}
            </span>
            <span className="text-[10px] text-slate-500 uppercase">
              Alerta Max
            </span>
          </div>
        </div>
      </div>

      {/* SECTOR SENTIMENT */}
      <div className="flex-1">
        <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-wide">
          IA Summary (Por Setor)
        </h3>

        <div className="space-y-4">
          {Object.entries(sectorStats).map(([sector, stats]) => {
            const bullishPct = (stats.bullish / stats.total) * 100;
            const bearishPct = (stats.bearish / stats.total) * 100;
            const neutralPct = 100 - bullishPct - bearishPct;

            return (
              <div key={sector} className="group">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-slate-300 font-medium">{sector}</span>
                  <span className="text-slate-500">{stats.total} News</span>
                </div>

                {/* Progress Bar Container */}
                <div className="h-2 w-full bg-slate-800 flex overflow-hidden">
                  <div
                    style={{ width: `${bullishPct}%` }}
                    className="bg-green-500/80 h-full transition-all duration-500"
                    title={`Bullish: ${Math.round(bullishPct)}%`}
                  />
                  <div
                    style={{ width: `${neutralPct}%` }}
                    className="bg-slate-600/30 h-full transition-all duration-500"
                  />
                  <div
                    style={{ width: `${bearishPct}%` }}
                    className="bg-red-500/80 h-full transition-all duration-500"
                    title={`Bearish: ${Math.round(bearishPct)}%`}
                  />
                </div>

                {/* Micro Label */}
                <div className="flex justify-between text-[9px] text-slate-600 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="text-green-700">
                    {Math.round(bullishPct)}% Bull
                  </span>
                  <span className="text-red-700">
                    {Math.round(bearishPct)}% Bear
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default MarketPulse;
