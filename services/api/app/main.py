import json
import os
from datetime import datetime, timedelta
from typing import Literal

from fastapi import FastAPI, Query, Header
from pydantic import BaseModel, AnyHttpUrl
from pymongo import MongoClient
from redis import Redis
import google.generativeai as genai

app = FastAPI(title="SentinelWatch API")


class SourceCreate(BaseModel):
    url: AnyHttpUrl
    event_type: Literal["financial", "geopolitical", "odds"]
    source_type: Literal["news", "official", "social_media"] = "news"


DEFAULT_SOURCES = [
    # Global / US
    {"url": "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=10000664", "event_type": "financial", "source_type": "news"}, # CNBC Finance
    {"url": "https://feeds.content.dowjones.io/public/rss/mw_topstories", "event_type": "financial", "source_type": "news"}, # MarketWatch
    {"url": "https://cointelegraph.com/rss", "event_type": "financial", "source_type": "news"}, # Crypto
    {"url": "https://decrypt.co/feed", "event_type": "financial", "source_type": "news"}, # Decrypt
    {"url": "https://techcrunch.com/feed/", "event_type": "financial", "source_type": "news"}, # TechCrunch
    {"url": "https://www.theverge.com/rss/index.xml", "event_type": "financial", "source_type": "news"}, # The Verge
    
    # Social / Sentiment (Reddit RSS - Investment-Focused Communities)
    {"url": "https://www.reddit.com/r/wallstreetbets/top/.rss?t=day", "event_type": "financial", "source_type": "social_media"},
    {"url": "https://www.reddit.com/r/investing/top/.rss?t=day", "event_type": "financial", "source_type": "social_media"},
    {"url": "https://www.reddit.com/r/stocks/top/.rss?t=day", "event_type": "financial", "source_type": "social_media"},
    {"url": "https://www.reddit.com/r/StockMarket/top/.rss?t=day", "event_type": "financial", "source_type": "social_media"},
    {"url": "https://www.reddit.com/r/SecurityAnalysis/top/.rss?t=day", "event_type": "financial", "source_type": "social_media"},
    {"url": "https://www.reddit.com/r/economy/top/.rss?t=day", "event_type": "financial", "source_type": "social_media"},

    # Geopolitics (Google News)
    {"url": "https://news.google.com/rss/search?q=Geopolitics+War+Crisis&hl=en-US&gl=US&ceid=US:en", "event_type": "geopolitical", "source_type": "news"},
    {"url": "https://news.google.com/rss/search?q=Global+Economy&hl=en-US&gl=US&ceid=US:en", "event_type": "financial", "source_type": "news"},

    # Brazil (Manter alguns relevantes)
    {"url": "https://www.infomoney.com.br/feed/", "event_type": "financial", "source_type": "financial"},
    {"url": "https://valor.globo.com/rss", "event_type": "financial", "source_type": "financial"},
    {"url": "https://pt.investing.com/rss/news.rss", "event_type": "financial", "source_type": "financial"}, # Investing BR
    {"url": "https://www.cnnbrasil.com.br/feed/", "event_type": "financial", "source_type": "news"}, # CNN Brasil
    
    # Official
    {"url": "https://www.federalreserve.gov/feeds/press_all.xml", "event_type": "financial", "source_type": "official"}, # FED
    {"url": "https://www.bcb.gov.br/rss/ultimasnoticias", "event_type": "financial", "source_type": "official"}, # BCB
]


def get_settings() -> dict:
    return {
        "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        "mongo_db": os.getenv("MONGO_DB", "sentinelwatch"),
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", "6379")),
        "tasks_queue": os.getenv("TASKS_QUEUE", "tasks_queue"),
    }


settings = get_settings()

mongo_client = MongoClient(settings["mongo_uri"])
mongo_db = mongo_client[settings["mongo_db"]]
redis_client = Redis(
    host=settings["redis_host"],
    port=settings["redis_port"],
    decode_responses=True,
)


import asyncio

