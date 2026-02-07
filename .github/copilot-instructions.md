# SentinelWatch AI Agent Instructions

## Architecture Overview

**SentinelWatch** is an event-driven intelligence platform for Brazilian market monitoring. All services communicate exclusively via Redis queues—no direct HTTP calls between services.

**Message Flow:**
```
API ──(tasks_queue)──> Collector ──(events_queue)──> Analysis ──(alerts_queue)──> Notifier
                                                           │
                                                           └──> MongoDB (events collection)
```

**Service Responsibilities:**
- **API** (`services/api`): FastAPI gateway, registers sources, exposes `/events` and `/events/geo-summary` endpoints
- **Collector** (`services/collector`): RSS feed scraper with auto-discovery fallback, publishes raw events
- **Analysis** (`services/analysis`): NLP scoring, impact/urgency classification, UF (state) inference, persists to MongoDB
- **Notifier** (`services/notifier`): Consumes alerts, currently logs to stdout (future: Telegram/email)
- **Dashboard** (`dashboard/`): React + Vite + Leaflet map, fetches events from API

## Brazilian Market Focus

All events are geolocated to Brazilian states (UF). The `location.region` field uses 2-letter state codes: `SP`, `RJ`, `MG`, `DF`, etc., or `BR` for national events.

**State Inference Pattern** ([services/analysis/app/main.py](services/analysis/app/main.py)):
- `BRAZILIAN_STATES_MAP` dictionary maps Portuguese place names to UF codes
- `infer_region()` searches longest-first (e.g., "rio grande do sul" before "rio") to avoid false matches
- Common entities auto-mapped: "petrobras" → RJ, "bolsa" → SP (B3), "brasília" → DF

When adding location features, always use this map—don't hardcode state logic.

## Event Schema

All events follow this structure (defined in [doc/event_schema.md](doc/event_schema.md)):

```python
{
  "id": "uuid",
  "type": "financial | geopolitical | odds",
  "title": str,
  "description": str,
  "impact": "high | medium | low",  # Scored via keyword weights
  "urgency": "urgent | normal",     # Based on keywords + event_type
  "location": {"country": "BR", "region": "SP"},
  "entities": {"people": [...], "orgs": [...], "locations": [...]},
  "source": {"id": str, "url": str},
  "timestamp": "ISO 8601",
  "analyzed_at": "ISO 8601"
}
```

**Impact Scoring** ([services/analysis/app/main.py](services/analysis/app/main.py#L29-L58)):
- Keywords have weights: `guerra`/`war`=5, `crise`=4, `juros`=3, etc.
- `geopolitical` events get +3 bonus
- `score >= 7` = high, `>= 3` = medium, else low

## Development Workflow

**Start Backend:**
```powershell
docker compose up --build
```
Wait for all services to show ready: `api`, `collector`, `analysis`, `notifier`, `mongo`, `redis`.

**Start Frontend:**
```powershell
cd dashboard
npm install  # first time only
npm run dev
```
Access at `http://localhost:5173`

**Clean Restart (Windows):**
```powershell
.\clean_and_start.ps1  # Stops containers, deletes volumes, rebuilds
```

**Register RSS Source:**
```powershell
# Recommended: G1 Economia (stable Brazilian financial news)
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/sources" `
  -ContentType "application/json" `
  -Body '{"url":"http://g1.globo.com/dynamo/economia/rss2.xml","event_type":"financial"}'
```

Watch logs in Docker to see events flow through: `collector` → `analysis` → `notifier`.

## RSS Collection Patterns

The Collector uses auto-discovery ([services/collector/app/main.py](services/collector/app/main.py#L40-L68)):
1. Try direct RSS parse
2. If response is HTML, scan for `<link rel="alternate" type="application/rss+xml">`
3. On failure, use `RSS_FALLBACK_URL` (G1 Economia)
4. Last resort: synthetic event to prevent pipeline stall

**Critical:** Collector limits to 5 most recent entries to avoid queue flooding.

## Geospatial Visualization

Dashboard uses Leaflet with GeoJSON ([dashboard/src/data/brazilGeoJSON.js](dashboard/src/data/brazilGeoJSON.js)) for state boundaries.

**MapVisualization Component:**
- Polygon fill color by event count (lighter = fewer, darker = more)
- Click state → filters events by `region=UF` query param
- Hover shows UF code + event count

**API Endpoint for Map Data:**
```python
# GET /events/geo-summary
# Returns: {"SP": 12, "RJ": 8, "MG": 3, ...}
```

## Environment Variables

All services read from `docker-compose.yml`:
- `MONGO_URI`, `MONGO_DB`
- `REDIS_HOST`, `REDIS_PORT`
- `TASKS_QUEUE`, `EVENTS_QUEUE`, `ALERTS_QUEUE`

Defaults exist in each service's `get_settings()` for local development without Docker.

## Code Patterns

**Queue Publishing (Python):**
```python
redis_client.lpush(queue_name, json.dumps(message_dict))
```

**Queue Consuming (Python):**
```python
while True:
    item = redis_client.brpop(queue_name, timeout=5)
    if not item:
        continue
    _queue, payload = item
    data = json.loads(payload)
```

**MongoDB Event Query (API):**
```python
filters = {}
if impact: filters["impact"] = impact
if event_type: filters["type"] = event_type
if region and region != "BR": filters["location.region"] = region
events = list(mongo_db.events.find(filters, {"_id": 0}).sort("timestamp", -1).limit(100))
```

## Frontend Data Flow

1. `fetchEvents()` → `GET /events?impact=X&type=Y&region=Z`
2. `fetchGeoSummary()` → `GET /events/geo-summary`
3. Events sorted by `sortBy` state (timestamp or urgency score)
4. Map click updates `selectedRegion` → refetches with region filter

## Testing & Debugging

1. Check `docker compose logs -f collector` to see if RSS parsing succeeds
2. Check `docker compose logs -f analysis` for NLP scoring output
3. Check `docker compose logs -f notifier` for final alert messages
4. Query MongoDB directly: `docker exec -it theodds-mongo-1 mongosh sentinelwatch`
5. Query Redis: `docker exec -it theodds-redis-1 redis-cli`

**Common Issue:** "No events showing"
→ Register a source first, then check collector logs for fetch errors

## Contributing Patterns

- **Add new event type:** Update `Literal["financial", "geopolitical", "odds"]` in API model + frontend TYPE_OPTIONS
- **Add NLP keyword:** Update `weights` dict in `score_event()` ([services/analysis/app/main.py](services/analysis/app/main.py#L29-L58))
- **Add state mapping:** Update `BRAZILIAN_STATES_MAP` ([services/analysis/app/main.py](services/analysis/app/main.py#L76+))
- **Add alert channel:** Implement in Notifier service, consume from `alerts_queue`

## Next Steps (Roadmap)

See [README.md](README.md#L85-90) for planned features:
- Advanced NLP scoring
- Telegram/email alerting
- Event deduplication cache
- HTML scraping beyond RSS
