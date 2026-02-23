"""
LLM Layer (Opcional) — Análise contextual profunda via OpenAI.
Desligada por padrão. Ativada quando OPENAI_API_KEY + ENABLE_LLM_LAYER=true.
"""

import os

ENABLE_LLM = os.getenv("ENABLE_LLM_LAYER", "false").lower() == "true"
OPENAI_KEY = os.getenv("OPENAI_API_KEY", "")

_client = None

if ENABLE_LLM and OPENAI_KEY:
    try:
        from openai import OpenAI
        _client = OpenAI(api_key=OPENAI_KEY)
        print("[inference/llm] ✓ Camada LLM ativada (OpenAI).")
    except Exception as e:
        print(f"[inference/llm] ✕ Falha ao inicializar OpenAI: {e}")
else:
    print("[inference/llm] Camada LLM desativada. Usando apenas modelo local.")


async def analyze_context(event: dict) -> dict | None:
    """
    Analisa um evento com LLM para obter reasoning contextual
    e ajuste de confiança.

    Returns:
        {
            "reasoning": "Texto explicativo da análise...",
            "confidence_adjustment": 0.1  # delta entre -0.2 e +0.2
        }
        ou None se LLM não estiver ativo.
    """
    if not _client:
        return None

    title = event.get("title", "")
    description = event.get("description", "")
    sector = event.get("sector", "")
    sentiment_label = event.get("analytics", {}).get("sentiment", {}).get("label", "Neutral")

    prompt = f"""Você é um analista sênior de risco financeiro.

Evento: "{title}"
Descrição: {description[:300]}
Setor: {sector}
Sentimento detectado: {sentiment_label}

Avalie o impacto potencial deste evento no mercado financeiro.
Responda em JSON com exatamente dois campos:
1. "reasoning": uma frase curta (máx 50 palavras) explicando o impacto potencial
2. "confidence_adjustment": um número entre -0.2 e +0.2 indicando se a probabilidade de impacto deve ser ajustada para cima (+) ou para baixo (-)

Responda APENAS o JSON, sem markdown."""

    try:
        response = _client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=150,
        )

        import json
        content = response.choices[0].message.content.strip()
        result = json.loads(content)

        # Clamp adjustment
        adj = float(result.get("confidence_adjustment", 0.0))
        adj = max(-0.2, min(0.2, adj))

        return {
            "reasoning": result.get("reasoning", ""),
            "confidence_adjustment": adj,
        }

    except Exception as e:
        print(f"[inference/llm] Erro na análise LLM: {e}")
        return None
