# OpenFinance Intel — Infraestrutura Global 🏗️ (v1.2.0)

## 🎯 Conceito

Plataforma **Event-Driven** de inteligência de investimento. O sistema ingere dados da web (RSS, Reddit, Twitter) e os transforma em **Sinais de Mercado** estruturados, classificados por sentimento, setor, sub-setor e impacto.

---

## 🧱 Arquitetura de Microserviços

O sistema opera em **8 containers Docker** orquestrados via Docker Compose, comunicando-se por **Redis** (filas de mensagens) e **MongoDB** (persistência).

```
Internet (RSS/Reddit/Twitter)
        │
        ▼
┌──────────────┐     tasks_queue      ┌──────────────┐
│  API Gateway │◄────────────────────►│   Collector   │
│  (FastAPI)   │     Redis            │  (Scraper)    │
│  :8000       │                      └──────┬───────┘
└──────┬───────┘                             │
       │                              events_queue
       │ MongoDB                             │
       │                              ┌──────▼───────┐
       ├──────────────────────────────►│   Analysis   │
       │                              │  (NLP Core)  │
       │                              └──────┬───────┘
       │                                     │
       │                       alerts_queue + inference_queue
       │                                     │
       │                    ┌────────────────┼───────────────┐
       │                    │                 │               │
       │             ┌──────▼───────┐  ┌─────▼────────┐
       │             │   Notifier   │  │  Inference  │
       │             └──────────────┘  │  (ML Core)  │
       │                              └──────────────┘
       │
┌──────▼───────┐      BYOK       ┌──────────────┐
│  Dashboard   │──────/ai/analyze──►│ OpenAI/Gemini│
│  (React)     │                 └──────────────┘
│  :80         │
└──────────────┘
```

---

### 1. 🕷️ Collector Service

_O "Braço" do sistema._

- **Responsabilidade**: Buscar dados na internet a partir de fontes configuradas
- **Fontes suportadas**: RSS, Atom, Google News, Reddit RSS, Twitter/X (via Nitter)
- **Deduplicação**: Hash MD5 determinístico (`md5(url + title)`) — mesma notícia nunca gera duplicata
- **Feed Discovery**: Tenta descobrir feeds automaticamente a partir de URLs de sites

### 2. 🧠 Analysis Service (AI Core)

_O "Cérebro" do sistema._

- **Responsabilidade**: Ler, entender, classificar e pontuar cada evento
- **Pipeline de NLP**:
  1. **Limpeza**: Remove HTML, tags e caracteres irrelevantes
  2. **Detecção de Setor**: Classifica em **Crypto, Tech, Market, Macro, Commodities, Social** via keywords + spaCy
  3. **Sub-setor (Macro)**: Classifica eventos Macro em **Política Monetária, Geopolítica, Política Fiscal, Dados Econômicos, Geral**
  4. **Classificação Social Forçada**: Fontes Reddit/Twitter/Nitter → setor "Social" obrigatório, ignorando keywords
  5. **Análise de Sentimento (TextBlob)**: Polaridade (-1.0 a +1.0) → `Bullish` (>0.1), `Bearish` (<-0.1), `Neutral`
  6. **Classificação Geográfica**: Brasil vs. Internacional baseado em termos e URLs
  7. **Scoring**: Impacto (0-10) baseado em keywords de crise e intensidade de sentimento
  8. **Insight**: Frase de ação por combinação setor × sentimento (21 combinações pré-definidas)
  9. **Extração de Keywords & Entidades**: spaCy NER + extração customizada
- **Auto-Cleanup (v1.2.0)**: A cada 100 eventos processados, remove automaticamente eventos antigos mantendo apenas os **1000 mais recentes** no DB

### 3. 🌐 API Gateway (FastAPI)

_A "Porta de Entrada"._

- **Responsabilidade**: Servir dados para o frontend e orquestrar coleta
- **Endpoints principais**:
  - `GET /events` — Eventos enriquecidos com filtros (tipo, impacto, ordenação)
  - `GET /narratives` — Narrativas agrupadas por setor com eventos, sentimento e insight
  - `POST /sources` — Adicionar novas fontes de dados
  - `GET /sources` — Listar fontes ativas
- **Scheduler**: Loop assíncrono que re-agenda verificação de fontes periodicamente
- **Smart Seeder**: Upsert de fontes padrão sem destruir o banco existente
- **Filtro Social Estrito**: Setor "Social" contém apenas eventos de Reddit/Twitter/Nitter
- **Setor Garantido**: Todos os 6 setores aparecem na resposta, mesmo sem eventos
- **v1.1.0**: Endpoint `GET /predictions` retorna predições de probabilidade de impacto
- **v1.2.0**: Endpoints adicionais:
  - `GET /predictions/stats` — Estatísticas agregadas do DB (total, high, medium, low)
  - `POST /ai/analyze` — Análise IA on-demand (summary/crash/market) com BYOK (header `X-AI-Key`)
  - `POST /admin/cleanup` — Limpeza manual do banco (mantendo N eventos mais recentes)

### 4. 🤖 Inference Service (v1.1.0)

_O "Motor Preditivo" do sistema._

