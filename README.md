# OpenFinance Intel 🌍⚡

**Plataforma de Inteligência Financeira Global** impulsionada por eventos em tempo real e IA.

O OpenFinance Intel monitora o ecossistema financeiro mundial, coletando notícias, sinais de mercado e eventos geopolíticos. Utilizando **NLP (Processamento de Linguagem Natural)** avançado, ele detecta autonomamente países relevantes, classifica o impacto e visualiza dados em um mapa global em tempo real.

---

## 🚀 Funcionalidades Principais

- **🌍 Inteligência Global**: Detecta automaticamente países em notícias (ex: "Wall Street" → 🇺🇸 EUA, "B3" → 🇧🇷 BR) usando **spaCy NER**.
- **⚡ Ticker em Tempo Real**: Dados de mercado ao vivo (USD, EUR, BTC) e atualizações de eventos com latência sub-segundo.
- **🛡️ Filtro de Ruído**: Filtragem baseada em IA bloqueia esportes, fofocas e ruídos irrelevantes.
- **📊 UI Profissional**: Dashboard em modo escuro inspirado em Terminais Bloomberg.
- **🔍 Fontes Inteligentes**: Integra CNBC, Reuters, Google News (Geopolítica) e feeds oficiais de Bancos Centrais.

---

## 🏗️ Arquitetura

O sistema é construído sobre uma arquitetura de **Microserviços**:

1.  **Collector**: Faz scraping de feeds RSS/HTML (IDs determinísticos para desduplicação).
2.  **Analysis**: O "Cérebro". Usa **spaCy (EN/PT)** para Reconhecimento de Entidade Nomeada (NER) para inferir localização e impacto.
3.  **API Gateway**: Serviço FastAPI gerenciando fontes e recuperação de dados.
4.  **Dashboard**: Frontend React + Leaflet + Vite.
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

- **Backend**: Python 3.11, FastAPI, spaCy (NLP)
- **Frontend**: React 18, Leaflet (Mapas), Chart.js
- **Dados**: MongoDB, Redis
- **DevOps**: Docker, Nginx (proxy opcional)

---

## 🤝 Contribuição

1.  Faça um Fork do repositório
2.  Crie uma branch para sua feature (`git checkout -b feature/RecursoIncrivel`)
3.  Commit suas mudanças (`git commit -m 'Adiciona algum RecursoIncrivel'`)
4.  Push para a branch (`git push origin feature/RecursoIncrivel`)
5.  Abra um Pull Request

---

_OpenFinance Intel - Transformando Ruído em Sinal._
