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

# --- NLP SETUP ---
import spacy
from spacy.language import Language
from textblob import TextBlob # Sentiment Analysis

print("[analysis] Carregando modelos NLP...")
try:
    nlp_pt = spacy.load("pt_core_news_sm")
    nlp_en = spacy.load("en_core_web_sm")
    print("[analysis] Modelos EN/PT carregados com sucesso.")
except OSError:
    print("[analysis] AVISO: Modelos Spacy não encontrados. Baixando fallback...")
    from spacy.cli import download
    download("en_core_web_sm")
    download("pt_core_news_sm")
    nlp_pt = spacy.load("pt_core_news_sm")
    nlp_en = spacy.load("en_core_web_sm")
# -----------------



BLOCKED_KEYWORDS = [
    # Esportes
    "futebol", "campeonato", "paulistão", "brasileirão", "copa do brasil",
    "libertadores", "neymar", "messi", "flamengo", "corinthians", "palmeiras",
    "são paulo fc", "vasco", "grêmio", "inter", "atlético-mg", "cruzeiro",
    "botafogo", "fluminense", "santos fc", "bahia fc", "estádio", "torcida",
    "golaço", "artilheiro", "técnico abel", "técnico tite",
    # Entretenimento / Fofoca
    "bbb", "big brother", "reality", "paredão", "famoso", "celebridade",
    "fofoca", "novela", "renascer", "influencer", "horóscopo", "signo",
    "look do dia", "red carpet", "oscar", "grammy", "show de",
    "namorado de", "separação de",
]


def is_relevant(text: str) -> bool:
    """Verifica se o texto é relevante para investidores (filtra ruído)"""
    text_lower = text.lower()
    
    # Se tiver qualquer palavra bloqueada, descarta
    for word in BLOCKED_KEYWORDS:
        if f" {word} " in f" {text_lower} ": # Match exato de palavra tokenizada
            return False
        if word in text_lower and len(word) > 5: # Match parcial seguro para palavras longas
            return False
            
    return True


    return True


def analyze_sentiment(text: str) -> dict:
    """Calcula polaridade e classifica como Bullish/Bearish/Neutral"""
    blob = TextBlob(text)
    polarity = blob.sentiment.polarity
    subjectivity = blob.sentiment.subjectivity
    
    # Regra definida pelo User
    if polarity > 0.1:
        label = "Bullish"
    elif polarity < -0.1:
        label = "Bearish"
    else:
        label = "Neutral"
        
    return {
        "polarity": round(polarity, 2),
        "subjectivity": round(subjectivity, 2),
        "label": label
    }


