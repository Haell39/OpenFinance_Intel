# Visualização Geoespacial - SentinelWatch 🗺️

## Resumo da Implementação

A visualização geoespacial do SentinelWatch foi completamente implementada, incluindo:

- Mapa interativo com Leaflet mostrando eventos por estado (UF)
- Filtragem de eventos ao clicar em regiões
- Ordenação por urgência/impacto ou data
- Normalização de localização em siglas UF (SP, RJ, MG, etc.)

---

## Serviços Backend Atualizados

### 1. **API Gateway** (`services/api/app/main.py`)

#### Novo Endpoint: `GET /events/geo-summary`

```python
@app.get("/events/geo-summary")
def geo_summary() -> dict:
    """Agrupa eventos por UF e retorna contagem por região"""
    pipeline = [
        {
            "$group": {
                "_id": "$location.region",
                "count": {"$sum": 1},
            }
        },
        {
            "$sort": {"_id": 1}
        },
    ]

    results = list(mongo_db.events.aggregate(pipeline))

    # Converte resultado em dicionário { "UF": count }
    geo_data = {}
    for doc in results:
        uf = doc["_id"] if doc["_id"] else "BR"
        geo_data[uf] = doc["count"]

    return geo_data
```

**Exemplo de Resposta:**

```json
{
  "SP": 4,
  "MG": 1,
  "RJ": 2,
  "RS": 1
}
```

#### Atualização: `GET /events` - Novo parâmetro `?region=UF`

```python
@app.get("/events")
def list_events(
    impact: str | None = None,
    event_type: str | None = Query(default=None, alias="type"),
    region: str | None = None,  # ← NOVO
) -> list[dict]:
    filters: dict = {}
    if impact:
        filters["impact"] = impact
    if event_type:
        filters["type"] = event_type
    if region and region != "BR":  # ← NOVO
        filters["location.region"] = region

    events = list(...)
    return events
```

### 2. **Analysis Service** (`services/analysis/app/main.py`)

#### Mapa de Estados Completo

Adicionado `BRAZILIAN_STATES_MAP` com 27 estados brasileiros mapeados para suas siglas UF:

- SP, RJ, MG, BA, PE, RS, SC, PR, DF, CE, PA, MA, GO, ES, MT, MS, TO, RO, RR, AP, AM, AL, SE, PB, RN, PI, AC

#### Função Aprimorada: `infer_region()`

```python
def infer_region(event: dict) -> str:
    """Infere a sigla do estado (UF) do Brasil baseada no conteúdo do evento"""
    text = f"{event.get('title', '')} {event.get('body', '')}".lower()

    # Busca por matches de estados no mapa (mais específicos primeiro)
    # Ordena por tamanho decrescente para capturar "rio grande do sul" antes de "rio"
    sorted_keys = sorted(BRAZILIAN_STATES_MAP.keys(), key=len, reverse=True)
    for state_name in sorted_keys:
        if state_name in text:
            return BRAZILIAN_STATES_MAP[state_name]

    # Default: Brasil (todos os eventos sem localização específica ficam em BR)
    return "BR"
```

**Exemplos de Normalização:**

- "São Paulo", "sao paulo" → **SP**
- "Rio de Janeiro", "petrobras" → **RJ**
- "Bahia", "salvador" → **BA**
- "Ceará", "fortaleza" → **CE**
- "Não mencionado" → **BR**

---

## Frontend React - Atualizado

### 1. **Dados Geográficos** (`dashboard/src/data/brazilGeoJSON.js`)

Arquivo com:

- GeoJSON de todos os 27 estados brasileiros
- Coordenadas de centróide para posicionamento de badges no mapa
- Lookup rápido via `stateCoordinates` object

### 2. **Novo Componente** (`dashboard/src/components/MapVisualization.jsx`)

```jsx
export function MapVisualization({ geoData, selectedRegion, onRegionClick })
```

**Funcionalidades:**

- Renderiza mapa interativo do Brasil com Leaflet
- Mostra badge com sigla UF e contagem de eventos
- Badge escalável: tamanho proporcional à quantidade de eventos
- Click handler para filtrar eventos por região
- Destaque visual do estado selecionado (cor vermelha, borda dourada)

**Exemplos:**

- Badge "SP" mostra "4" eventos
- Badge "MG" mostra "1" evento
- Clique em um badge → filtra lista de eventos para aquela região
- Clique novamente no mesmo estado → remove filtro regional

### 3. **Atualização: App.jsx**

#### Novo State

```jsx
const [selectedRegion, setSelectedRegion] = useState("all");
const [sortBy, setSortBy] = useState("timestamp");
const [geoData, setGeoData] = useState({});
```

#### Novas Funções

```jsx
const loadGeoData = () => {
  fetchGeoSummary()
    .then((data) => {
      setGeoData(data);
    })
    .catch((err) => {
      console.error("Failed to load geo data:", err);
    });
};

const handleRegionClick = (region) => {
  setSelectedRegion(region === selectedRegion ? "all" : region);
};
```

#### Novo Seletor de Ordenação

```jsx
<label>
  Ordenar
  <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
    <option value="timestamp">Data</option>
    <option value="urgency">Urgência/Impacto</option>
  </select>
</label>
```

**Lógica de Sorting:**

- **Timestamp**: Eventos mais recentes primeiro (padrão)
- **Urgency**: Eventos ordenados por urgência/impacto
  - Urgent + High Impact → Score 1100
  - Normal + Medium Impact → Score 50
  - Low Impact → Score padrão

### 4. **Cliente API Atualizado** (`dashboard/src/api/events.js`)

