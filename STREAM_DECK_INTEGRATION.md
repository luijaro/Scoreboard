# 🎮 Stream Deck In### **Acciones Especiales**
- `GET http://localhost:3001/reset-scores` - Resetear ambos scores a 0-0
- `GET http://localhost:3001/timer/reset` - Resetear el timer
- `GET http://localhost:3001/timer/5` - Establecer timer a 5 minutos
- `GET http://localhost:3001/timer/10` - Establecer timer a 10 minutos
- `GET http://localhost:3001/timer/15` - Establecer timer a 15 minutos
- `GET http://localhost:3001/timer/20` - Establecer timer a 20 minutos
- `GET http://localhost:3001/swap-players` - Intercambiar posiciones de jugadores

### **Cambio de Juego**
- `GET http://localhost:3001/game/GGST` - Cambiar a Guilty Gear Strive
- `GET http://localhost:3001/game/SF6` - Cambiar a Street Fighter 6
- `GET http://localhost:3001/game/T8` - Cambiar a Tekken 8
- `GET http://localhost:3001/game/UNI2` - Cambiar a Under Night In-Birth 2
- `GET http://localhost:3001/game/GBVSR` - Cambiar a Granblue Versus Rising
- `GET http://localhost:3001/game/BBCF` - Cambiar a BlazBlue Central Fiction
- `GET http://localhost:3001/game/MBTL` - Cambiar a Melty Blood Type Lumina
- `GET http://localhost:3001/game/COTW` - Cambiar a City of the Wolves
- `GET http://localhost:3001/game/GVSR` - Cambiar a Granblue Versus (Original)
- `GET http://localhost:3001/game/HFTF` - Cambiar a Heritage for the Future
- `GET http://localhost:3001/game/MBAACC` - Cambiar a Melty Blood Actress Again
- `GET http://localhost:3001/game/SCON4` - Cambiar a Soul Calibur VI
- `GET http://localhost:3001/game/SF3` - Cambiar a Street Fighter 3rd Strike
- `GET http://localhost:3001/game/VSAV` - Cambiar a Vampire Savior

Tu aplicación ahora incluye un servidor HTTP interno que permite controlar el scoreboard desde el Stream Deck de Elgato.

## 🚀 Configuración Automática

Cuando inicies la aplicación, se creará automáticamente un servidor HTTP en:
```
http://localhost:3001
```

## 📋 Endpoints Disponibles

### **Scores**
- `GET http://localhost:3001/score/player1/+1` - Aumentar score del jugador 1
- `GET http://localhost:3001/score/player1/-1` - Disminuir score del jugador 1  
- `GET http://localhost:3001/score/player2/+1` - Aumentar score del jugador 2
- `GET http://localhost:3001/score/player2/-1` - Disminuir score del jugador 2

### **Acciones Especiales**
- `GET http://localhost:3001/reset-scores` - Resetear ambos scores a 0-0
- `GEThttp://localhost:3001/timer/reset ` - Resetear el timer
- `GET http://localhost:3001/swap-players` - Intercambiar posiciones de jugadores

### **Control de la Aplicación**
- **Iniciar App:** Usar archivos `start_app.bat` o `start_app.ps1`
- **Cerrar App:** Usar archivo `close_app.bat`
- **Reiniciar App:** Multi Action combinando cerrar + esperar + iniciar

### **Estado del Servidor**
- `GET http://localhost:3001/` - Ver estado y lista de comandos disponibles

## 🎛️ Configuración en Stream Deck

### **Opción 1: Website Action (Más Simple)**

1. **Arrastra "Website" desde Actions**
2. **En URL:** `http://localhost:3001/score/player1/+1`
3. **En Access:** Selecciona "GET"
4. **Título del botón:** "P1 +1"
5. **Icono:** Agrega un "+" o el nombre del jugador

