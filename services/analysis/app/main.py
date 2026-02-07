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


BRAZILIAN_STATES_MAP = {
    # São Paulo
    "são paulo": "SP",
    "sao paulo": "SP",
    "sp": "SP",
    "bolsa": "SP",  # B3 Bolsa em SP
    # Rio de Janeiro
    "rio de janeiro": "RJ",
    "rio janeiro": "RJ",
    "rj": "RJ",
    "petrobras": "RJ",  # Headquarters
    # Minas Gerais
    "minas gerais": "MG",
    "minas": "MG",
    "mg": "MG",
    "belo horizonte": "MG",
    # Distrito Federal
    "brasília": "DF",
    "brasilia": "DF",
    "distrito federal": "DF",
    "df": "DF",
    # Bahia
    "bahia": "BA",
    "ba": "BA",
    "salvador": "BA",
    # Pernambuco
    "pernambuco": "PE",
    "pe": "PE",
    "recife": "PE",
    # Rio Grande do Sul
    "rio grande do sul": "RS",
    "rs": "RS",
    "porto alegre": "RS",
    # Santa Catarina
    "santa catarina": "SC",
    "sc": "SC",
    "florianópolis": "SC",
    "florianopolis": "SC",
    # Paraná
    "paraná": "PR",
    "parana": "PR",
    "pr": "PR",
    "curitiba": "PR",
    # Ceará
    "ceará": "CE",
    "ceara": "CE",
    "ce": "CE",
    "fortaleza": "CE",
    # Pará
    "pará": "PA",
    "pa": "PA",
    "belém": "PA",
    "belem": "PA",
    # Maranhão
    "maranhão": "MA",
    "maranhao": "MA",
    "ma": "MA",
    # Goiás
    "goiás": "GO",
    "goias": "GO",
    "go": "GO",
    "goiânia": "GO",
    "goiania": "GO",
    # Espírito Santo
    "espírito santo": "ES",
    "espirito santo": "ES",
    "es": "ES",
    # Mato Grosso
    "mato grosso": "MT",
    "mt": "MT",
    # Mato Grosso do Sul
    "mato grosso do sul": "MS",
    "ms": "MS",
    # Tocantins
    "tocantins": "TO",
    "to": "TO",
    # Rondônia
    "rondônia": "RO",
    "rondonia": "RO",
    "ro": "RO",
    # Roraima
    "roraima": "RR",
    "rr": "RR",
    # Amapá
    "amapá": "AP",
    "amapa": "AP",
    "ap": "AP",
    # Amazonas
    "amazonas": "AM",
    "am": "AM",
    # Alagoas
    "alagoas": "AL",
    "al": "AL",
    # Acre
    "acre": "AC",
    "ac": "AC",
    "rio branco": "AC",
    # Sergipe
    "sergipe": "SE",
    "se": "SE",
    # Paraíba
    "paraíba": "PB",
    "paraiba": "PB",
    "pb": "PB",
    # Rio Grande do Norte
    "rio grande do norte": "RN",
    "rn": "RN",
    # Piauí
    "piauí": "PI",
    "piaui": "PI",
    "pi": "PI",
    "teresina": "PI",
}


BRAZILIAN_CITIES_MAP = {
    # Capitais (todas)
    "rio branco": "AC",
    "maceió": "AL",
    "maceio": "AL",
    "macapá": "AP",
    "macapa": "AP",
    "manaus": "AM",
    "salvador": "BA",
    "fortaleza": "CE",
    "brasília": "DF",
    "brasilia": "DF",
    "vitória": "ES",
    "vitoria": "ES",
    "goiânia": "GO",
    "goiania": "GO",
    "são luís": "MA",
    "sao luis": "MA",
    "cuiabá": "MT",
    "cuiaba": "MT",
    "campo grande": "MS",
    "belém": "PA",
    "belem": "PA",
    "joão pessoa": "PB",
    "joao pessoa": "PB",
    "recife": "PE",
    "teresina": "PI",
    "rio de janeiro": "RJ",
    "natal": "RN",
    "porto alegre": "RS",
    "porto velho": "RO",
    "boa vista": "RR",
    "florianópolis": "SC",
    "florianopolis": "SC",
    "são paulo": "SP",
    "sao paulo": "SP",
    "aracaju": "SE",
    "palmas": "TO",
    # Polos tecnologicos/financeiros
    "campinas": "SP",
    "são josé dos campos": "SP",
    "sao jose dos campos": "SP",
    "são carlos": "SP",
    "sao carlos": "SP",
    "ribeirão preto": "SP",
    "ribeirao preto": "SP",
    "santos": "SP",
    "guarulhos": "SP",
    "osasco": "SP",
    "sorocaba": "SP",
    "jundiaí": "SP",
    "jundiai": "SP",
    "porto digital": "PE",
    "joinville": "SC",
    "blumenau": "SC",
    "itajai": "SC",
    "itajaí": "SC",
    "belo horizonte": "MG",
    "contagem": "MG",
    "betim": "MG",
    "uberaba": "MG",
    "uberlândia": "MG",
    "uberlandia": "MG",
    "juiz de fora": "MG",
    "curitiba": "PR",
    "londrina": "PR",
    "maringá": "PR",
    "maringa": "PR",
    "cascavel": "PR",
    "foz do iguaçu": "PR",
    "foz do iguacu": "PR",
    "caxias do sul": "RS",
    "pelotas": "RS",
    "canoas": "RS",
    "niterói": "RJ",
    "niteroi": "RJ",
    "duque de caxias": "RJ",
    "nova iguaçu": "RJ",
    "nova iguacu": "RJ",
    "campos dos goytacazes": "RJ",
    "feira de santana": "BA",
    "vitória da conquista": "BA",
    "vitoria da conquista": "BA",
    "jaboatão": "PE",
    "jaboatao": "PE",
    "olinda": "PE",
    "juazeiro do norte": "CE",
    "sobral": "CE",
    "santarém": "PA",
    "santarem": "PA",
    "marabá": "PA",
    "maraba": "PA",
    "anápolis": "GO",
    "anapolis": "GO",
    "aparecida de goiânia": "GO",
    "aparecida de goiania": "GO",
    "taguatinga": "DF",
}