@app.on_event("startup")
async def startup_event():
    """Start background tasks"""
    print(f"[api] Google GenAI Version: {genai.__version__}")
    # Seed Defaults
    seed_defaults()
    
    # Start Scheduler
    asyncio.create_task(scheduler_loop())


def seed_defaults():
    """Seed default sources if database is empty"""
    count = mongo_db.sources.count_documents({})
    if count == 0:
        print(f"[api] Seeding {len(DEFAULT_SOURCES)} default sources...")
        for src in DEFAULT_SOURCES:
            source_doc = {
                "url": src["url"],
                "event_type": src["event_type"],
                "source_type": src["source_type"],
                "created_at": datetime.utcnow().isoformat() + "Z",
            }
            result = mongo_db.sources.insert_one(source_doc)
            
            # Queue for immediate collection
            task = {
                "source_id": str(result.inserted_id),
                "url": src["url"],
                "event_type": src["event_type"],
            }
            redis_client.lpush(settings["tasks_queue"], json.dumps(task))
        print("[api] Seeding complete.")


async def scheduler_loop():
    """Re-queue all sources every 10 minutes"""
    while True:
        print("[scheduler] Running periodic collection...")
        try:
            sources = list(mongo_db.sources.find({}))
            for source in sources:
                task = {
                    "source_id": str(source["_id"]),
                    "url": source["url"],
                    "event_type": source["event_type"],
                }
                redis_client.lpush(settings["tasks_queue"], json.dumps(task))
            print(f"[scheduler] Re-queued {len(sources)} sources.")
        except Exception as e:
            print(f"[scheduler] Error: {e}")
        
        
        await asyncio.sleep(60) # 1 minute for faster updates


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/sources")
def create_source(payload: SourceCreate) -> dict:
    # Check if URL already exists to avoid duplicates
    existing = mongo_db.sources.find_one({"url": str(payload.url)})
    if existing:
        return {"id": str(existing["_id"]), "status": "already_exists"}

    source_doc = {
        "url": str(payload.url),
        "event_type": payload.event_type,
        "source_type": payload.source_type,
        "created_at": datetime.utcnow().isoformat() + "Z",
    }
    result = mongo_db.sources.insert_one(source_doc)

    task = {
        "source_id": str(result.inserted_id),
        "url": source_doc["url"],
        "event_type": source_doc["event_type"],
    }
    redis_client.lpush(settings["tasks_queue"], json.dumps(task))

    return {"id": str(result.inserted_id), "status": "queued"}


@app.get("/events")
def list_events(
    impact: str | None = None,
    event_type: str | None = Query(default=None, alias="type"),
    region: str | None = None,
) -> list[dict]:
    filters: dict = {}
    if impact:
        filters["impact"] = impact
    if event_type:
        filters["type"] = event_type
    if region and region != "all":
        # Supports both "BR", "US", "GLOBAL", etc.
        filters["location.country"] = region

    # Fetch events including _id (don't suppress it)
    events = list(
        mongo_db.events.find(filters).sort("timestamp", -1).limit(500)
    )
    
    # Convert ObjectId to string id
    for event in events:
        if "_id" in event:
            event["id"] = str(event["_id"])
            del event["_id"]
            
    return events


@app.get("/events/geo-summary")
def geo_summary() -> dict:
    """Agrupa eventos por UF e retorna contagem por região"""
    pipeline = [
        {
            "$group": {
                "_id": "$location.region",
                "count": {"$sum": 1},
            }
        },
        {
            "$sort": {"_id": 1}
        },
    ]
    
    results = list(mongo_db.events.aggregate(pipeline))
    
    # Converte resultado em dicionário { "UF": count }
    geo_data = {}
    for doc in results:
        uf = doc["_id"] if doc["_id"] else "BR"
        geo_data[uf] = doc["count"]
    
    return geo_data


from .llm_service import generate_narrative_title
import asyncio

