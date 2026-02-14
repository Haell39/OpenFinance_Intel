import React from "react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

const Sparkline = ({ data, color }) => {
  // data is array of numbers: [10, 12, 11, 14, ...]
  const chartData = data.map((val, i) => ({ i, val }));

  return (
    <div className="w-16 h-6">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="val"
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
