import React from "react";

function timeAgo(value) {
  if (!value) return "";
  const date = new Date(value);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 60) return `${diffMins}m atrás`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h atrás`;

  // Format: "dd/mm HH:MM"
  const day = date.getDate().toString().padStart(2, "0");
  const month = (date.getMonth() + 1).toString().padStart(2, "0");
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

function getEventLink(event) {
  if (event?.link) return event.link;
  if (event?.source?.url) return event.source.url;
  return null;
}

const EventCard = ({ event, compact = false }) => {
  const sentiment = event.analytics?.sentiment?.label || "Neutral";

  // Cores de Borda baseadas no Sentimento
  const borderColors = {
    Bullish: "border-green-500/50 hover:border-green-400",
    Bearish: "border-red-500/50 hover:border-red-400",
    Neutral: "border-slate-700 hover:border-slate-500",
  };

  return (
    <div
      className={`bg-slate-800/80 backdrop-blur-sm border ${borderColors[sentiment]} rounded-lg p-3 shadow-lg transition-all duration-200 group relative overflow-hidden`}
    >
      {/* Background Glow based on sentiment */}
      <div
        className={`absolute top-0 right-0 w-16 h-16 blur-2xl opacity-10 rounded-full pointer-events-none -mr-8 -mt-8 ${
          sentiment === "Bullish"
            ? "bg-green-500"
            : sentiment === "Bearish"
              ? "bg-red-500"
              : "bg-slate-500"
        }`}
      />

      <div className="flex justify-between items-start mb-2 relative z-10">
        <div className="flex items-center gap-2">
          {event.location?.country && event.location?.country !== "GLOBAL" && (
            <span className="text-[10px] font-bold bg-slate-900 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
              {event.location.country}
            </span>
          )}
          <span
            className={`text-[10px] font-mono uppercase tracking-wider border px-1 rounded ${
              sentiment === "Bullish"
                ? "border-green-900 bg-green-900/20 text-green-400"
                : sentiment === "Bearish"
                  ? "border-red-900 bg-red-900/20 text-red-400"
                  : "border-slate-700 bg-slate-800 text-slate-400"
            }`}
          >
            {sentiment}
          </span>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {timeAgo(event.timestamp)}
        </span>
      </div>

      <h3
        className={`font-semibold text-slate-100 leading-tight mb-2 ${compact ? "text-sm" : "text-base"}`}
      >
        <a
          href={getEventLink(event)}
          target="_blank"
          rel="noreferrer"
          className="hover:text-blue-400 transition-colors"
        >
          {event.title}
        </a>
      </h3>

      {/* Insight Display */}
      {event.insight && (
        <div className="mb-2 p-1.5 bg-slate-900/50 rounded border-l-2 border-slate-600">
          <p className="text-xs text-slate-300 italic">💡 {event.insight}</p>
        </div>
      )}

      {!compact && event.description && (
        <p className="text-xs text-slate-400 line-clamp-2 mb-3">
          {event.description}
        </p>
      )}

      <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-700/50 pt-2 mt-1 relative z-10">
        <span className="flex items-center gap-1 opacity-75">
          {event.source?.url
            ? new URL(event.source.url).hostname.replace("www.", "")
            : "Source"}
        </span>
        <div className="flex gap-2">
          {event.impact === "high" && (
            <span className="flex items-center gap-1 text-amber-500 font-bold animate-pulse">
              ⚠️ HIGH IMPACT
            </span>
          )}
          {event.urgency === "urgent" && (
            <span className="text-red-400 font-bold">🚨 URGENT</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default EventCard;
