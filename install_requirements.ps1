# Script de instalación de prerequisitos para Scoreboard
# Este script verifica e instala Node.js y todas las dependencias necesarias

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Instalador de Prerequisitos" -ForegroundColor Cyan
Write-Host "   Streamcontrol MS - Scoreboard" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Función para ejecutar comando y verificar resultado
function Check-LastExitCode {
    if ($LASTEXITCODE -ne 0) {
        Write-Host "ERROR: El comando anterior falló" -ForegroundColor Red
        return $false
    }
    return $true
}

# 1. Verificar si Node.js está instalado
Write-Host "[1/3] Verificando Node.js..." -ForegroundColor Yellow
$nodeVersion = node --version 2>$null

if ($null -eq $nodeVersion) {
    Write-Host "Node.js no está instalado. Instalando..." -ForegroundColor Red
    
    # Descargar e instalar Node.js LTS
    $nodeUrl = "https://nodejs.org/dist/v20.11.1/node-v20.11.1-x64.msi"
    $installerPath = "$env:TEMP\node-installer.msi"
    
    Write-Host "Descargando Node.js v20.11.1..." -ForegroundColor Cyan
    
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $nodeUrl -OutFile $installerPath -ErrorAction Stop
        
        Write-Host "Ejecutando instalador de Node.js..." -ForegroundColor Cyan
        Start-Process -FilePath $installerPath -ArgumentList "/quiet /norestart" -Wait
        
        # Limpiar archivo temporal
        Remove-Item $installerPath -ErrorAction SilentlyContinue
        
        # Recargar las variables de entorno
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
        
        Write-Host "Node.js instalado correctamente ✓" -ForegroundColor Green
    }
    catch {
        Write-Host "Error al descargar Node.js. Verifica tu conexión a internet." -ForegroundColor Red
        Write-Host $_.Exception.Message -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "Node.js $nodeVersion está instalado ✓" -ForegroundColor Green
}

# Verificar npm
Write-Host "[2/3] Verificando npm..." -ForegroundColor Yellow
$npmVersion = npm --version 2>$null

if ($null -eq $npmVersion) {
    Write-Host "ERROR: npm no está disponible" -ForegroundColor Red
    exit 1
}

Write-Host "npm $npmVersion está instalado ✓" -ForegroundColor Green
Write-Host ""

# 2. Instalar dependencias del proyecto
Write-Host "[3/3] Instalando dependencias del proyecto..." -ForegroundColor Yellow
Write-Host "Ejecutando: npm install" -ForegroundColor Cyan
Write-Host ""

# Cambiar al directorio del proyecto
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

npm install

if (Check-LastExitCode) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "   ✓ Instalación completada" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "Puedes ejecutar la aplicación con:" -ForegroundColor Cyan
    Write-Host "  - Ejecutando: start_app.bat" -ForegroundColor White
    Write-Host "  - O escribiendo en PowerShell: npm start" -ForegroundColor White
    Write-Host ""
} else {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "   ✗ Error en la instalación" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    exit 1
}

Write-Host "Presiona una tecla para cerrar esta ventana..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