def infer_sector(text: str) -> str:
    """Classifica o evento em um setor de investimento (Taxonomia v3 - 5 Pillars)"""
    text_lower = text.lower()
    
    sectors = {
        "Crypto": ["bitcoin", "btc", "ethereum", "eth", "blockchain", "sec", "etf", "binance", "crypto", "solana", "coinbase", "defi", "memecoin"],
        "Tech": ["inteligência artificial", "ai", "apple", "google", "nvidia", "nvda", "software", "big tech", "microsoft", "msft", "meta", "nasdaq", "chip", "cybersecurity", "semicondutores"],
        "Commodities": ["petróleo", "brent", "wti", "opep", "minério", "ferro", "ouro", "gold", "agro", "soja", "energia", "oil", "vale", "petrobras", "prio", "commodities", "milho", "café"],
        
        # Market: O "Motor" Corporativo (Ações, Resultados, Bancos, Varejo)
        # PRIORIDADE SOBRE MACRO: Tickers e termos específicos de bolsa devem se sobressair a termos genéricos de governo/país.
        "Market": [
            "bolsa", "b3", "ibovespa", "ibov", "wall street", "ações", "stocks", "mercado", "fechamento", "abertura", "pregão",
            "bancos", "itaú", "bradesco", "nubank", "santander", "btg", "xp", "corretora",
            "dividendos", "lucro", "prejuízo", "balanço", "trimestre", "earnings", "resultado", "receita", "margem",
            "ipo", "m&a", "fusão", "aquisição", 
            "varejo", "magalu", "via", "americanas", "amazon", "tesla", "tsla", "weg", "embraer", "vale",
            "s&p 500", "spx", "dow jones", "djia", "russell", "nyse", "rally", "bullish", "bearish", "investidores", "investors",
            "shares", "equity", "equities", "alta", "baixa", "cotação", "fii", "fiis", "sobe", "cai", "valoriza", "desvaloriza",
            "futures", "pontos", "points", "gain", "loss", "markets"
        ],

        # Social Trend Radar (Strictly Twitter/Reddit/Viral as requested)
        "Social": [
            "twitter", "x.com", "tweet", "retweet", "thread", "bluesky", 
            "reddit", "subreddit", "r/", "u/", "wallstreetbets", "wsb", 
            "viral", "trending topic", "hype", "fomo", "fud", "community_notes"
        ],

        # Macro: O "Clima" Econômico (Juros, Governo, Geopolítica)
        "Macro": [
            "juros", "inflação", "fed", "fomc", "copom", "selic", "ipca", "pib", "gdp", "recessão", "taxa", "tesouro", "treasury", "bonds",
            "geopolítica", "guerra", "eleições", "governo", "congresso", "senado", "biden", "china", "eua", "europa", "crise", "fiscal"
        ]
    }
    
    # 1. Busca por palavras-chave
    for sector, keywords in sectors.items():
        for kw in keywords:
            if f" {kw} " in f" {text_lower} " or kw in text_lower.split():
                return sector
                
    # 2. Fallback (Macro é o contexto geral padrão)
    return "Macro"


def generate_insight(sector: str, sentiment_label: str) -> str:
    """Gera um insight acionável rápido baseado em setor e sentimento"""
    
    # Insights Genéricos por Setor/Sentimento
    insights = {
        ("Crypto", "Bullish"): "Forte fluxo institucional. Monitorar máximas.",
        ("Crypto", "Bearish"): "Correção em andamento. Risco de suporte quebrar.",
        ("Crypto", "Neutral"): "Consolidação lateral. Aguardar breakout.",
        
        ("Tech", "Bullish"): "Rali em AI e Big Tech impulsiona índices.",
        ("Tech", "Bearish"): "Rotação de capital defensiva. Cuidado com valuations.",
        ("Tech", "Neutral"): "Aguardando earnings para direção clara.",

        ("Commodities", "Bullish"): "Choque de oferta ou demanda aquecida. Bom para exportadoras.",
        ("Commodities", "Bearish"): "Desaceleração global pressiona preços. Atenção a custos.",
        ("Commodities", "Neutral"): "Mercado equilibrado. Foco em eficiência.",

        ("Macro", "Bullish"): "Dados fortes sugerem 'Soft Landing'. Apetite ao risco.",
        ("Macro", "Bearish"): "Risco fiscal ou recessivo. Busca por proteção (Dólar/Ouro).",
        ("Macro", "Neutral"): "Cenário 'Data Dependent'. Monitorar próximos dados.",

        ("Market", "Bullish"): "Resultados corporativos superam expectativas. Compras em Blue Chips.",
        ("Market", "Bearish"): "Aversão a risco pressiona índices. Venda em cíclicos.",
        ("Market", "Neutral"): "Mercado de lado. Stock picking é essencial.",

        ("Social", "Bullish"): "Sentimento otimista nas redes. Monitorar fluxo institucional confirmando.",
        ("Social", "Bearish"): "Pânico social crescente. Possível oportunidade contrarian.",
        ("Social", "Neutral"): "Discussão mista nas redes. Sem consenso forte do varejo.",
    }
    
    return insights.get((sector, sentiment_label), f"Monitorar impacto em {sector}.")


