# OpenFinance Intel — Global Infrastructure 🏗️

## 🎯 Conceito

Plataforma **Event-Driven** para inteligência de investimento. O sistema ingere o caos da web (RSS, News) e o transforma em **Sinais de Mercado** estruturados, classificados por sentimento e impacto.

---

## 🧱 Arquitetura de Microserviços

O sistema opera em containers Docker orquestrados, comunicando-se via **Redis** (Pub/Sub e Filas).

### 1. 🕷️ Collector Service

_O "Braço" do sistema._

- **Responsabilidade**: Ir até a internet e buscar dados.
- **Fontes**: Suporta RSS, Atom, Google News e Twitter/X (via Nitter/RSS).
- **Deduplicação**: Gera um ID único (`md5(url+title)`) para cada evento, garantindo que a mesma notícia não gere ruído duplicado.

### 2. 🧠 Analysis Service (AI Core)

_O "Cérebro" do sistema._

- **Responsabilidade**: Ler, entender, classificar e pontuar o evento.
- **Pipeline de NLP**:
  1.  **Limpeza**: Remove HTML e caracteres irrelevantes.
  2.  **Detecção de Setor**: Usa palavras-chave e spaCy para classificar em `Crypto`, `Tech`, `Energy`, `Forex`, `Macro`.
  3.  **Análise de Sentimento (TextBlob)**:
      - **Polaridade**: Calcula score de -1.0 a +1.0.
      - **Classificação**: `Bullish` (>0.1), `Bearish` (<-0.1) ou `Neutral`.
  4.  **Scoring**: Calcula pontuação de **Impacto** (0-10) baseada em palavras-chave de crise e intensidade do sentimento.
  5.  **Insight**: Gera uma frase de ação (ex: "Atenção à volatilidade cambial").

### 3. 🌐 API Gateway

_A "Porta de Entrada"._

- **Responsabilidade**: Servir dados para o Frontend e gerenciar configurações.
- **Scheduler**: Loop assíncrono que re-agenda a verificação de fontes.
- **Smart Seeder**: Lógica de Upsert que permite adicionar novas fontes padrão sem resetar o banco de dados.

### 4. 🖥️ Dashboard (Frontend)

_A "Face" do sistema._

- **Tecnologia**: React + Vite + Tailwind CSS.
- **Impact Board**: Visualização estilo Kanban organizada por setores.
- **UX Financeira**: Cores semânticas (Verde/Vermelho) para rápida leitura de mercado ("5-second rule").
- **Auto-Refresh**: Polling inteligente que atualiza o board sem recarregar a página.

---

## 🔄 Fluxo de Dados (Pipeline V6)

1.  **Ingestão**: API agenda tarefa -> Redis `tasks_queue`.
2.  **Coleta**: Collector baixa o conteúdo -> Extrai Título/Corpo -> Redis `events_queue`.
3.  **Inteligência**: Analysis processa NLP -> Detecta Setor e Sentimento -> Gera Insight -> Salva no **MongoDB**.
4.  **Consumo**: Frontend solicita `/events` -> API consulta Mongo -> Usuário vê "Bitcoin Bullish" na coluna Crypto.

---

## 🗄️ Stack de Dados

- **MongoDB**: Armazena eventos enriquecidos.
  - Exemplo: `analytics: { sentiment: { label: "Bullish", polarity: 0.8 }, score: 9 }`.
- **Redis**: Broker de mensagens de baixa latência.

---

## ⚠️ Segurança & Ética

- O sistema utiliza apenas dados públicos.
- Respeita `robots.txt` e headers de User-Agent.
- Ferramenta de apoio à decisão, não recomendação de investimento automatizada.
