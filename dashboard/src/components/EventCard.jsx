import React from "react";
import { Star } from "lucide-react";

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

const EventCard = ({
  event,
  compact = false,
  toggleWatchlist,
  isWatchlisted,
  isDark,
}) => {
  const sentiment = event.analytics?.sentiment?.label || "Neutral";

  // Terminal Colors
  const borderColors = {
    Bullish: isDark
      ? "border-green-900/50 hover:border-green-500"
      : "border-green-200 hover:border-green-500",
    Bearish: isDark
      ? "border-red-900/50 hover:border-red-500"
      : "border-red-200 hover:border-red-500",
    Neutral: isDark
      ? "border-slate-800 hover:border-slate-600"
      : "border-zinc-300 hover:border-zinc-400",
  };

  const sentimentColor = {
    Bullish: isDark ? "text-green-400" : "text-green-600",
    Bearish: isDark ? "text-red-400" : "text-red-600",
    Neutral: isDark ? "text-slate-500" : "text-slate-400",
  };

  return (
    <div
      className={`bg-zinc-50 dark:bg-gray-950 border ${borderColors[sentiment]} rounded-sm p-2 transition-all duration-200 group relative hover:bg-zinc-100 dark:hover:bg-gray-900 shadow-sm`}
    >
      {/* Header Line: ID | Location | Time | Star */}
      <div className="flex justify-between items-center mb-1 text-[10px] font-mono text-slate-500 dark:text-slate-500 border-b border-zinc-200 dark:border-gray-800 pb-1">
        <div className="flex gap-2 items-center">
          <span className={sentimentColor[sentiment]}>●</span>
          {event.location?.country === "Brasil" ? (
            <span className="text-green-600 dark:text-green-500">BR</span>
          ) : (
            <span>INTL</span>
          )}
          <span className="bg-zinc-200 dark:bg-gray-900 px-1 rounded text-slate-600 dark:text-slate-400">
            {event.source?.name || "RSS"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span>{timeAgo(event.timestamp)}</span>
          {toggleWatchlist && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleWatchlist(event);
              }}
              className={`hover:scale-110 transition-transform ${isWatchlisted ? "text-yellow-400" : "text-slate-400 hover:text-yellow-400"}`}
            >
              <Star size={12} fill={isWatchlisted ? "currentColor" : "none"} />
            </button>
          )}
        </div>
      </div>

      {/* Title */}
      <h3
        className={`font-medium text-slate-800 dark:text-slate-200 leading-snug mb-1 ${compact ? "text-xs" : "text-sm"} hover:text-blue-600 dark:hover:text-blue-400 transition-colors`}
      >
        <a href={getEventLink(event)} target="_blank" rel="noreferrer">
          {event.title}
        </a>
      </h3>

      {/* Insight (Terminal Style) */}
      {event.insight && (
        <div className="mb-1 pl-1 border-l-2 border-slate-300 dark:border-slate-700">
          <p className="text-[10px] font-mono text-slate-600 dark:text-slate-400 leading-tight">
            <span className="text-yellow-600">&gt;&gt;&gt;</span>{" "}
            {event.insight}
          </p>
        </div>
      )}

      {/* Footer: Metrics */}
      <div className="flex justify-between items-center pt-1 mt-1 border-t border-zinc-200 dark:border-gray-900">
        <div className="flex gap-2 text-[10px] font-mono">
          <span className={sentimentColor[sentiment]}>
            {sentiment.toUpperCase()}
          </span>
          <span className="text-slate-500 dark:text-slate-600">
            IMP:
            {event.impact === "high" ? (
              <span className="text-red-600 dark:text-red-500">HI</span>
            ) : (
              "LO"
            )}
          </span>
        </div>
        {event.urgency === "urgent" && (
          <span className="text-[9px] font-mono bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-500 px-1 rounded-sm border border-red-200 dark:border-red-900/30">
            URGENT
          </span>
        )}
      </div>
    </div>
  );
};

export default EventCard;
