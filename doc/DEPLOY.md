# 🚀 Guia de Deploy — OpenFinance Intel na Oracle Cloud (Grátis)

Este guia leva você do zero ao deploy completo na **Oracle Cloud Free Tier** (grátis pra sempre).

**Tempo estimado**: ~30 minutos

---

## Passo 1 — Criar Conta na Oracle Cloud

1. Acesse **[cloud.oracle.com](https://cloud.oracle.com)** e clique em **"Sign Up"**.
2. Preencha seus dados (nome, e-mail, país).
3. **Cartão de crédito**: Ele pede, mas **NÃO cobra**. É só verificação. Você vai usar o tier "Always Free".
4. Escolha a **Home Region** mais perto de você:
   - 🇧🇷 Brasil → escolha **"Brazil East (Sao Paulo)"** ou **"Brazil Southeast (Vinhedo)"**
5. Aguarde a ativação da conta (pode levar até 30 minutos).

---

## Passo 2 — Criar a VM (Máquina Virtual)

1. Faça login no painel: **[cloud.oracle.com](https://cloud.oracle.com)**
2. No menu principal, vá em: **Compute → Instances → Create Instance**

### Configurações da VM:

| Campo           | O que colocar                                                                       |
| --------------- | ----------------------------------------------------------------------------------- |
| **Name**        | `openfinance-intel` (ou qualquer nome)                                              |
| **Compartment** | Deixe o padrão (root)                                                               |
| **Image**       | Clique em **"Edit"** → Escolha **Ubuntu 22.04** (Canonical)                         |
| **Shape**       | Clique em **"Change Shape"** → Aba **"Ampere"** → Selecione **VM.Standard.A1.Flex** |
| **OCPUs**       | **2** (grátis até 4)                                                                |
| **RAM**         | **12 GB** (grátis até 24 GB)                                                        |

### SSH Key (Muito importante!):

Na seção **"Add SSH keys"**:

1. Selecione **"Generate a key pair for me"**
2. Clique em **"Save Private Key"** → Salve o arquivo `.key` no seu PC (ex: `oracle-vm.key`)
3. **NÃO PERCA ESSE ARQUIVO!** Sem ele, você não entra na VM.

### Rede:

- Na seção "Networking", deixe tudo no padrão
- Marque **"Assign a public IPv4 address"** (deve já estar marcado)

### Criar:

Clique em **"Create"** e aguarde ~2 minutos até o status ficar **"RUNNING"**.

📝 **Anote o IP público** que aparece na tela (ex: `132.145.xx.xx`). Você vai usar ele pra acessar.

---

## Passo 3 — Abrir a Porta 80 (HTTP)

A Oracle bloqueia todas as portas por padrão. Você precisa abrir a porta 80 para acessar o site.

### 3.1 — No Painel Oracle (Security List):

1. Na página da sua VM, clique no link da **Subnet** (em "Primary VNIC" → "Subnet")
2. Clique na **Security List** (ex: `Default Security List for vcn-xxx`)
3. Clique em **"Add Ingress Rules"**
4. Preencha:

| Campo                  | Valor            |
| ---------------------- | ---------------- |
| Source Type            | CIDR             |
| Source CIDR            | `0.0.0.0/0`      |
| IP Protocol            | TCP              |
| Destination Port Range | `80`             |
| Description            | HTTP OpenFinance |

5. Clique **"Add Ingress Rules"**

### 3.2 — Repita para a porta 443 (HTTPS, opcional):

Mesma coisa, mas com porta `443` e descrição `HTTPS`.

---

## Passo 4 — Conectar na VM via SSH

Abra o **PowerShell** (ou Terminal) no seu PC:

```powershell
# Mude a permissão da chave (Windows PowerShell)
icacls "C:\caminho\para\oracle-vm.key" /inheritance:r /grant:r "$($env:USERNAME):(R)"

# Conecte via SSH
ssh -i "C:\caminho\para\oracle-vm.key" ubuntu@SEU_IP_PUBLICO
```

> Substitua `C:\caminho\para\oracle-vm.key` pelo caminho real do arquivo `.key` que você salvou.
> Substitua `SEU_IP_PUBLICO` pelo IP que anotou no Passo 2.

Se perguntar "Are you sure you want to continue connecting?", digite **yes**.

🎉 Agora você está dentro do servidor!

---

## Passo 5 — Instalar Docker no Servidor

Rode estes comandos **dentro da VM** (um de cada vez):

```bash
# Atualizar sistema
sudo apt update && sudo apt upgrade -y

# Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Adicionar seu usuário ao grupo Docker (evita usar sudo sempre)
sudo usermod -aG docker $USER

# Sair e entrar de novo para aplicar permissão
exit
```

Reconecte via SSH (mesmo comando do Passo 4), depois verifique:

```bash
docker --version
docker compose version
```

Se ambos mostrarem versões, está instalado! ✅

---

## Passo 6 — Abrir Porta 80 no Firewall do Ubuntu

Além da Security List da Oracle (Passo 3), o Ubuntu tem seu próprio firewall:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save
```

Se der erro no `netfilter-persistent`:

```bash
sudo apt install iptables-persistent -y
sudo netfilter-persistent save
```

---

## Passo 7 — Clonar o Projeto e Fazer Deploy

```bash
# Clonar seu repositório
git clone https://github.com/Haell39/OpenFinance_Intel.git
cd OpenFinance_Intel

# (Opcional) Se tiver variáveis de ambiente, crie o arquivo:
# nano services/.env
# Adicione: GOOGLE_API_KEY=sua_chave_aqui
# Salve com Ctrl+X → Y → Enter

# SUBIR TUDO! 🚀
docker compose up --build -d
```

> O `-d` faz rodar em background (não prende o terminal).
> O primeiro build demora ~5-10 minutos (baixa imagens, instala dependências).

### Verificar se está rodando:

```bash
docker compose ps
```

Todos os serviços devem estar com status `Up`:

```
NAME          STATUS
redis         Up
mongo         Up
api           Up
collector     Up
analysis      Up
dashboard     Up
```

---

## Passo 8 — Acessar a Plataforma! 🎉

Abra o navegador e acesse:

```
http://SEU_IP_PUBLICO
```

(Ex: `http://132.145.xx.xx`)

Aguarde ~2 minutos para os primeiros eventos aparecerem.

**Pronto! Sua plataforma está no ar, grátis, 24/7!** 🚀

---

## 📋 Comandos Úteis (Dia a Dia)

```bash
# Ver logs em tempo real
docker compose logs -f

# Ver logs de um serviço específico
docker compose logs -f api

# Reiniciar tudo
docker compose restart

# Atualizar com novas mudanças do GitHub
git pull origin main
docker compose up --build -d

# Parar tudo
docker compose down

# Parar e APAGAR dados (banco limpo)
docker compose down -v
```

---

## ⚠️ Troubleshooting

| Problema                        | Solução                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Não consigo acessar pelo IP** | Verifique Security List (Passo 3) e iptables (Passo 6)                                                                     |
| **Build falha por memória**     | Ative swap: `sudo fallocate -l 4G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile` |
| **SSH não conecta**             | Verifique se usou o arquivo `.key` correto e se o IP está certo                                                            |
| **Containers caem**             | Rode `docker compose logs` pra ver o erro                                                                                  |
| **Quero domínio próprio**       | Aponte um A Record do seu domínio pro IP da VM. Depois instale Certbot pro HTTPS                                           |