@app.get("/narratives")
async def get_narratives() -> list[dict]:
    """
    Agrupa eventos das últimas 48h em 'Narrativas de Mercado' por setor.
    Gera títulos via LLM (OpenAI) ou Fallback seguro.
    """
    try:
        # 1. Filtro Temporal (48h)
        cutoff = datetime.utcnow() - timedelta(hours=48)
        cutoff_iso = cutoff.isoformat() + "Z"

        pipeline = [
            {"$match": {"timestamp": {"$gte": cutoff_iso}}},
            {"$sort": {"timestamp": 1}},  # Cronológico para a timeline
            {
                "$group": {
                    "_id": "$sector",
                    "events": {"$push": "$$ROOT"},
                    "avg_polarity": {"$avg": "$analytics.sentiment.polarity"},
                    "event_count": {"$sum": 1}
                }
            }
        ]

        # Executa agregação (Sync wrapper for PyMongo)
        groups = list(mongo_db.events.aggregate(pipeline))

        # Se não houver dados suficientes, retorna MOCK (Fallback)
        if not groups:
            return generate_mock_narratives()

        # Preparar tasks para geração de títulos em paralelo
        tasks = []
        for group in groups:
            sector = group["_id"] or "Global"
            events = group["events"]
            tasks.append(generate_narrative_title(events, sector))
        
        # Executar chamadas LLM e aguardar
        titles = await asyncio.gather(*tasks)

        narratives = []
        for i, group in enumerate(groups):
            sector = group["_id"] or "Global"
            events = group["events"]
            avg_polarity = group.get("avg_polarity", 0)
            
            # Fix IDs in events
            for evt in events:
                if "_id" in evt:
                    evt["id"] = str(evt["_id"])
                    del evt["_id"]

            # STRICT FILTER: Social Sector contains ONLY Reddit/Twitter
            if sector == "Social":
                # Filter events using CORRECT fields: 'link' (article URL) and 'source.url' (feed URL)
                social_domains = ["reddit.com", "twitter.com", "x.com", "nitter."]
                def is_social_event(e):
                    combined = (e.get("link", "") + " " + (e.get("source", {}).get("url", "") or "")).lower()
                    return any(d in combined for d in social_domains)
                events = [e for e in events if is_social_event(e)]
                # Update event count after filtering
                group["event_count"] = len(events)
            
            # If Social became empty but had events, maybe title is now wrong? 
            # It's fine, we just want to suppress non-social noise.

            sentiment_label = "Neutral"
            if avg_polarity > 0.05:
                sentiment_label = "Bullish"
            elif avg_polarity < -0.05:
                sentiment_label = "Bearish"

            # Compute most common insight from events
            event_insights = [e.get("insight", "") for e in events if e.get("insight")]
            most_common_insight = max(set(event_insights), key=event_insights.count) if event_insights else f"Monitorar impacto em {sector}."

            narrative = {
                # Deterministic ID for persistence (Watchlist)
                "id": f"narrative-{sector.lower()}",
                "title": titles[i], # Título gerado via LLM
                "sector": sector,
                "overall_sentiment": sentiment_label,
                "insight": most_common_insight,
                "event_count": group["event_count"],
                "last_updated": datetime.utcnow().isoformat() + "Z",
                "events": events
            }
            narratives.append(narrative)

        # Ensure all 5 pillars are present
        all_sectors = ["Macro", "Market", "Tech", "Crypto", "Commodities", "Social"]
        present_sectors = {n["sector"] for n in narratives}
        
        for sector in all_sectors:
            if sector not in present_sectors:
                narratives.append({
                    "id": f"narrative-{sector.lower()}",
                    "title": f"Sem movimentação relevante em {sector}", # Título placeholder
                    "sector": sector,
                    "overall_sentiment": "Neutral",
                    "event_count": 0,
                    "last_updated": datetime.utcnow().isoformat() + "Z",
                    "events": []
                })

        # Ordenar narrativas por contagem de eventos (Relevância)
        narratives.sort(key=lambda x: x["event_count"], reverse=True)
        return narratives

    except Exception as e:
        print(f"[api] Erro ao gerar narrativas: {e}")
        return generate_mock_narratives()


