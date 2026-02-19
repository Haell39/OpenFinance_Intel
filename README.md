# OpenFinance Intel 🌍⚡

**Plataforma de Inteligência de Investimentos** — IA, NLP e Análise de Sentimento para transformar o caos do mercado em **Sinais Acionáveis**.

O OpenFinance Intel monitora o ecossistema financeiro global em tempo real, coletando notícias, feeds de redes sociais e dados macroeconômicos. Usando **NLP** e **Análise de Sentimento**, classifica cada evento como _Bullish_, _Bearish_ ou _Neutral_ e os organiza em **6 setores de investimento**: Crypto, Tech, Market, Macro, Commodities e Social.

---

## 🚀 Funcionalidades

### Inteligência & AI

- **🧠 Análise de Sentimento**: Classificação automática Bullish 🟢 / Bearish 🔴 / Neutral ⚪ via TextBlob
- **🎯 Radar de Oportunidades**: Detecção automática de sinais acionáveis — Momentum, Oportunidade Contrarian, Clusters de Alto Impacto e Buzz Social
- **📊 Índice Fear & Greed**: Gauge visual 0-100 calculado em tempo real a partir do sentimento agregado
- **💡 Insights por Setor**: Cada narrativa inclui insight acionável para investidores (ex: "Pânico social crescente. Possível oportunidade contrarian.")

### Dashboard & UI

- **📰 Intelligence Feed**: Split View (Narrativas + Timeline) com agrupamento inteligente por setor
- **🏷️ Subcategorias Macro**: Filtragem por Política Monetária, Geopolítica, Política Fiscal e Dados Econômicos
- **🖥️ Market Overview**: Bento Grid com Sentimento do Mercado, Raio-X Setorial, Top Sinais Bullish/Bearish, Radar de Oportunidades e Indicadores Chave
- **💼 Watchlist**: Favoritos com persistência local para monitorar riscos e oportunidades
- **🎨 Dual Theme**: Light Mode (padrão) + Dark Mode com persistência
- **🌎 Bilíngue**: PT-BR / EN-US com alternância instantânea
- **⚙️ Configurações**: Página completa com controle de auto-refresh (Off/1/5/10/20 min), aparência e idioma
- **⚡ Ticker**: Cotações ao vivo (USD, EUR, BTC) na barra superior

### Fontes de Dados

- **RSS/Atom**: Bloomberg, Reuters, CNBC, BBC, Al Jazeera, NYT, Google News
- **Reddit**: r/wallstreetbets, r/investing, r/stocks, r/StockMarket, r/SecurityAnalysis, r/economy
- **Flexível**: Adicione suas próprias fontes RSS ou perfis Twitter/X via modal integrado

---

## 🏗️ Arquitetura

Microserviços Docker orquestrados via Docker Compose:

```
┌─────────────────────────────────────────────────────────┐
│                    Dashboard (React)                     │
│              localhost:80 — Nginx + Static Files         │
└────────────────────────┬────────────────────────────────┘
                         │ HTTP /api
┌────────────────────────▼────────────────────────────────┐
│               API Gateway (FastAPI :8000)                │
│          Narratives • Sources • Events • Scheduler       │
└───────┬─────────────────────────────────────┬───────────┘
        │ Redis Queue                         │ MongoDB
┌───────▼──────────┐   ┌─────────────────┐   │
│    Collector      │──►│    Analysis      │───┘
│  RSS/Atom/Twitter │   │  NLP • Sentiment │
│  Deduplication    │   │  Sector • Insight│
└──────────────────┘   └─────────────────┘
```

| Serviço       | Tecnologia              | Responsabilidade                                          |
| ------------- | ----------------------- | --------------------------------------------------------- |
| **Collector** | Python                  | Scraping RSS/Atom, deduplicação via hash MD5              |
| **Analysis**  | Python, spaCy, TextBlob | Sentimento, classificação setorial, sub-setores, insights |
| **API**       | Python, FastAPI         | Gateway, scheduler, narrativas, gestão de fontes          |
| **Dashboard** | React 18, Vite, Nginx   | UI premium, visualizações, watchlist (Docker Nginx)       |
| **Redis**     | Redis 7 Alpine          | Broker de mensagens (task/event queues)                   |
| **MongoDB**   | Mongo 7                 | Persistência de eventos enriquecidos                      |

---

## ⚡ Início Rápido

### Pré-requisitos

- Docker & Docker Compose

### Executar

```bash
docker compose up --build
```

Acesse: **http://localhost** (porta 80)

> Tudo roda em Docker — frontend, backend, banco e filas. Aguarde ~2 minutos para os primeiros eventos aparecerem.

---

## 🚀 Publicação & Deploy

Consulte o guia oficial de deploy em **[doc/DEPLOY.md](doc/DEPLOY.md)** para instruções passo-a-passo de como subir a plataforma em:

- **VPS** (DigitalOcean, AWS, Hetzner) — Recomendado
- **PaaS** (Railway, Render)

---

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI, Microservices, Docker
- **AI & NLP**: spaCy (NER), TextBlob (Sentiment), Custom Narrative Engine
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, Nginx (produção)
- **Data**: MongoDB (NoSQL), Redis (Message Broker)
- **DevOps**: Docker Compose, HMR, Environment Variables

---

## 📁 Estrutura do Projeto

```
TheOdds/
├── dashboard/              # Frontend React + Vite + Nginx
│   ├── src/
│   │   ├── components/     # MarketOverview, IntelligenceFeed, Watchlist, etc.
│   │   ├── App.jsx         # App principal + routing + settings
│   │   └── styles.css      # Design system
│   └── imgs/               # Ícones e assets
├── services/
│   ├── api/                # FastAPI Gateway
│   ├── collector/          # RSS/Atom Scraper
│   ├── analysis/           # NLP & Sentiment Engine
│   └── notifier/           # Alert Service
├── doc/                    # Documentação técnica
└── docker-compose.yml      # Orquestração
```

---

## 🤝 Contribuição

1. Fork o repositório
2. Crie uma branch (`git checkout -b feature/NovaAnalise`)
3. Commit suas mudanças
4. Push e abra um Pull Request

---

_OpenFinance Intel — Transformando Notícia em Alpha._ 🚀