**Repetir para cada acción:**
- Botón "START APP": System > Open → `start_app.bat`
- Botón "CLOSE APP": System > Open → `close_app.bat`
- Botón "P1 +1": `http://localhost:3001/score/player1/+1`
- Botón "P1 -1": `http://localhost:3001/score/player1/-1`
- Botón "P2 +1": `http://localhost:3001/score/player2/+1`
- Botón "P2 -1": `http://localhost:3001/score/player2/-1`
- Botón "Reset": `http://localhost:3001/reset-scores`
- Botón "Swap": `http://localhost:3001/swap-players`
- Botón "Timer 5min": `http://localhost:3001/timer/5`
- Botón "Timer 10min": `http://localhost:3001/timer/10`
- Botón "Timer 15min": `http://localhost:3001/timer/15`
- Botón "Timer 20min": `http://localhost:3001/timer/20`
- Botón "Timer Reset": `http://localhost:3001/timer/reset`
- Botón "GGST": `http://localhost:3001/game/GGST`
- Botón "SF6": `http://localhost:3001/game/SF6`
- Botón "T8": `http://localhost:3001/game/T8`
- Botón "UNI2": `http://localhost:3001/game/UNI2`
- Botón "GBVSR": `http://localhost:3001/game/GBVSR`
- Botón "BBCF": `http://localhost:3001/game/BBCF`
- Botón "MBTL": `http://localhost:3001/game/MBTL`
- Botón "COTW": `http://localhost:3001/game/COTW`
- Botón "GVSR": `http://localhost:3001/game/GVSR`
- Botón "HFTF": `http://localhost:3001/game/HFTF`
- Botón "MBAACC": `http://localhost:3001/game/MBAACC`
- Botón "SCON4": `http://localhost:3001/game/SCON4`
- Botón "SF3": `http://localhost:3001/game/SF3`
- Botón "VSAV": `http://localhost:3001/game/VSAV`

### **Opción 2: System Action (Alternativa)**

1. **Arrastra "System" > "Open"**
2. **En App/File:** `cmd.exe`
3. **En Arguments:** `/c curl "http://localhost:3001/score/player1/+1"`
4. **Título:** "P1 +1"

## 🔧 Configuración Avanzada

### **Multi Actions**
Puedes crear botones que ejecuten múltiples acciones:
1. **Crear Multi Action**
2. **Agregar Website actions en secuencia:**
   - Reset scores
   - Reset timer
   - (Espera 100ms entre acciones)

### **Feedback Visual**
Para obtener confirmación visual:
1. **Usa "Text" action combinado con "Website"**
2. **El servidor responde con JSON indicando éxito/falla**

## 📊 Respuestas del Servidor

Todas las acciones responden con JSON:

**Éxito:**
```json
{
  "success": true,
  "message": "Score changed for player1 by +1"
}
```

**Error:**
```json
{
  "success": false,
  "message": "Failed to change score"
}
```

## 🛠️ Solución de Problemas

### **"No responde el Stream Deck"**
1. **Verifica que la aplicación esté ejecutándose**
2. **Comprueba en el log de la consola:** `[Stream Deck] Servidor HTTP iniciado en http://localhost:3001`
3. **Prueba manualmente en navegador:** `http://localhost:3001`

### **"Puerto ocupado"**
Si el puerto 3001 está ocupado, la aplicación mostrará un error. Cierra otras aplicaciones que puedan usar ese puerto.

### **"Stream Deck no encuentra el endpoint"**
1. **Asegúrate de usar HTTP, no HTTPS**
2. **Verifica que la URL sea exacta:** `http://localhost:3001/score/player1/+1`
3. **No olvides incluir el puerto :3001**

## 🎯 Ejemplo de Layout Recomendado

```
┌─────────┬─────────┬─────────┬─────────┬─────────┐
│  START  │  P1 +1  │  P2 +1  │  RESET  │ TIMER   │
│   APP   │         │         │ SCORES  │ 5 MIN   │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│  CLOSE  │  P1 -1  │  P2 -1  │  SWAP   │ TIMER   │
│   APP   │         │         │ PLAYERS │ 10 MIN  │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│ RESTART │ TIMER   │ TIMER   │ TIMER   │  GGST   │
│   APP   │ 15 MIN  │ 20 MIN  │ RESET   │  GAME   │
├─────────┼─────────┼─────────┼─────────┼─────────┤
│   SF6   │   T8    │  UNI2   │ GBVSR   │  BBCF   │
│  GAME   │  GAME   │  GAME   │  GAME   │  GAME   │
└─────────┴─────────┴─────────┴─────────┴─────────┘
```

