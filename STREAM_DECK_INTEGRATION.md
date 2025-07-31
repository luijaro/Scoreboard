# 🎮 Stream Deck Integration

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
- `GET http://localhost:3001/timer/reset` - Resetear el timer
- `GET http://localhost:3001/swap-players` - Intercambiar posiciones de jugadores

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
- Botón "P1 +1": `http://localhost:3001/score/player1/+1`
- Botón "P1 -1": `http://localhost:3001/score/player1/-1`
- Botón "P2 +1": `http://localhost:3001/score/player2/+1`
- Botón "P2 -1": `http://localhost:3001/score/player2/-1`
- Botón "Reset": `http://localhost:3001/reset-scores`
- Botón "Swap": `http://localhost:3001/swap-players`

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
┌─────────┬─────────┬─────────┐
│  P1 +1  │  P2 +1  │  RESET  │
├─────────┼─────────┼─────────┤
│  P1 -1  │  P2 -1  │  SWAP   │
├─────────┼─────────┼─────────┤
│ TIMER   │  SAVE   │  OBS    │
│ RESET   │ MATCH   │ SCENE   │
└─────────┴─────────┴─────────┘
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
- Cambiar personajes
- Cambiar rounds/eventos
- Control de timer con tiempos específicos
- Integración con OBS
- Comandos de Twitch

¡Disfruta controlando tu stream de forma profesional! 🎬
