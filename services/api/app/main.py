import json
import os
from datetime import datetime
from typing import Literal

from fastapi import FastAPI, Query
from pydantic import BaseModel, AnyHttpUrl
from pymongo import MongoClient
from redis import Redis

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
    
    # Geopolitics (Google News)
    {"url": "https://news.google.com/rss/search?q=Geopolitics+War+Crisis&hl=en-US&gl=US&ceid=US:en", "event_type": "geopolitical", "source_type": "news"},
    {"url": "https://news.google.com/rss/search?q=Global+Economy&hl=en-US&gl=US&ceid=US:en", "event_type": "financial", "source_type": "news"},

    # Brazil (Manter alguns relevantes)
    {"url": "https://www.infomoney.com.br/feed/", "event_type": "financial", "source_type": "financial"},
    {"url": "https://valor.globo.com/rss", "event_type": "financial", "source_type": "financial"},
    
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
        
        await asyncio.sleep(300) # 5 minutes


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

    events = list(
        mongo_db.events.find(filters, {"_id": 0}).sort("timestamp", -1).limit(100)
    )
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
