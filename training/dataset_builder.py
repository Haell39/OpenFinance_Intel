"""
dataset_builder.py — Conector MongoDB → Dataset rotulado para treinamento ML

Conecta ao MongoDB, exporta eventos enriquecidos, aplica labeling 
heurístico automático e salva CSV pronto para o train.py.

Uso:
    python dataset_builder.py                         # MongoDB local
    python dataset_builder.py --mongo-uri mongodb://host:27017  # remoto
"""

import argparse
import csv
import os
import sys
from datetime import datetime

from pymongo import MongoClient

# ──────────────────────────────────────────────
# Feature extraction (réplica exata do inference)
# ──────────────────────────────────────────────
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

CRISIS_KEYWORDS = [
    "crash", "colapso", "recessão", "recession", "default", "guerra",
    "war", "sanção", "sanction", "tariff", "tarifa", "impeachment",
    "crise", "crisis", "falência", "bankruptcy", "shutdown",
    "emergência", "emergency", "inflação", "inflation",
    "selic", "fed", "juros", "rates", "hike",
]

POLICY_KEYWORDS = [
    "governo", "government", "lei", "law", "regulação", "regulation",
    "ministério", "ministry", "congresso", "congress", "senado", "senate",
    "reforma", "reform", "tributária", "fiscal", "orçamento", "budget",
    "subsídio", "subsidy", "privatização", "privatization",
    "lula", "haddad", "campos neto", "galípolo",
    "powell", "yellen", "lagarde", "biden", "trump",
]

FEATURE_NAMES = [
    "sentiment_polarity", "sentiment_abs", "impact_score",
    "sector_encoded", "sub_sector_encoded",
    "keyword_count", "entity_count",
    "title_length", "description_length",
    "has_crisis_keyword", "has_policy_keyword",
    "is_social_source", "urgency_encoded", "impact_encoded",
]


def extract_features(event: dict) -> dict:
    """Extrai features numéricas de um evento — idêntico ao inference/app/features.py."""
    analytics = event.get("analytics", {})
    sentiment = analytics.get("sentiment", {})
    title = event.get("title", "")
    description = event.get("description", "")
    full_text = f"{title} {description}".lower()
    source = event.get("source", {})
    source_url = (source.get("url", "") or "").lower()
    link = (event.get("link", "") or "").lower()

    return {
        "sentiment_polarity": sentiment.get("polarity", 0.0),
        "sentiment_abs": abs(sentiment.get("polarity", 0.0)),
        "impact_score": analytics.get("score", 0),
        "sector_encoded": SECTOR_MAP.get(event.get("sector", ""), 5),
        "sub_sector_encoded": SUB_SECTOR_MAP.get(event.get("sub_sector", ""), 4),
        "keyword_count": len(event.get("keywords", [])),
        "entity_count": len(event.get("entities", [])),
        "title_length": len(title),
        "description_length": len(description),
        "has_crisis_keyword": 1 if any(k in full_text for k in CRISIS_KEYWORDS) else 0,
        "has_policy_keyword": 1 if any(k in full_text for k in POLICY_KEYWORDS) else 0,
        "is_social_source": 1 if any(
            d in source_url or d in link
            for d in ["reddit.com", "twitter.com", "x.com", "nitter."]
        ) else 0,
        "urgency_encoded": {"critical": 3, "urgent": 2, "normal": 1, "low": 0}.get(
            event.get("urgency", "normal"), 1
        ),
        "impact_encoded": {"high": 3, "medium": 2, "low": 1}.get(
            event.get("impact", "low"), 1
        ),
    }


