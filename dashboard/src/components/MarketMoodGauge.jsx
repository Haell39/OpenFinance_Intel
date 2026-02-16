import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

const MarketMoodGauge = ({ isDark, language }) => {
  const t = {
    pt: {
      title: "Sentimento do Mercado",
      bearish: "Pessimista",
      neutral: "Neutro",
      bullish: "Otimista",
      greedLevel: "Nível de Ganância",
      status: "OTIMISTA",
    },
    en: {
      title: "Market Sentiment",
      bearish: "Bearish",
      neutral: "Neutral",
      bullish: "Bullish",
      greedLevel: "Greed Level",
      status: "BULLISH",
    },
  };
  const strings = language === "pt" ? t.pt : t.en;

  const data = [
    { name: strings.bearish, value: 33, color: "#ef4444" }, // Red
    { name: strings.neutral, value: 33, color: "#52525b" }, // Zinc-600
    { name: strings.bullish, value: 33, color: "#22c55e" }, // Green
  ];

  // needle value (mocked for now, can be dynamic later)
  const needleValue = 75; // 0-100 range, 75 is bullish

  return (
    <div className="flex flex-col items-center justify-center h-full relative">
      <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 absolute top-2 left-3">
        {strings.title}
      </h3>

      <div className="w-full h-[140px] flex items-end justify-center pb-2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="100%"
              startAngle={180}
              endAngle={0}
              innerRadius={60}
              outerRadius={80}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Needle / Text Overlay */}
        <div className="absolute bottom-6 flex flex-col items-center">
          <span className="text-2xl font-black text-slate-800 dark:text-white tracking-tighter">
            {strings.status}
          </span>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest">
            {strings.greedLevel}
          </span>
        </div>
      </div>
    </div>
  );
};

export default MarketMoodGauge;
