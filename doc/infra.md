# SentinelWatch — Financial & Geopolitical Event Intelligence Platform

## 🎯 Ideia do Projeto

O **SentinelWatch** é uma plataforma de inteligência financeira orientada a eventos, projetada para **monitorar, analisar e alertar sobre acontecimentos que impactam mercados**, como notícias financeiras, eventos geopolíticos e sinais de mercado derivados de variações de odds esportivas. O sistema coleta dados públicos de múltiplas fontes, classifica automaticamente cada evento por **tipo, impacto e urgência**, associa esses eventos a uma **localização geográfica (Brasil, inicialmente)** e entrega essa informação de forma acionável por meio de **alertas em tempo real** e **visualização em mapa interativo**.

Este projeto é a evolução direta do **OpenFinance Map**, avançando de uma plataforma reativa de visualização para um sistema **proativo e autônomo de inteligência**, capaz de detectar eventos relevantes sem intervenção humana e apoiar decisões informadas no contexto financeiro e econômico.

---

## 🧠 Conceito Central

Tudo no SentinelWatch é tratado como um **Evento**.

Um evento pode ser:

- Uma notícia financeira relevante
- Um acontecimento geopolítico com impacto econômico
- Uma decisão política ou regulatória
- Uma variação significativa de odds esportivas (como sinal de mercado)

Independentemente da origem, todo evento passa pelo mesmo pipeline de processamento, garantindo simplicidade, coesão e escalabilidade.

---

## 🧱 Arquitetura Geral (Microserviços Orientados a Eventos)

O sistema utiliza uma **arquitetura distribuída e event-driven**, onde microserviços independentes se comunicam exclusivamente por meio de filas (Redis). Cada serviço possui uma responsabilidade bem definida, mantendo baixo acoplamento e facilitando evolução futura.

### 🔹 Microserviços

#### 1. API Gateway (FastAPI)

- Cadastro de fontes monitoradas (notícias, feeds, eventos esportivos)
- Definição do tipo de evento (`financial`, `geopolitical`, `odds`)
- Exposição de endpoints REST
- Persistência de configurações e histórico no MongoDB
- Publicação de tarefas de coleta no Redis

#### 2. Collector Service (Scraper Genérico)

- Coleta dados de fontes públicas:
  - Sites e feeds de notícias financeiras
  - Portais econômicos e políticos
  - Páginas públicas de odds esportivas
- **Auto-discovery de RSS**: detecta feeds em páginas HTML via `<link rel="alternate">`
- Segue redirecionamentos e acepta múltiplos content-types
- Normaliza os dados brutos
- Publica eventos iniciais na fila (`events_queue`)

#### 3. Analysis Service (NLP + Regras + NER)

- Consome eventos brutos
- Aplica NLP e regras contextuais para:
  - Classificar impacto (alto / médio / baixo)
  - Definir urgência
  - Extrair palavras-chave
  - **NER contextual para localização** (detecta "governo de", "prefeitura de", "assembleia legislativa de", etc.)
  - Mapear cidades → estados (todas capitais + 60+ cidades)
  - Associar localização geográfica ao Brasil em UF normalizada (SP, RJ, MG, etc.)
- Para odds:
  - Compara valores entre fontes
  - Detecta variações relevantes
- Publica eventos enriquecidos e prontos para ação

#### 4. Notifier Service

- Consome eventos analisados
- Filtra por tipo, impacto e urgência
- Envia alertas automáticos via:
  - Telegram
  - E-mail (SMTP)
- Gera mensagens claras e acionáveis

#### 5. Map & Dashboard (Frontend)

- **Mapa interativo fullscreen** do Brasil exibindo eventos por estado
- **Badges de eventos por UF** clicáveis para filtrar regionalmente
- **Sidebar dinâmica** que aparece ao selecionar estado
- **Cards de eventos** com:
  - Barra lateral colorida por impacto (vermelho/laranja/verde)
  - Link para fonte original
  - Selo de localização (Nacional/UF/Localidade não especificada)
  - Ordenação por: Mais recentes, Mais urgentes, Mais impactantes
- **Modal para cadastro de fontes** com 10 fontes brasileiras pré-configuradas:
  - InfoMoney, Valor Econômico, G1 Economia, Banco Central do Brasil
  - Tesouro Nacional, Agência Brasil, Estadão Economia, Folha Mercado
  - IBGE, B3
- Histórico e filtros por tipo de evento e impacto

---

## 🔄 Fluxo de Processamento

```
Fonte (Notícia / Evento / Odds)
        ↓
Collector Service
        ↓
Redis (events_queue)
        ↓
Analysis Service
        ├─ Classifica tipo, impacto e urgência
        ├─ Associa localização
        ↓
Redis (alerts_queue)
        ↓
Notifier Service
        ↓
Alertas (Telegram / E-mail)
        ↓
Mapa e Dashboard
```

---

## 🗄️ Infraestrutura

- **Redis** → Fila de eventos e comunicação entre serviços
- **MongoDB** → Persistência de eventos, fontes e histórico
- **Docker** → Containerização dos microserviços
- **Docker Compose** → Orquestração local
- **Railway** → Deploy em produção

---

## 🧪 Princípios de Engenharia Aplicados

- Microserviços
- Event-driven architecture
- Separation of concerns
- Loose coupling
- Automação orientada a dados
- Escalabilidade desde o design

---

## ⚠️ Nota Ética

O projeto utiliza apenas dados públicos, possui caráter educacional e informativo, não realiza recomendações financeiras nem incentiva apostas ou investimentos.

---

## 🚀 Objetivo do Projeto

Demonstrar, em um sistema real e publicado, competências práticas em:

- Arquitetura distribuída
- Processamento de eventos em tempo real
- NLP aplicado a finanças
- Scraping de dados públicos
- Visualização geoespacial
- Automação e alertas inteligentes

Um projeto de portfólio desenhado para impressionar tecnicamente, mantendo simplicidade e clareza para um desenvolvedor iniciante.
