# Event Schema - SentinelWatch

## Estrutura de Evento

Todos os eventos processados pelo sistema seguem este schema:

```json
{
  "id": "uuid",
  "type": "financial | geopolitical | odds",
  "title": "string",
  "description": "string",
  "impact": "high | medium | low",
  "urgency": "urgent | normal",
  "location": {
    "country": "BR",
    "region": "SP | RJ | DF | MG | RS | SC | PR | BA | PE | CE | ..."
  },
  "source": {
    "id": "string",
    "url": "string"
  },
  "timestamp": "ISO 8601 datetime",
  "analyzed_at": "ISO 8601 datetime"
}
```

## Campos de Localização

### `location.country`

- Sempre "BR" (Brasil)
- Campo obrigatório

### `location.region`

- Sigla do estado brasileiro (SP, RJ, MG, etc.)
- Ou "BR" para eventos nacionais
- Será usado para posicionar eventos no mapa

## Futura Visualização em Mapa

Os eventos serão exibidos em um mapa interativo do Brasil, com:

- Marcadores posicionados por região/estado
- Cores baseadas no impacto (vermelho = high, amarelo = medium, verde = low)
- Agrupamento por densidade de eventos
- Filtros por tipo e impacto

## Exemplos

### Evento Nacional

```json
{
  "location": {
    "country": "BR",
    "region": "BR"
  }
}
```

### Evento Regional

```json
{
  "location": {
    "country": "BR",
    "region": "SP"
  }
}
```
