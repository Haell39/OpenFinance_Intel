import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  AlertTriangle,
  BarChart3,
  Key,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  FileText,
  TrendingDown,
  PieChart,
} from "lucide-react";

const MODULE_CONFIG = {
  summary: {
    icon: FileText,
    color: "blue",
    gradient: "from-blue-500 to-cyan-500",
  },
  crash: {
    icon: TrendingDown,
    color: "red",
    gradient: "from-red-500 to-orange-500",
  },
  market: {
    icon: PieChart,
    color: "violet",
    gradient: "from-violet-500 to-purple-500",
  },
};

const AIInsights = ({ isDark, language }) => {
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("ai_api_key") || "",
  );
  const [provider, setProvider] = useState(
    () => localStorage.getItem("ai_provider") || "gemini",
  );
  const [showKey, setShowKey] = useState(false);
  const [results, setResults] = useState({
    summary: null,
    crash: null,
    market: null,
  });
  const [loading, setLoading] = useState({
    summary: false,
    crash: false,
    market: false,
  });
  const [errors, setErrors] = useState({
    summary: null,
    crash: null,
    market: null,
  });

  const t = {
    pt: {
      title: "AI Insights",
      subtitle: "Análise Inteligente de Mercado",
      apiKeyLabel: "Chave da API",
      apiKeyPlaceholder: "Cole sua API key aqui...",
      providerLabel: "Provedor de IA",
      analyze: "Analisar com IA",
      analyzing: "Analisando...",
      noKey: "Configure sua API key para começar",
      keySaved: "Chave salva no navegador",
      keyWarning:
        "A chave não é enviada ao servidor — usada apenas por request",
      modules: {
        summary: {
          title: "Resumo de Alto Impacto",
          desc: "Análise dos 10 eventos com maior probabilidade ML",
        },
        crash: {
          title: "Detector de Crashes & Bolhas",
          desc: "Avaliação de risco sistêmico baseada em métricas agregadas",
        },
        market: {
          title: "Análise de Mercado",
          desc: "Conjuntura e perspectivas por setor financeiro",
        },
      },
      lastGenerated: "Gerado em",
      poweredBy: "Análise gerada por",
      clearResults: "Limpar",
      costNote: "~2-5K tokens por análise",
    },
    en: {
      title: "AI Insights",
      subtitle: "Intelligent Market Analysis",
      apiKeyLabel: "API Key",
      apiKeyPlaceholder: "Paste your API key here...",
      providerLabel: "AI Provider",
      analyze: "Analyze with AI",
      analyzing: "Analyzing...",
      noKey: "Configure your API key to get started",
      keySaved: "Key saved in browser",
      keyWarning: "Key is never stored on server — used per-request only",
      modules: {
        summary: {
          title: "High-Impact Summary",
          desc: "Analysis of top 10 events by ML probability",
        },
        crash: {
          title: "Crash & Bubble Detector",
          desc: "Systemic risk assessment based on aggregated metrics",
        },
        market: {
          title: "Market Analysis",
          desc: "Financial sector outlook and perspectives",
        },
      },
      lastGenerated: "Generated at",
      poweredBy: "Analysis powered by",
      clearResults: "Clear",
      costNote: "~2-5K tokens per analysis",
    },
  };
  const s = language === "pt" ? t.pt : t.en;

  // Persist key and provider
  useEffect(() => {
    localStorage.setItem("ai_api_key", apiKey);
  }, [apiKey]);
  useEffect(() => {
    localStorage.setItem("ai_provider", provider);
  }, [provider]);

  const maskKey = (key) => {
    if (!key) return "";
    if (key.length <= 8) return "•".repeat(key.length);
    return key.slice(0, 4) + "•••••" + key.slice(-4);
  };

  const handleAnalyze = async (module) => {
    if (!apiKey) return;
    setLoading((prev) => ({ ...prev, [module]: true }));
    setErrors((prev) => ({ ...prev, [module]: null }));

    try {
      const res = await fetch("/ai/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-AI-Key": apiKey,
        },
        body: JSON.stringify({ module, provider }),
      });

      const data = await res.json();
      if (data.error) {
        setErrors((prev) => ({ ...prev, [module]: data.error }));
      } else {
        setResults((prev) => ({ ...prev, [module]: data }));
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, [module]: err.message }));
    } finally {
      setLoading((prev) => ({ ...prev, [module]: false }));
    }
  };

  // Simple markdown-to-JSX renderer for bold, headers, lists
  const renderMarkdown = (text) => {
    if (!text) return null;
    const lines = text.split("\n");
    return lines.map((line, i) => {
      // Headers
      if (line.startsWith("### "))
        return (
          <h4
            key={i}
            className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-4 mb-1"
          >
            {renderInline(line.slice(4))}
          </h4>
        );
      if (line.startsWith("## "))
        return (
          <h3
            key={i}
            className="text-base font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2"
          >
            {renderInline(line.slice(3))}
          </h3>
        );
      if (line.startsWith("# "))
        return (
          <h2
            key={i}
            className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-5 mb-2"
          >
            {renderInline(line.slice(2))}
          </h2>
        );
      // Bullet points
      if (line.match(/^[-*] /))
        return (
          <li
            key={i}
            className="text-sm text-slate-700 dark:text-slate-300 ml-4 mb-1 list-disc"
          >
            {renderInline(line.slice(2))}
          </li>
        );
      // Numbered lists
      if (line.match(/^\d+\. /))
        return (
          <li
            key={i}
            className="text-sm text-slate-700 dark:text-slate-300 ml-4 mb-1 list-decimal"
          >
            {renderInline(line.replace(/^\d+\. /, ""))}
          </li>
        );
      // Empty lines
      if (line.trim() === "") return <div key={i} className="h-2" />;
      // Regular paragraphs
      return (
        <p
          key={i}
          className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed mb-1"
        >
          {renderInline(line)}
        </p>
      );
    });
  };

  const renderInline = (text) => {
    // Bold **text**
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong
            key={i}
            className="font-bold text-slate-900 dark:text-slate-100"
          >
            {part.slice(2, -2)}
          </strong>
        );
      }
      return part;
    });
  };

  const ModuleCard = ({ moduleKey }) => {
    const config = MODULE_CONFIG[moduleKey];
    const Icon = config.icon;
    const isLoading = loading[moduleKey];
    const result = results[moduleKey];
    const error = errors[moduleKey];
    const moduleText = s.modules[moduleKey];

    return (
      <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-xl shadow-sm overflow-hidden">
        {/* Module Header */}
        <div className={`bg-gradient-to-r ${config.gradient} p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 backdrop-blur-sm rounded-lg p-2">
                <Icon size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-sm">
                  {moduleText.title}
                </h3>
                <p className="text-white/80 text-xs">{moduleText.desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {result && (
                <button
                  onClick={() =>
                    setResults((prev) => ({ ...prev, [moduleKey]: null }))
                  }
                  className="text-white/60 hover:text-white text-xs transition-colors"
                >
                  {s.clearResults}
                </button>
              )}
              <button
                onClick={() => handleAnalyze(moduleKey)}
                disabled={!apiKey || isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm border border-white/30 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    {s.analyzing}
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {s.analyze}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Module Content */}
        <div className="p-5">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="relative">
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-r ${config.gradient} opacity-20 animate-ping absolute`}
                />
                <div
                  className={`w-16 h-16 rounded-full bg-gradient-to-r ${config.gradient} flex items-center justify-center relative`}
                >
                  <Brain size={24} className="text-white animate-pulse" />
                </div>
              </div>
              <p className="text-sm text-slate-500 animate-pulse">
                {language === "pt"
                  ? "Processando análise de IA..."
                  : "Processing AI analysis..."}
              </p>
              <p className="text-[10px] text-slate-400">{s.costNote}</p>
            </div>
          )}

          {error && !isLoading && (
            <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/40 rounded-lg p-4">
              <XCircle size={18} className="text-red-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-red-700 dark:text-red-400">
                  {language === "pt" ? "Erro na análise" : "Analysis Error"}
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                  {error}
                </p>
              </div>
            </div>
          )}

          {result && !isLoading && (
            <div>
              {/* Result metadata */}
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-zinc-100 dark:border-gray-800">
                <CheckCircle2 size={14} className="text-green-500" />
                <span className="text-[10px] text-slate-400">
                  {s.poweredBy}{" "}
                  <span className="font-bold text-slate-600 dark:text-slate-300">
                    {result.provider === "openai"
                      ? "OpenAI GPT-4o Mini"
                      : "Google Gemini 2.0 Flash"}
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 ml-auto">
                  {s.lastGenerated}{" "}
                  {new Date(result.generated_at).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
              {/* Rendered analysis */}
              <div className="prose prose-sm dark:prose-invert max-w-none">
                {renderMarkdown(result.analysis)}
              </div>
            </div>
          )}

          {!result && !isLoading && !error && (
            <div className="flex flex-col items-center justify-center py-10 gap-2">
              <Icon size={32} className="text-slate-300 dark:text-slate-700" />
              <p className="text-xs text-slate-400 text-center max-w-xs">
                {!apiKey
                  ? s.noKey
                  : language === "pt"
                    ? `Clique em "${s.analyze}" para gerar análise`
                    : `Click "${s.analyze}" to generate analysis`}
              </p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl p-2.5 shadow-lg">
              <Brain size={22} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {s.title}
              </h1>
              <p className="text-xs text-slate-500">{s.subtitle}</p>
            </div>
          </div>
          <span className="text-[9px] text-slate-400 font-mono bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded">
            NLP + ML + LLM
          </span>
        </div>

        {/* API Key Configuration */}
        <div className="bg-white dark:bg-gray-900 border border-zinc-200 dark:border-gray-800 rounded-xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Key size={16} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
              {s.apiKeyLabel}
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Provider selector */}
            <div>
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                {s.providerLabel}
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setProvider("openai")}
                  className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                    provider === "openai"
                      ? "bg-green-50 dark:bg-green-900/20 border-green-300 dark:border-green-700 text-green-700 dark:text-green-400"
                      : "bg-zinc-50 dark:bg-gray-800 border-zinc-200 dark:border-gray-700 text-slate-500 hover:border-green-300"
                  }`}
                >
                  🤖 OpenAI
                </button>
                <button
                  onClick={() => setProvider("gemini")}
                  className={`flex-1 py-2.5 px-3 text-xs font-bold rounded-lg border transition-all ${
                    provider === "gemini"
                      ? "bg-blue-50 dark:bg-blue-900/20 border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-400"
                      : "bg-zinc-50 dark:bg-gray-800 border-zinc-200 dark:border-gray-700 text-slate-500 hover:border-blue-300"
                  }`}
                >
                  ✨ Gemini
                </button>
              </div>
            </div>

            {/* API Key input */}
            <div className="md:col-span-2">
              <label className="block text-xs text-slate-500 mb-1.5 font-medium">
                {provider === "openai" ? "OpenAI API Key" : "Google AI API Key"}
              </label>
              <div className="relative">
                <input
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder={s.apiKeyPlaceholder}
                  className="w-full py-2.5 px-3 pr-10 text-sm rounded-lg border border-zinc-200 dark:border-gray-700 bg-zinc-50 dark:bg-gray-800 text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:border-blue-400 font-mono"
                />
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>

          {/* Key status */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            {apiKey ? (
              <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
                <CheckCircle2 size={12} className="shrink-0" />
                <span className="text-[10px] font-medium">{s.keySaved}</span>
                <span className="text-[10px] text-slate-400 font-mono">
                  ({maskKey(apiKey)})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-amber-500">
                <AlertTriangle size={12} className="shrink-0" />
                <span className="text-[10px] font-medium">{s.noKey}</span>
              </div>
            )}
            <span className="text-[9px] text-slate-400 ml-auto">
              🔒 {s.keyWarning}
            </span>
          </div>
        </div>

        {/* Analysis Modules */}
        <ModuleCard moduleKey="summary" />
        <ModuleCard moduleKey="crash" />
        <ModuleCard moduleKey="market" />

        {/* Footer */}
        <div className="text-center pb-4">
          <p className="text-[10px] text-slate-400 italic">
            {language === "pt"
              ? "⚠️ Análises geradas por IA — ferramenta de apoio à decisão, não recomendação de investimento."
              : "⚠️ AI-generated analysis — decision support tool, not investment advice."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AIInsights;