def match_location_token(text: str, token: str) -> bool:
    if len(token) <= 3:
        return re.search(rf"\b{re.escape(token)}\b", text) is not None
    return token in text


def extract_location_ner(text: str) -> str | None:
    """Extrai localização usando padrões contextuais (NER simplificado)"""
    # Padrões contextuais que indicam localização geográfica
    patterns = [
        r"governo d[oa]s? (\w+(?:\s+\w+){0,3})",
        r"assembleia legislativa d[oa]s? (\w+(?:\s+\w+){0,3})",
        r"prefeitura d[ea] (\w+(?:\s+\w+){0,2})",
        r"tribunal de justiça d[oa]s? (\w+(?:\s+\w+){0,3})",
        r"secretaria d[ea] (\w+(?:\s+\w+){0,2})",
        r"operação em (\w+(?:\s+\w+){0,2})",
        r"ação em (\w+(?:\s+\w+){0,2})",
        r"estado d[oa]s? (\w+(?:\s+\w+){0,3})",
        r"cidade de (\w+(?:\s+\w+){0,2})",
        r"município de (\w+(?:\s+\w+){0,2})",
        r"em (\w+(?:\s+\w+){0,2}), (\w{2})\b",  # "em CidadeX, SP"
    ]
    
    for pattern in patterns:
        matches = re.finditer(pattern, text, re.IGNORECASE)
        for match in matches:
            location = match.group(1).lower().strip()
            
            # Tenta encontrar nos mapas de cidade primeiro
            if location in BRAZILIAN_CITIES_MAP:
                return BRAZILIAN_CITIES_MAP[location]
            
            # Depois tenta estados
            if location in BRAZILIAN_STATES_MAP:
                return BRAZILIAN_STATES_MAP[location]
    
    return None


def infer_region(event: dict) -> str:
    """Infere a sigla do estado (UF) do Brasil baseada no conteúdo do evento"""
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()
    
    # Método 1 (PRIORITÁRIO): Reconhecimento de entidades contextuais (NER)
    ner_result = extract_location_ner(text)
    if ner_result:
        return ner_result
    
    # Método 2: Busca por matches de cidades no mapa (mais específicas primeiro)
    sorted_cities = sorted(BRAZILIAN_CITIES_MAP.keys(), key=len, reverse=True)
    for city_name in sorted_cities:
        if match_location_token(text, city_name):
            return BRAZILIAN_CITIES_MAP[city_name]

    # Método 3: Busca por matches de estados no mapa (mais específicos primeiro)
    # Ordena por tamanho decrescente para capturar "rio grande do sul" antes de "rio"
    sorted_keys = sorted(BRAZILIAN_STATES_MAP.keys(), key=len, reverse=True)
    for state_name in sorted_keys:
        if match_location_token(text, state_name):
            return BRAZILIAN_STATES_MAP[state_name]
    
    # Default: Brasil (todos os eventos sem localização específica ficam em BR)
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
    link = raw_event.get("link", "")

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
        "link": link,
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
            
            # Persistência única em MongoDB (Upsert para evitar duplicatas)
            mongo_db.events.update_one(
                {"id": enriched_event["id"]},
                {"$set": enriched_event},
                upsert=True
            )

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
