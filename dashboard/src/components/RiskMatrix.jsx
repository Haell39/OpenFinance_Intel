import React from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";

const RiskMatrix = ({ events, isDark }) => {
  // Filter valid events with sentiment and score
  const data = events
    .filter((e) => e.analytics?.sentiment && e.analytics?.score !== undefined)
    .map((e) => ({
      x: e.analytics.sentiment.polarity || 0, // Sentiment (-1 to 1)
      y: e.analytics.score || 0, // Impact (0 to 10)
      title: e.title,
      sector: e.sector,
      sentiment: e.analytics.sentiment.label,
    }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-slate-800 border border-zinc-200 dark:border-slate-600 p-2 rounded shadow-xl text-xs z-50">
          <p className="font-bold text-slate-800 dark:text-slate-200 mb-1">
            {data.title}
          </p>
          <p className="text-slate-600 dark:text-slate-400">
            {data.sector} •{" "}
            <span
              className={
                data.sentiment === "Bullish"
                  ? "text-green-600 dark:text-green-400"
                  : data.sentiment === "Bearish"
                    ? "text-red-600 dark:text-red-400"
                    : "text-slate-500 dark:text-slate-400"
              }
            >
              {data.sentiment}
            </span>
          </p>
          <p className="text-slate-500 mt-1">
            Vol: {data.x.toFixed(2)} | Imp: {data.y}
          </p>
        </div>
      );
    }
    return null;
  };

  const gridColor = isDark ? "#334155" : "#e2e8f0"; // slate-700 vs slate-200
  const axisStroke = isDark ? "#475569" : "#94a3b8"; // slate-600 vs slate-400
  const tickFill = isDark ? "#94a3b8" : "#64748b"; // slate-400 vs slate-500

  return (
    <div className="h-full w-full bg-zinc-50 dark:bg-slate-900/50 rounded-lg p-2 border border-zinc-200 dark:border-slate-700/50 flex flex-col transition-colors duration-300">
      <h3 className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
        🎯 Matriz de Risco (Risco vs Retorno)
      </h3>
      <div className="flex-1 w-full min-h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: -20 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={gridColor}
              opacity={0.5}
            />
            <XAxis
              type="number"
              dataKey="x"
              name="Sentiment"
              domain={[-1, 1]}
              tick={{ fontSize: 10, fill: tickFill }}
              stroke={axisStroke}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="Impact"
              domain={[0, 10]}
              tick={{ fontSize: 10, fill: tickFill }}
              stroke={axisStroke}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ strokeDasharray: "3 3" }}
            />

            {/* Quadrant Lines */}
            <ReferenceLine x={0} stroke={axisStroke} strokeOpacity={0.5} />
            <ReferenceLine y={5} stroke={axisStroke} strokeOpacity={0.5} />

            <Scatter name="Events" data={data} fill="#8884d8">
              {data.map((entry, index) => {
                let color = isDark ? "#94a3b8" : "#cbd5e1"; // Neutral

                // High Impact Rules
                if (entry.y >= 5) {
                  if (entry.x <= -0.1)
                    color = isDark ? "#ef4444" : "#dc2626"; // Red
                  else if (entry.x >= 0.1)
                    color = isDark ? "#22c55e" : "#16a34a"; // Green
                }

                return <Cell key={`cell-${index}`} fill={color} />;
              })}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default RiskMatrix;