# --- v1.1.0: Predictions Endpoint ---

@app.get("/predictions")
def get_predictions(
    sector: str | None = None,
    min_probability: float = Query(default=0.0, ge=0.0, le=1.0),
    limit: int = Query(default=500, ge=1, le=500),
):
    """
    Retorna predições de probabilidade de impacto.
    Filtros opcionais: sector, min_probability, limit.
    """
    query = {}
    if sector:
        query["sector"] = sector
    if min_probability > 0:
        query["probability"] = {"$gte": min_probability}

    predictions = list(
        mongo_db.predictions.find(query, {"_id": 0})
        .sort("predicted_at", -1)
        .limit(limit)
    )
    return predictions


@app.get("/predictions/stats")
def get_predictions_stats():
    """
    Retorna estatísticas totais de predições no MongoDB (sem limit).
    Usado pelo dashboard para mostrar contadores reais.
    """
    pipeline = [
        {
            "$group": {
                "_id": "$confidence",
                "count": {"$sum": 1},
                "avg_probability": {"$avg": "$probability"},
            }
        }
    ]
    groups = list(mongo_db.predictions.aggregate(pipeline))

    stats = {"total": 0, "high": 0, "medium": 0, "low": 0, "avg_probability": 0.0}
    total_prob = 0.0
    for g in groups:
        count = g["count"]
        stats[g["_id"]] = count
        stats["total"] += count
        total_prob += g.get("avg_probability", 0) * count

    if stats["total"] > 0:
        stats["avg_probability"] = round(total_prob / stats["total"], 3)

    return stats


@app.post("/admin/cleanup")
def cleanup_old_data(keep_events: int = Query(default=1000, ge=100, le=5000)):
    """
    Mantém apenas os N eventos mais recentes e suas predições.
    Remove eventos e predições mais antigos.
    """
    total_events = mongo_db.events.count_documents({})
    total_predictions = mongo_db.predictions.count_documents({})

    if total_events <= keep_events:
        return {
            "message": f"Nenhuma limpeza necessária. {total_events} eventos <= {keep_events} limite.",
            "events_before": total_events,
            "events_after": total_events,
            "predictions_before": total_predictions,
            "predictions_after": total_predictions,
            "deleted_events": 0,
            "deleted_predictions": 0,
        }

    # Find the timestamp cutoff (keep_events most recent)
    cutoff_event = list(
        mongo_db.events.find({}, {"timestamp": 1})
        .sort("timestamp", -1)
        .skip(keep_events)
        .limit(1)
    )

    if not cutoff_event:
        return {"message": "Sem dados para limpar."}

    cutoff_ts = cutoff_event[0].get("timestamp")

    # Get IDs of events to delete
    old_events = list(
        mongo_db.events.find(
            {"timestamp": {"$lte": cutoff_ts}},
            {"id": 1, "_id": 1}
        )
    )
    old_event_ids = [e.get("id", str(e["_id"])) for e in old_events]

    # Delete old predictions
    pred_result = mongo_db.predictions.delete_many(
        {"event_id": {"$in": old_event_ids}}
    )

    # Delete old events
    event_result = mongo_db.events.delete_many(
        {"timestamp": {"$lte": cutoff_ts}}
    )

    events_after = mongo_db.events.count_documents({})
    preds_after = mongo_db.predictions.count_documents({})

    return {
        "message": f"Limpeza concluída. Mantidos os {keep_events} eventos mais recentes.",
        "events_before": total_events,
        "events_after": events_after,
        "deleted_events": event_result.deleted_count,
        "predictions_before": total_predictions,
        "predictions_after": preds_after,
        "deleted_predictions": pred_result.deleted_count,
    }


# ─────────────────────────────────────────────
# AI Insights — Análise com IA Generativa
# ─────────────────────────────────────────────

