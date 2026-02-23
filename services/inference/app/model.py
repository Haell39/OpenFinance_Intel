"""
Model — Carrega modelo ML treinado (RandomForest) e expõe predict().
Se modelo não estiver disponível, usa fallback heurístico.
"""

import os
import numpy as np

from .features import feature_names

# Tenta carregar joblib (pode falhar se modelo não existe ainda)
try:
    import joblib
    JOBLIB_AVAILABLE = True
except ImportError:
    JOBLIB_AVAILABLE = False

MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "models", "impact_model_v1.joblib"
)

_model = None
_model_version = "heuristic_v1"  # default


def _load_model():
    """Tenta carregar o modelo treinado do disco."""
    global _model, _model_version

    if not JOBLIB_AVAILABLE:
        print("[inference/model] joblib não disponível. Usando fallback heurístico.")
        return

    if os.path.exists(MODEL_PATH):
        try:
            _model = joblib.load(MODEL_PATH)
            _model_version = "rf_v1"
            print(f"[inference/model] ✓ Modelo carregado: {MODEL_PATH}")
        except Exception as e:
            print(f"[inference/model] ✕ Erro ao carregar modelo: {e}")
            _model = None
    else:
        print(f"[inference/model] Modelo não encontrado em {MODEL_PATH}. Usando fallback heurístico.")


def _heuristic_predict(features: dict) -> float:
    """
    Fallback heurístico quando não há modelo treinado.
    Calcula probabilidade baseada em regras simples.
    Retorna float entre 0.0 e 1.0.
    """
    score = 0.0

    # Sentimento extremo (bearish forte = mais impacto potencial)
    polarity = features.get("sentiment_polarity", 0.0)
    score += abs(polarity) * 0.15

    # Score de impacto do Analysis service (0-10 → 0-0.3)
    impact = features.get("impact_score", 0)
    score += min(impact / 10.0, 1.0) * 0.30

    # Keywords de crise (+0.20)
    if features.get("has_crisis_keyword", 0):
        score += 0.20

    # Keywords de política pública (+0.15)
    if features.get("has_policy_keyword", 0):
        score += 0.15

    # Setores de maior impacto macro (Macro, Market)
    sector = features.get("sector_encoded", 5)
    if sector in (2, 3):  # Market, Macro
        score += 0.10

    # Urgência alta
    urgency = features.get("urgency_encoded", 1)
    if urgency >= 2:
        score += 0.10

    # Clamp entre 0.0 e 1.0
    return round(min(max(score, 0.0), 1.0), 3)


def predict(features: dict) -> tuple[float, str]:
    """
    Prediz a probabilidade de impacto de um evento.

    Returns:
        (probability, model_version)
        probability: float 0.0 – 1.0
        model_version: str identifica qual modelo/método foi usado
    """
    if _model is not None:
        try:
            # Constrói array ordenado de features
            names = feature_names()
            x = np.array([[features.get(name, 0) for name in names]])

            # predict_proba retorna [[prob_class_0, prob_class_1]]
            if hasattr(_model, "predict_proba"):
                proba = _model.predict_proba(x)[0]
                # Classe 1 = alto impacto
                probability = float(proba[1]) if len(proba) > 1 else float(proba[0])
            else:
                # Fallback para predict()
                prediction = _model.predict(x)[0]
                probability = float(prediction)

            return round(min(max(probability, 0.0), 1.0), 3), _model_version

        except Exception as e:
            print(f"[inference/model] Erro na predição ML, usando fallback: {e}")

    # Fallback heurístico
    return _heuristic_predict(features), "heuristic_v1"


def get_confidence_label(probability: float) -> str:
    """Converte probabilidade em label visual."""
    if probability >= 0.75:
        return "high"
    elif probability >= 0.45:
        return "medium"
    else:
        return "low"


# Carrega modelo na inicialização do módulo
_load_model()
