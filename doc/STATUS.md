# Status do Projeto — OpenFinance Intel 🌍

**Versão Atual**: v1.2.0 (AI Insights + ML Enhancement Release)

## ✅ Visão Geral

O **OpenFinance Intel** é um **Terminal de Inteligência Financeira** completo, 100% containerizado em Docker. O sistema coleta dados de múltiplas fontes globais (RSS, Reddit, Twitter), analisa-os com NLP e Machine Learning, calcula probabilidade de impacto via `predict_proba`, e agora oferece **análise generativa sob demanda** com OpenAI/Gemini. A plataforma apresenta insights acionáveis em uma interface premium com 6 abas: Market Overview, Intelligence Feed, Watchlist, Probabilidade, AI Insights e Configurações. Toda a plataforma sobe com um único `docker compose up --build`.

---

## 🚀 Funcionalidades Entregues

### 1. Inteligência & AI (Backend)

- ✅ **Narrative Engine**: Agrupamento inteligente de eventos por setor com clusterização (Tempo + Setor + Entidades)
- ✅ **Análise de Sentimento**: Classificação Bullish/Bearish/Neutral via TextBlob (Polaridade -1.0 a +1.0)
- ✅ **6 Setores de Investimento**: Crypto, Tech, Market, Macro, Commodities, Social
- ✅ **Subcategorias Macro**: Eventos Macro sub-classificados em Política Monetária, Geopolítica, Política Fiscal, Dados Econômicos e Geral
- ✅ **Classificação Social Forçada**: Eventos de Reddit/Twitter/Nitter sempre classificados como "Social", ignorando NLP
- ✅ **Insights Acionáveis por Setor**: Frases de ação pré-definidas por combinação setor+sentimento
- ✅ **NLP com spaCy**: NER para contexto geográfico e extração de entidades
- ✅ **Scoring & Impact**: Classificação de impacto (high/medium/low) e urgência
- ✅ 🆕 **ML Predict Proba**: RandomForest treinado com scikit-learn para probabilidade de impacto
- ✅ 🆕 **AI Insights (LLM)**: Análise generativa on-demand via OpenAI GPT-4o Mini / Google Gemini 2.0 Flash (BYOK)
- ✅ 🆕 **Auto-Cleanup**: Limpeza automática do DB a cada 100 eventos, mantendo máximo de 1000 eventos

### 2. Visualização & UI (Frontend)

- ✅ **Market Overview (Bento Grid)**:
  - Pulso de Mercado IA (banner de resumo)
  - Sentimento do Mercado (gauge visual)
  - Raio-X Setorial (barras por setor)
  - Top Bullish / Top Bearish (sinais recentes, clicáveis para fonte)
  - 🆕 **Radar de Oportunidades** — NLP+ML: Momentum, Contrarian, High-Impact Clusters, ML Alert (predict_proba), Social Buzz
  - 🆕 **Indicadores Chave** — Fear & Greed Index (0-100), Velocidade de Eventos, Diversidade Setorial, Taxa de Alerta
- ✅ **Intelligence Feed (Split View)**:
  - Narrativas por setor na sidebar com insight na preview
  - Timeline detalhada com keywords, domínio da fonte e badges de impacto
  - Insight do Analista (seção destacada em amber)
  - 🆕 **Subcategorias Macro** — Filtros pill para Política Monetária, Geopolítica, Fiscal, Dados Econômicos
- ✅ **Watchlist Pessoal**: Favoritar eventos e narrativas com persistência via LocalStorage
- ✅ 🆕 **Probabilidade (ML)**: 250 eventos mais recentes, paginação estável (10/página), stats locais, refresh inteligente sem embaralhamento
- ✅ 🆕 **AI Insights**: 3 módulos IA on-demand:
  - 📋 Resumo de Alto Impacto (Top 10 ML → relatório executivo)
  - 🔴 Detector de Crashes & Bolhas (métricas agregadas → risco 0-100)
  - 📊 Análise de Mercado (dados por setor → conjuntura + alocação)
  - 🔑 BYOK: API key fornecida pelo user, salva no localStorage, nunca no servidor
- ✅ **Dual Theme**: Light Mode + Dark Mode com toggle e persistência
- ✅ **Bilíngue**: PT-BR / EN-US com alternância instantânea
- ✅ **Ticker**: Cotações ao vivo (USD, EUR, BTC) na barra superior (estilo pill)
- ✅ 🆕 **Página de Configurações**: Auto-refresh (Off/1/5/10/20 min), Aparência (tema/idioma), Sobre
- ✅ 🆕 **Favicon & Logo**: Ícone personalizado da plataforma no browser e sidebar
- ✅ 🆕 **Full Docker Deploy**: Frontend containerizado com Nginx (multi-stage build), acessível na porta 80

### 3. Engenharia de Dados

- ✅ **Fontes Globais**: Bloomberg, Reuters, CNBC, BBC, Al Jazeera, NYT, Google News
- ✅ **Fontes Sociais (Reddit)**: r/wallstreetbets, r/investing, r/stocks, r/StockMarket, r/SecurityAnalysis, r/economy
- ✅ **Smart Seeder**: Upsert de novas fontes sem resetar o banco
- ✅ **Deduplicação**: Hash MD5 determinístico (url + title)
- ✅ **Adicionar Fontes em Produção**: Modal integrado para RSS e Twitter/X
- ✅ 🆕 **Auto-Cleanup DB**: Mantém máximo de 1000 eventos no MongoDB automaticamente
- ✅ 🆕 **Admin Cleanup API**: `POST /admin/cleanup` para limpeza manual

### 4. API Endpoints

| Endpoint             | Método   | Descrição                                         |
| -------------------- | -------- | ------------------------------------------------- |
| `/events`            | GET      | Eventos enriquecidos com filtros                  |
| `/narratives`        | GET      | Narrativas agrupadas por setor                    |
| `/sources`           | GET/POST | Listar e adicionar fontes                         |
| `/predictions`       | GET      | Predições de probabilidade ML                     |
| `/predictions/stats` | GET      | Estatísticas agregadas do DB                      |
| `/ai/analyze`        | POST     | Análise IA on-demand (BYOK via `X-AI-Key` header) |
| `/admin/cleanup`     | POST     | Limpeza manual do banco                           |

---

## 🏗️ Estado da Arquitetura

| Serviço       | Status     | Tecnologia          | Observação                                             |
| ------------- | ---------- | ------------------- | ------------------------------------------------------ |
| **Collector** | 🟢 Estável | Python/RSS          | Scraper universal + feed discovery                     |
| **Analysis**  | 🟢 Estável | Python/NLP          | Sentiment + Sector + Insight + Auto-Cleanup (max 1000) |
| **Inference** | 🟢 Estável | Python/scikit-learn | RandomForest predict_proba + heurística fallback       |
| **API**       | 🟢 Estável | FastAPI             | REST + Scheduler + AI Insights (BYOK OpenAI/Gemini)    |
| **Dashboard** | 🟢 Estável | React/Nginx         | 6 abas, SPA + reverse proxy, porta 80                  |
| **Notifier**  | 🟡 Básico  | Python/Redis        | Estrutura pronta, alertas não implementados            |

---

## 🔮 Roadmap Futuro

1. **Alertas em Tempo Real**: Push notifications para eventos de alto impacto
2. **Backtesting de Sentimento**: Cruzar sentimento histórico vs. variação de preços
3. **Deploy Cloud**: Hostinger VPS + EasyPanel + domínio próprio
4. **Autenticação**: Login com OAuth e watchlist persistida no servidor
5. **API Pública**: Endpoints para integração com ferramentas externas
