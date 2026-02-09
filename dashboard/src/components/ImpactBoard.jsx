import React from "react";
import EventCard from "./EventCard";

const SECTORS = ["Macro", "Forex", "Energy", "Tech", "Crypto", "Global"];

const ImpactBoard = ({ events }) => {
  // Agrupa eventos por setor
  const groupedEvents = events.reduce((acc, event) => {
    const sector = event.sector || "Global";
    if (!acc[sector]) acc[sector] = [];
    acc[sector].push(event);
    return acc;
  }, {});

  return (
    <div className="h-full overflow-x-auto overflow-y-hidden p-4">
      <div className="flex h-full gap-4 min-w-[1200px]">
        {SECTORS.map((sector) => (
          <div
            key={sector}
            className="flex-1 flex flex-col min-w-[300px] bg-slate-900/50 rounded-xl border border-slate-700/50 backdrop-blur-sm"
          >
            {/* Header da Coluna */}
            <div className="p-3 border-b border-slate-700/50 flex justify-between items-center bg-slate-800/50 rounded-t-xl">
              <h3 className="font-bold text-slate-200">{sector}</h3>
              <span className="text-xs font-mono bg-slate-700 px-2 py-0.5 rounded text-slate-300">
                {groupedEvents[sector]?.length || 0}
              </span>
            </div>

            {/* Lista de Cards com Scroll */}
            <div className="flex-1 overflow-y-auto p-2 space-y-3 custom-scrollbar">
              {groupedEvents[sector]?.map((event) => (
                <div
                  key={event.id}
                  className="transform transition-all hover:scale-[1.02]"
                >
                  <EventCard event={event} compact={true} />
                </div>
              ))}

              {(!groupedEvents[sector] ||
                groupedEvents[sector].length === 0) && (
                <div className="h-32 flex items-center justify-center text-slate-600 text-sm italic">
                  Sem eventos recentes
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImpactBoard;
