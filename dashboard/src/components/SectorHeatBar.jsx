import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";

const SectorHeatBar = ({ isDark }) => {
  const data = [
    { name: "Crypto", sentiment: 0.8 },
    { name: "Tech", sentiment: 0.4 },
    { name: "Energy", sentiment: 0.2 },
    { name: "Forex", sentiment: -0.1 },
    { name: "Macro", sentiment: -0.5 },
  ];

  return (
    <div className="w-full h-full flex flex-col relative">
      <h3 className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400 absolute top-2 left-3 z-10">
        Raio-X Setorial
      </h3>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 25, right: 20, bottom: 5, left: 40 }}
        >
          <XAxis type="number" hide />
          <YAxis
            dataKey="name"
            type="category"
            axisLine={false}
            tickLine={false}
            tick={{
              fill: isDark ? "#94a3b8" : "#475569",
              fontSize: 10,
              fontWeight: 600,
            }}
            width={50}
          />
          <ReferenceLine x={0} stroke="#52525b" />
          <Bar dataKey="sentiment" barSize={12} radius={[2, 2, 2, 2]}>
            {data.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={entry.sentiment >= 0 ? "#22c55e" : "#ef4444"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default SectorHeatBar;
