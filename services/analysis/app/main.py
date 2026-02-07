import json
import os
import re
import time
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

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


def score_event(event: dict, keywords: list[str]) -> int:
    """Calcula um score simples de impacto/urgencia baseado em palavras-chave"""
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    keyword_set = set(keywords)

    weights = {
        "crise": 4,
        "crisis": 4,
        "guerra": 5,
        "war": 5,
        "sanction": 4,
        "sanções": 4,
        "default": 5,
        "calote": 5,
        "recessão": 4,
        "inflacao": 3,
        "inflação": 3,
        "juros": 3,
        "tarifa": 2,
        "regulacao": 2,
        "regulação": 2,
        "ata": 2,
        "copom": 3,
        "ibovespa": 2,
        "dolar": 2,
        "dólar": 2,
        "petroleo": 2,
        "petróleo": 2,
    }

    score = 0
    for key, weight in weights.items():
        if key in keyword_set or key in text:
            score += weight

    if event.get("event_type") == "geopolitical":
        score += 3

    return score


def classify_impact(event: dict, score: int) -> str:
    """Classifica impacto com base em score"""
    if score >= 7:
        return "high"
    if score >= 3:
        return "medium"
    return "low"


def classify_urgency(event: dict, keywords: list[str], score: int) -> str:
    """Classifica a urgência com base em score e termos de tempo"""
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    urgent_terms = ["urgent", "breaking", "immediate", "urgente", "agora", "hoje"]
    if any(word in text for word in urgent_terms):
        return "urgent"
    if event.get("event_type") == "geopolitical":
        return "urgent"
    if score >= 6:
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


def clean_text(text: str, max_length: int | None = None) -> str:
    """Remove HTML tags, normalize whitespace, and optionally truncate."""
    if not text:
        return ""
    clean = bleach.clean(text, tags=[], strip=True)
    clean = " ".join(clean.split())
    if max_length and len(clean) > max_length:
        return f"{clean[: max_length - 3].rstrip()}..."
    return clean


def extract_keywords(text: str, max_keywords: int = 6) -> list[str]:
    """Extrai palavras-chave simples a partir do texto"""
    if not text:
        return []

    stopwords = {
        "a",
        "ao",
        "aos",
        "as",
        "com",
        "como",
        "da",
        "das",
        "de",
        "do",
        "dos",
        "e",
        "em",
        "entre",
        "na",
        "nas",
        "no",
        "nos",
        "o",
        "os",
        "para",
        "por",
        "que",
        "se",
        "sem",
        "sua",
        "suas",
        "seu",
        "seus",
        "um",
        "uma",
        "ao",
        "da",
        "de",
    }

    tokens = []
    for raw in text.lower().replace("-", " ").split():
        token = "".join(ch for ch in raw if ch.isalnum())
        if len(token) < 3 or token in stopwords:
            continue
        tokens.append(token)

    if not tokens:
        return []

    frequencies: dict[str, int] = {}
    for token in tokens:
        frequencies[token] = frequencies.get(token, 0) + 1

    sorted_tokens = sorted(
        frequencies.items(), key=lambda item: (-item[1], item[0])
    )
    return [token for token, _count in sorted_tokens[:max_keywords]]


def extract_entities(text: str) -> dict:
    """Extrai entidades simples (pessoa, org, loc) por heuristica"""
    if not text:
        return {"people": [], "orgs": [], "locations": []}

    org_markers = ["SA", "S.A", "Ltda", "LTDA", "Corp", "Bank", "Banco"]
    location_terms = [
        "Brasil",
        "São Paulo",
        "Rio de Janeiro",
        "Brasília",
        "Minas Gerais",
        "Bahia",
        "Paraná",
        "Pernambuco",
        "Ceará",
        "Rio Grande do Sul",
    ]

    candidates = re.findall(r"\b[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇ-]+(?:\s+[A-ZÁÉÍÓÚÂÊÔÃÕÇ][\wÁÉÍÓÚÂÊÔÃÕÇ-]+){0,3}", text)
    people = set()
    orgs = set()
    locations = set()

    for term in location_terms:
        if term.lower() in text.lower():
            locations.add(term)

    for candidate in candidates:
        if any(marker in candidate for marker in org_markers):
            orgs.add(candidate)
        elif candidate.lower() in [loc.lower() for loc in location_terms]:
            locations.add(candidate)
        else:
            if len(candidate.split()) >= 2:
                people.add(candidate)

    return {
        "people": sorted(people)[:5],
        "orgs": sorted(orgs)[:5],
        "locations": sorted(locations)[:5],
    }


def normalize_timestamp(value: str | None) -> str:
    """Normaliza timestamps RSS para ISO 8601 em UTC"""
    if not value:
        return datetime.utcnow().isoformat() + "Z"
    try:
        parsed = parsedate_to_datetime(value)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")
    except (TypeError, ValueError):
        return datetime.utcnow().isoformat() + "Z"


def enrich_event(raw_event: dict) -> dict:
    """
    Enriquece um evento bruto com analise, seguindo o schema padrao do SentinelWatch.

    Entrada: raw_event (do Collector e Scraper)
    Saida: enriched_event (persistivel e consumivel pela API)
    """
    # Extracao segura de campos do evento bruto
    event_id = raw_event.get("event_id", "")
    event_type = raw_event.get("event_type", "financial")
    title = raw_event.get("title", "Sem titulo")
    body = raw_event.get("body", "")
    created_at = normalize_timestamp(raw_event.get("created_at"))
    source = raw_event.get("source", {})

    # Remove HTML tags from RSS content
    title = clean_text(title, max_length=140)
    body = clean_text(body, max_length=400)
    keywords = extract_keywords(f"{title} {body}")
    entities = extract_entities(f"{title} {body}")
    
    # Classificacao e enriquecimento
    score = score_event(raw_event, keywords)
    impact = classify_impact(raw_event, score)
    urgency = classify_urgency(raw_event, keywords, score)
    region = infer_region(raw_event)
    
    # Construção do documento final seguindo o schema
    enriched_event = {
        "id": event_id,
        "type": event_type,
        "title": title,
        "description": body,
        "impact": impact,
        "urgency": urgency,
        "keywords": keywords,
        "entities": entities,
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

            # Publicação para notificação (remove _id inserido pelo Mongo)
            alert_payload = dict(enriched_event)
            alert_payload.pop("_id", None)
            redis_client.lpush(settings["alerts_queue"], json.dumps(alert_payload))
            
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
