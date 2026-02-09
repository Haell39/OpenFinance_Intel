# Status do Projeto - OpenFinance Intel 🌍

**Versão Atual**: v5.0 (Global Intelligence Release)

## ✅ Visão Geral

O **OpenFinance Intel** evoluiu de um monitor regional para uma **Plataforma Global de Inteligência Financeira**. O sistema agora monitora as principais economias do mundo (G20), utilizando Inteligência Artificial (NLP) para entender o contexto geográfico e econômico de cada evento em tempo real.

## 🚀 Funcionalidades Entregues

### 1. Inteligência & AI

- **[NOVO] NLP com spaCy**: Substituição de regex simples por modelos neurais (`en_core_web_sm` e `pt_core_news_sm`) para detecção de entidades (Países, Cidades, Organizações).
- **Infrência Geográfica Global**: O sistema entende que "Fed" se refere aos EUA e "OPEP" à Arábia Saudita.
- **Filtro de Ruído**: Bloqueio ativo de conteúdo irrelevante (esportes, entretenimento).

### 2. Visualização & UI

- **Mapa Mundi Interativo**: Visualização global com marcadores dinâmicos nos principais centros financeiros.
- **Real-Time Ticker**: Cotações de moedas e cripto (USD, EUR, BTC) atualizadas ao vivo.
- **Timer & Force Refresh**: Controle total sobre a atualização dos dados.

### 3. Engenharia de Dados

- **Agendador Inteligente**: Coleta automática de fontes a cada 5 minutos.
- **Deduplicação Robusta**: Hashs determinísticos garantem que a mesma notícia não seja processada duas vezes.
- **Fontes Globais**: Integração nativa com CNBC, MarketWatch, Google News Geopolitics.

---

## 🏗️ Estado da Arquitetura

| Serviço       | Status     | Tecnologia   | Obs                                         |
| ------------- | ---------- | ------------ | ------------------------------------------- |
| **Collector** | 🟢 Estável | Python/RSS   | Scraper universal + Twitter Bridge          |
| **Analysis**  | 🟢 Estável | Python/spaCy | "Cérebro" do sistema. Processa NER e Scores |
| **API**       | 🟢 Estável | FastAPI      | Cache e Gestão de Fontes                    |
| **Dashboard** | 🟢 Estável | React/Vite   | Dark Mode, Leaflet Map                      |

---

## 🔮 Próximos Passos (Roadmap)

1.  **Análise de Sentimento (Sentiment Analysis)**: Classificar notícias como _Bullish_ (Otimista) ou _Bearish_ (Pessimista) para o mercado.
2.  **Alertas Push**: Integração com Telegram Bot ou E-mail para alertas urgentes ("Breaking News").
3.  **Gráficos Históricos**: Visualizar a tendência de volume de notícias por país ao longo do tempo.
