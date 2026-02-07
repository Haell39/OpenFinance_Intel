# Guia de Testes - SentinelWatch

## 1️⃣ Garantir que tudo está instalado

```powershell
# Verificar Docker
docker --version
docker compose --version

# Verificar Node.js
node --version
npm --version
```

---

## 2️⃣ Iniciar o Backend (em um terminal)

```powershell
cd D:\GitHub Desktop\TheOdds
docker compose up --build
```

Aguarde até ver as mensagens:

```
mongo          | mongod server is running
redis          | Ready to accept connections
api            | Uvicorn running on http://0.0.0.0:8000
collector      | iniciado. Aguardando tarefas na fila...
analysis       | iniciado. Aguardando eventos na fila...
notifier       | iniciado. Aguardando alertas na fila...
```

---

## 3️⃣ Iniciar o Frontend (em outro terminal)

```powershell
cd D:\GitHub Desktop\TheOdds\dashboard
npm install  # (primeira vez apenas)
npm run dev
```

Acesse: **http://localhost:5173**

---

## 4️⃣ Testar o Pipeline Completo

### Passo A: Verificar que a API está viva

```powershell
Invoke-RestMethod -Uri "http://localhost:8000/health"
```

Esperado: `{"status":"ok"}`

---

### Passo B: Cadastrar uma fonte RSS real

```powershell
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/sources" `
  -ContentType "application/json" `
  -Body '{"url":"http://g1.globo.com/dynamo/economia/rss2.xml","event_type":"financial"}'
```

Esperado:

```
id      : 67a1b2c3d4e5f6g7h8i9j0k1
status  : queued
```

---

### Passo C: Aguardar coleta e análise

Monitore os logs do Docker:

**No terminal do Backend, você deve ver:**

```
[collector] publicou evento xxxxx...: Bolsa fecha em alta com IPCA...
[analysis] ✓ evento xxxxx... (financial, high) processado e salvo
[notifier] [financial] impact=high urgency=urgent title=Bolsa...
```

Isso significa: coleta → análise → alerta funcionando ✅

---

### Passo D: Verificar dados na API

```powershell
# Todos os eventos
Invoke-RestMethod -Uri "http://localhost:8000/events"

# Apenas eventos de alto impacto
Invoke-RestMethod -Uri "http://localhost:8000/events?impact=high"

# Apenas notícias financeiras
Invoke-RestMethod -Uri "http://localhost:8000/events?type=financial"

# Combinado
Invoke-RestMethod -Uri "http://localhost:8000/events?impact=high&type=financial"
```

Você deve ver uma lista completa com:

- `title`: Texto limpo (SEM HTML)
- `description`: Texto limpo (SEM HTML)
- `impact`: high/medium/low
- `urgency`: urgent/normal
- `location`: { country: "BR", region: "XX" }
- `timestamp`: Data original do feed

---

### Passo E: Conferir a UI

Volte a **http://localhost:5173**

Você deve ver uma tabela com todos os eventos listados:

- ✅ Textos sem HTML
- ✅ Cores indicando impacto
- ✅ Badges de urgência
- ✅ Placeholder do mapa

Use os filtros para:

- Selecionar por **Impacto**
- Selecionar por **Tipo**

---

## 5️⃣ Testar Sanitização de HTML

Para confirmar que a remoção de HTML funciona:

### Método A: Via MongoDB (direto no container)

```powershell
# Entre no container MongoDB
docker exec -it theOdds-mongo-1 mongosh

# No shell MongoDB
use sentinelwatch
db.events.findOne({}, {_id: 0, title: 1, description: 1})
```

Verifique que `description` contém apenas texto, sem `<p>`, `<img>`, `<iframe>`, etc.

### Método B: Via API (mais fácil)

```powershell
$events = Invoke-RestMethod -Uri "http://localhost:8000/events"
$events[0].description  # Ver primeira descrição - deve ser texto limpo
```

---

## 6️⃣ Testar com Múltiplas Fontes

Cadastre outras fontes RSS:

```powershell
# G1 Economia
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/sources" `
  -ContentType "application/json" `
  -Body '{"url":"http://g1.globo.com/dynamo/economia/rss2.xml","event_type":"financial"}'

# Outro feed
Invoke-RestMethod -Method Post -Uri "http://localhost:8000/sources" `
  -ContentType "application/json" `
  -Body '{"url":"https://example.com/feed.xml","event_type":"geopolitical"}'
```

Cada cadastro gerará nova coleta, análise e eventos na UI.

---

## 7️⃣ Parar tudo

```powershell
# Backend
# No terminal do Docker, pressione Ctrl+C, depois:
docker compose down

# Frontend
# No terminal do npm, pressione Ctrl+C
```

---

## ✅ Checklist Funcional

- [ ] Backend sobe sem erros
- [ ] Frontend conecta na API
- [ ] GET /events retorna dados
- [ ] Fonte RSS é cadastrada com sucesso
- [ ] Eventos aparecem nos logs do Collector
- [ ] Eventos aparecem nos logs do Analysis
- [ ] Descrições vêm sem HTML
- [ ] UI exibe eventos corretamente
- [ ] Filtros funcionam
- [ ] Cores de impacto aparecem
- [ ] Timestamps estão formatados legíveis

Se todos passarem ✅ o projeto está 100% funcional!

---

## 🐛 Troubleshooting

**"Conexão recusada na API"**

- Verifique se `docker compose up` está rodando
- Aguarde 10-15 segundos para containers iniciarem

**"Nenhum evento aparece na UI"**

- Verifique logs: `docker logs <container-name>`
- Confirme que fonte foi cadastrada
- Aguarde 5-10 segundos para processamento

**"HTML ainda aparece na descrição"**

- Você tem eventos antigos salvos SEM a sanitização
- Limpe TODOS os dados antigos e reconstrua:
  ```powershell
  docker compose down -v
  docker compose up --build
  ```
- Aguarde containers iniciarem completamente
- Depois cadastre uma NOVA fonte:
  ```powershell
  Invoke-RestMethod -Method Post -Uri "http://localhost:8000/sources" `
    -ContentType "application/json" `
    -Body '{"url":"https://www.infomoney.com.br/feed/","event_type":"financial"}'
  ```
- Aguarde alguns segundos nos logs (veja o Analysis processar)
- Recarregue a interface (F5)
- Agora as descrições virão sem HTML ✅

**"npm install trava"**

- Delete `node_modules` e `package-lock.json`
- Execute novamente: `npm install`
