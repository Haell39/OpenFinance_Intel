# Status do Projeto - OpenFinance Intel

## Visao geral

O **OpenFinance Intel** (antigo SentinelWatch) é uma plataforma de inteligência financeira premium, orientada a eventos. O sistema monitora, analisa e alerta sobre acontecimentos que impactam o mercado brasileiro. Recentemente passou por um **overhaul visual completo** (Dark Theme) e melhorias de estabilidade (deduplicação).

## Arquitetura atual

**Fluxo de dados**

Fonte -> API Gateway -> Redis (tasks_queue)
Collector -> RSS -> Redis (events_queue)
Analysis -> NLP + Geo -> MongoDB + Redis (alerts_queue)
Notifier -> logs
UI (React) -> GET /events + GET /events/geo-summary

**Microservicos**

- **API Gateway**: Expose endpoints REST e gerencia fontes.
- **Collector**: Scraper inteligente com **IDs determinísticos** para prevenir duplicatas.
- **Analysis**: Classificação NLP + Upsert no MongoDB (Idempotência).
- **Notifier**: Consumidor de alertas.
- **UI (Dashboard)**: Interface Premium Dark Theme com mapa fullscreen e ticker de mercado.

## Estado atual (V4 - Premium UI + Stability)

- **Identidade Visual**: Novo nome "OpenFinance Intel" e tema "Navy & Slate".
- **UX Premium**: Status bar com sinais de mercado, cards com glassmorphism, mapa com markers neon.
- **Estabilidade**:
  - ✅ **Deduplicação de Eventos**: IDs gerados via hash do conteúdo (MD5).
  - ✅ **Upsert no Banco**: Previne inserções repetidas de notícias.
- **Funcionalidades Principais**:
  - Pipeline end-to-end (RSS -> UI).
  - Geolocalização automática (NER) por estado (UF).
  - Filtros de Impacto e Urgência.

## Infraestrutura

- Redis (Filas)
- MongoDB (Persistência)
- Docker Compose (Orquestração)

## Próximos passos sugeridos

- Integração com Telegram/WhatsApp para alertas push.
- Adicionar dados reais de mercado (API de ações/moedas) no ticker.
- Implementar login/autenticação de usuários.
- Testes automatizados (E2E e Unitários).
