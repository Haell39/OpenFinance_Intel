import os
import asyncio
import google.generativeai as genai
import traceback

# Initialize client if API key is present
api_key = os.getenv("GOOGLE_API_KEY")
ENABLE_LLM = False # User requested to disable external API for cost savings

if api_key and ENABLE_LLM:
    genai.configure(api_key=api_key)
    # Use Flash for speed/cost efficiency
    model = genai.GenerativeModel('gemini-2.0-flash')
else:
    print("[llm_service] LLM features disabled (ENABLE_LLM=False or No Key).")
    model = None

async def generate_narrative_title(events: list, sector: str) -> str:
    """
    Generates a high-impact narrative title using Google Gemini.
    Falls back to a keyword-based approach if LLM is unavailable or fails.
    """
    if not model:
        return _fallback_title(events, sector)

    try:
        # Construct prompt
        headlines = [e.get("title", "") for e in events[:5]] # Limit to top 5 events for context
        prompt = (
            f"Setor: {sector}\n"
            f"Manchetes:\n" + "\n".join(f"- {h}" for h in headlines) + "\n\n"
            "Instrução: Você é um editor sênior da Bloomberg. Leia as manchetes acima e "
            "gere um título único, coeso e de alto impacto (máximo de 5 a 6 palavras) que "
            "resuma a narrativa principal. Retorne APENAS o título, sem aspas ou explicações."
        )

        response = await model.generate_content_async(prompt)
        
        # Check if response was blocked
        if response.prompt_feedback and response.prompt_feedback.block_reason:
             print(f"[llm_service] Blocked: {response.prompt_feedback.block_reason}")
             return _fallback_title(events, sector)

        # Extract text safely
        title = response.text.strip().replace('"', '').replace('*', '')
        return title if title else _fallback_title(events, sector)

    except Exception as e:
        print(f"[llm_service] Error generating title with Gemini: {e}")
        try:
            print("[llm_service] Available models:")
            for m in genai.list_models():
                print(f" - {m.name}")
        except:
            pass
        # traceback.print_exc() # Reduce noise

def _fallback_title(events: list, sector: str) -> str:
    """
    Fallback logic: Simple "Movimentação em [Sector]"
    """
    return f"Movimentação em {sector}"