class AIAnalyzeRequest(BaseModel):
    module: Literal["summary", "crash", "market"]
    provider: Literal["openai", "gemini"]


def _build_summary_prompt(events: list, predictions: list) -> str:
    """Prompt para resumo dos eventos de alto impacto."""
    lines = []
    for e in events[:10]:
        pred = next((p for p in predictions if p.get("event_id") == e.get("id")), {})
        prob = pred.get("probability", 0)
        conf = pred.get("confidence", "low")
        sent = e.get("analytics", {}).get("sentiment", {}).get("label", "Neutral")
        lines.append(
            f"- [{e.get('sector', 'N/A')}] {e.get('title', 'Sem título')} "
            f"| Sentimento: {sent} | Prob. Impacto ML: {prob:.0%} ({conf}) "
            f"| Urgência: {e.get('urgency', 'normal')}"
        )
    events_text = "\n".join(lines)
    return f"""Você é um analista financeiro sênior do sistema OpenFinance Intel.

Analise os seguintes {len(lines)} eventos de maior impacto detectados pelo nosso pipeline NLP+ML:

{events_text}

Gere um relatório estruturado em PORTUGUÊS com:
1. **Resumo Executivo** (3-4 frases conectando os principais temas)
2. **Top 3 Insights Chave** (com emojis) — impacto potencial no mercado
3. **Ações Recomendadas** — o que um investidor deveria fazer agora
4. **Nível de Atenção Geral** — Baixo/Médio/Alto/Crítico com justificativa

Seja objetivo, use dados concretos dos eventos, e forneça análise de qualidade profissional."""


def _build_crash_prompt(metrics: dict) -> str:
    """Prompt para detector de crashes e bolhas."""
    return f"""Você é um especialista em risco sistêmico e detecção de crises financeiras do sistema OpenFinance Intel.

Analise as seguintes métricas agregadas dos eventos coletados:

📊 Métricas do Sistema:
- Total de eventos analisados: {metrics['total_events']}
- Eventos de alto impacto: {metrics['high_impact']} ({metrics['high_pct']:.1f}%)
- Sentimento geral: {metrics['bullish']} Bullish / {metrics['bearish']} Bearish / {metrics['neutral']} Neutral
- Bearish ratio: {metrics['bear_ratio']:.1f}%
- Setores com mais alertas: {metrics['top_alert_sectors']}
- Urgência média: {metrics['avg_urgency']}
- Keywords de crise detectadas: {metrics['crisis_count']} eventos
- ML probabilidade média de impacto: {metrics['avg_ml_prob']:.1%}
- Eventos com prob. ML >= 75%: {metrics['ml_high_count']}

Gere um relatório de RISCO em PORTUGUÊS com:
1. **🔴 Índice de Risco de Crash** (0-100) — com base nos dados, não invente
2. **Indicadores de Alerta** — quais métricas estão em zona de perigo
3. **Cenário de Risco** — o que poderia acontecer se a tendência continuar
4. **Cenário Base** — probabilidade mais provável
5. **Sinais de Bolha** — se há indícios de euforia irracional em algum setor
6. **Recomendação de Proteção** — estratégias de hedge/proteção

Seja realista, baseie-se nos dados, evite alarmes falsos."""


def _build_market_prompt(sector_data: list) -> str:
    """Prompt para análise de mercado financeiro."""
    lines = []
    for s in sector_data:
        lines.append(
            f"- {s['sector']}: {s['count']} eventos | "
            f"Bullish: {s['bullish']} Bearish: {s['bearish']} | "
            f"Impacto alto: {s['high']} | ML prob. média: {s['avg_prob']:.1%}"
        )
    sector_text = "\n".join(lines)
    return f"""Você é um estrategista de mercado sênior do sistema OpenFinance Intel.

Dados agregados por setor do mercado financeiro:

{sector_text}

Gere uma análise de MERCADO FINANCEIRO em PORTUGUÊS com:
1. **Panorama Geral** — conjuntura atual baseada nos dados
2. **Setores em Destaque** — quais setores merecem atenção e por quê
3. **Setores de Risco** — onde há mais pressão vendedora ou incerteza
4. **Correlações** — como os setores se influenciam mutuamente
5. **Perspectivas** — projeção de curto prazo (próximos dias/semanas)
6. **Alocação Sugerida** — percentual sugerido por setor (sumando 100%)

Seja profissional e analítico. Use os dados reais fornecidos."""


