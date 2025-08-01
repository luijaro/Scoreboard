# Script para iniciar la aplicación Scoreboard
$appPath = "C:\Users\luija\OneDrive\Documents\Github\challonge-top8-viewer\Scoreboard"

# Cambiar al directorio de la aplicación
Set-Location $appPath

# Verificar si Node.js está instalado
if (Get-Command "npm" -ErrorAction SilentlyContinue) {
    Write-Host "Iniciando Scoreboard App..."
    npm start
} else {
    Write-Host "Error: npm no encontrado. Instala Node.js primero."
    Read-Host "Presiona Enter para continuar"
}
