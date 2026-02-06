#!/usr/bin/env pwsh

# Script para limpar dados antigos e reiniciar o SentinelWatch

Write-Host "================================" -ForegroundColor Green
Write-Host "Limpando dados antigos..." -ForegroundColor Yellow
Write-Host "================================" -ForegroundColor Green

# Parar containers
Write-Host "`n[1] Parando containers..." -ForegroundColor Cyan
docker compose down -v

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erro ao parar containers" -ForegroundColor Red
    exit 1
}

Write-Host "[✓] Dados deletados com sucesso!" -ForegroundColor Green

# Reconstruir e iniciar
Write-Host "`n[2] Reconstruindo e iniciando containers..." -ForegroundColor Cyan
docker compose up --build

Write-Host "`n================================" -ForegroundColor Green
Write-Host "Sistema pronto!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "`nProximas etapas:" -ForegroundColor Yellow
Write-Host "1. Abra outro terminal em dashboard/" -ForegroundColor White
Write-Host "2. Execute: npm install && npm run dev" -ForegroundColor White
Write-Host "3. Cadastre uma fonte RSS" -ForegroundColor White
Write-Host "4. Acesse http://localhost:5173" -ForegroundColor White
