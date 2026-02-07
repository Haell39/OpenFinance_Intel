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
  - **Auto-discovery de RSS**: detecta feeds automaticamente em páginas HTML
  - Segue redirecionamentos e valida content-type
  - Publica eventos brutos na fila events_queue
  - Usa fallback de RSS configuravel

- Analysis
  - Limpa HTML e normaliza descricao
  - Extrai keywords simples
  - **NER contextual para localização** (método prioritário):
    - Detecta padrões: "governo de", "prefeitura de", "assembleia legislativa de", etc.
    - Mapeia cidades → UF (27 capitais + 60+ polos tecnológicos/financeiros)
    - Evita falsos positivos com preposições comuns (ex: "para" ≠ Pará)
  - **Normaliza localizacao em siglas UF** (SP, RJ, MG, etc.)
  - Calcula score e define impacto/urgencia
  - Extrai entidades basicas (pessoas, orgs, locais)
  - **Preserva link original da notícia**
  - Persiste eventos enriquecidos no MongoDB
  - Publica alertas no Redis

- Notifier
  - Consome alertas e imprime logs

- UI (React + Vite + Leaflet)
  - **Layout fullscreen** com mapa ocupando toda tela
  - **Mapa interativo** com badges de eventos por estado
  - **Sidebar slide-in** ao clicar em estado
  - **Cards de eventos** com:
    - Barra lateral colorida por impacto (alto=vermelho, médio=laranja, baixo=verde)
    - Botão "Fonte" com link original da notícia
    - Selo de localização (Nacional/UF/Localidade não especificada)
  - **Tabs de ordenação**: Mais recentes, Mais urgentes, Mais impactantes
  - Filtra por impacto, tipo e regiao geografica
  - Exibe descricao, keywords, entidades e metadados
  - **Modal de cadastro de fontes** com 10 fontes brasileiras pré-configuradas:
    - InfoMoney, Valor Econômico, G1 Economia, Banco Central
    - Tesouro Nacional, Agência Brasil, Estadão, Folha
    - IBGE, B3
  - Opção de cadastrar feed RSS customizado

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

## Estado atual (V3 - NER + UI Completa)

- Pipeline end-to-end funcionando (RSS -> Collector -> Analysis -> NER -> MongoDB -> API -> UI)
- **RSS auto-discovery** para fontes que não expõem feed diretamente
- **NER contextual** para detecção precisa de localização (evita falsos positivos)
- Mapeamento completo de 27 capitais + 60+ cidades brasileiras
- Sanitizacao de HTML e normalizacao de texto
- Impacto/urgencia por score ponderado
- **Link original preservado** em todos eventos
- Location extraction e normalizacao em UF com 3 métodos hierárquicos
- **Visualizacao geoespacial fullscreen** com sidebar interativa
- **10 fontes brasileiras** pré-configuradas no modal
- **Ordenação múltipla**: recente, urgente, impactante
- UI responsiva com cards profissionais

## Proximos passos sugeridos

- ✅ ~~NER contextual para localização~~ (IMPLEMENTADO)
- ✅ ~~Auto-discovery RSS~~ (IMPLEMENTADO)
- ✅ ~~UI fullscreen com sidebar~~ (IMPLEMENTADO)
- ✅ ~~Fontes brasileiras pré-configuradas~~ (IMPLEMENTADO)
- ✅ ~~Ordenação múltipla~~ (IMPLEMENTADO)
- Adicionar mais fontes RSS (Twitter, Internacional)
- Implementar heatmap com gradiente de cores no mapa
- Popups/info boxes ao clicar em badges dos estados
- Timeline interativa para filtro temporal
- Export de dados (CSV/GeoJSON)
- Persistencia e listagem de fontes cadastradas na UI (ver histórico)
- Integrar spaCy NER model para entidades mais robustas
- Suporte a queries/alertas persistentes
- Search bar funcional no header
- Testes automatizados (pytest + Jest)
