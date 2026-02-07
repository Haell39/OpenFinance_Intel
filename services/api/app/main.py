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


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.post("/sources")
def create_source(payload: SourceCreate) -> dict:
    source_doc = {
        "url": str(payload.url),
        "event_type": payload.event_type,
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
    if region and region != "BR":
        filters["location.region"] = region

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
