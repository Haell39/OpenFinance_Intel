"""
Inference Service — Loop principal.
Consome eventos enriquecidos da fila 'inference_queue',
calcula probabilidade de impacto e salva em MongoDB.
"""

import json
import os
import time
from datetime import datetime, timezone

from pymongo import MongoClient
from redis import Redis

from .features import extract_features
from .model import predict, get_confidence_label
from .llm_layer import analyze_context, ENABLE_LLM


def get_settings() -> dict:
    return {
        "mongo_uri": os.getenv("MONGO_URI", "mongodb://localhost:27017"),
        "mongo_db": os.getenv("MONGO_DB", "sentinelwatch"),
        "redis_host": os.getenv("REDIS_HOST", "localhost"),
        "redis_port": int(os.getenv("REDIS_PORT", 6379)),
        "inference_queue": os.getenv("INFERENCE_QUEUE", "inference_queue"),
    }


def run() -> None:
    """Loop principal do Inference Service."""
    settings = get_settings()

    redis_client = Redis(
        host=settings["redis_host"],
        port=settings["redis_port"],
        decode_responses=True,
    )
    mongo_client = MongoClient(settings["mongo_uri"])
    mongo_db = mongo_client[settings["mongo_db"]]

    print("[inference] ✓ Inference Service iniciado.")
    print(f"[inference]   Queue: {settings['inference_queue']}")
    print(f"[inference]   LLM Layer: {'ON' if ENABLE_LLM else 'OFF'}")
    print("[inference]   Aguardando eventos na fila...")

    while True:
        item = redis_client.brpop(settings["inference_queue"], timeout=5)
        if not item:
            time.sleep(0.5)
            continue

        _queue, payload = item
        try:
            event = json.loads(payload)
        except json.JSONDecodeError as e:
            print(f"[inference] ✕ Erro ao decodificar evento: {e}")
            continue

        try:
            event_id = event.get("id", "unknown")
            title = event.get("title", "Sem título")

            # 1. Feature Engineering
            features = extract_features(event)

            # 2. ML Prediction
            probability, model_version = predict(features)

            # 3. LLM Layer (opcional)
            llm_result = None
            if ENABLE_LLM:
                import asyncio
                llm_result = asyncio.get_event_loop().run_until_complete(
                    analyze_context(event)
                )
                if llm_result:
                    # Ajusta probabilidade com delta do LLM
                    adj = llm_result.get("confidence_adjustment", 0.0)
                    probability = round(min(max(probability + adj, 0.0), 1.0), 3)
                    model_version += "+llm"

            # 4. Classificar confiança
            confidence = get_confidence_label(probability)

            # 5. Determinar categoria de impacto
            sector = event.get("sector", "")
            if features.get("has_policy_keyword"):
                impact_category = "Impacto de Políticas Públicas"
            elif sector in ("Macro", "Commodities", "Market"):
                impact_category = "Impacto Macroeconômico"
            else:
                impact_category = "Impacto Setorial"

            # 6. Construir documento de predição
            prediction_doc = {
                "event_id": event_id,
                "event_title": title,
                "sector": sector,
                "sub_sector": event.get("sub_sector", ""),
                "probability": probability,
                "confidence": confidence,
                "impact_category": impact_category,
                "features_used": features,
                "llm_reasoning": llm_result.get("reasoning") if llm_result else None,
                "model_version": model_version,
                "predicted_at": datetime.now(timezone.utc).isoformat(),
            }

            # 7. Salvar no MongoDB (upsert por event_id)
            mongo_db.predictions.update_one(
                {"event_id": event_id},
                {"$set": prediction_doc},
                upsert=True,
            )

            # Log
            emoji = "🔴" if probability >= 0.75 else "🟡" if probability >= 0.45 else "🟢"
            print(
                f"[inference] {emoji} {event_id[:8]}... "
                f"P={probability:.1%} ({confidence}) "
                f"| {impact_category} | {title[:50]}..."
            )

        except Exception as e:
            print(f"[inference] ✕ Erro ao processar evento: {e}")
            continue


if __name__ == "__main__":
    run()
