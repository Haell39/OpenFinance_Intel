# OpenFinance Intel 🌍⚡

**Plataforma de Inteligência de Investimentos** impulsionada por IA e análise de sentimento.

O OpenFinance Intel monitora o ecossistema financeiro global, transformando o caos de notícias e eventos em **Sinais de Investimento** claros. Utilizando **NLP (Processamento de Linguagem Natural)** e **Análise de Sentimento**, ele classifica eventos como _Bullish_ (Otimista) ou _Bearish_ (Pessimista) e os organiza por setor (Crypto, Tech, Macro, etc.).

---

## 🚀 Funcionalidades Principais

- **🧠 Análise de Sentimento**: Classifica notícias em **Bullish** 🟢, **Bearish** 🔴 ou **Neutral** ⚪ usando TextBlob.
- **📰 Intelligence Feed**: Narrativas agrupadas por IA com linha do tempo de eventos e medidor de sentimento.
- **💼 Watchlist Pessoal**: Sistema de favoritos para monitorar riscos e oportunidades específicas (com persistência local).
- **🖥️ Market Overview Terminal**: Dashboard estilo "Bento Grid" modulado para alta densidade de dados.
- **🎨 Premium UI**: Design "Silver Metal" laminado como padrão, com **Dark Mode** opcional e UX financeira de ponta.
- **🌎 Localização**: Suporte completo a **Português (PT-BR)** e Inglês (EN-US).
- **📊 Matriz de Risco**: Gráfico de dispersão (Impacto vs Sentimento) para identificar anomalias de mercado.
- **⚡ Ticker em Tempo Real**: Cotações ao vivo (USD, EUR, BTC) e atualizações de eventos com latência sub-segundo.
- **🔍 Fontes Globais**: Integração com Bloomberg, Reuters, CNBC, Google News e feeds oficiais de Bancos Centrais.

---

## 🏗️ Arquitetura

O sistema é construído sobre uma arquitetura de **Microserviços**:

1.  **Collector**: Faz scraping de feeds RSS/HTML e Twitter/X (IDs determinísticos para desduplicação).
2.  **Analysis**: O "Cérebro". Usa **spaCy** para categorização de setores e **TextBlob** para análise de sentimento (Polaridade/Subjetividade).
3.  **API Gateway**: Serviço FastAPI gerenciando fontes, eventos e websocket.
4.  **Dashboard**: Frontend React + Vite + Tailwind CSS (Focado em UX de terminal financeiro).
5.  **Infraestrutura**: Docker Compose, Redis (Filas), MongoDB (Persistência).

---

## ⚡ Início Rápido

### Pré-requisitos

- Docker & Docker Compose

### Executar a Plataforma

```bash
docker compose up --build
```

Acesse o dashboard em: **http://localhost:5173**

---

## 🛠️ Tech Stack & Highlights

- **Backend Architecture**: Python 3.11, FastAPI, Microservices (Collector, Analysis, API), Docker Containerization
- **AI & NLP**: spaCy (Entity Recognition), TextBlob (Sentiment Analysis), Custom Narrative Engine
- **Frontend Engineering**: React 18, Vite, Tailwind CSS, Recharts, LocalStorage Persistence
- **Data & Infrastructure**: MongoDB (NoSQL), Redis (Task Queue), Nginx (Reverse Proxy)
- **DevOps**: Docker Compose, Hot Module Replacement (HMR), Environment Variables Management

_Project designed to mimic institutional-grade financial terminals._

---

## 🤝 Contribuição

1.  Faça um Fork do repositório
2.  Crie uma branch (`git checkout -b feature/NovaAnalise`)
3.  Commit suas mudanças (`git commit -m 'Adiciona modelo de análise de Commodities'`)
4.  Push para a branch
5.  Abra um Pull Request

---

_OpenFinance Intel - Transformando Notícia em Alpha._
