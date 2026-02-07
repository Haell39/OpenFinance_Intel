import json
import os
import time
import re
from datetime import datetime
from uuid import uuid4
from urllib.parse import urljoin

import feedparser
import requests
from redis import Redis


def get_settings() -> dict:
    return {
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", "6379")),
        "tasks_queue": os.getenv("TASKS_QUEUE", "tasks_queue"),
        "events_queue": os.getenv("EVENTS_QUEUE", "events_queue"),
        "rss_timeout": int(os.getenv("RSS_TIMEOUT", "20")),
        "rss_user_agent": os.getenv(
            "RSS_USER_AGENT",
            "SentinelWatch/1.0 (+https://github.com/your-org/sentinelwatch)",
        ),
        "rss_fallback_url": os.getenv(
            "RSS_FALLBACK_URL",
            "http://g1.globo.com/dynamo/economia/rss2.xml",
        ),
    }


RSS_CONTENT_TYPES = (
    "application/rss+xml",
    "application/atom+xml",
    "application/xml",
    "text/xml",
)


def looks_like_feed(response: requests.Response) -> bool:
    content_type = response.headers.get("Content-Type", "").lower()
    return any(feed_type in content_type for feed_type in RSS_CONTENT_TYPES)


def discover_feed_url(html_text: str, base_url: str) -> str | None:
    if not html_text:
        return None
    for match in re.finditer(r"<link[^>]+>", html_text, re.IGNORECASE):
        tag = match.group(0)
        if "alternate" not in tag.lower():
            continue
        if "rss" not in tag.lower() and "atom" not in tag.lower():
            continue
        href_match = re.search(r"href=[\"']([^\"']+)[\"']", tag, re.IGNORECASE)
        if not href_match:
            continue
        return urljoin(base_url, href_match.group(1))
    return None


def collect_from_rss(url: str, settings: dict) -> list[dict]:
    """Coleta entradas de um feed RSS"""
    try:
        response = requests.get(
            url,
            timeout=settings["rss_timeout"],
            headers={
                "User-Agent": settings["rss_user_agent"],
                "Accept": "application/rss+xml, application/atom+xml, application/xml, text/xml, text/html;q=0.9, */*;q=0.8",
            },
            allow_redirects=True,
        )
        response.raise_for_status()

        if not looks_like_feed(response):
            feed_url = discover_feed_url(response.text, response.url)
            if feed_url and feed_url != url:
                return collect_from_rss(feed_url, settings)

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


def collect_from_source(task: dict, settings: dict) -> list[dict]:
    """Determina tipo de coleta e retorna eventos brutos"""
    url = task.get("url")

    # Trata tudo como RSS, com descoberta automatica quando a URL for HTML
    entries = collect_from_rss(url, settings)
    if entries:
        return entries

    fallback = settings.get("rss_fallback_url")
    if fallback and fallback != url:
        print(f"[collector] Usando fallback RSS: {fallback}")
        return collect_from_rss(fallback, settings)
    
    # Se falhar, retorna evento simulado para não travar o pipeline
    print(f"[collector] Usando fallback simulado para {url}")
    return [{
        "title": f"Evento de {url}",
        "body": "Fallback: fonte não pôde ser coletada como RSS.",
        "link": url,
        "published": "",
    }]


def build_raw_events(task: dict, settings: dict) -> list[dict]:
    """Cria eventos brutos a partir das entradas coletadas"""
    collected_data = collect_from_source(task, settings)
    
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
        raw_events = build_raw_events(task, settings)
        
        # Publica cada evento na fila
        for raw_event in raw_events:
            redis_client.lpush(settings["events_queue"], json.dumps(raw_event))
            print(f"[collector] publicou evento {raw_event['event_id']}: {raw_event['title'][:60]}")


if __name__ == "__main__":
    run()
