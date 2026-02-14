import React from "react";

function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m`; // Ultra short
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;

  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  return `${day}/${month}`;
}

function getEventLink(event) {
  if (event?.link) return event.link;
  if (event?.source?.url) return event.source.url;
  return null;
}

const EventCard = ({ event, compact = false }) => {
  const sentiment = event.analytics?.sentiment?.label || "Neutral";

  // Terminal Colors
  const borderColors = {
    Bullish: "border-green-900/50 hover:border-green-500",
    Bearish: "border-red-900/50 hover:border-red-500",
    Neutral: "border-slate-800 hover:border-slate-600",
  };

  const sentimentColor = {
    Bullish: "text-green-400",
    Bearish: "text-red-400",
    Neutral: "text-slate-500",
  };

  return (
    <div
      className={`bg-gray-950 border ${borderColors[sentiment]} rounded-sm p-2 transition-all duration-200 group relative hover:bg-gray-900`}
    >
      {/* Header Line: ID | Location | Time */}
      <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-slate-500 border-b border-gray-800 pb-1">
        <div className="flex gap-2 items-center">
          <span className={sentimentColor[sentiment]}>●</span>
          {event.location?.country === "Brasil" ? (
            <span className="text-green-600">BR</span>
          ) : (
            <span>INTL</span>
          )}
          <span className="bg-gray-900 px-1 rounded text-slate-400">
            {event.source?.name || "RSS"}
          </span>
        </div>
        <div>{timeAgo(event.timestamp)}</div>
      </div>

      {/* Title */}
      <h3
        className={`font-medium text-slate-200 leading-snug mb-1 ${compact ? "text-xs" : "text-sm"} hover:text-blue-400 transition-colors`}
      >
        <a href={getEventLink(event)} target="_blank" rel="noreferrer">
          {event.title}
        </a>
      </h3>

      {/* Insight (Terminal Style) */}
      {event.insight && (
        <div className="mb-1 pl-1 border-l-2 border-slate-700">
          <p className="text-[10px] font-mono text-slate-400 leading-tight">
            <span className="text-yellow-600">&gt;&gt;&gt;</span>{" "}
            {event.insight}
          </p>
        </div>
      )}

      {/* Footer: Metrics */}
      <div className="flex justify-between items-center pt-1 mt-1 border-t border-gray-900">
        <div className="flex gap-2 text-[10px] font-mono">
          <span className={sentimentColor[sentiment]}>
            {sentiment.toUpperCase()}
          </span>
          <span className="text-slate-600">
            IMP:
            {event.impact === "high" ? (
              <span className="text-red-500">HI</span>
            ) : (
              "LO"
            )}
          </span>
        </div>
        {event.urgency === "urgent" && (
          <span className="text-[9px] font-mono bg-red-900/20 text-red-500 px-1 rounded-sm border border-red-900/30">
            URGENT
          </span>
        )}
      </div>
    </div>
  );
};

export default EventCard;
