import json
import os
import time
from datetime import datetime
from uuid import uuid4

import feedparser
import requests
from redis import Redis


def get_settings() -> dict:
    return {
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", "6379")),
        "tasks_queue": os.getenv("TASKS_QUEUE", "tasks_queue"),
        "events_queue": os.getenv("EVENTS_QUEUE", "events_queue"),
    }


def collect_from_rss(url: str) -> list[dict]:
    """Coleta entradas de um feed RSS"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        feed = feedparser.parse(response.content)
        
        entries = []
        for entry in feed.entries[:5]:  # Limita a 5 entradas mais recentes
            entries.append({
                "title": entry.get("title", "Sem título"),
                "body": entry.get("summary", entry.get("description", "")),
                "link": entry.get("link", ""),
                "published": entry.get("published", entry.get("updated", "")),
            })
        return entries
    except Exception as e:
        print(f"[collector] Erro ao coletar RSS {url}: {e}")
        return []


def collect_from_source(task: dict) -> list[dict]:
    """Determina tipo de coleta e retorna eventos brutos"""
    url = task.get("url")
    
    # Por simplicidade, trata tudo como RSS por enquanto
    # Pode expandir para scraping HTML no futuro
    if url.endswith(".xml") or "rss" in url.lower() or "feed" in url.lower():
        return collect_from_rss(url)
    
    # Fallback: tenta RSS mesmo se URL não indicar
    entries = collect_from_rss(url)
    if entries:
        return entries
    
    # Se falhar, retorna evento simulado para não travar o pipeline
    print(f"[collector] Usando fallback simulado para {url}")
    return [{
        "title": f"Evento de {url}",
        "body": "Fallback: fonte não pôde ser coletada como RSS.",
        "link": url,
        "published": "",
    }]


def build_raw_events(task: dict) -> list[dict]:
    """Cria eventos brutos a partir das entradas coletadas"""
    collected_data = collect_from_source(task)
    
    raw_events = []
    for data in collected_data:
        raw_events.append({
            "event_id": str(uuid4()),
            "source": {
                "id": task.get("source_id"),
                "url": task.get("url"),
            },
            "event_type": task.get("event_type"),
            "title": data.get("title"),
            "body": data.get("body"),
            "link": data.get("link"),
            "created_at": data.get("published") or datetime.utcnow().isoformat() + "Z",
        })
    
    return raw_events


def run() -> None:
    settings = get_settings()
    redis_client = Redis(
        host=settings["redis_host"],
        port=settings["redis_port"],
        decode_responses=True,
    )

    while True:
        item = redis_client.brpop(settings["tasks_queue"], timeout=5)
        if not item:
            time.sleep(0.5)
            continue

        _queue, payload = item
        task = json.loads(payload)
        
        # Coleta eventos reais da fonte
        raw_events = build_raw_events(task)
        
        # Publica cada evento na fila
        for raw_event in raw_events:
            redis_client.lpush(settings["events_queue"], json.dumps(raw_event))
            print(f"[collector] publicou evento {raw_event['event_id']}: {raw_event['title'][:60]}")


if __name__ == "__main__":
    run()