### **Layout Alternativo para más juegos:**

```
┌─────────┬─────────┬─────────┬─────────┐
│  P1 +1  │  P2 +1  │  RESET  │ TIMER   │
│         │         │ SCORES  │ 5 MIN   │
├─────────┼─────────┼─────────┼─────────┤
│  P1 -1  │  P2 -1  │  SWAP   │ TIMER   │
│         │         │ PLAYERS │ RESET   │
├─────────┼─────────┼─────────┼─────────┤
│  GGST   │   SF6   │   T8    │  UNI2   │
├─────────┼─────────┼─────────┼─────────┤
│ GBVSR   │  BBCF   │  MBTL   │  COTW   │
├─────────┼─────────┼─────────┼─────────┤
│  GVSR   │  HFTF   │ MBAACC  │ SCON4   │
├─────────┼─────────┼─────────┼─────────┤
│   SF3   │  VSAV   │ (Libre) │ (Libre) │
└─────────┴─────────┴─────────┴─────────┘
```

### **Layout Compacto (Solo Juegos Principales):**

```
┌─────────┬─────────┬─────────┬─────────┐
│  P1 +1  │  P2 +1  │  RESET  │ TIMER   │
│         │         │ SCORES  │ 5 MIN   │
├─────────┼─────────┼─────────┼─────────┤
│  P1 -1  │  P2 -1  │  SWAP   │ TIMER   │
│         │         │ PLAYERS │ RESET   │
├─────────┼─────────┼─────────┼─────────┤
│  GGST   │   SF6   │   T8    │  UNI2   │
├─────────┼─────────┼─────────┼─────────┤
│ GBVSR   │  BBCF   │  MBTL   │ (Libre) │
└─────────┴─────────┴─────────┴─────────┘
```

## 📝 Notas Importantes

- ✅ **Los cambios se guardan automáticamente** en el JSON
- ✅ **Los overlays se actualizan inmediatamente**
- ✅ **El servidor se inicia/detiene con la aplicación**
- ✅ **Funciona con cualquier versión de Stream Deck Software**
- ⚠️ **Requiere que la aplicación esté ejecutándose**
- ⚠️ **Solo funciona en la misma computadora (localhost)**

## 🔄 Actualizaciones Futuras

Se pueden agregar más endpoints según necesidades:
- Cambiar personajes específicos
- Cambiar rounds/eventos
- Control de timer con tiempos específicos
- Integración con OBS
- Comandos de Twitch
- Más juegos disponibles

