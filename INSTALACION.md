# 📦 Instalación de Prerequisitos - Streamcontrol MS

Este documento explica cómo instalar todos los prerequisitos necesarios para ejecutar la aplicación.

## ¿Qué hace el instalador?

El instalador automáticamente:
1. ✓ Verifica si **Node.js** está instalado
2. ✓ Si no está instalado, **descarga e instala Node.js LTS** automáticamente
3. ✓ Instala todas las **dependencias del proyecto** (npm packages)

## Cómo usar

### Opción 1: Archivo Batch (Recomendado - Más fácil)
Simplemente **haz doble clic** en:
- `install_requirements.bat`

### Opción 2: PowerShell
Abre PowerShell y ejecuta:
```powershell
.\install_requirements.ps1
```

> **Nota**: Si recibes un error sobre "execution policy", ejecuta primero:
> ```powershell
> Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
> ```

## ¿Qué se instala?

- **Node.js v20.11.1 LTS** - Si no está instalado
- **npm** - Gestor de paquetes de Node.js
- **Dependencias del proyecto**:
  - `obs-websocket-js` - Para integración con OBS
  - `tmi.js` - Para integración con Twitch
  - `electron` - Framework para la aplicación
  - `electron-builder` - Para compilar la aplicación

## Después de la instalación

Una vez instalado, puedes:

### Ejecutar la aplicación
- Haz doble clic en `start_app.bat`
- O ejecuta: `npm start`

### Compilar la aplicación (crear .exe)
- Ejecuta: `npm run dist`

## Requisitos del sistema

- **Windows 7 o superior**
- **Conexión a Internet** (para descargar Node.js si es necesario)
- **Espacio en disco**: ~500 MB libres

## Solucución de problemas

### "Node.js no se instala"
- Verifica tu conexión a internet
- Intenta descargar Node.js manualmente desde: https://nodejs.org/

### "npm install falla"
- Intenta eliminar las carpetas `node_modules` y `package-lock.json`
- Vuelve a ejecutar el instalador

### "El script no se ejecuta en PowerShell"
- Ejecuta: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- Luego intenta de nuevo

## Preguntas frecuentes

**P: ¿Necesito permisos de administrador?**  
R: Sí, si Node.js no está instalado. El script lo solicitará automáticamente.

**P: ¿Cuánto tiempo tarda?**  
R: 2-5 minutos, dependiendo de tu conexión a internet y velocidad del disco.

**P: ¿Puedo desinstalarlo?**  
R: Sí, solo desinstala Node.js desde "Panel de Control" → "Programas y características"

---

¿Necesitas ayuda? Revisa el archivo `README.md` principal del proyecto.
