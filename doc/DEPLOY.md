# Guia de Deploy — OpenFinance Intel 🚀

Como a plataforma está 100% containerizada com Docker, o deploy é simples e robusto. Você tem duas opções principais: **VPS (Recomendado)** ou **PaaS**.

---

## 🏗️ Opção 1: VPS (DigitalOcean, Hetzner, AWS) — Recomendado 🏆

Esta é a forma profissional de hospedar. Você tem controle total, custos fixos e performance garantida.

### 1. Provisionar Servidor

- **OS**: Ubuntu 22.04 LTS (ou superior)
- **CPU/RAM Recomendado**: 2 vCPU / 4GB RAM (mínimo 2GB RAM + Swap)
- **Disco**: 25GB+ SSD

### 2. Instalar Docker & Compose

Acesse via SSH e rode:

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Verificar instalação
docker compose version
```

### 3. Deploy da Aplicação

Clone o repositório e suba os containers:

```bash
# Clone
git clone https://github.com/SEU_USUARIO/TheOdds.git
cd TheOdds

# Configurar Variáveis de Ambiente (Opcional)
cp services/.env.example services/.env
nano services/.env # Adicione sua GOOGLE_API_KEY se tiver

# Subir tudo (Build em produção)
docker compose up --build -d
```

### 4. Configurar Domínio & SSL (HTTPS)

O `dashboard` expõe a porta **80**. Para ter HTTPS (cadeado verde), use o **Nginx Proxy Manager** ou configure o Certbot manualmente.

**Método Rápido com Nginx Proxy Manager:**

1. Adicione o serviço ao `docker-compose.yml` (ou rode separado).
2. Aponte seu domínio (A Record) para o IP da VPS.
3. No painel do Proxy Manager, encaminhe `seu-dominio.com` para `http://dashboard:80`.

---

## ☁️ Opção 2: Railway (PaaS) — Mais Fácil

O Railway lê o `docker-compose.yml` e faz deploy automático.

1. Crie conta em [railway.app](https://railway.app).
2. Clique em **"New Project"** → **"Deploy from GitHub repo"**.
3. Selecione o repositório **TheOdds**.
4. O Railway vai detectar o `docker-compose.yml`.
5. **Configuração Importante:**
   - Vá em "Variables" e adicione as variáveis se necessário.
   - O Railway pode pedir para expor uma porta. O dashboard usa a **80**. Se o Railway injetar a variável `$PORT`, o Nginx precisaria ser ajustado, mas geralmente para Docker Compose ele gerencia o roteamento interno.
   - **Dica**: No Railway, pode ser necessário configurar o `PORT` do dashboard para a porta que eles esperam, ou configurar o Railway para escutar na 80.

---

## ☁️ Opção 3: Render (PaaS)

1. Crie um **Web Service** para o Dashboard.
   - Build Context: `.`
   - Dockerfile path: `dashboard/Dockerfile`
2. Crie serviços separados para API, Redis e Mongo (ou use o MongoDB Atlas Gratuito).
   - **Nota**: O Render não suporta docker-compose nativo no plano gratuito da mesma forma que o Railway. É mais complexo conectar os microserviços. **Recomendamos a Opção 1 (VPS) ou 2 (Railway).**

---

## 🔄 Como Atualizar em Produção

Quando você fizer push de novas features:

### VPS

```bash
git pull origin main
docker compose up --build -d
```

(O Docker só recria os containers que mudaram. O banco de dados persiste porque usamos _volumes_.)

### Railway

Automático. Um push na `main` dispara um novo deploy.

---

## ⚠️ Checklist de Produção

- [ ] **Segurança**: Configure firewall (UFW) na VPS para fechar portas desnecessárias (só abra 80, 443, 22).
- [ ] **Bancos de Dados**: O MongoDB expõe a porta 27017 no compose padrão. Em produção, garanta que ela não está acessível externamente ou ponha senha.
- [ ] **Performance**: Se usar VPS de 2GB de RAM, ative **Swap** para evitar que o build do front estoure a memória.