- **Responsabilidade**: Calcular probabilidade de impacto para cada evento enriquecido
- **Pipeline de Inferência**:
  1. **Feature Engineering**: 14 features numéricas (sentimento, score, setor, keywords, urgência)
  2. **Modelo ML**: RandomForest treinado ou heurística ponderada como fallback
  3. **LLM Layer (Opcional)**: Análise contextual via OpenAI GPT-4o-mini (BYOK)
- **Foco de Nicho MVP**: Impacto de Políticas Públicas (Macro, Commodities, Market)
- **Terminologia**: "Análise de Probabilidade de Impacto" (gestão de risco, não previsão)

### 5. 🖥️ Dashboard (React)

_A "Face" do sistema._

- **Tecnologia**: React 18 + Vite (build) + Nginx (produção) + Tailwind CSS + Lucide Icons
- **Docker**: Multi-stage build (Node → Nginx Alpine ~20MB). Build de produção com arquivos estáticos servidos por Nginx
- **Reverse Proxy**: Nginx encaminha `/events`, `/sources`, `/narratives` para o container `api:8000`
- **Porta**: 80 (produção via Docker)
- **4 Abas**:
  | Aba | Conteúdo |
  |-----|---------|
  | **Market Overview** | Bento Grid: Pulso IA, Gauge de Sentimento, Raio-X Setorial, Top Sinais (clicáveis), Radar de Oportunidades (NLP+ML), Indicadores Chave (Fear & Greed) |
  | **Intelligence Feed** | Narrativas por setor → Timeline detalhada com subcategorias Macro, insights, keywords |
  | **Watchlist** | Eventos/narrativas favoritados com persistência LocalStorage |
  | **Probabilidade** | 250 eventos mais recentes com paginação estável (10/página), stats locais, refresh inteligente |
  | **AI Insights** | 3 módulos IA on-demand: Resumo Executivo, Detector de Crashes, Análise de Mercado (BYOK OpenAI/Gemini) |
  | **Configurações** | Auto-refresh (Off/10/20/30 min), tema, idioma, sobre |
- **Dual Theme**: Light/Dark com classe CSS e persistência
- **i18n**: PT-BR / EN-US com tradução completa
- **Auto-Refresh**: Configurável de Off a 30 min (padrão: 20 min)
- **Favicon Custom**: Ícone da plataforma no browser tab e sidebar

### 5. 📢 Notifier Service

_O "Alarme" do sistema._

- **Responsabilidade**: Consumir fila `alerts_queue` para notificações
- **Status**: Estrutura pronta, lógica de alerta não implementada (roadmap)

---

## 🔄 Fluxo de Dados (Pipeline v1.2.0)

```
1. API agenda tarefa ──────────►  Redis: tasks_queue
2. Collector busca conteúdo ───►  Extrai título/corpo/link
3. Collector publica evento ───►  Redis: events_queue
4. Analysis processa NLP ─────►  Setor + Sub-setor + Sentimento + Insight + Score
5. Analysis salva ─────────────►  MongoDB (evento enriquecido) + auto-cleanup (max 1000)
6. Analysis publica ───────────►  Redis: inference_queue
7. Inference calcula ML ───────►  predict_proba → MongoDB (predições)
8. Frontend solicita dados ────►  API serve /events, /narratives, /predictions
9. AI Insights (on-demand) ────►  API chama OpenAI/Gemini via BYOK → relatório
10. Usuário vê sinais ──────────►  Filtra, favorita, analisa, explora
```

---

## 🗄️ Stack de Dados

### MongoDB

- **Database**: `sentinelwatch`
- **Collections**: `events` (enriquecidos), `sources` (fontes configuradas), `predictions` (v1.1.0)
- Exemplo de evento enriquecido:
  ```json
  {
    "title": "Fed mantém juros estáveis",
    "sector": "Macro",
    "sub_sector": "Monetary Policy",
    "analytics": { "sentiment": { "label": "Neutral", "polarity": 0.02 } },
    "impact": "high",
    "insight": "Cenário 'Data Dependent'. Monitorar próximos dados.",
    "keywords": ["fed", "juros", "rates"]
  }
  ```

### Redis

- **Filas**: `tasks_queue`, `events_queue`, `alerts_queue`, `inference_queue` (v1.1.0)
- Broker de baixa latência entre microserviços

---

## 🐳 Docker Compose

| Container | Imagem/Build         | Porta | Dependências |
| --------- | -------------------- | ----- | ------------ |
| redis     | redis:7-alpine       | 6379  | —            |
| mongo     | mongo:7              | 27017 | —            |
| api       | ./services/api       | 8000  | redis, mongo |
| collector | ./services/collector | —     | redis        |
| analysis  | ./services/analysis  | —     | redis, mongo |
| notifier  | ./services/notifier  | —     | redis        |
| inference | ./services/inference | —     | redis, mongo |
| dashboard | ./dashboard (Nginx)  | 80    | api          |

---

## ⚠️ Segurança & Ética

- Utiliza apenas **dados públicos** (RSS feeds e páginas públicas)
- Respeita `robots.txt` e headers de User-Agent
- **API keys de IA (BYOK)**: Fornecidas pelo usuário via interface, enviadas por header HTTP, **nunca armazenadas** no servidor
- **Ferramenta de apoio à decisão**, não recomendação de investimento automatizada
- Nenhum dado pessoal é coletado ou armazenado
