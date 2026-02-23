"""
Feature Engineering — Extrai features numéricas de um evento enriquecido
para alimentar o modelo de ML.
"""

# Setores e sub-setores mapeados para encoding numérico
SECTOR_MAP = {
    "Crypto": 0, "Tech": 1, "Market": 2,
    "Macro": 3, "Commodities": 4, "Social": 5,
}

SUB_SECTOR_MAP = {
    "Monetary Policy": 0, "Geopolitics": 1, "Fiscal Policy": 2,
    "Economic Data": 3, "General": 4,
    "DeFi": 5, "Regulation": 6, "Mining": 7,
    "AI": 8, "Semiconductors": 9, "Cybersecurity": 10,
}

# Palavras-chave indicadoras de crise / alto impacto
CRISIS_KEYWORDS = [
    "crash", "colapso", "recessão", "recession", "default", "guerra",
    "war", "sanção", "sanction", "tariff", "tarifa", "impeachment",
    "crise", "crisis", "falência", "bankruptcy", "shutdown",
    "emergência", "emergency", "inflação", "inflation",
    "selic", "fed", "juros", "rates", "hike",
]

# Palavras-chave de política pública (foco MVP)
POLICY_KEYWORDS = [
    "governo", "government", "lei", "law", "regulação", "regulation",
    "ministério", "ministry", "congresso", "congress", "senado", "senate",
    "reforma", "reform", "tributária", "fiscal", "orçamento", "budget",
    "subsídio", "subsidy", "privatização", "privatization",
    "lula", "haddad", "campos neto", "galípolo",
    "powell", "yellen", "lagarde", "biden", "trump",
]


def extract_features(event: dict) -> dict:
    """
    Converte um evento enriquecido em um dicionário de features numéricas.
    """
    analytics = event.get("analytics", {})
    sentiment = analytics.get("sentiment", {})
    title = event.get("title", "")
    description = event.get("description", "")
    full_text = f"{title} {description}".lower()
    source = event.get("source", {})
    source_url = (source.get("url", "") or "").lower()
    link = (event.get("link", "") or "").lower()

    # --- Features ---
    features = {
        # Sentimento
        "sentiment_polarity": sentiment.get("polarity", 0.0),
        "sentiment_abs": abs(sentiment.get("polarity", 0.0)),

        # Score atual do Analysis service
        "impact_score": analytics.get("score", 0),

        # Setor e sub-setor (label encoding)
        "sector_encoded": SECTOR_MAP.get(event.get("sector", ""), 5),
        "sub_sector_encoded": SUB_SECTOR_MAP.get(event.get("sub_sector", ""), 4),

        # Contagem de informações extraídas
        "keyword_count": len(event.get("keywords", [])),
        "entity_count": len(event.get("entities", [])),

        # Comprimento do texto (proxy de profundidade)
        "title_length": len(title),
        "description_length": len(description),

        # Indicadores binários
        "has_crisis_keyword": 1 if any(k in full_text for k in CRISIS_KEYWORDS) else 0,
        "has_policy_keyword": 1 if any(k in full_text for k in POLICY_KEYWORDS) else 0,

        # Fonte social (Reddit/Twitter)
        "is_social_source": 1 if any(
            d in source_url or d in link
            for d in ["reddit.com", "twitter.com", "x.com", "nitter."]
        ) else 0,

        # Urgência encoding
        "urgency_encoded": {"critical": 3, "urgent": 2, "normal": 1, "low": 0}.get(
            event.get("urgency", "normal"), 1
        ),

        # Impacto encoding
        "impact_encoded": {"high": 3, "medium": 2, "low": 1}.get(
            event.get("impact", "low"), 1
        ),
    }

    return features


def feature_names() -> list[str]:
    """Retorna lista ordenada de nomes de features (usado no treinamento)."""
    return [
        "sentiment_polarity", "sentiment_abs", "impact_score",
        "sector_encoded", "sub_sector_encoded",
        "keyword_count", "entity_count",
        "title_length", "description_length",
        "has_crisis_keyword", "has_policy_keyword",
        "is_social_source", "urgency_encoded", "impact_encoded",
    ]