def score_event(event: dict, keywords: list[str], sentiment: dict) -> int:
    """Calcula score de impacto ajustado pelo sentimento"""
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
        # Novos termos investidor
        "dividendos": 3,
        "fii": 3,
        "lucro": 3,
        "prejuízo": 3,
        "balanço": 3,
        "trimestre": 2,
        "b3": 3,
        "fed": 4,
        "ipca": 3,
        "selic": 4,
        "cdi": 2,
        "bitcoin": 3,
        "crypto": 2,
    }

    score = 0
    for key, weight in weights.items():
        if key in keyword_set or key in text:
            score += weight

    if event.get("event_type") == "geopolitical":
        score += 3

    # Boost de Impacto se for Bearish Forte ou Bullish Forte (Volatilidade = Oportunidade)
    if sentiment["label"] == "Bearish" and sentiment["polarity"] <= -0.3:
        score += 3
    elif sentiment["label"] == "Bullish" and sentiment["polarity"] >= 0.3:
        score += 2
        
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


COUNTRY_MAP = {
    # North America
    "estados unidos": "US", "usa": "US", "eua": "US", "fed": "US", "biden": "US", "trump": "US", "wall street": "US", "nyse": "US", "nasdaq": "US", "dólar": "US", "dollar": "US",
    "canadá": "CA", "canada": "CA",
    "méxico": "MX", "mexico": "MX",

    # South America
    "brasil": "BR", "brazil": "BR", "lula": "BR", "bolsonaro": "BR", "ibovespa": "BR", "real": "BR", "b3": "BR", "copom": "BR", "bc": "BR", "campos neto": "BR", "haddad": "BR", "petrobras": "BR", "vale": "BR",
    "argentina": "AR", "milei": "AR", "buenos aires": "AR",
    "chile": "CL",
    "colômbia": "CO", "colombia": "CO",
    "venezuela": "VE", "maduro": "VE",

    # Europe
    "zona do euro": "EU", "eurozone": "EU", "bce": "EU", "ecb": "EU", "lagarde": "EU", "união europeia": "EU",
    "alemanha": "DE", "germany": "DE", "berlim": "DE", "berlin": "DE", "scholz": "DE", "bundesbank": "DE",
    "reino unido": "GB", "uk": "GB", "united kingdom": "GB", "inglaterra": "GB", "londres": "GB", "london": "GB", "sunak": "GB", "starmer": "GB", "boe": "GB",
    "frança": "FR", "france": "FR", "macron": "FR", "paris": "FR",
    "itália": "IT", "italy": "IT", "meloni": "IT", "roma": "IT", "rome": "IT",
    "espanha": "ES", "spain": "ES", "madrid": "ES",
    "ucrânia": "UA", "ukraine": "UA", "zelensky": "UA", "kiev": "UA", "kyiv": "UA",
    "rússia": "RU", "russia": "RU", "putin": "RU", "moscou": "RU", "moscow": "RU", "kremlin": "RU",
    "turquia": "TR", "turkey": "TR", "erdogan": "TR", "istambul": "TR",

    # Asia
    "china": "CN", "pequim": "CN", "beijing": "CN", "xi jinping": "CN", "xangai": "CN", "shanghai": "CN",
    "japão": "JP", "japan": "JP", "tóquio": "JP", "tokyo": "JP", "yen": "JP", "iene": "JP", "boj": "JP", "ueda": "JP",
    "índia": "IN", "india": "IN", "modi": "IN", "nova delhi": "IN", "new delhi": "IN",
    "coreia do sul": "KR", "south korea": "KR", "seul": "KR", "seoul": "KR",
    "taiwan": "TW", "taipé": "TW", "taipei": "TW", "tsmc": "TW",
    "hong kong": "HK", "hsi": "HK",

    # Middle East
    "israel": "IL", "netanyahu": "IL", "tel aviv": "IL", "jerusalém": "IL", "idf": "IL",
    "irã": "IR", "iran": "IR", "teerã": "IR", "tehran": "IR",
    "gaza": "PS", "hamas": "PS", "palestina": "PS",
    "arábia saudita": "SA", "saudi arabia": "SA", "riade": "SA", "riyadh": "SA", "opec": "SA", "opep": "SA", "aramco": "SA",
    "emirados árabes": "AE", "uae": "AE", "dubai": "AE",

    # Oceania
    "austrália": "AU", "australia": "AU", "sydney": "AU", "rba": "AU",

    # Africa
    "áfrica do sul": "ZA", "south africa": "ZA",
    "egito": "EG", "egypt": "EG", "cairo": "EG",
    "nigéria": "NG", "nigeria": "NG",
}


