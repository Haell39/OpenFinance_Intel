# OpenFinance Intel — Global Infrastructure 🏗️

## 🎯 Conceito

Plataforma **Event-Driven** para inteligência financeira global. O sistema ingere o caos da web (RSS, News) e o transforma em sinais estruturados, geolocalizados e classificados para investidores.

---

## 🧱 Arquitetura de Microserviços

O sistema opera em containers Docker orquestrados, comunicando-se via **Redis** (Pub/Sub e Filas).

### 1. 🕷️ Collector Service

_O "Braço" do sistema._

- **Responsabilidade**: Ir até a internet e buscar dados.
- **Fontes**: Suporta RSS, Atom e scraping direto.
- **Deduplicação**: Gera um ID único (`md5(url+title)`) para cada evento antes mesmo de entrar na fila, economizando processamento.

### 2. 🧠 Analysis Service (AI Core)

_O "Cérebro" do sistema._

- **Responsabilidade**: Ler, entender e enriquecer o evento.
- **NLP (Natural Language Processing)**:
  - Utiliza **spaCy** com modelos `en_core_web_sm` (Inglês) e `pt_core_news_sm` (Português).
  - **NER (Named Entity Recognition)**: Identifica Países (GPE), Organizações (ORG) e Pessoas (PERSON).
  - **Country Mapping**: Converte entidades ("United States", "EUA") em códigos ISO (`US`, `BR`), permitindo plotagem precisa no mapa.
- **Scoring**: Calcula pontuação de **Impacto** (0-10) e **Urgência**.

### 3. 🌐 API Gateway

_A "Porta de Entrada"._

- **Responsabilidade**: Servir dados para o Frontend e gerenciar configurações.
- **Scheduler**: Possui um loop assíncrono que re-agenda a verificação de todas as fontes a cada 5 minutos.
- **Endpoints**: `/events` (com filtros globais), `/sources` (gestão de feeds).

### 4. 🖥️ Dashboard (Frontend)

_A "Face" do sistema._

- **Tecnologia**: React + Vite + Leaflet.
- **Mapa Global**: Renderiza marcadores em coordenadas de países (Lat/Lng).
- **Auto-Refresh**: Polling inteligente que verifica atualizações sem recarregar a página.

---

## 🔄 Fluxo de Dados (Pipeline V5)

1.  **Ingestão**: API agenda tarefa -> Redis `tasks_queue`.
2.  **Coleta**: Collector baixa o HTML/XML -> Extrai Título/Corpo -> Redis `events_queue`.
3.  **Inteligência**: Analysis carrega modelos NLP -> Detecta Idioma -> Extrai País -> Calcula Score -> Salva no **MongoDB**.
4.  **Consumo**: Frontend solicita `/events` -> API consulta Mongo -> Usuário vê "Breaking News" na China.

---

## 🗄️ Stack de Dados

- **MongoDB**: Schema flexível para eventos. Documentos incluem `location: { country: "US" }`, `analytics: { score: 8 }`.
- **Redis**: Broker de mensagens de baixa latência. Essencial para desacoplar a coleta (lenta) da análise (cpu-intensive).

---

## ⚠️ Segurança & Ética

- O sistema utiliza apenas dados públicos.
- Respeita `robots.txt` e headers de User-Agent.
- Focado em análise de tendências, não recomendação de investimento.
