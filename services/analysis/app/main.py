import json
import os
import time
from datetime import datetime

from pymongo import MongoClient
from redis import Redis


def get_settings() -> dict:
    return {
        "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        "mongo_db": os.getenv("MONGO_DB", "sentinelwatch"),
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", "6379")),
        "events_queue": os.getenv("EVENTS_QUEUE", "events_queue"),
        "alerts_queue": os.getenv("ALERTS_QUEUE", "alerts_queue"),
    }


def classify_impact(event: dict) -> str:
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    if event.get("event_type") == "geopolitical":
        return "high"
    if any(word in text for word in ["crisis", "war", "sanction", "default", "rate"]):
        return "high"
    if any(word in text for word in ["inflation", "tax", "regulation"]):
        return "medium"
    return "low"


def classify_urgency(event: dict) -> str:
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    if any(word in text for word in ["urgent", "breaking", "immediate"]):
        return "urgent"
    if event.get("event_type") == "geopolitical":
        return "urgent"
    return "normal"


def enrich_event(event: dict) -> dict:
    impact = classify_impact(event)
    urgency = classify_urgency(event)
    region = event.get("region") or "BR"
    return {
        "id": event.get("event_id"),
        "type": event.get("event_type"),
        "title": event.get("title"),
        "description": event.get("body"),
        "impact": impact,
        "urgency": urgency,
        "location": {
            "country": "BR",
            "region": region,
        },
        "source": event.get("source"),
        "timestamp": event.get("created_at"),
        "analyzed_at": datetime.utcnow().isoformat() + "Z",
    }


def run() -> None:
    settings = get_settings()
    redis_client = Redis(
        host=settings["redis_host"],
        port=settings["redis_port"],
        decode_responses=True,
    )
    mongo_client = MongoClient(settings["mongo_uri"])
    mongo_db = mongo_client[settings["mongo_db"]]

    while True:
        item = redis_client.brpop(settings["events_queue"], timeout=5)
        if not item:
            time.sleep(0.5)
            continue

        _queue, payload = item
        raw_event = json.loads(payload)
        enriched_event = enrich_event(raw_event)
        mongo_db.events.insert_one(enriched_event)
        redis_client.lpush(settings["alerts_queue"], json.dumps(enriched_event))
        print(f"[analysis] analyzed event {enriched_event.get('id')}")


if __name__ == "__main__":
    run()