async def _call_llm(prompt: str, provider: str, api_key: str) -> str:
    """Chama o LLM escolhido e retorna o texto."""
    if provider == "openai":
        from openai import OpenAI
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=2000,
            temperature=0.7,
        )
        return response.choices[0].message.content

    elif provider == "gemini":
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel("gemini-2.0-flash")
        response = model.generate_content(prompt)
        return response.text

    return "Provider não suportado."


@app.post("/ai/analyze")
async def ai_analyze(
    request: AIAnalyzeRequest,
    x_ai_key: str = Header(..., alias="X-AI-Key"),
):
    """
    Endpoint de análise IA on-demand.
    Requer API key via header X-AI-Key.
    """
    try:
        module = request.module
        provider = request.provider

        if module == "summary":
            # Top 10 eventos por probabilidade ML
            predictions = list(
                mongo_db.predictions.find({}, {"_id": 0})
                .sort("probability", -1)
                .limit(10)
            )
            event_ids = [p["event_id"] for p in predictions]
            events = list(
                mongo_db.events.find({"id": {"$in": event_ids}}, {"_id": 0})
            )
            prompt = _build_summary_prompt(events, predictions)

        elif module == "crash":
            # Métricas agregadas
            all_events = list(mongo_db.events.find({}, {"_id": 0}))
            all_preds = list(mongo_db.predictions.find({}, {"_id": 0}))

            total = len(all_events)
            high = sum(1 for e in all_events if e.get("impact") == "high")
            bullish = sum(1 for e in all_events if e.get("analytics", {}).get("sentiment", {}).get("label") == "Bullish")
            bearish = sum(1 for e in all_events if e.get("analytics", {}).get("sentiment", {}).get("label") == "Bearish")
            neutral = total - bullish - bearish

            # Crisis keywords
            crisis_kw = ["crash", "colapso", "recessão", "recession", "default", "crise", "crisis", "guerra", "war"]
            crisis_count = sum(
                1 for e in all_events
                if any(k in (e.get("title", "") + " " + e.get("description", "")).lower() for k in crisis_kw)
            )

            # Urgency
            urg_map = {"critical": 3, "urgent": 2, "normal": 1, "low": 0}
            avg_urg = sum(urg_map.get(e.get("urgency", "normal"), 1) for e in all_events) / max(total, 1)

            # Top alert sectors
            sector_alerts = {}
            for e in all_events:
                if e.get("impact") == "high":
                    s = e.get("sector", "Other")
                    sector_alerts[s] = sector_alerts.get(s, 0) + 1
            top_sectors = sorted(sector_alerts.items(), key=lambda x: -x[1])[:3]
            top_sectors_str = ", ".join(f"{s}({c})" for s, c in top_sectors) or "nenhum"

            # ML metrics
            avg_ml = sum(p.get("probability", 0) for p in all_preds) / max(len(all_preds), 1)
            ml_high = sum(1 for p in all_preds if p.get("probability", 0) >= 0.75)

            metrics = {
                "total_events": total,
                "high_impact": high,
                "high_pct": (high / max(total, 1)) * 100,
                "bullish": bullish,
                "bearish": bearish,
                "neutral": neutral,
                "bear_ratio": (bearish / max(total, 1)) * 100,
                "top_alert_sectors": top_sectors_str,
                "avg_urgency": f"{avg_urg:.1f}/3.0",
                "crisis_count": crisis_count,
                "avg_ml_prob": avg_ml,
                "ml_high_count": ml_high,
            }
            prompt = _build_crash_prompt(metrics)

        elif module == "market":
            # Dados por setor
            sectors = ["Market", "Macro", "Commodities", "Tech", "Crypto", "Social"]
            sector_data = []
            for sector in sectors:
                events = list(mongo_db.events.find({"sector": sector}, {"_id": 0}))
                preds = list(mongo_db.predictions.find({"sector": sector}, {"_id": 0}))
                if not events:
                    continue
                sector_data.append({
                    "sector": sector,
                    "count": len(events),
                    "bullish": sum(1 for e in events if e.get("analytics", {}).get("sentiment", {}).get("label") == "Bullish"),
                    "bearish": sum(1 for e in events if e.get("analytics", {}).get("sentiment", {}).get("label") == "Bearish"),
                    "high": sum(1 for e in events if e.get("impact") == "high"),
                    "avg_prob": sum(p.get("probability", 0) for p in preds) / max(len(preds), 1),
                })
            prompt = _build_market_prompt(sector_data)

        else:
            return {"error": "Módulo inválido."}

        # Call LLM
        result = await _call_llm(prompt, provider, x_ai_key)

        return {
            "module": module,
            "provider": provider,
            "analysis": result,
            "generated_at": datetime.utcnow().isoformat() + "Z",
        }

    except Exception as e:
        return {"error": str(e)}


