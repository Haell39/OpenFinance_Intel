import React from "react";
import EventCard from "./EventCard";
import { Briefcase } from "lucide-react";

const Watchlist = ({ watchlist, toggleWatchlist, isDark, language }) => {
  const t = {
    pt: {
      title: "Minha Watchlist",
      subtitle: "Eventos e narrativas salvos",
      empty: "Sua lista está vazia.",
      emptyDesc: "Marque eventos com a estrela ⭐ para acompanhá-los aqui.",
      count: "itens salvos",
    },
    en: {
      title: "My Watchlist",
      subtitle: "Saved events and narratives",
      empty: "Your watchlist is empty.",
      emptyDesc: "Star events ⭐ to track them here.",
      count: "saved items",
    },
  };

  const strings = language === "pt" ? t.pt : t.en;

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 bg-zinc-200 dark:bg-slate-900 scrollbar-thin scrollbar-thumb-zinc-300 dark:scrollbar-thumb-gray-800 transition-colors duration-300">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Briefcase className="text-blue-500" /> {strings.title}
            </h2>
            <p className="text-slate-500 text-sm mt-1">{strings.subtitle}</p>
          </div>
          <span className="text-xs font-mono bg-zinc-200 dark:bg-slate-800 px-2 py-1 rounded text-slate-600 dark:text-slate-400">
            {watchlist.length} {strings.count}
          </span>
        </div>

        {watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600 border-2 border-dashed border-zinc-200 dark:border-slate-800 rounded-lg">
            <Briefcase size={48} className="mb-4 opacity-50" />
            <p className="text-lg font-medium">{strings.empty}</p>
            <p className="text-sm">{strings.emptyDesc}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {watchlist.map((event) => (
              <div key={event.id || event._id} className="relative group">
                <EventCard
                  event={event}
                  compact={false}
                  toggleWatchlist={() => toggleWatchlist(event)}
                  isWatchlisted={true}
                  isDark={isDark}
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Watchlist;
