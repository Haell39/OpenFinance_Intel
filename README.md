# OpenFinance Intel 🌍⚡

**Plataforma de Inteligência de Investimentos** impulsionada por IA e análise de sentimento.

O OpenFinance Intel monitora o ecossistema financeiro global, transformando o caos de notícias e eventos em **Sinais de Investimento** claros. Utilizando **NLP (Processamento de Linguagem Natural)** e **Análise de Sentimento**, ele classifica eventos como _Bullish_ (Otimista) ou _Bearish_ (Pessimista) e os organiza por setor (Crypto, Tech, Macro, etc.).

---

## 🚀 Funcionalidades Principais

- **🧠 Análise de Sentimento**: Classifica notícias em **Bullish** 🟢, **Bearish** 🔴 ou **Neutral** ⚪ usando TextBlob.
- **📊 Impact Board**: Visualização Kanban profissional focada em setores de investimento (**Crypto, Tech, Energy, Forex, Macro**).
- **💡 Insights Acionáveis**: A IA gera insights rápidos baseados no contexto (ex: "Setor Forex Bearish -> Monitorar Dólar").
- **⚡ Ticker em Tempo Real**: Cotações ao vivo (USD, EUR, BTC) e atualizações de eventos com latência sub-segundo.
- **🛡️ Filtro de Ruído**: Bloqueio ativo de esportes, fofocas e conteúdo irrelevante para o mercado.
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

## 🛠️ Tech Stack

- **Backend**: Python 3.11, FastAPI, spaCy (NLP), TextBlob (Sentiment)
- **Frontend**: React 18, Tailwind CSS, Vite
- **Dados**: MongoDB, Redis
- **DevOps**: Docker, Nginx

---

## 🤝 Contribuição

1.  Faça um Fork do repositório
2.  Crie uma branch (`git checkout -b feature/NovaAnalise`)
3.  Commit suas mudanças (`git commit -m 'Adiciona modelo de análise de Commodities'`)
4.  Push para a branch
5.  Abra um Pull Request

---

_OpenFinance Intel - Transformando Notícia em Alpha._
