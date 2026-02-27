import { useState, useEffect } from "react";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  AlertTriangle,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
} from "lucide-react";

const CONFIDENCE_CONFIG = {
  high: {
    color: "bg-red-500",
    text: "text-red-400",
    border: "border-red-500/30",
    emoji: "🔴",
    label_pt: "Alto",
    label_en: "High",
  },
  medium: {
    color: "bg-amber-500",
    text: "text-amber-400",
    border: "border-amber-500/30",
    emoji: "🟡",
    label_pt: "Médio",
    label_en: "Medium",
  },
  low: {
    color: "bg-emerald-500",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
    emoji: "🟢",
    label_pt: "Baixo",
    label_en: "Low",
  },
};

const SECTOR_ICONS = {
  Macro: "🏛️",
  Market: "📈",
  Commodities: "🛢️",
  Crypto: "₿",
  Tech: "💻",
  Social: "🌐",
};

const ITEMS_PER_PAGE = 10;

const PredictionRadar = ({ isDark, language, refreshInterval = 30000 }) => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [filter, setFilter] = useState("all"); // all, high, medium, low
  const [sectorFilter, setSectorFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("newest"); // newest, oldest
  const [currentPage, setCurrentPage] = useState(1);
  const [dbStats, setDbStats] = useState({
    total: 0,
    high: 0,
    medium: 0,
    low: 0,
    avg_probability: 0,
  });

  const fetchPredictions = async () => {
    const isInitial = predictions.length === 0;
    try {
      if (isInitial) setLoading(true);
      else setRefreshing(true);

      const [predRes, statsRes] = await Promise.all([
        fetch("/predictions?limit=250"),
        fetch("/predictions/stats"),
      ]);

      if (predRes.ok) {
        const data = await predRes.json();
        // Only update if events actually changed (new/removed events or probability changed)
        const oldMap = new Map(
          predictions.map((p) => [p.event_id, p.probability]),
        );
        const newMap = new Map(data.map((p) => [p.event_id, p.probability]));
        const hasChanges =
          data.length !== predictions.length ||
          data.some(
            (p) =>
              !oldMap.has(p.event_id) ||
              oldMap.get(p.event_id) !== p.probability,
          );
        if (hasChanges || isInitial) {
          setPredictions(data);
        }
        setLastUpdated(new Date());
      }

      if (statsRes.ok) {
        const s = await statsRes.json();
        setDbStats(s);
      }
    } catch (err) {
      console.error("Failed to fetch predictions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const id = setInterval(fetchPredictions, refreshInterval);
      return () => clearInterval(id);
    }
  }, [refreshInterval]);

  // --- Filters ---
  const filtered = predictions
    .filter((p) => {
      if (filter !== "all" && p.confidence !== filter) return false;
      if (sectorFilter !== "all" && p.sector !== sectorFilter) return false;
      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.predicted_at || 0);
      const dateB = new Date(b.predicted_at || 0);
      const cmp = sortOrder === "newest" ? dateB - dateA : dateA - dateB;
      // Stable tiebreaker: use event_id so order never shuffles for same timestamp
      if (cmp !== 0) return cmp;
      return (a.event_id || "").localeCompare(b.event_id || "");
    });

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const startIdx = (safePage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filter, sectorFilter, sortOrder]);

  // Stats from the 250 displayed predictions (matches what user sees)
  const stats = {
    total: predictions.length,
    high: predictions.filter((p) => p.confidence === "high").length,
    medium: predictions.filter((p) => p.confidence === "medium").length,
    low: predictions.filter((p) => p.confidence === "low").length,
    avgProbability: predictions.length
      ? predictions.reduce((sum, p) => sum + p.probability, 0) /
        predictions.length
      : 0,
  };

  const sectors = [...new Set(predictions.map((p) => p.sector))].sort();

  const formatTime = (isoStr) => {
    if (!isoStr) return "";
    const d = new Date(isoStr);
    const diff = Math.floor((Date.now() - d.getTime()) / 60000);
    if (diff < 1) return language === "pt" ? "agora" : "now";
    if (diff < 60) return `${diff}m`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h`;
    return `${Math.floor(diff / 1440)}d`;
  };

  return (
    <div className="w-full h-full overflow-y-auto p-4 md:p-6 bg-zinc-200 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <Activity size={24} className="text-blue-500" />
              {language === "pt"
                ? "Análise de Probabilidade"
                : "Probability Analysis"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {language === "pt"
                ? "Probabilidade de impacto calculada por ML para cada evento do mercado."
                : "ML-calculated impact probability for each market event."}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {refreshing && (
              <span className="text-[10px] text-blue-400 font-medium animate-pulse">
                {language === "pt" ? "Atualizando..." : "Refreshing..."}
              </span>
            )}
            {lastUpdated && !refreshing && (
              <span className="text-[10px] text-slate-400 font-mono">
                {language === "pt" ? "Atualizado" : "Updated"}{" "}
                {lastUpdated.toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
            )}
            <button
              onClick={fetchPredictions}
              disabled={loading || refreshing}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw
                size={14}
                className={loading || refreshing ? "animate-spin" : ""}
              />
              {language === "pt" ? "Atualizar" : "Refresh"}
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-zinc-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
              {stats.total}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
              {language === "pt" ? "Total" : "Total"}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-zinc-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-red-500">{stats.high}</div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
              🔴 {language === "pt" ? "Alto Risco" : "High Risk"}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-zinc-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-amber-500">
              {stats.medium}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
              🟡 {language === "pt" ? "Médio" : "Medium"}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-zinc-200 dark:border-gray-800 p-4 text-center shadow-sm">
            <div className="text-2xl font-bold text-emerald-500">
              {stats.low}
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
              🟢 {language === "pt" ? "Baixo" : "Low"}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 rounded-xl border border-zinc-200 dark:border-gray-800 p-4 text-center shadow-sm col-span-2 md:col-span-1">
            <div className="text-2xl font-bold text-blue-500">
              {(stats.avgProbability * 100).toFixed(0)}%
            </div>
            <div className="text-xs text-slate-500 uppercase tracking-wider mt-1">
              {language === "pt" ? "Média" : "Average"}
            </div>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          {["all", "high", "medium", "low"].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                filter === f
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 border-zinc-300 dark:border-gray-700 hover:border-blue-400"
              }`}
            >
              {f === "all"
                ? language === "pt"
                  ? "Todos"
                  : "All"
                : CONFIDENCE_CONFIG[f]?.[
                    language === "pt" ? "label_pt" : "label_en"
                  ] || f}
            </button>
          ))}

          <span className="text-slate-300 dark:text-slate-700">|</span>

          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-medium rounded-full border bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 border-zinc-300 dark:border-gray-700 outline-none focus:border-blue-400"
          >
            <option value="all">
              {language === "pt" ? "Todos os Setores" : "All Sectors"}
            </option>
            {sectors.map((s) => (
              <option key={s} value={s}>
                {SECTOR_ICONS[s] || ""} {s}
              </option>
            ))}
          </select>

          <span className="text-slate-300 dark:text-slate-700">|</span>

          {/* Sort Order */}
          <button
            onClick={() =>
              setSortOrder((prev) => (prev === "newest" ? "oldest" : "newest"))
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 border-zinc-300 dark:border-gray-700 hover:border-blue-400 transition-colors"
          >
            <ArrowUpDown size={12} />
            {sortOrder === "newest"
              ? language === "pt"
                ? "Mais Recentes"
                : "Newest"
              : language === "pt"
                ? "Mais Antigos"
                : "Oldest"}
          </button>
        </div>

        {/* Predictions List */}
        {loading && predictions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 text-sm">
              {language === "pt"
                ? "Carregando predições..."
                : "Loading predictions..."}
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-3">
            <AlertTriangle size={40} className="text-slate-400" />
            <p className="text-slate-500 text-sm">
              {language === "pt"
                ? "Nenhuma predição encontrada. Aguarde o sistema processar eventos."
                : "No predictions found. Wait for the system to process events."}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {paginatedItems.map((pred, idx) => {
              const conf =
                CONFIDENCE_CONFIG[pred.confidence] || CONFIDENCE_CONFIG.low;
              const pct = Math.round(pred.probability * 100);

              return (
                <div
                  key={pred.event_id || startIdx + idx}
                  className={`bg-white dark:bg-gray-900 rounded-xl border ${conf.border} p-4 shadow-sm hover:shadow-md transition-all duration-200 group`}
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">
                          {SECTOR_ICONS[pred.sector] || "📊"}
                        </span>
                        <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          {pred.sector}
                          {pred.sub_sector ? ` · ${pred.sub_sector}` : ""}
                        </span>
                        <span className="text-xs text-slate-400">·</span>
                        <span className="text-xs text-slate-400">
                          {formatTime(pred.predicted_at)}
                        </span>
                      </div>
                      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {pred.event_title}
                      </h3>
                      {pred.impact_category && (
                        <p className="text-xs text-slate-500 mt-1">
                          {pred.impact_category}
                        </p>
                      )}
                      {pred.llm_reasoning && (
                        <p className="text-xs text-blue-400 mt-1 italic">
                          💡 {pred.llm_reasoning}
                        </p>
                      )}
                    </div>

                    {/* Right: Probability */}
                    <div className="flex flex-col items-end shrink-0">
                      <div
                        className={`text-2xl font-bold ${conf.text} tabular-nums`}
                      >
                        {pct}%
                      </div>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${conf.color} text-white mt-1`}
                      >
                        {conf[language === "pt" ? "label_pt" : "label_en"]}
                      </span>
                    </div>
                  </div>

                  {/* Probability Bar */}
                  <div className="mt-3 h-1.5 bg-zinc-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${conf.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>

                  {/* Model Info (subtle) */}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[10px] text-slate-400 font-mono">
                      {pred.model_version || "heuristic_v1"}
                    </span>
                    {pred.probability >= 0.75 && (
                      <span className="text-[10px] text-red-400 flex items-center gap-1">
                        <TrendingUp size={10} />
                        {language === "pt"
                          ? "Alta probabilidade de impacto"
                          : "High impact probability"}
                      </span>
                    )}
                    {pred.probability < 0.3 && (
                      <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                        <TrendingDown size={10} />
                        {language === "pt"
                          ? "Baixa probabilidade"
                          : "Low probability"}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {filtered.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs text-slate-400 font-mono">
              {language === "pt"
                ? `${startIdx + 1}–${Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} de ${filtered.length}`
                : `${startIdx + 1}–${Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} of ${filtered.length}`}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={safePage <= 1}
                className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 hover:border-blue-400 disabled:opacity-30 transition-colors"
              >
                1
              </button>
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="p-1.5 rounded border border-zinc-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 hover:border-blue-400 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 text-xs font-bold text-slate-700 dark:text-slate-300 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800 tabular-nums">
                {safePage} / {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={safePage >= totalPages}
                className="p-1.5 rounded border border-zinc-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 hover:border-blue-400 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={14} />
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={safePage >= totalPages}
                className="px-2 py-1 text-xs rounded border border-zinc-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-slate-600 dark:text-slate-400 hover:border-blue-400 disabled:opacity-30 transition-colors"
              >
                {totalPages}
              </button>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className="text-center py-4 space-y-1">
          <p className="text-[10px] text-slate-400">
            {language === "pt"
              ? `📊 Exibindo os ${predictions.length} eventos mais recentes de ${dbStats.total} no total · Estatísticas referentes aos eventos exibidos`
              : `📊 Showing ${predictions.length} most recent events of ${dbStats.total} total · Statistics reflect displayed events`}
          </p>
          <p className="text-[10px] text-slate-400 italic">
            {language === "pt"
              ? "⚠️ Análise de Probabilidade de Impacto — ferramenta de apoio à decisão, não recomendação de investimento."
              : "⚠️ Impact Probability Analysis — decision support tool, not investment advice."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default PredictionRadar;