```javascript
export async function fetchGeoSummary() {
  const response = await fetch("/events/geo-summary");
  if (!response.ok) {
    throw new Error("Failed to load geo summary");
  }
  return response.json();
}

export async function fetchEvents({ impact, type, region }) {
  const params = new URLSearchParams();
  if (impact && impact !== "all") params.set("impact", impact);
  if (type && type !== "all") params.set("type", type);
  if (region && region !== "all") params.set("region", region); // ← NOVO
  // ...
}
```

### 5. **Estilos para Mapa** (`dashboard/src/styles/map.css`)

```css
.map-badge {
  border-radius: 50%;
  background: linear-gradient(135deg, #3b82f6, #1e40af);
  color: white;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
  transition: all 0.2s ease;
  border: 3px solid white;
}

.map-badge:hover {
  transform: scale(1.1);
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.4);
}

.map-badge.selected {
  background: linear-gradient(135deg, #ef4444, #991b1b);
  border-color: #fcd34d;
  box-shadow: 0 0 0 3px #fcd34d;
}
```

### 6. **Adições ao Styles.css**

- `.region-filter-info`: Info box destacando região selecionada
- `.clear-region-btn`: Botão para limpar filtro regional
- `.map-section`: Container para o mapa
- `.entities`: Display para entidades extraídas (pessoas, orgs, localizações)
- `.events-count-badge`: Badge mostrando contagem de eventos filtrados

---

## Dependências Adicionadas

### package.json do Dashboard

```json
{
  "dependencies": {
    "leaflet": "1.9.4",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-leaflet": "4.2.1"
  }
}
```

### CSS Leaflet

```javascript
// main.jsx
import "leaflet/dist/leaflet.css";
```

---

## Fluxo Completo de Dados

1. **Coleta**: Collector captura eventos e enfileira no Redis
2. **Análise**: Analysis enriquece eventos e **normaliza location.region para UF**
3. **Persistência**: MongoDB armazena eventos com campo `location: { country: "BR", region: "SP" }`
4. **API Geo-Summary**: MongoDB aggregation agrupa eventos por UF e retorna contagem
5. **Dashboard MapVisualization**: Frontend busca geo-summary e renderiza badges no mapa
6. **Interação**: Usuário clica em um estado para filtrar eventos
7. **Filtragem**: Frontend chama GET /events?region=SP, API filtra por location.region

---

## Exemplo de Evento Normalizado

```json
{
  "id": "uuid-123",
  "type": "financial",
  "title": "Bolsa cai em São Paulo",
  "description": "Ibovespa recua 2% em SP...",
  "impact": "high",
  "urgency": "urgent",
  "keywords": ["bolsa", "sp", "ibovespa"],
  "entities": {
    "people": ["Ana Silva"],
    "orgs": ["B3 SA"],
    "locations": ["São Paulo"]
  },
  "location": {
    "country": "BR",
    "region": "SP"  ← NORMALIZADO PARA SIGLA UF
  },
  "source": { "id": "...", "url": "..." },
  "timestamp": "2026-02-06T22:45:00Z",
  "analyzed_at": "2026-02-06T22:45:05Z"
}
```

---

## UI/UX Melhorias

### Header

- Novo texto descritivo: "Inteligência geoespacial para Brasil"
- Novo seletor de ordenação
- Mesmo filtro de impact/type

### Region Filter Info

- Box destacado mostrando UF selecionado em azul
- Botão rápido para limpar filtro
- Mostra-se apenas quando há filtro ativo

### Map Section

- Mapa interativo full-width com Leaflet
- Basins de cada estado com contagem
- Hover effect para usuário saber que é clicável
- Seleção visual em vermelho com borda dourada
- OSM tiles para contexto geográfico

### Events List

- Adicionada badge contando eventos quando há filtro regional
- Display de entidades extraídas (localizações)
- Sort order refletido nos eventos
- Mensagem contextual: "Nenhum evento nesta região"

---

## Testes Validados

### Backend

✅ GET /events/geo-summary retorna { "SP": 4, "MG": 1 }
✅ GET /events?region=SP filtra apenas eventos de SP
✅ Location normalization funciona (São Paulo → SP)
✅ Analysis service está processando eventos corretamente

### Frontend

✅ MapVisualization renders sem erros JS
✅ Badges aparecem com contagens corretas
✅ Click em badge filtra eventos
✅ Sort selector muda ordem de eventos
✅ Region filter info box aparece/desaparece

---

## Arquivos Criados/Modificados

**Criados:**

- dashboard/src/data/brazilGeoJSON.js
- dashboard/src/components/MapVisualization.jsx
- dashboard/src/styles/map.css

**Modificados:**

- services/api/app/main.py (novo endpoint + region param)
- services/analysis/app/main.py (location normalization)
- dashboard/src/App.jsx (state, handlers, JSX com mapa)
- dashboard/src/api/events.js (geo-summary + region)
- dashboard/src/styles.css (novas classes)
- dashboard/src/main.jsx (imports leaflet CSS)
- dashboard/package.json (leaflet + react-leaflet)

---

## Próximas Melhorias (Sugeridas)

1. **Popups no Mapa**: Clique para ver evento preview
2. **Heat Map**: Gradiente de cores por densidade de eventos
3. **Filtro Temporal**: Timeline interativa no mapa
4. **Export Geo**: CSV/GeoJSON das coordenadas
5. **Layer Toggle**: Mostrar/ocultar diferentes tipos de eventos
6. **Zoom Automático**: Ao selecionar região, dar zoom no mapa

---

## Status

✅ **COMPLETO** - Visualização geoespacial totalmente funcional e integrada!
