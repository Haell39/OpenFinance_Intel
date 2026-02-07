# Status do Projeto - SentinelWatch

## Visao geral

O SentinelWatch esta funcional em sua base de microservicos, com pipeline completo de eventos e uma UI com visualizacao geoespacial interativa. O foco atual e estabilidade, clareza e simplicidade para evolucao futura.

## Arquitetura atual

**Fluxo de dados**

Fonte -> API Gateway -> Redis (tasks_queue)
Collector -> RSS -> Redis (events_queue)
Analysis -> NLP + Geo -> MongoDB + Redis (alerts_queue)
Notifier -> logs
UI (React) -> GET /events + GET /events/geo-summary

**Microservicos**

- API Gateway (FastAPI)
  - POST /sources para cadastrar fontes
  - GET /events com filtros (impact, type) + filtragem por region/UF
  - GET /events/geo-summary para agregacao por estado
  - Persiste fontes no MongoDB
  - Enfileira tarefas no Redis

- Collector (RSS)
  - Coleta feeds RSS reais
  - Publica eventos brutos na fila events_queue
  - Usa fallback de RSS configuravel

- Analysis
  - Limpa HTML e normaliza descricao
  - Extrai keywords simples
  - **Normaliza localizacao em siglas UF** (SP, RJ, MG, etc.)
  - Calcula score e define impacto/urgencia
  - Extrai entidades basicas (pessoas, orgs, locais)
  - Persiste eventos enriquecidos no MongoDB
  - Publica alertas no Redis

- Notifier
  - Consome alertas e imprime logs

- UI (React + Vite + Leaflet)
  - Lista eventos com filtros
  - Mapa interativo mostrando eventos por estado
  - Filtra por impacto, tipo e regiao geografica
  - Ordena por data ou urgencia/impacto
  - Exibe descricao, keywords, entidades e metadados
  - Permite cadastrar novas fontes RSS

## Dados e schema

Eventos seguem o schema definido em [doc/event_schema.md](event_schema.md). Campos principais:

- id, type, title, description
- impact, urgency, keywords
- entities (people, orgs, locations)
- location (country: "BR", region: "SP" | "MG" | ... | "BR")
- timestamp, analyzed_at

**Normalizacao de Localizacao**: O campo `location.region` agora contem siglas de estado (UF) normalizadas:

- "São Paulo", "sao paulo", "bolsa" -> **SP**
- "Rio de Janeiro", "petrobras" -> **RJ**
- "Bahia", "salvador" -> **BA**
- E assim para todos os 27 estados brasileiros

## Infraestrutura

- Redis para filas de eventos
- MongoDB para persistencia de eventos e fontes
- Docker Compose para orquestracao local
- Dockerfiles por servico

## Visualizacao Geoespacial (NOVO!)

Ver [doc/GEOSPATIAL.md](GEOSPATIAL.md) para detalhes completos.

**Resumo:**

- Mapa interativo do Brasil com Leaflet
- Badges mostrando contagem de eventos por estado
- Click para filtrar eventos de uma regiao
- Sortar por data ou urgencia/impacto
- API endpoint `/events/geo-summary` retorna { "UF": count }

## Estado atual (V2)

- Pipeline end-to-end funcionando (RSS -> Collector -> Analysis -> Geo -> MongoDB -> API -> UI)
- Coleta real via RSS (G1 Economia)
- Sanitizacao de HTML e normalizacao de texto
- Impacto/urgencia por score ponderado
- Location extraction e normalizacao em UF
- Visualizacao geoespacial interativa completa!
- UI responsiva com tabela e mapa

## Proximos passos sugeridos

- Adicionar mais fontes RSS (Twitter, outros)
- Implementar heatmap com gradiente de cores
- Popups/info boxes ao clicar em badges
- Timeline interativa para filtro temporal
- Export de dados (CSV/GeoJSON)
- Persistencia e listagem de fontes cadastradas na UI
- Integrar NER model (spaCy) para entidades melhores
- Suporte a queries/alertas persistentes
