# Guia de Uso - Visualização Geoespacial do SentinelWatch

## 📍 Começando

Acesse: **http://localhost:5174/**

Você verá:

1. Header com filtros (Impacto, Tipo, Ordenar)
2. Seção de cadastro de fontes RSS
3. **Mapa do Brasil com badges de estados** (lado esquerdo)
4. **Tabela de eventos** (lado direito)

---

## 🗺️ Usando o Mapa

### Visualizar Contagem por Estado

O mapa mostra **badges circulares** com:

- **Sigla do estado** (SP, MG, RJ, etc.)
- **Número de eventos** naquela região

**Exemplo:**

- Badge "SP" mostra "4" (4 eventos em São Paulo)
- Badge "MG" mostra "1" (1 evento em Minas Gerais)
- Tamanho do badge escala com quantidade de eventos

### Clicar para Filtrar

1. **Clique no estado desejado**
   - Badge fica **vermelho** com **borda dourada**
   - Info box aparece: `[SP] Limpar filtro regional`
   - Tabela atualiza mostrando **apenas eventos do estado**

2. **Clique novamente para limpar filtro**
   - Badge volta ao azul normal
   - Info box desaparece
   - Tabela mostra todos os eventos novamente

---

## 📊 Filtrando Eventos

### Filtros Disponíveis

**Header:**

- **Impacto**: all | high | medium | low
- **Tipo**: all | financial | geopolitical | odds
- **Ordenar**: timestamp (Data) | urgency (Urgência/Impacto)

**Geograficamente:**

- Clique em um estado no mapa para filtrar por região

### Combinando Filtros

Você pode combinar todos os filtros:

```
Impacto: high
Tipo: financial
Região: SP (clicando no mapa)
Ordenar por: Urgência/Impacto
```

Resultado: Eventos de **alto impacto**, tipo **financial**, na região **SP**, ordenados por **urgência/impacto**.

---

## 📝 Tabela de Eventos

Colunas:

1. **Evento**: Título + Descrição + Keywords (roxo)
2. **Tipo**: Badge com tipo (financial, geopolitical, odds)
3. **Impacto**: Cor (🔴 high, 🟡 medium, 🟢 low)
4. **Urgência**: Cor (🔴 urgent, 🔵 normal)
5. **Localização**: Sigla UF + "BR" (ex: "SP, BR")
6. **Data/Hora**: Timestamp do evento

### Entities Display

Abaixo de cada descrição, você verá:

```
📍 São Paulo, Bolsa de Valores
```

Essas são as **entidades extraídas** pelo serviço de análise (localizações reconhecidas).

---

## ➕ Cadastrar Nova Fonte

1. **Preencha "URL do feed"**
   - Defaut: `http://g1.globo.com/dynamo/economia/rss2.xml`
   - Pode ser qualquer feed RSS válido

2. **Selecione "Tipo"**
   - financial
   - geopolitical
   - odds

3. **Clique "Cadastrar"**
   - Status: "Enviando..."
   - Se sucesso: "Fonte cadastrada ✅"
   - O mapa atualizará em poucos segundos

---

## 🔄 Fluxo Completo

```
1. Usuário Cadastra Fonte
   ↓
2. API enfileira tarefa no Redis
   ↓
3. Collector busca RSS e cria eventos brutos
   ↓
4. Analysis enriquece eventos:
   - Limpa HTML
   - Extrai keywords
   - **Normaliza localidade para UF**
   - Calcula score e impacto/urgência
   - Extrai entidades
   ↓
5. Events salvos no MongoDB com location.region em UF (SP, MG, etc.)
   ↓
6. Frontend carrega geo-summary (/events/geo-summary)
   ↓
7. Mapa renderiza badges por UF
   ↓
8. Usuário clica em estado para filtrar
   ↓
9. Frontend chama GET /events?region=SP
   ↓
10. Tabela mostra apenas eventos de SP
```

---

## 📌 Exemplos Práticos

### Exemplo 1: Encontrar Eventos Críticos em SP

1. Filtro Impacto: **high**
2. Filtro Tipo: **financial**
3. Clique no badge **SP** no mapa
4. Ordene por: **Urgência/Impacto**