def generate_mock_narratives() -> list[dict]:
    """Retorna dados fictícios para não bloquear o frontend se o banco estiver vazio"""
    return [
        {
            "id": "mock-1",
            "title": "Adoção Institucional & ETFs em Crypto",
            "sector": "Crypto",
            "overall_sentiment": "Bullish",
            "event_count": 5,
            "events": [
                {"id": "mock-evt-1", "title": "BlackRock aumenta posição em Bitcoin", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "high", "analytics": {"sentiment": {"label": "Bullish"}}},
                {"id": "mock-evt-2", "title": "Ethereum atinge nova máxima histórica", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "medium", "analytics": {"sentiment": {"label": "Bullish"}}},
            ]
        },
        {
            "id": "mock-2",
            "title": "Incerteza com Juros & Fed em Macro",
            "sector": "Macro",
            "overall_sentiment": "Bearish",
            "event_count": 8,
            "events": [
                {"id": "mock-evt-3", "title": "Fed sinaliza manutenção das taxas", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "high", "analytics": {"sentiment": {"label": "Bearish"}}},
                {"id": "mock-evt-4", "title": "Inflação nos EUA sobe acima do esperado", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "high", "analytics": {"sentiment": {"label": "Bearish"}}},
            ]
        },
        {
            "id": "mock-3",
            "title": "Rali do Petróleo & OPEP em Commodities",
            "sector": "Commodities",
            "overall_sentiment": "Bullish",
            "event_count": 6,
            "events": [
                {"id": "mock-evt-5", "title": "OPEP anuncia cortes na produção", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "high", "analytics": {"sentiment": {"label": "Bullish"}}},
            ]
        },
        {
            "id": "mock-4",
            "title": "Avanços em IA & Big Tech",
            "sector": "Tech",
            "overall_sentiment": "Bullish",
            "event_count": 5,
            "events": [
                {"id": "mock-evt-8", "title": "Nvidia supera expectativas de lucro", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "high", "analytics": {"sentiment": {"label": "Bullish"}}},
            ]
        },
        {
            "id": "mock-5",
            "title": "Resultados Corporativos & B3 em Market",
            "sector": "Market",
            "overall_sentiment": "Neutral",
            "event_count": 4,
            "events": [
                {"id": "mock-evt-6", "title": "Bancos anunciam lucros recordes no trimestre", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "medium", "analytics": {"sentiment": {"label": "Bullish"}}},
                {"id": "mock-evt-7", "title": "Varejo sofre com juros altos", "timestamp": datetime.utcnow().isoformat() + "Z", "impact": "medium", "analytics": {"sentiment": {"label": "Bearish"}}},
            ]
        }
    ]

