import json
import os
from datetime import datetime, timedelta
from typing import Literal

from fastapi import FastAPI, Query
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

