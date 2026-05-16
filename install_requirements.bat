@echo off
REM Script para ejecutar la instalación de prerequisitos
REM Este archivo inicia el script PowerShell de instalación

REM Obtener la ruta del script actual
setlocal enabledelayedexpansion
set "SCRIPT_PATH=%~dp0"

REM Verificar si PowerShell está disponible
where powershell >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: PowerShell no encontrado
    pause
    exit /b 1
)

REM Ejecutar el script PowerShell con permisos elevados si es necesario
echo Iniciando instalación de prerequisitos...
echo.

REM Ejecutar el script PowerShell
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPT_PATH%install_requirements.ps1"

if %errorlevel% neq 0 (
    echo.
    echo ERROR: La instalación falló
    pause
    exit /b 1
)

exit /b 0
