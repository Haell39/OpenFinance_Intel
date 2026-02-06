import json
import os
import time
from datetime import datetime

import bleach
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
    """Classifica o impacto do evento baseado no tipo e conteúdo"""
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    if event.get("event_type") == "geopolitical":
        return "high"
    if any(word in text for word in ["crisis", "war", "sanction", "default", "rate"]):
        return "high"
    if any(word in text for word in ["inflation", "tax", "regulation"]):
        return "medium"
    return "low"


def classify_urgency(event: dict) -> str:
    """Classifica a urgência do evento"""
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    if any(word in text for word in ["urgent", "breaking", "immediate"]):
        return "urgent"
    if event.get("event_type") == "geopolitical":
        return "urgent"
    return "normal"


def infer_region(event: dict) -> str:
    """Infere a região do Brasil baseada no conteúdo do evento"""
    # Por enquanto, usa "BR" para todos. Pode ser expandido com lógica NLP no futuro
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    
    # Mapeamento simples de palavras-chave para regiões (pode ser expandido)
    region_keywords = {
        "sp": ["são paulo", "sp", "bolsa"],
        "rj": ["rio de janeiro", "rj"],
        "mg": ["minas gerais", "mg"],
        "df": ["brasília", "distrito federal", "df"],
        "ba": ["bahia", "salvador"],
        "pe": ["pernambuco", "recife"],
        "rs": ["rio grande do sul", "porto alegre"],
        "sc": ["santa catarina"],
        "pr": ["paraná"],
        "ce": ["ceará"],
    }
    
    for region, keywords in region_keywords.items():
        if any(kw in text for kw in keywords):
            return region.upper()
    
    return "BR"


def clean_text(text: str) -> str:
    """Remove HTML tags and normalize whitespace"""
    if not text:
        return ""
    clean = bleach.clean(text, tags=[], strip=True)
    clean = " ".join(clean.split())
    return clean


def enrich_event(raw_event: dict) -> dict:
    """
    Enriquece um evento bruto com analise, seguindo o schema padrao do SentinelWatch.
    
    Entrada: raw_event (do Collector e Scraper)
    Saida: enriched_event (persistivel e consumivel pela API)
    ""Remove HTML tags from RSS content
    title = clean_text(title)
    body = clean_text(body)
    
    # "
    # Extracao segura de campos do evento bruto
    event_id = raw_event.get("event_id", "")
    event_type = raw_event.get("event_type", "financial")
    title = raw_event.get("title", "Sem titulo")
    body = raw_event.get("body", "")
    created_at = raw_event.get("created_at", datetime.utcnow().isoformat() + "Z")
    source = raw_event.get("source", {})
    
    # Classificacao e enriquecimento
    impact = classify_impact(raw_event)
    urgency = classify_urgency(raw_event)
    region = infer_region(raw_event)
    
    # Construção do documento final seguindo o schema
    enriched_event = {
        "id": event_id,
        "type": event_type,
        "title": title,
        "description": body,
        "impact": impact,
        "urgency": urgency,
        "location": {
            "country": "BR",
            "region": region,
        },
        "source": source if isinstance(source, dict) else {},
        "timestamp": created_at,
        "analyzed_at": datetime.utcnow().isoformat() + "Z",
    }
    
    return enriched_event


def run() -> None:
    """Loop principal do Analysis Service"""
    settings = get_settings()
    redis_client = Redis(
        host=settings["redis_host"],
        port=settings["redis_port"],
        decode_responses=True,
    )
    mongo_client = MongoClient(settings["mongo_uri"])
    mongo_db = mongo_client[settings["mongo_db"]]

    print("[analysis] iniciado. Aguardando eventos na fila...")

    while True:
        item = redis_client.brpop(settings["events_queue"], timeout=5)
        if not item:
            time.sleep(0.5)
            continue

        _queue, payload = item
        try:
            raw_event = json.loads(payload)
        except json.JSONDecodeError as e:
            print(f"[analysis] erro ao decodificar evento: {e}")
            continue

        try:
            # Enriquecimento único e centralizado
            enriched_event = enrich_event(raw_event)
            
            # Persistência única em MongoDB
            mongo_db.events.insert_one(enriched_event)
            
            # Publicação para notificação
            redis_client.lpush(settings["alerts_queue"], json.dumps(enriched_event))
            
            print(
                f"[analysis] ✓ evento {enriched_event['id'][:8]}... "
                f"({enriched_event['type']}, {enriched_event['impact']}) "
                f"processado e salvo"
            )
        except Exception as e:
            print(f"[analysis] erro ao processar evento: {e}")
            continue


if __name__ == "__main__":
    run()
