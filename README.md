# SentinelWatch

SentinelWatch is an event-driven intelligence platform focused on the Brazilian market. It ingests sources, collects raw events, analyzes impact and urgency, and emits alerts through a simple pipeline.

## Architecture

Flow:

Source -> API Gateway -> Redis (tasks_queue)
Collector -> Redis (events_queue)
Analysis -> MongoDB + Redis (alerts_queue)
Notifier -> logs

Services:

- API Gateway (FastAPI): registers sources and enqueues tasks
- Collector: consumes tasks and publishes raw events
- Analysis: classifies impact and urgency and stores enriched events
- Notifier: consumes alerts and prints a message

## Quick start

Start the stack:

```bash
docker compose up --build
```

Register a source (PowerShell - Windows):

```powershell
# Exemplo com feed RSS real de notícias financeiras (recomendado)
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/sources" -ContentType "application/json" -Body '{"url":"http://g1.globo.com/dynamo/economia/rss2.xml","event_type":"financial"}'

# Ou use um exemplo genérico
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/sources" -ContentType "application/json" -Body '{"url":"https://example.com/feed.xml","event_type":"financial"}'
```

Register a source (macOS/Linux):

```bash
# Exemplo com feed RSS real de notícias financeiras (recomendado)
curl -X POST "http://localhost:8000/sources" \
  -H "Content-Type: application/json" \
  -d '{"url":"http://g1.globo.com/dynamo/economia/rss2.xml","event_type":"financial"}'

# Ou use um exemplo genérico
curl -X POST "http://localhost:8000/sources" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/feed.xml","event_type":"financial"}'
```

**Fontes RSS recomendadas:**

- G1 Economia (mais estável): `http://g1.globo.com/dynamo/economia/rss2.xml`
- InfoMoney: `https://www.infomoney.com.br/feed/` (pode bloquear requests de containers)
- Valor Econômico (se disponível público)

You should see logs in the collector, analysis, and notifier containers showing the event flowing through the pipeline.

Fetch analyzed events for the UI:

```bash
curl "http://localhost:8000/events?impact=high&type=geopolitical"
```

**Rodar o Dashboard (Frontend):**

```bash
cd dashboard
npm install
npm run dev
```

Acesse `http://localhost:5173` para ver a interface.

## Configuration

Each service reads environment variables in docker-compose.yml:

- MONGO_URI, MONGO_DB
- REDIS_HOST, REDIS_PORT
- TASKS_QUEUE, EVENTS_QUEUE, ALERTS_QUEUE

## Next steps

- Implementar visualização de mapa do Brasil
- Expandir scraping para páginas HTML além de RSS
- Adicionar NLP scoring avançado no analysis service
- Integrar canais de alerta (Telegram, email)
- Adicionar sistema de cache de eventos já processados