# ──────────────────────────────────────────────
# Labeling heurístico automático
# ──────────────────────────────────────────────
def auto_label(event: dict, all_titles: dict) -> int:
    """
    Rotula automaticamente um evento como alto impacto (1) ou baixo (0).

    Critérios para label = 1 (alto impacto):
      - Evento com título similar apareceu em 3+ fontes distintas
      - Score >= 7 E contém keywords de crise
      - Urgência = critical

    Critérios para label = 0 (baixo impacto):
      - Score <= 3 E sem crisis/policy keywords
      - Impacto = low E sem urgência

    Eventos ambíguos recebem label baseado no score médio.
    """
    analytics = event.get("analytics", {})
    score = analytics.get("score", 0)
    title = event.get("title", "")
    description = event.get("description", "")
    full_text = f"{title} {description}".lower()
    impact = event.get("impact", "low")
    urgency = event.get("urgency", "normal")

    has_crisis = any(k in full_text for k in CRISIS_KEYWORDS)
    has_policy = any(k in full_text for k in POLICY_KEYWORDS)

    # Título normalizado para dedup
    title_key = title.lower().strip()[:60]  # primeiros 60 chars
    source_count = all_titles.get(title_key, 1)

    # ── Alto impacto ──
    if source_count >= 3:
        return 1
    if score >= 7 and has_crisis:
        return 1
    if urgency == "critical":
        return 1
    if impact == "high" and score >= 6:
        return 1
    if score >= 8 and has_policy:
        return 1

    # ── Baixo impacto ──
    if score <= 3 and not has_crisis and not has_policy:
        return 0
    if impact == "low" and urgency in ("low", "normal") and score <= 4:
        return 0

    # ── Ambíguo → baseado no score ──
    return 1 if score >= 6 else 0


def build_title_frequency(events: list) -> dict:
    """Conta quantas vezes cada título (normalizado) aparece — proxy para multi-fonte."""
    freq = {}
    for e in events:
        key = e.get("title", "").lower().strip()[:60]
        freq[key] = freq.get(key, 0) + 1
    return freq


# ──────────────────────────────────────────────
# Main
# ──────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="Exporta dataset de treinamento do MongoDB")
    parser.add_argument("--mongo-uri", default="mongodb://localhost:27017", help="URI do MongoDB")
    parser.add_argument("--db", default="sentinelwatch", help="Nome do banco")
    parser.add_argument("--output", default="training/dataset.csv", help="Caminho do CSV de saída")
    parser.add_argument("--min-events", type=int, default=50, help="Mínimo de eventos para exportar")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  OpenFinance Intel — Dataset Builder")
    print(f"{'='*60}")
    print(f"  MongoDB:  {args.mongo_uri}")
    print(f"  Database: {args.db}")
    print(f"  Output:   {args.output}")
    print(f"{'='*60}\n")

    # Conecta ao MongoDB
    client = MongoClient(args.mongo_uri)
    db = client[args.db]
    events_coll = db["events"]

    # Exporta todos os eventos
    events = list(events_coll.find({}, {"_id": 0}))
    total = len(events)
    print(f"📊 Eventos encontrados: {total}")

    if total < args.min_events:
        print(f"\n⚠️  Mínimo recomendado: {args.min_events} eventos.")
        print(f"   Continue acumulando dados e tente novamente.\n")
        sys.exit(1)

    # Conta frequência de títulos (proxy multi-fonte)
    title_freq = build_title_frequency(events)

    # Extrai features + label para cada evento
    dataset = []
    label_counts = {0: 0, 1: 0}

    for event in events:
        features = extract_features(event)
        label = auto_label(event, title_freq)
        label_counts[label] += 1

        row = {name: features[name] for name in FEATURE_NAMES}
        row["label"] = label
        row["event_id"] = event.get("id", "")
        row["title"] = event.get("title", "")[:100]
        dataset.append(row)

    # Salva CSV
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    fieldnames = FEATURE_NAMES + ["label", "event_id", "title"]

    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(dataset)

    # Stats
    pct_high = (label_counts[1] / total * 100) if total else 0
    pct_low = (label_counts[0] / total * 100) if total else 0

    print(f"\n✅ Dataset exportado: {args.output}")
    print(f"   Total:          {total} eventos")
    print(f"   Alto impacto:   {label_counts[1]} ({pct_high:.1f}%)")
    print(f"   Baixo impacto:  {label_counts[0]} ({pct_low:.1f}%)")
    print(f"   Features:       {len(FEATURE_NAMES)}")
    print(f"\n💡 Próximo passo: python training/train.py\n")


if __name__ == "__main__":
    main()