### **Juegos Actualmente Soportados:**
- ✅ **GGST** - Guilty Gear Strive
- ✅ **SF6** - Street Fighter 6  
- ✅ **T8** - Tekken 8
- ✅ **UNI2** - Under Night In-Birth 2
- ✅ **GBVSR** - Granblue Versus Rising
- ✅ **BBCF** - BlazBlue Central Fiction
- ✅ **MBTL** - Melty Blood Type Lumina
- ✅ **COTW** - City of the Wolves
- ✅ **GVSR** - Granblue Versus (Original)
- ✅ **HFTF** - Heritage for the Future (JoJo's Bizarre Adventure)
- ✅ **MBAACC** - Melty Blood Actress Again Current Code
- ✅ **SCON4** - Soul Calibur VI
- ✅ **SF3** - Street Fighter 3rd Strike
- ✅ **VSAV** - Vampire Savior
- ⚠️ **Otros juegos** - Revisar carpeta `personajes/` para más opciones

### **Cómo agregar más juegos:**
1. **Verifica que existe la carpeta del juego** en `personajes/[NOMBRE]/`
2. **Usa el endpoint:** `GET http://localhost:3001/game/[NOMBRE]`
3. **Ejemplo:** Para agregar KOF XV: `http://localhost:3001/game/KOFXV`

¡Disfruta controlando tu stream de forma profesional! 🎬

---

## 📱 Integración con Touch Portal

Touch Portal puede usar los mismos endpoints HTTP. Configuración recomendada:

### **Para Cambio de Juegos en Touch Portal:**

**Botón GGST:**
- **Action:** HTTP Request
- **URL:** `http://localhost:3001/game/GGST`
- **Method:** GET
- **Text:** "🎮 GGST"
- **Background:** Azul (#3498db)

**Botón SF6:**
- **URL:** `http://localhost:3001/game/SF6`
- **Text:** "🥊 SF6"
- **Background:** Rojo (#e74c3c)

**Botón T8:**
- **URL:** `http://localhost:3001/game/T8`
- **Text:** "👊 T8"
- **Background:** Naranja (#e67e22)

**Botón UNI2:**
- **URL:** `http://localhost:3001/game/UNI2`
- **Text:** "🌙 UNI2"
- **Background:** Púrpura (#9b59b6)

**Botón COTW:**
- **URL:** `http://localhost:3001/game/COTW`
- **Text:** "🐺 COTW"
- **Background:** Gris (#95a5a6)

**Botón HFTF:**
- **URL:** `http://localhost:3001/game/HFTF`
- **Text:** "⭐ HFTF"
- **Background:** Dorado (#f39c12)

**Botón SF3:**
- **URL:** `http://localhost:3001/game/SF3`
- **Text:** "🥋 SF3"
- **Background:** Azul Oscuro (#2c3e50)

**Botón VSAV:**
- **URL:** `http://localhost:3001/game/VSAV`
- **Text:** "🧛 VSAV"
- **Background:** Rojo Oscuro (#8e44ad)

### **Layout Touch Portal Recomendado:**

```
┌────────────┬────────────┬────────────┐
│    P1 +1   │    P2 +1   │   RESET    │
│   (Verde)  │   (Verde)  │   SCORES   │
├────────────┼────────────┼────────────┤
│    P1 -1   │    P2 -1   │    SWAP    │
│  (Naranja) │  (Naranja) │  PLAYERS   │
├────────────┼────────────┼────────────┤
│ 🎮 GGST   │ 🥊 SF6    │ 👊 T8     │
├────────────┼────────────┼────────────┤
│ 🌙 UNI2   │ ⚔️ GBVSR  │ ⏱️ TIMER  │
│           │           │   5 MIN    │
├────────────┼────────────┼────────────┤
│ 🐺 COTW   │ ⭐ HFTF   │ 🥋 SF3    │
├────────────┼────────────┼────────────┤
│ 🧛 VSAV   │ 🔥 BBCF   │ 🩸 MBTL   │
└────────────┴────────────┴────────────┘
```

### **Layout Compacto Touch Portal:**

```
┌────────────┬────────────┬────────────┐
│    P1 +1   │    P2 +1   │   RESET    │
│   (Verde)  │   (Verde)  │   SCORES   │
├────────────┼────────────┼────────────┤
│    P1 -1   │    P2 -1   │    SWAP    │
│  (Naranja) │  (Naranja) │  PLAYERS   │
├────────────┼────────────┼────────────┤
│ 🎮 GGST   │ 🥊 SF6    │ 👊 T8     │
├────────────┼────────────┼────────────┤
│ 🌙 UNI2   │ ⚔️ GBVSR  │ ⏱️ TIMER  │
│           │           │   5 MIN    │
└────────────┴────────────┴────────────┘
```

### **Ventajas de Touch Portal:**
- ✅ **Pantalla táctil más grande**
- ✅ **Cambio rápido entre juegos**
- ✅ **Iconos personalizables por juego**
- ✅ **Feedback visual inmediato**
- ✅ **Mismos endpoints que Stream Deck**