**Resultado:** Você vê apenas eventos financeiros críticos de São Paulo, ordenados por urgência.

### Exemplo 2: Monitorar Situação Geopolítica

1. Filtro Tipo: **geopolitical**
2. Ordenar por: **Urgência/Impacto**
3. Observe o mapa para ver qual estado tem mais eventos geopolíticos

**Resultado:** Visão clara de eventos geopolíticos em tempo real por região.

### Exemplo 3: Análise Regional Completa

1. **Não defina filtro de tipo/impacto** (deixe em "all")
2. Clique em **MG** no mapa
3. Veja todos os eventos de Minas Gerais
4. Analise tipos e impactos diferentes em uma única região

---

## 🎯 Normalizações Automáticas

O backend **normaliza automaticamente** qualquer menção a um estado para sua sigla UF:

| What you Mention                 | Normalized To |
| -------------------------------- | ------------- |
| "São Paulo", "sao paulo"         | **SP**        |
| "Bolsa" (B3 em sp)               | **SP**        |
| "Rio de Janeiro", "RJ"           | **RJ**        |
| "Petrobras" (HQ em RJ)           | **RJ**        |
| "Bahia", "Salvador"              | **BA**        |
| "Minas Gerais", "Belo Horizonte" | **MG**        |
| "Ceará", "Fortaleza"             | **CE**        |
| (27 estados + muitas variações)  | ✅ Funciona   |

Se nenhum estado for mencionado → **"BR"** (Brasil inteiro)

---

## ⚙️ API Endpoints

### GET /events/geo-summary

Retorna contagem de eventos por UF:

```bash
curl http://localhost:8000/events/geo-summary
```

Resposta:

```json
{
  "SP": 4,
  "MG": 1,
  "RJ": 2,
  "BR": 1
}
```

### GET /events?region=SP

Filtra eventos de um estado:

```bash
curl http://localhost:8000/events?region=SP
```

Pode combinar:

```bash
curl "http://localhost:8000/events?region=SP&impact=high&type=financial"
```

---

## 🐛 Troubleshooting

**O mapa não carrega?**

1. Verifique se o frontend está rodando (http://localhost:5174/)
2. Abra o F12 → Console
3. Procure por erros de CORS ou network
4. Tente fazer refresh (Ctrl+R)

**Os badges não aparecem no mapa?**

1. Verifique se há eventos no banco (GET /events)
2. Confirme se GET /events/geo-summary retorna dados
3. Confirme se a location.region está preenchida (não null)

**Dados não atualizam após cadastrar fonte?**

1. Espere 2-3 segundos (processamento assíncrono)
2. Tente fazer refresh manual
3. Volte para Home (refresh F5) se persistir

**Filtro por região não funciona?**

1. Certifique de que a sigla UF está correta (SP, não paulo)
2. Confirme que há eventos para aquele estado
3. Tente limpar e reselecionar

---

## 📚 Arquivos Relevantes

Frontend:

- `dashboard/src/App.jsx` - Lógica principal + mapa
- `dashboard/src/components/MapVisualization.jsx` - Componente do mapa
- `dashboard/src/data/brazilGeoJSON.js` - Dados geográficos
- `dashboard/src/api/events.js` - Cliente HTTP

Backend:

- `services/api/app/main.py` - Endpoints GET /events + GET /events/geo-summary
- `services/analysis/app/main.py` - Lógica de normalização de location.region

Documentação:

- `doc/GEOSPATIAL.md` - Documentação técnica completa
- `doc/STATUS.md` - Status geral do projeto
- `doc/event_schema.md` - Schema de eventos

---

## 🚀 Próximas Melhorias

Sugestões futuras:

1. **Heatmap**: Gradiente de cores por densidade
2. **Timeline**: Filtro temporal interativo
3. **Pop-ups**: Info ao clicar no badge
4. **Export**: CSV/GeoJSON dos eventos
5. **Alertas**: Notificações por região
6. **Layer Toggle**: Mostrar/ocultar tipos
7. **Search**: Busca de eventos por texto

---

**Aproveite a visualização geoespacial do SentinelWatch!** 🎉