def match_location_token(text: str, token: str) -> bool:
    """
    Verifica se o token de localizacao esta no texto.
    Para tokens curtos ou comuns (rio, santa, espirito), exige match exato ou contexto.
    """
    token_lower = token.lower()
    
    # Lista de tokens perigosos que sao palavras comuns
    common_words = ["rio", "santa", "espirito", "belo", "nova", "campo", "grande", "faria"]
    
    if token_lower in common_words:
        return False # Ignora sozinho. Só pega se vier composto (ex: "Rio de Janeiro")
        
    if len(token) <= 3:
        # Para siglas ou nomes curtos, exige word boundary
        return re.search(rf"\b{re.escape(token_lower)}\b", text) is not None
        
    return token_lower in text


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


def infer_country(event: dict) -> str:
    """
    Infere apenas se é 'Brasil' ou 'Internacional'.
    """
    title = event.get("title", "").lower()
    body = event.get("body", "").lower()
    full_text = f"{title} {body}"
    
    # 1. Check Explicit BR terms
    br_terms = ["brasil", "brazil", "real", "b3", "ibovespa", "copom", "selic", "campos neto", "lula", "haddad", "petrobras", "vale", "brl"]
    for term in br_terms:
        if f" {term} " in f" {full_text} ":
             return "Brasil"

    # 2. Check source URL (br root)
    source_url = event.get("source", {}).get("url", "") or event.get("link", "")
    if ".br" in source_url or "valor.globo" in source_url or "infomoney" in source_url:
        return "Brasil"

    return "Internacional"


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


    except (TypeError, ValueError):
        return datetime.utcnow().isoformat() + "Z"


def enrich_event(raw_event: dict) -> dict | None:
    """
    Enriquece um evento bruto com analise. Retorna None se irrelevante.
    """
    # Extracao segura de campos do evento bruto
    event_id = raw_event.get("event_id", "")
    event_type = raw_event.get("event_type", "financial")
    title = raw_event.get("title", "Sem titulo")
    body = raw_event.get("body", "")
    created_at = normalize_timestamp(raw_event.get("created_at"))
    source = raw_event.get("source", {})
    link = raw_event.get("link", "")

    # Remove HTML tags form RSS content
    title = clean_text(title, max_length=140)
    body = clean_text(body, max_length=400)
    
    # --- FILTRO DE RELEVÂNCIA ---
    full_text = f"{title} {body}"
    if not is_relevant(full_text):
        return None
    # ----------------------------

    keywords = extract_keywords(full_text)
    entities = extract_entities(full_text)
    sentiment = analyze_sentiment(full_text)
    
    # Force Social sector for social media sources (Reddit, Twitter, Nitter)
    source_url = (source.get("url", "") or "").lower()
    link_url = (link or "").lower()
    social_domains = ["reddit.com", "twitter.com", "x.com", "nitter."]
    is_social_source = any(domain in source_url or domain in link_url for domain in social_domains)
    
    # Novas classificações de investimento
    sector = "Social" if is_social_source else infer_sector(full_text)
    insight = generate_insight(sector, sentiment["label"])
    
    # Classificacao e enriquecimento
    score = score_event(raw_event, keywords, sentiment)
    impact = classify_impact(raw_event, score)
    urgency = classify_urgency(raw_event, keywords, score)
    region = infer_country(raw_event)
    
    # Construção do documento final seguindo o schema
    enriched_event = {
        "id": event_id,
        "type": event_type,
        "title": title,
        "description": body,
        "impact": impact,
        "urgency": urgency,
        "sector": sector, # [NEW]
        "insight": insight, # [NEW]
        "keywords": keywords,
        "entities": entities,
        "analytics": {
            "sentiment": sentiment,
            "score": score
        },
        "location": {
            "country": region, # Agora armazena o código do país
            "region": region,  # Mantem compatibilidade retroativa por enquanto
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
            
            if enriched_event is None:
                print(f"[analysis] ✕ evento ignorado (filtro de ruído): {raw_event.get('title', '')[:40]}...")
                continue

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
