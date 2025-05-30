# 🎮 Scoreboard Electron + OBS + Twitter Quickshare

Gestor de torneos con integración a Challonge, overlays en tiempo real, control y captura de OBS, y publicación sencilla de resultados en Twitter.

---

## 🚀 Instalación y ejecución

1. Clona el repositorio y entra en la carpeta raíz:
    ```bash
    git clone https://github.com/tuusuario/tu-repo.git
    cd tu-repo
    ```
2. Instala las dependencias:
    ```bash
    npm install
    ```
3. Inicia la aplicación:
    ```bash
    npm start
    ```

**Requisitos:**
- Node.js y npm instalados  
- OBS Studio 28+ con OBS WebSocket 5.x activado (ya viene integrado en OBS 28 o superior)

---

## 🖥️ Funcionalidades principales

- Scoreboard editable en tiempo real (nombres, scores, personajes, tags)
- Sincronización con Challonge: carga y selección automática de matches y rondas
- Integración directa con OBS Studio:
    - Conexión vía WebSocket
    - Cambio de escena desde la app
    - Captura de la escena actual y copia automática al portapapeles
- Generador de mensajes de resultados (por ejemplo, Top 8)
- Botón "Twittear mensaje":
    - Abre Twitter con el mensaje listo para publicar
    - Solo tienes que pegar (Ctrl+V) la captura de OBS en el compositor de tweets

---

## 🕹️ Uso rápido

1. Conecta OBS desde la pestaña correspondiente de la app.
2. Cambia de escena desde la app o desde OBS según lo que quieras capturar.
3. Haz clic en el botón **"Capturar escena y copiar"** para copiar la imagen de la escena actual al portapapeles.
4. Ve a la sección de resultados y haz clic en **"Twittear mensaje"**.
5. Se abrirá el compositor de Twitter con el mensaje prellenado.
6. Pega la imagen capturada con **Ctrl+V** y publica el tweet.

---

## 📋 Notas técnicas

- El portapapeles usa la API nativa de Electron, compatible con Windows, macOS y la mayoría de distribuciones Linux.
- La captura se realiza usando el método `GetSourceScreenshot` de OBS WebSocket para asegurar máxima calidad.
- El botón "Twittear mensaje" usa el intent oficial de Twitter, por lo que solo permite prellenar texto (la imagen se debe pegar manualmente).
- El scoreboard y la configuración se guardan como archivos JSON locales para overlays y sincronización.

---

## ⚠️ Limitaciones

- No es posible subir imágenes automáticamente a Twitter por restricciones de la plataforma; la imagen debe pegarse manualmente después de hacer la captura.
- Para publicar tweets con imagen de forma 100% automática se requiere integración con la API de Twitter y credenciales de desarrollador (no incluida por defecto).

---

## 👨‍💻 Licencia

MIT  
Hecho por [TuNombre/TuUsuario](https://github.com/tuusuario)
