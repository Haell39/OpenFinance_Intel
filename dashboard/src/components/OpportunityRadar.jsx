import React, { useMemo, useState, useEffect } from "react";
import {
  Target,
  TrendingUp,
  TrendingDown,
  Zap,
  Shield,
  Eye,
  ArrowUpRight,
  Brain,
} from "lucide-react";

/**
 * OpportunityRadar — Detects actionable investment signals from event data.
 * Combines NLP-enriched event data with ML probability predictions
 * to surface high-confidence opportunities for analysts.
 */
const OpportunityRadar = ({ events, isDark, language }) => {
  const [predictions, setPredictions] = useState([]);

  // Fetch ML predictions to enrich signal detection
  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        const res = await fetch("/predictions?limit=250");
        if (res.ok) {
          const data = await res.json();
          setPredictions(data);
        }
      } catch (err) {
        console.error("[OpportunityRadar] Failed to fetch predictions:", err);
      }
    };
    fetchPredictions();
  }, []);

  const t = {
    pt: {
      title: "Radar de Oportunidades",
      subtitle: "NLP + Machine Learning",
      momentum: "Momentum",
      contrarian: "Oportunidade Contrarian",
      highImpact: "Cluster de Alto Impacto",
      sectorShift: "Rotação Setorial",
      socialBuzz: "Buzz Social",
      mlAlert: "Alerta ML",
      noSignals: "Monitorando... Sem sinais fortes no momento.",
      bullish: "Otimista",
      bearish: "Pessimista",
      confidence: "Confiança",
      events: "eventos",
      action: "Ação Sugerida",
      mlPowered: "ML",
      nlpPowered: "NLP",
    },
    en: {
      title: "Opportunity Radar",
      subtitle: "NLP + Machine Learning",
      momentum: "Momentum",
      contrarian: "Contrarian Opportunity",
      highImpact: "High-Impact Cluster",
      sectorShift: "Sector Rotation",
      socialBuzz: "Social Buzz",
      mlAlert: "ML Alert",
      noSignals: "Monitoring... No strong signals at the moment.",
      bullish: "Bullish",
      bearish: "Bearish",
      confidence: "Confidence",
      events: "events",
      action: "Suggested Action",
      mlPowered: "ML",
      nlpPowered: "NLP",
    },
  };
  const s = language === "pt" ? t.pt : t.en;

  // Build a lookup map: event_id → prediction
  const predMap = useMemo(() => {
    const map = {};
    predictions.forEach((p) => {
      map[p.event_id] = p;
    });
    return map;
  }, [predictions]);

  const signals = useMemo(() => {
    if (!events || events.length === 0) return [];
    const detected = [];

    // Group by sector with ML enrichment
    const sectorMap = {};
    events.forEach((e) => {
      const sector = e.sector || "Global";
      if (!sectorMap[sector])
        sectorMap[sector] = {
          bullish: 0,
          bearish: 0,
          neutral: 0,
          total: 0,
          highImpact: 0,
          mlHighRisk: 0,
          avgMlProba: 0,
          mlProbaSum: 0,
          mlCount: 0,
          events: [],
        };
      sectorMap[sector].total++;
      const label = e.analytics?.sentiment?.label;
      if (label === "Bullish") sectorMap[sector].bullish++;
      else if (label === "Bearish") sectorMap[sector].bearish++;
      else sectorMap[sector].neutral++;
      if (e.impact === "high") sectorMap[sector].highImpact++;

      // ML enrichment
      const pred = predMap[e.id];
      if (pred) {
        sectorMap[sector].mlProbaSum += pred.probability;
        sectorMap[sector].mlCount++;
        if (pred.confidence === "high") sectorMap[sector].mlHighRisk++;
      }

      sectorMap[sector].events.push(e);
    });

    // Calculate average ML probability per sector
    Object.values(sectorMap).forEach((data) => {
      data.avgMlProba = data.mlCount > 0 ? data.mlProbaSum / data.mlCount : 0;
    });

    // 1. ML HIGH-RISK ALERT — Sector with avg ML probability >= 0.65
    Object.entries(sectorMap).forEach(([sector, data]) => {
      if (data.mlCount < 3) return;
      if (data.avgMlProba >= 0.65) {
        detected.push({
          type: "mlAlert",
          icon: Brain,
          color: "red",
          sector,
          source: "ML",
          title:
            language === "pt"
              ? `${s.mlAlert}: Risco Elevado em ${sector}`
              : `${s.mlAlert}: Elevated Risk in ${sector}`,
          description:
            language === "pt"
              ? `Modelo ML detectou probabilidade média de ${Math.round(data.avgMlProba * 100)}% de impacto em ${data.mlCount} eventos. ${data.mlHighRisk} classificados como alto risco.`
              : `ML model detected ${Math.round(data.avgMlProba * 100)}% avg impact probability across ${data.mlCount} events. ${data.mlHighRisk} classified as high risk.`,
          action:
            language === "pt"
              ? `Revisar exposição imediatamente. O modelo de ML indica alta probabilidade de impacto material em ${sector}.`
              : `Review exposure immediately. ML model indicates high probability of material impact in ${sector}.`,
          confidence: Math.round(data.avgMlProba * 100),
          eventCount: data.mlCount,
        });
      }
    });

    // 2. MOMENTUM SIGNAL — Sector with >70% bullish or bearish (NLP)
    Object.entries(sectorMap).forEach(([sector, data]) => {
      if (data.total < 3) return;
      const bullPct = (data.bullish / data.total) * 100;
      const bearPct = (data.bearish / data.total) * 100;

      // Boost confidence if ML agrees
      const mlBoost = data.avgMlProba >= 0.5 ? 10 : 0;

      if (bullPct >= 70) {
        detected.push({
          type: "momentum",
          icon: TrendingUp,
          color: "green",
          sector,
          source: mlBoost > 0 ? "NLP+ML" : "NLP",
          title:
            language === "pt"
              ? `${s.momentum} ${s.bullish} em ${sector}`
              : `${s.bullish} ${s.momentum} in ${sector}`,
          description:
            language === "pt"
              ? `${Math.round(bullPct)}% das ${data.total} notícias são positivas.${mlBoost > 0 ? ` ML confirma probabilidade de impacto (${Math.round(data.avgMlProba * 100)}%).` : " Forte consenso de alta."}`
              : `${Math.round(bullPct)}% of ${data.total} news are positive.${mlBoost > 0 ? ` ML confirms impact probability (${Math.round(data.avgMlProba * 100)}%).` : " Strong bullish consensus."}`,
          action:
            language === "pt"
              ? `Monitorar oportunidades de entrada em ${sector}. Confirmar com volume.`
              : `Monitor entry opportunities in ${sector}. Confirm with volume.`,
          confidence: Math.min(Math.round(bullPct) + mlBoost, 99),
          eventCount: data.total,
        });
      }

      if (bearPct >= 70) {
        detected.push({
          type: "momentum",
          icon: TrendingDown,
          color: "red",
          sector,
          source: mlBoost > 0 ? "NLP+ML" : "NLP",
          title:
            language === "pt"
              ? `${s.momentum} ${s.bearish} em ${sector}`
              : `${s.bearish} ${s.momentum} in ${sector}`,
          description:
            language === "pt"
              ? `${Math.round(bearPct)}% das ${data.total} notícias são negativas.${mlBoost > 0 ? ` ML confirma risco de impacto (${Math.round(data.avgMlProba * 100)}%).` : " Pressão vendedora."}`
              : `${Math.round(bearPct)}% of ${data.total} news are negative.${mlBoost > 0 ? ` ML confirms impact risk (${Math.round(data.avgMlProba * 100)}%).` : " Selling pressure."}`,
          action:
            language === "pt"
              ? `Revisar exposição em ${sector}. Considerar proteção.`
              : `Review exposure in ${sector}. Consider hedging.`,
          confidence: Math.min(Math.round(bearPct) + mlBoost, 99),
          eventCount: data.total,
        });
      }
    });

    // 3. CONTRARIAN SIGNAL — Extreme bearish (>80%) = possible bottom (NLP)
    Object.entries(sectorMap).forEach(([sector, data]) => {
      if (data.total < 4) return;
      const bearPct = (data.bearish / data.total) * 100;
      if (bearPct >= 80) {
        // If ML says low probability, strengthen contrarian case
        const mlContrarian = data.avgMlProba < 0.35;
        detected.push({
          type: "contrarian",
          icon: Shield,
          color: "amber",
          sector,
          source: mlContrarian ? "NLP+ML" : "NLP",
          title:
            language === "pt"
              ? `${s.contrarian}: ${sector}`
              : `${s.contrarian}: ${sector}`,
          description:
            language === "pt"
              ? `Pessimismo extremo (${Math.round(bearPct)}%).${mlContrarian ? ` Porém, ML indica baixa probabilidade real de impacto (${Math.round(data.avgMlProba * 100)}%), reforçando tese contrarian.` : " Historicamente, sentimento tão negativo pode indicar fundo."}`
              : `Extreme pessimism (${Math.round(bearPct)}%).${mlContrarian ? ` However, ML indicates low actual impact probability (${Math.round(data.avgMlProba * 100)}%), supporting contrarian thesis.` : " Historically, sentiment this negative may signal a bottom."}`,
          action:
            language === "pt"
              ? `Assista a reversões. Oportunidade para investidores com perfil contrarian.`
              : `Watch for reversals. Opportunity for contrarian investors.`,
          confidence: mlContrarian ? 78 : 65,
          eventCount: data.total,
        });
      }
    });

    // 4. HIGH-IMPACT CLUSTER — ML-enhanced (NLP high impact + ML high probability)
    Object.entries(sectorMap).forEach(([sector, data]) => {
      const mlHighCount = data.mlHighRisk;
      const nlpHighCount = data.highImpact;
      const combinedHigh = Math.max(mlHighCount, nlpHighCount);

      if (combinedHigh >= 3) {
        const usesML = mlHighCount >= 2;
        // Dynamic confidence: ratio of high-impact events in this sector
        const ratio = data.total > 0 ? combinedHigh / data.total : 0;
        const baseConfidence = Math.round(50 + ratio * 40); // 50-90 range
        const mlBonus = usesML ? 8 : 0;
        const dynamicConf = Math.min(baseConfidence + mlBonus, 95);
        detected.push({
          type: "highImpact",
          icon: Zap,
          color: "purple",
          sector,
          source: usesML ? "NLP+ML" : "NLP",
          title:
            language === "pt"
              ? `${s.highImpact}: ${sector}`
              : `${s.highImpact}: ${sector}`,
          description:
            language === "pt"
              ? `${combinedHigh} de ${data.total} eventos são alto impacto (${Math.round(ratio * 100)}%).${usesML ? ` ${mlHighCount} confirmados pelo modelo ML.` : ""} Possível catalisador de mercado.`
              : `${combinedHigh} of ${data.total} events are high-impact (${Math.round(ratio * 100)}%).${usesML ? ` ${mlHighCount} confirmed by ML model.` : ""} Possible market catalyst.`,
          action:
            language === "pt"
              ? `Atenção redobrada. Avaliar posições e stops em ${sector}.`
              : `Stay alert. Evaluate positions and stops in ${sector}.`,
          confidence: dynamicConf,
          eventCount: combinedHigh,
        });
      }
    });

    // 5. SOCIAL BUZZ — if Social sector has volume (NLP)
    if (sectorMap["Social"] && sectorMap["Social"].total >= 3) {
      const socialData = sectorMap["Social"];
      const dominant =
        socialData.bullish > socialData.bearish
          ? "bullish"
          : socialData.bearish > socialData.bullish
            ? "bearish"
            : "neutral";
      detected.push({
        type: "socialBuzz",
        icon: Eye,
        color: "blue",
        sector: "Social",
        source: "NLP",
        title:
          language === "pt"
            ? `${s.socialBuzz}: Varejo Ativo`
            : `${s.socialBuzz}: Retail Active`,
        description:
          language === "pt"
            ? `${socialData.total} posts de redes sociais capturados. Sentimento predominante: ${dominant === "bullish" ? "otimista" : dominant === "bearish" ? "pessimista" : "misto"}.`
            : `${socialData.total} social media posts captured. Dominant sentiment: ${dominant}.`,
        action:
          language === "pt"
            ? `Comparar sentimento social vs. institucional. Divergência = oportunidade.`
            : `Compare social vs. institutional sentiment. Divergence = opportunity.`,
        confidence: 60,
        eventCount: socialData.total,
      });
    }

    // Sort by confidence
    detected.sort((a, b) => b.confidence - a.confidence);
    return detected.slice(0, 5);
  }, [events, predMap, language]);

  const colorMap = {
    green: {
      bg: "bg-green-50 dark:bg-green-900/10",
      border: "border-green-200 dark:border-green-800/40",
      icon: "text-green-600 dark:text-green-400",
      badge:
        "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
      bar: "bg-green-500",
    },
    red: {
      bg: "bg-red-50 dark:bg-red-900/10",
      border: "border-red-200 dark:border-red-800/40",
      icon: "text-red-600 dark:text-red-400",
      badge: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
      bar: "bg-red-500",
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-900/10",
      border: "border-amber-200 dark:border-amber-800/40",
      icon: "text-amber-600 dark:text-amber-400",
      badge:
        "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400",
      bar: "bg-amber-500",
    },
    purple: {
      bg: "bg-purple-50 dark:bg-purple-900/10",
      border: "border-purple-200 dark:border-purple-800/40",
      icon: "text-purple-600 dark:text-purple-400",
      badge:
        "bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400",
      bar: "bg-purple-500",
    },
    blue: {
      bg: "bg-blue-50 dark:bg-blue-900/10",
      border: "border-blue-200 dark:border-blue-800/40",
      icon: "text-blue-600 dark:text-blue-400",
      badge: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
      bar: "bg-blue-500",
    },
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Target size={16} className="text-blue-600 dark:text-blue-400" />
          <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
            {s.title}
          </h2>
        </div>
        <div className="flex items-center gap-2">
          {predictions.length > 0 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-700">
              🧠 ML Active
            </span>
          )}
          <span className="text-[10px] text-slate-400 font-mono">
            {s.subtitle}
          </span>
        </div>
      </div>

      {/* Signals */}
      {signals.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-slate-400 italic">{s.noSignals}</p>
        </div>
      ) : (
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          {signals.map((signal, i) => {
            const colors = colorMap[signal.color];
            const Icon = signal.icon;
            return (
              <div
                key={i}
                className={`${colors.bg} ${colors.border} border rounded-lg p-3 transition-all duration-200 hover:shadow-md`}
              >
                <div className="flex items-start gap-3">
                  <div className={`${colors.icon} mt-0.5 shrink-0`}>
                    <Icon size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                        {signal.title}
                      </h3>
                      <div className="flex items-center gap-1.5 shrink-0 ml-2">
                        {/* Source badge: NLP, ML, or NLP+ML */}
                        <span
                          className={`text-[8px] font-bold px-1 py-0.5 rounded ${
                            signal.source === "ML"
                              ? "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"
                              : signal.source === "NLP+ML"
                                ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                                : "bg-zinc-100 dark:bg-zinc-800 text-zinc-500"
                          }`}
                        >
                          {signal.source}
                        </span>
                        <span
                          className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${colors.badge}`}
                        >
                          {signal.eventCount} {s.events}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-2">
                      {signal.description}
                    </p>

                    {/* Confidence Bar */}
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] text-slate-500 font-mono shrink-0">
                        {s.confidence}
                      </span>
                      <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${colors.bar} rounded-full transition-all duration-500`}
                          style={{ width: `${signal.confidence}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        {signal.confidence}%
                      </span>
                    </div>

                    {/* Suggested Action */}
                    <div className="flex items-start gap-1.5 bg-white/60 dark:bg-slate-900/40 rounded px-2 py-1.5">
                      <ArrowUpRight
                        size={12}
                        className={`${colors.icon} shrink-0 mt-0.5`}
                      />
                      <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium leading-snug">
                        {signal.action}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default OpportunityRadar;
