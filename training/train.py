"""
train.py — Treina modelo RandomForest para predição de impacto

Lê o CSV gerado pelo dataset_builder.py, treina um RandomForest,
avalia métricas e salva o modelo .joblib para uso pelo inference service.

Uso:
    python train.py                                    # usa defaults
    python train.py --input training/dataset.csv       # CSV customizado
    python train.py --estimators 200 --max-depth 12    # hyperparams
"""

import argparse
import os
import sys

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    roc_auc_score,
    accuracy_score,
)
import joblib

# Features — deve ser EXATAMENTE a mesma lista do inference/app/features.py
FEATURE_NAMES = [
    "sentiment_polarity", "sentiment_abs", "impact_score",
    "sector_encoded", "sub_sector_encoded",
    "keyword_count", "entity_count",
    "title_length", "description_length",
    "has_crisis_keyword", "has_policy_keyword",
    "is_social_source", "urgency_encoded", "impact_encoded",
]

MODEL_OUTPUT = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "services", "inference", "models", "impact_model_v1.joblib"
)


def main():
    parser = argparse.ArgumentParser(description="Treina modelo ML de impacto")
    parser.add_argument("--input", default="training/dataset.csv", help="CSV de entrada")
    parser.add_argument("--output", default=MODEL_OUTPUT, help="Caminho do .joblib")
    parser.add_argument("--estimators", type=int, default=150, help="N° de árvores")
    parser.add_argument("--max-depth", type=int, default=10, help="Profundidade máxima")
    parser.add_argument("--test-size", type=float, default=0.2, help="Fração de teste")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    args = parser.parse_args()

    print(f"\n{'='*60}")
    print(f"  OpenFinance Intel — ML Training Pipeline")
    print(f"{'='*60}")
    print(f"  Input:       {args.input}")
    print(f"  Output:      {args.output}")
    print(f"  Estimators:  {args.estimators}")
    print(f"  Max Depth:   {args.max_depth}")
    print(f"  Test Size:   {args.test_size}")
    print(f"  Seed:        {args.seed}")
    print(f"{'='*60}\n")

    # ── 1. Carregar dados ──
    if not os.path.exists(args.input):
        print(f"❌ Arquivo não encontrado: {args.input}")
        print(f"   Execute primeiro: python training/dataset_builder.py\n")
        sys.exit(1)

    df = pd.read_csv(args.input)
    print(f"📊 Dataset carregado: {len(df)} amostras")

    # Valida colunas
    missing = [f for f in FEATURE_NAMES + ["label"] if f not in df.columns]
    if missing:
        print(f"❌ Colunas ausentes no CSV: {missing}")
        sys.exit(1)

    # ── 2. Preparar X e y ──
    X = df[FEATURE_NAMES].values
    y = df["label"].values

    print(f"   Features:     {X.shape[1]}")
    print(f"   Label 0 (low):  {(y == 0).sum()} ({(y == 0).mean()*100:.1f}%)")
    print(f"   Label 1 (high): {(y == 1).sum()} ({(y == 1).mean()*100:.1f}%)")

    # Check balance
    minority_ratio = min((y == 0).mean(), (y == 1).mean())
    if minority_ratio < 0.15:
        print(f"\n⚠️  Dataset desbalanceado (minoria: {minority_ratio*100:.1f}%).")
        print(f"   Usando class_weight='balanced' para compensar.\n")
        class_weight = "balanced"
    else:
        class_weight = None

    # ── 3. Split treino/teste ──
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=args.test_size, random_state=args.seed, stratify=y
    )
    print(f"\n📋 Split:")
    print(f"   Treino: {len(X_train)} amostras")
    print(f"   Teste:  {len(X_test)} amostras")

    # ── 4. Treinar modelo ──
    print(f"\n🔧 Treinando RandomForest...")
    model = RandomForestClassifier(
        n_estimators=args.estimators,
        max_depth=args.max_depth,
        class_weight=class_weight,
        random_state=args.seed,
        n_jobs=-1,
    )
    model.fit(X_train, y_train)
    print(f"   ✓ Modelo treinado com {args.estimators} árvores\n")

    # ── 5. Avaliação ──
    y_pred = model.predict(X_test)
    y_proba = model.predict_proba(X_test)

    acc = accuracy_score(y_test, y_pred)
    print(f"{'─'*60}")
    print(f"  RESULTADOS")
    print(f"{'─'*60}")
    print(f"  Acurácia: {acc*100:.1f}%")

    # AUC (se tiver ambas as classes no teste)
    if len(np.unique(y_test)) > 1:
        auc = roc_auc_score(y_test, y_proba[:, 1])
        print(f"  AUC-ROC:  {auc:.3f}")
    else:
        print(f"  AUC-ROC:  N/A (apenas uma classe no teste)")

    print(f"\n  Classification Report:")
    print(classification_report(y_test, y_pred, target_names=["Low Impact", "High Impact"]))

    print(f"  Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred)
    print(f"     Pred Low | Pred High")
    print(f"  Low   {cm[0][0]:>5}  |  {cm[0][1]:>5}")
    print(f"  High  {cm[1][0]:>5}  |  {cm[1][1]:>5}")

    # ── 6. Feature Importance ──
    importances = model.feature_importances_
    sorted_idx = np.argsort(importances)[::-1]
    print(f"\n  Feature Importance (Top 10):")
    for i, idx in enumerate(sorted_idx[:10]):
        bar = "█" * int(importances[idx] * 40)
        print(f"    {i+1:>2}. {FEATURE_NAMES[idx]:<22s} {importances[idx]:.3f}  {bar}")

    # ── 7. Cross-validation ──
    print(f"\n  Cross-Validation (5-fold):")
    cv_scores = cross_val_score(model, X, y, cv=5, scoring="accuracy")
    print(f"    Scores:   {[f'{s:.3f}' for s in cv_scores]}")
    print(f"    Média:    {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    # ── 8. Salvar modelo ──
    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    joblib.dump(model, args.output)
    model_size = os.path.getsize(args.output) / 1024
    print(f"\n{'='*60}")
    print(f"  ✅ Modelo salvo: {args.output}")
    print(f"  📦 Tamanho:      {model_size:.1f} KB")
    print(f"{'='*60}")

    print(f"\n💡 Próximo passo:")
    print(f"   docker compose up --build inference")
    print(f"   → O modelo será carregado automaticamente na inicialização.\n")


if __name__ == "__main__":
    main()
