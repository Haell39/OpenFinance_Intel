import React, { useMemo } from "react";
import {
  Activity,
  Gauge,
  BarChart3,
  AlertTriangle,
  Flame,
  Snowflake,
} from "lucide-react";

/**
 * KeyMetrics — Dashboard-style KPI cards showing computed market metrics.
 * Fear & Greed Index, Event Velocity, Sector Diversity, High-Impact Rate.
 */
const KeyMetrics = ({ events, isDark, language }) => {
  const t = {
    pt: {
      title: "Indicadores Chave",
      fearGreed: "Índice Medo & Ganância",
      velocity: "Velocidade de Eventos",
      diversity: "Diversidade Setorial",
      alertRate: "Taxa de Alerta",
      extremeFear: "Medo Extremo",
      fear: "Medo",
      neutral: "Neutro",
      greed: "Ganância",
      extremeGreed: "Ganância Extrema",
      eventsPerHour: "eventos/hora",
      sectors: "setores ativos",
      highImpact: "alto impacto",
      perHour: "/hora",
    },
    en: {
      title: "Key Indicators",
      fearGreed: "Fear & Greed Index",
      velocity: "Event Velocity",
      diversity: "Sector Diversity",
      alertRate: "Alert Rate",
      extremeFear: "Extreme Fear",
      fear: "Fear",
      neutral: "Neutral",
      greed: "Greed",
      extremeGreed: "Extreme Greed",
      eventsPerHour: "events/hour",
      sectors: "active sectors",
      highImpact: "high impact",
      perHour: "/hour",
    },
  };
  const s = language === "pt" ? t.pt : t.en;

  const metrics = useMemo(() => {
    if (!events || events.length === 0) {
      return {
        fearGreed: 50,
        fearLabel: s.neutral,
        velocity: 0,
        diversity: 0,
        totalSectors: 0,
        alertRate: 0,
        highCount: 0,
      };
    }

    // 1. Fear & Greed Index (0-100, >50 = greed)
    let bullish = 0,
      bearish = 0;
    const sectors = new Set();
    let highImpact = 0;

    events.forEach((e) => {
      const label = e.analytics?.sentiment?.label;
      if (label === "Bullish") bullish++;
      if (label === "Bearish") bearish++;
      if (e.sector) sectors.add(e.sector);
      if (e.impact === "high") highImpact++;
    });

    const total = events.length;
    // FG = bullish % normalized to 0-100
    const fearGreed = total > 0 ? Math.round((bullish / total) * 100) : 50;

    let fearLabel;
    if (fearGreed <= 20) fearLabel = s.extremeFear;
    else if (fearGreed <= 40) fearLabel = s.fear;
    else if (fearGreed <= 60) fearLabel = s.neutral;
    else if (fearGreed <= 80) fearLabel = s.greed;
    else fearLabel = s.extremeGreed;

    // 2. Event velocity (events per hour in last 6h)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000);
    const recentCount = events.filter(
      (e) => new Date(e.timestamp) > sixHoursAgo,
    ).length;
    const velocity = Math.round((recentCount / 6) * 10) / 10;

    // 3. Sector diversity
    const diversity = sectors.size;

    // 4. Alert rate
    const alertRate = total > 0 ? Math.round((highImpact / total) * 100) : 0;

    return {
      fearGreed,
      fearLabel,
      velocity,
      diversity,
      totalSectors: 6,
      alertRate,
      highCount: highImpact,
    };
  }, [events, language]);

  // Fear & Greed color
  const fgColor =
    metrics.fearGreed <= 25
      ? "text-red-500"
      : metrics.fearGreed <= 45
        ? "text-orange-500"
        : metrics.fearGreed <= 55
          ? "text-slate-400"
          : metrics.fearGreed <= 75
            ? "text-lime-500"
            : "text-green-500";

  const fgBg =
    metrics.fearGreed <= 25
      ? "from-red-500 to-red-600"
      : metrics.fearGreed <= 45
        ? "from-orange-500 to-orange-600"
        : metrics.fearGreed <= 55
          ? "from-slate-400 to-slate-500"
          : metrics.fearGreed <= 75
            ? "from-lime-500 to-lime-600"
            : "from-green-500 to-green-600";

  const fgIcon =
    metrics.fearGreed <= 40
      ? Snowflake
      : metrics.fearGreed >= 60
        ? Flame
        : Gauge;
  const FGIcon = fgIcon;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <Activity size={16} className="text-blue-600 dark:text-blue-400" />
        <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
          {s.title}
        </h2>
      </div>

      {/* Fear & Greed — Hero Metric */}
      <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl p-4 mb-4">
        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">
          {s.fearGreed}
        </p>
        <div className="flex items-center gap-4">
          <div className="relative">
            <div
              className={`w-16 h-16 rounded-full bg-gradient-to-br ${fgBg} flex items-center justify-center shadow-lg`}
            >
              <span className="text-xl font-black text-white font-mono">
                {metrics.fearGreed}
              </span>
            </div>
          </div>
          <div className="flex-1">
            <p className={`text-lg font-bold ${fgColor}`}>
              {metrics.fearLabel}
            </p>
            {/* Gauge Bar */}
            <div className="mt-1 h-2 w-full bg-gradient-to-r from-red-500 via-yellow-400 via-slate-400 to-green-500 rounded-full overflow-hidden relative">
              <div
                className="absolute top-0 w-1 h-full bg-white shadow-md rounded-full border border-slate-300"
                style={{
                  left: `${metrics.fearGreed}%`,
                  transform: "translateX(-50%)",
                }}
              />
            </div>
            <div className="flex justify-between mt-0.5">
              <span className="text-[8px] text-red-500 font-mono">0</span>
              <span className="text-[8px] text-green-500 font-mono">100</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-3 gap-3 flex-1">
        {/* Velocity */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
          <BarChart3 size={18} className="text-blue-500 mb-1.5" />
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {metrics.velocity}
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-medium leading-tight mt-0.5">
            {s.eventsPerHour}
          </span>
        </div>

        {/* Diversity */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
          <Activity size={18} className="text-purple-500 mb-1.5" />
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {metrics.diversity}
            <span className="text-sm text-slate-400">
              /{metrics.totalSectors}
            </span>
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-medium leading-tight mt-0.5">
            {s.sectors}
          </span>
        </div>

        {/* Alert Rate */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-lg p-3 flex flex-col items-center justify-center text-center">
          <AlertTriangle
            size={18}
            className={`mb-1.5 ${metrics.alertRate > 30 ? "text-red-500 animate-pulse" : "text-amber-500"}`}
          />
          <span className="text-xl font-black text-slate-800 dark:text-slate-100 font-mono">
            {metrics.alertRate}%
          </span>
          <span className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-medium leading-tight mt-0.5">
            {s.highImpact}
          </span>
        </div>
      </div>
    </div>
  );
};

export default KeyMetrics;
