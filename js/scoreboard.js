// ================================
// Guardar manualmente el token de Nightbot desde el input
function guardarNightbotTokenManual() {
  const token = document.getElementById('nightbotToken').value.trim();
  if (!token) {
    mostrarNotificacion('❌ Ingresa un token para guardar', 'error');
    return;
  }
  
  // También obtener client ID y secret si están presentes
  const clientId = document.getElementById('nbClientId') ? document.getElementById('nbClientId').value.trim() : '';
  const clientSecret = document.getElementById('nbClientSecret') ? document.getElementById('nbClientSecret').value.trim() : '';
  const redirectUri = document.getElementById('nbRedirectUri') ? document.getElementById('nbRedirectUri').value.trim() : 'http://localhost';
  
  // Guardar el token y credentials en apikey.json usando ipcRenderer
  if (window && window.ipcRenderer) {
    const dataToSave = { nightbotToken: token };
    if (clientId) dataToSave.nightbotClientId = clientId;
    if (clientSecret) dataToSave.nightbotClientSecret = clientSecret;
    if (redirectUri) dataToSave.nightbotRedirectUri = redirectUri;
    
    window.ipcRenderer.invoke('save-api-key', dataToSave)
      .then(() => {
        mostrarNotificacion('✅ Token guardado en apikey.json', 'success');
      })
      .catch(() => {
        mostrarNotificacion('❌ Error al guardar el token', 'error');
      });
  } else {
    mostrarNotificacion('No se puede guardar el token (ipcRenderer no disponible)', 'error');
  }
}
//   Nightbot OAuth2: Generación de código (URL/curl)
// ================================
function generarNightbotAuthUrl() {
  const clientId = document.getElementById('nbClientId').value.trim();
  const redirectUri = document.getElementById('nbRedirectUri').value.trim();
  const div = document.getElementById('nbAuthUrl');
  if (!clientId || !redirectUri) {
  div.innerHTML = '<span class="text-error">Faltan datos</span>';
    return;
  }
  const url = `https://api.nightbot.tv/oauth2/authorize?client_id=${encodeURIComponent(clientId)}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=commands`;
  div.innerHTML = `<b>URL de autorización:</b> <a href="${url}" target="_blank">${url}</a>`;
}

function generarNightbotCurl() {
  const clientId = document.getElementById('nbClientId').value.trim();
  const clientSecret = document.getElementById('nbClientSecret').value.trim();
  const code = document.getElementById('nbAuthCode').value.trim();
  const redirectUri = document.getElementById('nbRedirectUri').value.trim();
  if (!clientId || !clientSecret || !code || !redirectUri) {
  document.getElementById('nbCurl').innerHTML = '<span class="text-error">Faltan datos</span>';
    return;
  }
  const curl = `curl -X POST https://api.nightbot.tv/oauth2/token \\\n  -d "client_id=${clientId}" \\\n  -d "client_secret=${clientSecret}" \\\n  -d "grant_type=authorization_code" \\\n  -d "code=${code}" \\\n  -d "redirect_uri=${redirectUri}"`;
  document.getElementById('nbCurl').innerHTML = `<b>Comando curl:</b><br><pre style="white-space:pre-wrap;">${curl}</pre>`;
}

// ================================
//   Nightbot OAuth2: Solicitud y manejo de token
// ================================
async function obtenerYGuardarNightbotToken() {
  const clientId = document.getElementById('nbClientId').value.trim();
  const clientSecret = document.getElementById('nbClientSecret').value.trim();
  const code = document.getElementById('nbAuthCode').value.trim();
  const redirectUri = document.getElementById('nbRedirectUri').value.trim();
  const msg = document.getElementById('nbJsonMsg');
  msg.textContent = '';
  if (!clientId || !clientSecret || !code || !redirectUri) {
    msg.textContent = 'Completa todos los campos.';
    msg.className = 'sb-message error';
    return;
  }
  msg.textContent = 'Solicitando token...';
  msg.className = 'sb-message';
  try {
    const params = new URLSearchParams();
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('redirect_uri', redirectUri);
    const res = await fetch('https://api.nightbot.tv/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });
    const json = await res.json();
    const nbJsonPaste = document.getElementById('nbJsonPaste');
    if (nbJsonPaste) nbJsonPaste.value = JSON.stringify(json, null, 2);
    if (json.access_token) {
      const nightbotTokenInput = document.getElementById('nightbotToken');
      if (nightbotTokenInput) nightbotTokenInput.value = json.access_token;
      // Guardar en apikey.json usando la función global para asegurar consistencia
      if (typeof guardarApiKey === 'function') {
        await guardarApiKey();
      } else if (window.electronAPI && window.electronAPI.guardarApiKey) {
        await window.electronAPI.guardarApiKey({ nightbotToken: json.access_token });
      } else if (window.ipcRenderer) {
        window.ipcRenderer.invoke('save-api-key', { nightbotToken: json.access_token });
      }
      msg.textContent = '¡Token guardado en apikey.json!';
      msg.className = 'sb-message success';
    } else {
      msg.textContent = 'Respuesta recibida, pero no se encontró access_token.';
      msg.className = 'sb-message error';
    }
  } catch (e) {
    msg.textContent = 'Error al solicitar el token: ' + e.message;
    msg.className = 'sb-message error';
  }
}

function extraerNightbotToken() {
  const txt = document.getElementById('nbJsonPaste').value.trim();
  const msg = document.getElementById('nbJsonMsg');
  msg.textContent = '';
  if (!txt) {
    msg.textContent = 'Pega el JSON de respuesta.';
    msg.className = 'sb-message error';
    return;
  }
  let obj;
  try {
    obj = JSON.parse(txt);
  } catch (e) {
    msg.textContent = 'JSON inválido.';
    msg.className = 'sb-message error';
    return;
  }
  if (!obj.access_token) {
    msg.textContent = 'No se encontró access_token.';
    msg.className = 'sb-message error';
    return;
  }
  document.getElementById('nightbotToken').value = obj.access_token;
  msg.textContent = '¡Token pegado abajo!';
  msg.className = 'sb-message success';
}
// ================================
//   NIGHTBOT: Setear comando custom
// ================================
async function setNightbotCommand() {
  const command = document.getElementById('nightbotCommand').value.trim();
  const response = document.getElementById('nightbotResponse').value.trim();
  const token = document.getElementById('nightbotToken').value.trim();
  const msg = document.getElementById('msgNightbot');
  if (!command || !response || !token) {
    msg.textContent = '❌ Faltan datos';
    return;
  }
  msg.textContent = 'Enviando...';
  try {
    // Intentar crear el comando
    let res = await fetch('https://api.nightbot.tv/1/commands', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: command,
        message: response,
        userLevel: 'everyone'
      })
    });
    let data = await res.json();
    if (res.ok) {
      msg.textContent = '✅ Comando creado en Nightbot';
      return;
    }
    // Si el error es que el comando ya existe, buscar el ID y reemplazarlo
    if (data.message && data.message.includes('already exists')) {
      msg.textContent = 'Comando ya existe, reemplazando...';
      // Buscar el comando existente
      const listRes = await fetch('https://api.nightbot.tv/1/commands', {
        headers: { 'Authorization': 'Bearer ' + token }
      });
      const listData = await listRes.json();
      const found = (listData.commands || []).find(cmd => cmd.name.toLowerCase() === command.toLowerCase());
      if (found) {
        // Editar el comando existente
        const editRes = await fetch(`https://api.nightbot.tv/1/commands/${found._id}`, {
          method: 'PUT',
          headers: {
            'Authorization': 'Bearer ' + token,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: response,
            userLevel: 'everyone'
          })
        });
        const editData = await editRes.json();
        if (editRes.ok) {
          msg.textContent = '✅ Comando reemplazado en Nightbot';
        } else {
          msg.textContent = '❌ ' + (editData.message || 'Error al reemplazar el comando');
        }
      } else {
        msg.textContent = '❌ No se encontró el comando para reemplazar.';
      }
    } else {
      msg.textContent = '❌ ' + (data.message || 'Error al crear el comando');
    }
  } catch (e) {
    msg.textContent = '❌ Error: ' + e.message;
  }
}
// ================================
//   SUB-TABS TWITCH (internos)
// ================================
function showTwitchSubTab(n) {
  document.querySelectorAll('.twitch-subtab-btn').forEach((btn, i) => btn.classList.toggle('active', i === n));
  document.querySelectorAll('.twitch-subtab-panel').forEach((panel, i) => panel.classList.toggle('active', i === n));
}
let timerInterval = null;
let timerEndTimestamp = null;

// ================================
//      TEMPORIZADOR (declaraciones globales)
// ================================

// ================================
//      STREAM DECK LISTENERS
// ================================
const { ipcRenderer } = require('electron');

// Escuchar comandos del Stream Deck
ipcRenderer.on('stream-deck-score-change', (event, data) => {
  console.log('[Stream Deck] Score change received:', data);
  const scoreElement = document.getElementById(data.player === 'player1' ? 'p1Score' : 'p2Score');
  if (scoreElement) {
    scoreElement.textContent = data.newScore;
    // Animar el cambio
    animateScore(scoreElement.id, data.newScore);
  }
});

ipcRenderer.on('stream-deck-reset-scores', (event) => {
  console.log('[Stream Deck] Reset scores received');
  document.getElementById('p1Score').textContent = 0;
  document.getElementById('p2Score').textContent = 0;
  // Animar ambos scores
  animateScore('p1Score', 0);
  animateScore('p2Score', 0);
});

ipcRenderer.on('stream-deck-swap-players', (event) => {
  console.log('[Stream Deck] Swap players received');
  // Ejecutar la función swap existente
  swap();
});

ipcRenderer.on('stream-deck-reset-timer', (event) => {
  console.log('[Stream Deck] Reset timer received');
  // Resetear el timer usando la función existente
  if (typeof resetearTimer === 'function') {
    resetearTimer();
  } else {
    // Fallback manual
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    timerEndTimestamp = null;
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) {
      timerDisplay.textContent = '00:00';
    }
  }
});

ipcRenderer.on('stream-deck-set-timer', (event, data) => {
  console.log('[Stream Deck] Set timer received:', data);
  
  // Establecer el timestamp global
  timerEndTimestamp = data.endTimestamp;
  
  // Limpiar cualquier timer anterior
  if (timerInterval) {
    clearInterval(timerInterval);
  }
  
  // Actualizar el input de minutos en la UI
  const timerInput = document.getElementById('timerInput');
  if (timerInput) {
    timerInput.value = data.minutes;
  }
  
  // Iniciar el countdown
  timerInterval = setInterval(() => {
    const restante = timerEndTimestamp - Date.now();
    if (restante <= 0) {
      mostrarTimer(0);
      clearInterval(timerInterval);
      const msgTimer = document.getElementById('msgTimer');
      if (msgTimer) {
        msgTimer.textContent = '⏰ ¡Tiempo finalizado!';
        setTimeout(() => msgTimer.textContent = '', 3000);
      }
    } else {
      mostrarTimer(restante);
    }
  }, 1000);
  
  // Mostrar inmediatamente el tiempo restante
  mostrarTimer(timerEndTimestamp - Date.now());
  
  // Mostrar mensaje de confirmación
  const msgTimer = document.getElementById('msgTimer');
  if (msgTimer) {
    msgTimer.textContent = `⏱️ Timer fijado a ${data.minutes} minutos`;
    setTimeout(() => msgTimer.textContent = '', 2000);
  }
});

ipcRenderer.on('stream-deck-change-game', (event, gameCode) => {
  console.log('[Stream Deck] Change game received:', gameCode);
  
  // Actualizar el selector de juego en la UI
  const gameSelect = document.getElementById('gameSel');
  if (gameSelect) {
    gameSelect.value = gameCode;
    
    // Simular el evento change para cargar personajes y actualizar la UI
    const changeEvent = new Event('change', { bubbles: true });
    gameSelect.dispatchEvent(changeEvent);
  }
  
  // Mostrar mensaje de confirmación
  const gameDisplay = document.getElementById('gameDisplay');
  if (gameDisplay) {
    gameDisplay.textContent = `🎮 Juego cambiado a ${gameCode}`;
    setTimeout(() => {
      if (gameDisplay.textContent.includes('🎮 Juego cambiado')) {
        gameDisplay.textContent = '';
      }
    }, 3000);
  } else {
    // Si no hay gameDisplay, usar console para confirmar
    console.log(`[Stream Deck] Game changed to ${gameCode}`);
  }
  
  // Guardar el cambio
  if (typeof guardarScoreboard === 'function') {
    guardarScoreboard();
  }
});

// ================================
//      MOSTRAR COMENTARISTAS EN SCOREBOARD
// ================================
function mostrarComentaristasEnScoreboard(coms) {
  const el1 = document.getElementById('comm1');
  const el2 = document.getElementById('comm2');
  if (el1 && coms && coms[0]) {
  el1.innerHTML = `<i class='fa fa-microphone'></i> ${coms[0].nombre || ''}${coms[0].twitter ? ` <span class='text-accent'>@${coms[0].twitter}</span>` : ''}`;
  } else if (el1) {
    el1.innerHTML = `<i class='fa fa-microphone'></i> Commentator #1`;
  }
  if (el2 && coms && coms[1]) {
  el2.innerHTML = `<i class='fa fa-microphone'></i> ${coms[1].nombre || ''}${coms[1].twitter ? ` <span class='text-accent'>@${coms[1].twitter}</span>` : ''}`;
  } else if (el2) {
    el2.innerHTML = `<i class='fa fa-microphone'></i> Commentator #2`;
  }
}

// ================================
//      CARGAR COMENTARISTAS AL INICIAR
// ================================
async function cargarComentaristasAlAbrir() {
  const res = await ipcRenderer.invoke('load-json');
  if (res.ok && res.data && res.data.comentaristas) {
    const coms = res.data.comentaristas;
    if (coms[0]) {
      document.getElementById('com1Name').value = coms[0].nombre || '';
      document.getElementById('com1Twitter').value = coms[0].twitter || '';
    }
    if (coms[1]) {
      document.getElementById('com2Name').value = coms[1].nombre || '';
      document.getElementById('com2Twitter').value = coms[1].twitter || '';
    }
    mostrarComentaristasEnScoreboard(coms);
  } else {
    mostrarComentaristasEnScoreboard([]);
  }
}

// Llamar al cambiar de pestaña a Comentaristas
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.tab-btn').forEach((btn, i) => {
    if (btn.textContent.includes('Comentaristas')) {
      btn.addEventListener('click', () => {
        cargarComentaristasAlAbrir();
        cargarTimerAlAbrir();
      });
    }
  });
  // Mostrar comentaristas en Scoreboard al iniciar
  cargarComentaristasAlAbrir();
  cargarTimerAlAbrir();
});

// ================================
//      COMENTARISTAS TAB
// ================================
async function guardarComentaristas() {
  const com1 = document.getElementById('com1Name').value.trim();
  const tw1 = document.getElementById('com1Twitter').value.trim();
  const com2 = document.getElementById('com2Name').value.trim();
  const tw2 = document.getElementById('com2Twitter').value.trim();
  // Cargar scoreboard actual
  const resLoad = await ipcRenderer.invoke('load-json');
  let data = resLoad.ok && resLoad.data ? resLoad.data : {};
  // Guardar comentaristas y twitters
  data.comentaristas = [
    { nombre: com1, twitter: tw1 },
    { nombre: com2, twitter: tw2 }
  ];
  // Guardar en scoreboard.json
  const resSave = await ipcRenderer.invoke('save-json', data, 'scoreboard');
  mostrarComentaristasEnScoreboard(data.comentaristas);
  document.getElementById('msgComentaristas').textContent = resSave.ok ? 'Comentaristas guardados.' : 'Error al guardar.';
  setTimeout(() => document.getElementById('msgComentaristas').textContent = '', 2000);
}

// ================================
//         CARGA INICIAL
// ================================
let obsEscenas = [];
window.ipcRenderer = require('electron').ipcRenderer;
let ultimoTorneoMatches = null; // <-- Declaración global

(async function cargarScoreboardAlAbrir() {
  const res = await ipcRenderer.invoke('load-json');
  if (res.ok && res.data) {
    window.ultimoScoreboardData = res.data;
    const d = res.data;
    if (d.player1) document.getElementById('p1NameInput').value = d.player1;
    if (d.player2) document.getElementById('p2NameInput').value = d.player2;
    if (typeof d.score1 === "number") document.getElementById('p1Score').textContent = d.score1;
    if (typeof d.score2 === "number") document.getElementById('p2Score').textContent = d.score2;
    if (d.tag1) document.getElementById('p1TagInput').value = d.tag1;
    if (d.tag2) document.getElementById('p2TagInput').value = d.tag2;
    if (d.char1) document.getElementById('p1Char').value = d.char1;
    if (d.char2) document.getElementById('p2Char').value = d.char2;
    if (d.game) document.getElementById('gameSel').value = d.game;
    if (d.event) document.getElementById('sbEvent').textContent = d.event;
    if (d.round) document.getElementById('sbRound').value = d.round;
    if (typeof updateVisual === "function") updateVisual();
    // Mostrar comentaristas en Scoreboard si existen
    if (d.comentaristas) mostrarComentaristasEnScoreboard(d.comentaristas);
    
    // RESETEAR TIMER AL ABRIR LA APP
    timerEndTimestamp = null;
    // Detener cualquier interval que pueda estar corriendo
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
    // Mostrar 00:00 en el display
    const timerDisplay = document.getElementById('timerDisplay');
    if (timerDisplay) timerDisplay.textContent = '00:00';
    
    // Guardar el JSON sin timerEndTimestamp (null se omite del JSON)
    await ipcRenderer.invoke('save-json', { ...d, timerEndTimestamp: null }, 'scoreboard');
  }
})();

// Inicializar sub-tabs cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
  // Asegurar que el primer sub-tab de Main esté visible
  showMainSubTab(0);
  
  // Asegurar que el primer sub-tab de Challonge esté preparado (cuando se acceda)
  // showChallongeSubTab(0); // No necesario hasta que se acceda a la pestaña
});

window.addEventListener('DOMContentLoaded', cambiarJuego);

// ================================
//           TABS
// ================================
function showTab(n) {
  document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === n));
  document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === n));
  
  // Tab 0: Scoreboard
  if (n === 0) {
    // Cargar comentaristas al entrar a Scoreboard
    cargarComentaristasAlAbrir();
    cargarTimerAlAbrir();
    
    // Configurar listener de estilo si no está configurado
    const styleSel = document.getElementById('styleSel');
    if (styleSel && !styleSel.dataset.listener) {
      styleSel.addEventListener('change', function() {
        const val = this.value;
        if (val === 'light') {
          document.body.classList.add('light-mode');
          localStorage.setItem('scoreboard-style', 'light');
        } else {
          document.body.classList.remove('light-mode');
          localStorage.setItem('scoreboard-style', 'dark');
        }
      });
      styleSel.dataset.listener = "true";
    }
    // Aplica el modo guardado
    const saved = localStorage.getItem('scoreboard-style');
    if (saved === 'light') {
      document.body.classList.add('light-mode');
      if (styleSel) styleSel.value = 'light';
    } else {
      document.body.classList.remove('light-mode');
      if (styleSel) styleSel.value = 'dark';
    }
  }
  
  // Tab 1: Comentaristas
  if (n === 1) {
    cargarComentaristasAlAbrir();
    cargarTimerAlAbrir();
  }
  
  // Tab 2: Challonge (unified tab with sub-tabs)
  if (n === 2) {
    // Cargar funciones de Challonge al entrar
    buscarTorneosMatches(); // Para credenciales
    cargarTorneosBracket(); // Para bracket  
    cargarTorneosTop8(); // Para top8
  }
  
  // Tab 3: Comandos y Escenas (Twitch + OBS)
  if (n === 3) {
    // No specific loading required for Twitch commands or OBS
  }
  
  // Tab 4: Start.gg (was 5, now 4)
  if (n === 4) {
    if (typeof cargarStartggToken === 'function') cargarStartggToken();
  }
  
  // Tab 5: Configurar rutas
  if (n === 5) {
    console.log('[showTab] Entrando a pestaña de rutas, cargando rutas...');
    if (typeof cargarRutas === 'function') {
      setTimeout(cargarRutas, 100); // Pequeño delay para asegurar que la pestaña esté visible
    }
  }
}

// ================================
//           SUB-TABS DE MAIN
// ================================
function showMainSubTab(n) {
  console.log('showMainSubTab called with:', n);
  
  // Solo afectar los botones y paneles dentro de #tab-main
  const mainTab = document.getElementById('tab-main');
  if (!mainTab) {
    console.error('tab-main not found');
    return;
  }
  
  const buttons = mainTab.querySelectorAll('.sub-tab-btn');
  const panels = mainTab.querySelectorAll('.sub-tab-panel');
  
  console.log('Found buttons:', buttons.length, 'panels:', panels.length);
  
  buttons.forEach((btn, i) => btn.classList.toggle('active', i === n));
  panels.forEach((p, i) => p.classList.toggle('active', i === n));
  
  // Cargar datos específicos según el sub-tab
  if (n === 0) {
    // Scoreboard - ya se carga automáticamente
  } else if (n === 1) {
    // Comentaristas
    cargarComentaristasAlAbrir();
    cargarTimerAlAbrir();
  } else if (n === 2) {
    // Comandos Twitch - no requiere carga especial
  } else if (n === 3) {
    // OBS - no requiere carga especial
  }
}

// ================================
//           SUB-TABS DE CHALLONGE
// ================================
function showChallongeSubTab(n) {
  console.log('showChallongeSubTab called with:', n);
  
  // Solo afectar los botones y paneles dentro de #tab-challonge
  const challongeTab = document.getElementById('tab-challonge');
  if (!challongeTab) {
    console.error('tab-challonge not found');
    return;
  }
  
  const buttons = challongeTab.querySelectorAll('.sub-tab-btn');
  const panels = challongeTab.querySelectorAll('.sub-tab-panel');
  
  console.log('Found buttons:', buttons.length, 'panels:', panels.length);
  
  buttons.forEach((btn, i) => btn.classList.toggle('active', i === n));
  panels.forEach((p, i) => p.classList.toggle('active', i === n));
  
  // Cargar datos específicos según el sub-tab
  if (n === 0) {
    // Credenciales - ya se carga automáticamente
    buscarTorneosMatches();
  } else if (n === 1) {
    // Bracket
    cargarTorneosBracket();
  } else if (n === 2) {
    // Top 8
    cargarTorneosTop8();
  }
}

// ================================
//           TWITCH BOT
// ================================
let ultimoSlugBracket = '';

async function conectarTwitchBot() {
  const username = document.getElementById('twitchUser').value.trim();
  const oauth = document.getElementById('twitchOAuth').value.trim();
  const channel = document.getElementById('twitchChannel').value.trim();
  if (!username || !oauth || !channel) {
    document.getElementById('msgTwitch').textContent = "❌ Faltan datos";
    return;
  }
  const res = await ipcRenderer.invoke('twitch-connect', { username, oauth, channel: "#" + channel });
  document.getElementById('msgTwitch').textContent = res.ok ? "✅ Conectado" : "❌ " + res.error;
}

async function enviarBracketBot() {
  const res = await ipcRenderer.invoke('twitch-say', { message: '!bracket' });
  document.getElementById('msgTwitch').textContent = res.ok ? "✅ !bracket enviado" : "❌ " + res.error;
}

async function enviarComandoBot(cmd) {
  if (!cmd) return;
  const res = await ipcRenderer.invoke('twitch-say', { message: cmd });
  document.getElementById('msgTwitch').textContent = res.ok ? `✅ "${cmd}" enviado` : "❌ " + res.error;
}

// ================================
//          SCOREBOARD
// ================================

// Listeners para los campos integrados en el marcador principal
['p1NameInput','p1TagInput','p2NameInput','p2TagInput','p1CharSelect','p2CharSelect'].forEach(id => {
  const el = document.getElementById(id) || document.getElementById(id.replace('Select',''));
  if (el) {
    el.addEventListener('input', updateVisual);
    el.addEventListener('change', updateVisual);
  }
});

// Agregar listener de auto-guardado para el campo round
document.addEventListener('DOMContentLoaded', function() {
  const sbRoundElement = document.getElementById('sbRound');
  if (sbRoundElement) {
    sbRoundElement.addEventListener('input', function() {
      // Auto-guardar datos después de un delay para evitar muchas escrituras
      clearTimeout(window.roundSaveTimeout);
      window.roundSaveTimeout = setTimeout(async () => {
        const data = getScoreboardData();
        await ipcRenderer.invoke('save-json', data, 'scoreboard');
      }, 1000); // Guardar 1 segundo después de que el usuario termine de escribir
    });
  }
});

function updateVisual() {
  // Actualizar tag debajo del score
  document.getElementById('p1TagDisplay').textContent = document.getElementById('p1TagInput').value;
  document.getElementById('p2TagDisplay').textContent = document.getElementById('p2TagInput').value;

  // Actualizar fila de tags y nombres debajo del score
  const tag1 = document.getElementById('p1TagInput').value;
  const tag2 = document.getElementById('p2TagInput').value;
  const name1 = document.getElementById('p1NameInput').value;
  const name2 = document.getElementById('p2NameInput').value;
  if (document.getElementById('sbTagName1')) document.getElementById('sbTagName1').textContent = tag1 || 'TAG1';
  if (document.getElementById('sbTagName2')) document.getElementById('sbTagName2').textContent = tag2 || 'TAG2';
  if (document.getElementById('sbPlayerName1')) document.getElementById('sbPlayerName1').textContent = name1 || 'Player1';
  if (document.getElementById('sbPlayerName2')) document.getElementById('sbPlayerName2').textContent = name2 || 'Player2';
  // Banderas removidas del UI; no actualizar
  // Actualizar personaje visual
  const p1Char = document.getElementById('p1CharSelect') ? document.getElementById('p1CharSelect').value : '';
  const p2Char = document.getElementById('p2CharSelect') ? document.getElementById('p2CharSelect').value : '';
  if (window.imgPersonajes) {
    if (document.getElementById('p1CharImg')) document.getElementById('p1CharImg').src = imgPersonajes[p1Char] || '';
    if (document.getElementById('p2CharImg')) document.getElementById('p2CharImg').src = imgPersonajes[p2Char] || '';
  }
}

function changeScore(player, delta) {
  const id = player === 1 ? 'p1Score' : 'p2Score';
  let score = parseInt(document.getElementById(id).textContent) || 0;
  score = Math.max(0, score + delta);
  animateScore(id, score);
}

function swap() {
  let p1Name = document.getElementById('p1NameInput').value;
  let p2Name = document.getElementById('p2NameInput').value;
  let p1Tag = document.getElementById('p1TagInput').value;
  let p2Tag = document.getElementById('p2TagInput').value;
  let p1Score = document.getElementById('p1Score').textContent;
  let p2Score = document.getElementById('p2Score').textContent;
  let p1Char = document.getElementById('p1CharSelect') ? document.getElementById('p1CharSelect').value : '';
  let p2Char = document.getElementById('p2CharSelect') ? document.getElementById('p2CharSelect').value : '';
  // Banderas removidas
  document.getElementById('p1NameInput').value = p2Name;
  document.getElementById('p2NameInput').value = p1Name;
  document.getElementById('p1TagInput').value = p2Tag;
  document.getElementById('p2TagInput').value = p1Tag;
  document.getElementById('p1Score').textContent = p2Score;
  document.getElementById('p2Score').textContent = p1Score;
  if (document.getElementById('p1CharSelect') && document.getElementById('p2CharSelect')) {
    document.getElementById('p1CharSelect').value = p2Char;
    document.getElementById('p2CharSelect').value = p1Char;
  }
  // Banderas removidas
  updateVisual();
}

function resetScores() {
  document.getElementById('p1Score').textContent = 0;
  document.getElementById('p2Score').textContent = 0;
}

function getScoreboardData() {
  // Cargar los comentaristas - priorizar los preservados de Start.gg
  let comentaristas = [];
  
  console.log('[Scoreboard] Verificando comentaristas preservados:', window.comentaristasPreservados);
  
  if (window.comentaristasPreservados && window.comentaristasPreservados.length > 0) {
    // Usar comentaristas preservados de Start.gg
    comentaristas = [...window.comentaristasPreservados]; // Clonar array
    console.log('[Scoreboard] Usando comentaristas preservados:', comentaristas);
    // Limpiar la variable después de usarla
    window.comentaristasPreservados = null;
  } else if (window.ultimoScoreboardData && window.ultimoScoreboardData.comentaristas) {
    // Si no hay preservados, usar los del último scoreboard cargado
    comentaristas = window.ultimoScoreboardData.comentaristas;
    console.log('[Scoreboard] Usando comentaristas del último scoreboard:', comentaristas);
  } else {
    // Solo como último recurso, leer de los inputs (cuando realmente se quiere cambiar)
    const com1Name = document.getElementById('com1Name')?.value || '';
    const com1Twitter = document.getElementById('com1Twitter')?.value || '';
    const com2Name = document.getElementById('com2Name')?.value || '';
    const com2Twitter = document.getElementById('com2Twitter')?.value || '';
    
    // Solo usar inputs si realmente hay datos en ellos
    if (com1Name || com1Twitter || com2Name || com2Twitter) {
      comentaristas = [
        { nombre: com1Name, twitter: com1Twitter },
        { nombre: com2Name, twitter: com2Twitter }
      ];
      console.log('[Scoreboard] Usando comentaristas de inputs (hay datos):', comentaristas);
    } else {
      // Si no hay datos en inputs, intentar mantener comentaristas vacíos pero válidos
      comentaristas = [
        { nombre: '', twitter: '' },
        { nombre: '', twitter: '' }
      ];
      console.log('[Scoreboard] Usando comentaristas vacíos por defecto');
    }
  }
  
  // Obtener el valor actual del temporizador
  const timerDisplay = document.getElementById('timerDisplay');
  const temporizador = timerDisplay ? timerDisplay.textContent || '00:00' : '00:00';
  
  return {
    player1: document.getElementById('p1NameInput').value,
    player2: document.getElementById('p2NameInput').value,
    score1: Number(document.getElementById('p1Score').textContent),
    score2: Number(document.getElementById('p2Score').textContent),
    tag1: document.getElementById('p1TagInput').value,
    tag2: document.getElementById('p2TagInput').value,
    char1: document.getElementById('p1CharSelect')?.value || '',
    char2: document.getElementById('p2CharSelect')?.value || '',
    game: document.getElementById('gameSel').value,
    event: document.getElementById('sbEvent').textContent,
    round: document.getElementById('sbRound').value,
    fase_original: window.currentFaseOriginal || '',
  country1: '',
  country2: '',
    temporizador: temporizador,
    comentaristas: comentaristas
  };
}


async function guardarScoreboard() {
  console.log('[GuardarScoreboard] Iniciando guardado manual...');
  console.log('[GuardarScoreboard] Comentaristas actuales en window.ultimoScoreboardData:', window.ultimoScoreboardData?.comentaristas);
  
  // Si no hay comentaristas preservados de Start.gg y hay datos previos, preservarlos
  if (!window.comentaristasPreservados && window.ultimoScoreboardData && window.ultimoScoreboardData.comentaristas) {
    console.log('[GuardarScoreboard] Preservando comentaristas existentes para el guardado manual');
    window.comentaristasPreservados = [...window.ultimoScoreboardData.comentaristas];
  }
  
  const data = getScoreboardData();
  console.log('[GuardarScoreboard] Datos a guardar:', data);
  
  const res = await ipcRenderer.invoke('save-json', data, 'scoreboard');
  if (res.ok) {
    // Actualizar los datos después del guardado exitoso
    window.ultimoScoreboardData = data;
    mostrarNotificacion('✅ ¡Guardado!', 'success');
  } else {
    mostrarNotificacion('❌ Error al guardar', 'error');
  }
}

async function abrirOutput() {
  await ipcRenderer.invoke('open-folder');
}
// ================================
//          EFECTOS
// ================================
function animateScore(id, newScore) {
  const el = document.getElementById(id);
  el.textContent = newScore;
  el.classList.remove('animated');
  void el.offsetWidth; // Forzar reflow para reiniciar animación
  el.classList.add('animated');
}

// ================================
//          PERSONAJES
// ================================
let listaPersonajes = [];
let imgPersonajes = {};

async function cambiarJuego() {
  const juegoFolder = document.getElementById('gameSel').value;
  const res = await ipcRenderer.invoke('get-personajes', juegoFolder);

  if (res.personajes && res.personajes.length) {
    listaPersonajes = res.personajes.map(p => p.nombre);
    imgPersonajes = {};
    res.personajes.forEach(p => { imgPersonajes[p.nombre] = p.imagen; });
    llenarSelectPersonajes('p1Char');
    llenarSelectPersonajes('p2Char');
    for (let i = 0; i < 8; ++i) llenarSelectPersonajes('top8char' + i);
    updateVisual();
  } else {
    listaPersonajes = [];
    imgPersonajes = {};
    llenarSelectPersonajes('p1Char');
    llenarSelectPersonajes('p2Char');
    for (let i = 0; i < 8; ++i) llenarSelectPersonajes('top8char' + i);
    updateVisual();
  }
}

function llenarSelectPersonajes(id) {
  const select = document.getElementById(id);
  if (!select) return;
  select.innerHTML = listaPersonajes.map(
    char => `<option value="${char}">${char}</option>`
  ).join('');
}

// ================================
//              TOP 8
// ================================
async function cargarTop8() {
  const slug = document.getElementById('tournamentTop8').value.trim();
  const msg = document.getElementById('msgTop8');
  if (!slug) {
    msg.textContent = "❌ Selecciona un torneo.";
    return;
  }
  msg.textContent = "Cargando...";
  const r = await ipcRenderer.invoke('get-top8', slug);
  if (r.error || !r.top8) {
    msg.textContent = r.error || "No se pudo obtener el top 8.";
    document.getElementById('top8Table').innerHTML = "";
    return;
  }
  msg.textContent = "Top 8 cargado.";
  const tbody = document.getElementById('top8Table');
  tbody.innerHTML = "";
  r.top8.forEach((p, idx) => {
    tbody.innerHTML += `
      <tr>
        <td style="padding:0.5em 1em;">${p.final_rank}</td>
        <td style="padding:0.5em 1em;">${p.name}</td>
        <td style="padding:0.5em 1em;">
          <select class="sb-dropdown" id="top8char${idx}">
            ${listaPersonajes.map(char => `<option value="${char}">${char}</option>`).join("")}
          </select>
        </td>
        <td style="padding:0.5em 1em;">
          <select class="sb-dropdown" id="top8twitter${idx}"></select>
        </td>
      </tr>
    `;
  });

  // ¡Aquí!
  await llenarUsuariosTop8DesdeTxt();

  // --- Obtén el nombre del torneo desde Challonge y guárdalo globalmente ---
  const titleRes = await window.ipcRenderer.invoke('get-tournament-title', slug);
  const nombreTorneo = titleRes.title || slug;
  window.nombreTorneoActual = nombreTorneo;
  // mostrarMensajeTop8(nombreTorneo, r.top8); // <-- comenta o elimina esta línea

  setTimeout(() => msg.textContent = '', 2500);
}




async function guardarTop8() {
  const tbody = document.getElementById('top8Table');
  if (!tbody.children.length) return;
  const top8Data = [];
  const juego = document.getElementById('gameSel').value;

  const nombreTorneo = window.nombreTorneoActual || "Torneo sin nombre";
  const fechaInput = document.getElementById('fechaTop8');
  if (fechaInput && !fechaInput.value) {
    const hoy = new Date();
    fechaInput.value = hoy.toISOString().slice(0, 10); // yyyy-mm-dd
  }
  const fecha = fechaInput && fechaInput.value ? fechaInput.value : new Date().toLocaleDateString('es-CL');

  for (let i = 0; i < tbody.children.length; ++i) {
    const jugador = tbody.children[i].children[1].textContent;
    const personaje = document.getElementById('top8char' + i).value;
    const twitter = document.getElementById('top8twitter' + i).value; // <-- ahora es select
    top8Data.push({ nombre: jugador, personaje, juego, twitter });
  }
  
  const res = await ipcRenderer.invoke('save-json', {
    evento: nombreTorneo,
    fecha: fecha,
    top8: top8Data
  }, 'top8');
  if (res.ok) {
    mostrarNotificacion("✅ Top 8 guardado.", "success");
  } else {
    mostrarNotificacion("❌ Error al guardar", "error");
  }
}

// ================================
//         CHALLONGE TAB
// ================================
async function guardarApiKey() {
  const apiKey = document.getElementById('apikey').value.trim();
  const twitchOAuth = document.getElementById('twitchOAuth') ? document.getElementById('twitchOAuth').value.trim() : "";
  const twitchUser = document.getElementById('twitchUser') ? document.getElementById('twitchUser').value.trim() : "";
  const twitchChannel = document.getElementById('twitchChannel') ? document.getElementById('twitchChannel').value.trim() : "";
  if (!apiKey) {
    mostrarNotificacion("API Key vacía", "error");
    return;
  }
  const nightbotToken = document.getElementById('nightbotToken') ? document.getElementById('nightbotToken').value.trim() : '';
  const nightbotClientId = document.getElementById('nbClientId') ? document.getElementById('nbClientId').value.trim() : '';
  const nightbotClientSecret = document.getElementById('nbClientSecret') ? document.getElementById('nbClientSecret').value.trim() : '';
  const nightbotRedirectUri = document.getElementById('nbRedirectUri') ? document.getElementById('nbRedirectUri').value.trim() : 'http://localhost';
  await ipcRenderer.invoke('save-api-key', { apiKey, twitchOAuth, twitchUser, twitchChannel, nightbotToken, nightbotClientId, nightbotClientSecret, nightbotRedirectUri });
  mostrarNotificacion("Datos guardados.", "success");
}

(async function cargarCredencialesAlIniciar() {
  const res = await ipcRenderer.invoke('load-api-key');
  if (res.ok) {
    if ('apiKey' in res) document.getElementById('apikey').value = res.apiKey;
    if ('twitchOAuth' in res && document.getElementById('twitchOAuth'))
      document.getElementById('twitchOAuth').value = res.twitchOAuth;
    if ('twitchUser' in res && document.getElementById('twitchUser'))
      document.getElementById('twitchUser').value = res.twitchUser;
    if ('twitchChannel' in res && document.getElementById('twitchChannel'))
      document.getElementById('twitchChannel').value = res.twitchChannel;
    if ('nightbotToken' in res && document.getElementById('nightbotToken'))
      document.getElementById('nightbotToken').value = res.nightbotToken;
    if ('nightbotClientId' in res && document.getElementById('nbClientId'))
      document.getElementById('nbClientId').value = res.nightbotClientId;
    if ('nightbotClientSecret' in res && document.getElementById('nbClientSecret'))
      document.getElementById('nbClientSecret').value = res.nightbotClientSecret;
    if ('nightbotRedirectUri' in res && document.getElementById('nbRedirectUri'))
      document.getElementById('nbRedirectUri').value = res.nightbotRedirectUri;
  }
})();

async function cargarJugadoresChallonge() {
  const slug = document.getElementById('slugChallonge').value.trim();
  if (!slug) return;
  document.getElementById('msgChallonge').textContent = "Consultando...";
  const r = await ipcRenderer.invoke('get-participants', slug);
  if (r.error) {
    mostrarNotificacion(r.error, "error");
    return;
  }
  let opts = '<option value="">Selecciona jugador</option>';
  (r.participants || []).forEach(p => {
    opts += `<option value="${p.name}">${p.name}</option>`;
  });
  document.getElementById('jugadoresChallonge').innerHTML = opts;
  document.getElementById('msgChallonge').textContent = "Jugadores cargados.";
  setTimeout(() => document.getElementById('msgChallonge').textContent = "", 2000);
}

function ponerJugador1() {
  const name = document.getElementById('jugadoresChallonge').value;
  if (name) document.getElementById('p1NameInput').value = name;
  updateVisual();
}

function ponerJugador2() {
  const name = document.getElementById('jugadoresChallonge').value;
  if (name) document.getElementById('p2NameInput').value = name;
  updateVisual();
}

// ================================
//          BRACKET
// ================================
function mostrarBracket() {
  const slug = document.getElementById('tournamentBracket').value.trim();
  const iframe = document.getElementById('challongeBracket');
  if (!iframe) return; // <-- Evita el error si no existe
  if (!slug) {
    iframe.src = '';
    return;
  }
  iframe.src = `https://challonge.com/${slug}/module?theme=2&show_standings=1&show_tournament_name=1`;
}

// ================================
//          MATCHES
// ================================
let matchesCargados = [];

function nombreDeRonda(round, roundsInfo) {
  // roundsInfo: { maxWinners: N, minLosers: -N, maxLosers: -1 }
  
  if (round > 0) {
    // Winners Bracket
    // Determinar cuántas rondas hay en total en el Winners Bracket
    const totalWinnersRounds = roundsInfo.maxWinners;
    
    console.log(`🏆 Winners Bracket - Round ${round}:`);
    console.log(`  - Total rondas en Winners: ${totalWinnersRounds}`);
    console.log(`  - maxWinners: ${roundsInfo.maxWinners}`);
    
    // En torneos de doble eliminación, la lógica típica es:
    // - Si hay 1 ronda: debe ser Winners Final
    // - Si hay 2 rondas: ronda 2 = Winners Final, ronda 1 = Winners Semis  
    // - Si hay 3 rondas: ronda 3 = Winners Final, ronda 2 = Winners Semis, ronda 1 = Winners Quarters
    // - Si hay 4+ rondas: usar la lógica original
    
    if (totalWinnersRounds === 1) {
      console.log(`  → Solo 1 ronda en Winners: Round ${round} = Winners Final`);
      return "Winners Final";
    } else if (totalWinnersRounds === 2) {
      console.log(`  → 2 rondas en Winners: Round ${round} = ${round === 2 ? 'Winners Final' : 'Winners Semis'}`);
      if (round === 2) return "Winners Final";
      if (round === 1) return "Winners Semis";
    } else if (totalWinnersRounds === 3) {
      console.log(`  → 3 rondas en Winners: Round ${round} = ${round === 3 ? 'Winners Final' : round === 2 ? 'Winners Semis' : 'Winners Quarters'}`);
      if (round === 3) return "Winners Final";
      if (round === 2) return "Winners Semis";
      if (round === 1) return "Winners Quarters";
    } else {
      console.log(`  → ${totalWinnersRounds} rondas en Winners, usando lógica original`);
      // Lógica original para torneos más grandes
      if (round === roundsInfo.maxWinners) return "Winners Final";
      if (round === roundsInfo.maxWinners - 1) return "Winners Semis";
      if (round === roundsInfo.maxWinners - 2) return "Winners Quarters";
      if (round === roundsInfo.maxWinners - 3) return "Winners Round 1";
      if (round === 1) return "Winners Round 1";
      return `Winners Round ${round}`;
    }
  }
  
  if (round < 0) {
    // Losers Bracket - mientras más negativo, mejor ronda
    // Con la estructura completa del torneo, podemos usar la lógica correcta
    console.log(`🎯 Calculando nombre para Losers Round ${round}`);
    console.log(`  - minLosers: ${roundsInfo.minLosers}, maxLosers: ${roundsInfo.maxLosers}`);
    
    if (round === roundsInfo.minLosers) return "Losers Final";
    if (round === roundsInfo.minLosers + 1) return "Losers Semis";
    if (round === roundsInfo.minLosers + 2) return "Losers Quarters";
    
    // Para rondas tempranas del losers bracket
    const roundsFromStart = Math.abs(round);
    return `Losers Round ${roundsFromStart}`;
  }
  
  if (round === 0) return "Grand Finals";
  
  return `Round ${round}`;
}


async function cargarMatches() {
  const apiKey = document.getElementById('apikey').value.trim();
  const tournamentSlug = document.getElementById('tournamentList').value;
  const msg = document.getElementById('msgMatches');
  const selectMatch = document.getElementById('selectMatch');

  if (!apiKey || !tournamentSlug) {
    msg.textContent = "❌ Selecciona un torneo primero.";
    return;
  }

  msg.textContent = "Cargando matches...";
  try {
    console.log("🔍 Iniciando carga de matches para torneo:", tournamentSlug);
    
    // Primero obtener TODOS los matches (incluyendo TBD vs TBD)
    const allMatchesRes = await window.ipcRenderer.invoke('get-all-matches-and-participants', tournamentSlug);
    console.log("📥 Respuesta de get-all-matches-and-participants:", allMatchesRes);
    
    // Si esa función no existe, usar la función original como fallback
    let res;
    if (allMatchesRes && allMatchesRes.ok) {
      res = allMatchesRes;
      console.log("✅ Usando matches completos incluyendo pendientes");
    } else {
      console.log("⚠️ Función de matches completos no disponible, usando función original");
      res = await window.ipcRenderer.invoke('get-matches-and-participants', tournamentSlug);
    }
    
    if (!res.ok) {
      console.error("❌ Error al obtener matches:", res.error);
      throw new Error(res.error || "Error al obtener los matches.");
    }

    // Debug: mostrar información del torneo
    console.log("🏆 Información del torneo:");
    console.log("  - Número de matches de eliminatorias:", res.matches ? res.matches.length : 0);
    console.log("  - Tipo de torneo:", res.tournament_type || "No especificado");
    console.log("  - Estado del torneo:", res.tournament_state || "No especificado");
    console.log("  - Matches completos:", res.matches);

    let allMatches = res.matches || [];
    let tipoMatches = "eliminatorias";

    // Si no hay matches de eliminatorias y es un torneo de grupos, intentar obtener matches de grupos
    if ((!res.matches || res.matches.length === 0) && 
        ((res.tournament_type && (res.tournament_type.toLowerCase().includes("group") || res.tournament_type.toLowerCase().includes("round robin"))) ||
         (res.tournament_state && res.tournament_state.toLowerCase().includes("group")))) {
      
      console.log("🔄 Intentando obtener matches de grupos...");
      msg.textContent = "Cargando matches de grupos...";
      
      try {
        const groupRes = await window.ipcRenderer.invoke('get-group-matches', tournamentSlug);
        console.log("📥 Respuesta de get-group-matches:", groupRes);
        
        if (groupRes.ok && groupRes.matches && groupRes.matches.length > 0) {
          allMatches = groupRes.matches;
          tipoMatches = "grupos";
          console.log("✅ Matches de grupos encontrados:", allMatches.length);
          console.log("📋 Lista de matches de grupos:", allMatches);
        } else {
          console.log("⚠️ No se pudieron obtener matches de grupos:", groupRes.error || "Sin matches disponibles");
        }
      } catch (groupError) {
        console.error("❌ Error al obtener matches de grupos:", groupError);
      }
    }

    // Limpia el select y agrega los matches
    selectMatch.innerHTML = '';
    matchesCargados = allMatches;

    if (!allMatches || allMatches.length === 0) {
      let mensaje = "⚠️ No se encontraron matches.";
      
      if ((res.tournament_type && (res.tournament_type.toLowerCase().includes("group") || res.tournament_type.toLowerCase().includes("round robin"))) ||
          (res.tournament_state && res.tournament_state.toLowerCase().includes("group"))) {
        mensaje = "⚠️ No se encontraron matches de eliminatorias ni de grupos. El torneo puede no haber comenzado aún.";
      } else {
        mensaje += " Esto puede ocurrir si el torneo aún no ha comenzado o si hay un problema con la configuración.";
      }
      
      console.log("📝 Mensaje final:", mensaje);
      msg.textContent = mensaje;
      selectMatch.style.display = 'none';
      return;
    }

    // Mostrar solo los matches que tienen jugadores asignados en el select
    const matchesConJugadores = allMatches.filter(match => 
      match.player1_name && match.player2_name && 
      !match.player1_name.includes('TBD') && !match.player2_name.includes('TBD')
    );

    matchesConJugadores.forEach(match => {
      const option = document.createElement('option');
      option.value = match.id;
      
      // Mostrar información adicional según el tipo de match
      let matchInfo = "";
      if (tipoMatches === "grupos" && match.group_name) {
        matchInfo = ` (${match.group_name})`;
      } else if (match.round && match.round !== 0) {
        matchInfo = ` (R${match.round})`;
      }
      
      option.textContent = `Match #${match.id} - ${match.player1_name} vs ${match.player2_name}${matchInfo}`;
      selectMatch.appendChild(option);
    });

    selectMatch.style.display = 'block';
    msg.textContent = `✅ ${matchesConJugadores.length}/${allMatches.length} matches cargados (mostrando solo matches con jugadores asignados).`;
    console.log(`🎉 Carga completada: ${allMatches.length} matches totales, ${matchesConJugadores.length} con jugadores`);

    // Asigna el evento para mostrar los datos del match seleccionado
    selectMatch.onchange = function() {
      mostrarMatchEnScoreboard();
      mostrarPreviewMatch();
    };

    // Si hay al menos un match, selecciona el primero y muestra sus datos automáticamente
    if (matchesConJugadores.length > 0) {
      selectMatch.selectedIndex = 0;
      mostrarMatchEnScoreboard();
      mostrarPreviewMatch();
    }
  } catch (error) {
    console.error("💥 Error general en cargarMatches:", error);
    msg.textContent = `❌ ${error.message}`;
  }
}

function mostrarMatchEnScoreboard() {
  const select = document.getElementById('selectMatch');
  const matchId = select.value;
  const match = matchesCargados.find(m => String(m.id) === String(matchId));
  if (!match) return;

  // Determinar el nombre de la ronda/evento
  let roundName = "";
  
  if (match.group_name) {
    // Es un match de grupos
    roundName = match.group_name;
  } else if (match.round !== undefined && match.round !== null) {
    // Es un match de eliminatorias con información de ronda
    // Usar TODOS los matches del torneo (incluyendo TBD vs TBD) para calcular la estructura
    const allWinnerRounds = matchesCargados
      .filter(m => m.round !== undefined && m.round !== null && m.round > 0)
      .map(m => m.round);
    const allLoserRounds = matchesCargados
      .filter(m => m.round !== undefined && m.round !== null && m.round < 0)
      .map(m => m.round);
    
    // IMPORTANTE: Excluir la ronda 0 (Grand Final) del cálculo de Winners Bracket
    // El Grand Final no es parte de la estructura del Winners Bracket
    const maxWinners = allWinnerRounds.length ? Math.max(...allWinnerRounds) : 1;
    const minLosers = allLoserRounds.length ? Math.min(...allLoserRounds) : -1;
    const maxLosers = allLoserRounds.length ? Math.max(...allLoserRounds) : -1;
    
    console.log(`🔍 Debug rondas para match ${match.id} (usando TODOS los matches):`);
    console.log(`  - Round actual: ${match.round}`);
    console.log(`  - Total matches en el torneo: ${matchesCargados.length}`);
    console.log(`  - Winners rounds encontradas (excluyendo Grand Final): [${allWinnerRounds.sort((a,b) => a-b).join(', ')}]`);
    console.log(`  - Losers rounds encontradas: [${allLoserRounds.sort((a,b) => b-a).join(', ')}]`);
    console.log(`  - Grand Finals detectados: ${matchesCargados.filter(m => m.round === 0).length} matches`);
    console.log(`  - maxWinners: ${maxWinners}, minLosers: ${minLosers}, maxLosers: ${maxLosers}`);
    
    const roundsInfo = { maxWinners, minLosers, maxLosers };
    roundName = nombreDeRonda(match.round, roundsInfo);
    
    console.log(`  - Nombre de ronda calculado: "${roundName}"`);
  } else {
    // Match sin información específica de ronda
    roundName = `Match #${match.id}`;
  }
  
  document.getElementById('sbEvent').value = roundName;
  window.currentRoundName = roundName;

  // --- NUEVO: Separar tag y nombre si corresponde ---
  function splitTagAndName(fullName) {
    if (typeof fullName === "string" && fullName.includes(" | ")) {
      const [tag, ...rest] = fullName.split(" | ");
      return { tag: tag.trim(), name: rest.join(" | ").trim() };
    }
    return { tag: "", name: fullName };
  }

  // Jugador 1
  const p1 = splitTagAndName(match.player1_name);
  document.getElementById('p1NameInput').value = p1.name;
  document.getElementById('p1TagInput').value = p1.tag;

  // Jugador 2
  const p2 = splitTagAndName(match.player2_name);
  document.getElementById('p2NameInput').value = p2.name;
  document.getElementById('p2TagInput').value = p2.tag;

  if (match.scores_csv) {
    const parts = match.scores_csv.split('-');
    if (parts.length === 2) {
      document.getElementById('p1Score').textContent = parts[0].trim();
      document.getElementById('p2Score').textContent = parts[1].trim();
    }
  } else {
    document.getElementById('p1Score').textContent = "0";
    document.getElementById('p2Score').textContent = "0";
  }
  if (typeof updateVisual === "function") updateVisual();
}


// ================================
//      REPORTAR RESULTADO
// ================================
async function reportarResultadoChallonge() {
  const select = document.getElementById('selectMatch');
  const matchId = select && select.value;
  if (!matchId || !matchesCargados.length) {
    mostrarNotificacion("Selecciona un match primero.", "error");
    return;
  }
  // CAMBIO: Usar el slug del select de torneos
  const slug = document.getElementById('tournamentList').value.trim();
  if (!slug) {
    mostrarNotificacion("Falta slug del torneo.", "error");
    return;
  }
  const score1 = document.getElementById('p1Score').textContent.trim();
  const score2 = document.getElementById('p2Score').textContent.trim();
  const match = matchesCargados.find(m => String(m.id) === String(matchId));
  if (!match) {
    mostrarNotificacion("Match no encontrado.", "error");
    return;
  }
  const scoreCsv = `${score1}-${score2}`;
  let winnerId = null;
  if (Number(score1) > Number(score2)) winnerId = match.player1_id;
  else if (Number(score2) > Number(score1)) winnerId = match.player2_id;
  else {
    mostrarNotificacion("Empate no permitido.", "error");
    return;
  }

  document.getElementById('msgReportChallonge').textContent = "Enviando...";
  const res = await ipcRenderer.invoke('report-match-score', { slug, matchId, scoreCsv, winnerId });
  if (res.ok) {
    mostrarNotificacion("✅ Resultado reportado correctamente.", "success");
  } else {
    mostrarNotificacion("❌ " + res.error, "error");
  }
}

function confirmarYReportar() {
  if (confirm("¿Estás seguro que quieres reportar el resultado a Challonge? Esta acción no se puede deshacer.")) {
    reportarResultadoChallonge();
  }
}

// ================================
//     Top 8 Redes
// ================================

function generarMensajeTop8(nombreTorneo, top8) {
  let mensaje = `Resultados ${nombreTorneo}\n\n`;

  let prevRank = null;
  let rankNum = 0;
  top8.forEach((p, i) => {
    // Si la posición anterior es igual, repite el número (para empates)
    if (prevRank !== p.final_rank) {
      rankNum = p.final_rank;
      prevRank = p.final_rank;
    }
    // Busca el input de twitter si existe (cuando se edita manualmente)
    let twitterInput = document.getElementById('top8twitter' + i);
    let twitter = twitterInput ? twitterInput.value.trim() : (p.twitter || "");
    let tag = twitter
      ? (twitter.startsWith('@') ? twitter : '@' + twitter)
      : `@${p.name.replace(/\s/g,'_')}`;
    mensaje += `${rankNum}) ${tag}\n`;
  });

  mensaje += `\n¡Gracias por participar!`;
  return mensaje;
}

function mostrarMensajeTop8(nombreTorneo, top8) {
  top8 = top8.slice().sort((a, b) => a.final_rank - b.final_rank);
  const mensaje = generarMensajeTop8(nombreTorneo, top8);
  document.getElementById('mensajeTop8Text').value = mensaje;
}

function copiarMensajeTop8() {
  const textarea = document.getElementById('mensajeTop8Text');
  textarea.select();
  textarea.setSelectionRange(0, 99999); // Para móviles
  document.execCommand('copy');
  mostrarNotificacion("¡Mensaje copiado!", "success");
}

function generarMensajeTop8DesdeInputs() {
  const tbody = document.getElementById('top8Table');
  let mensaje = `Resultados ${window.nombreTorneoActual || ""}\n\n`;
  for (let i = 0; i < tbody.children.length; ++i) {
    const puesto = tbody.children[i].children[0].textContent;
    let twitter = document.getElementById('top8twitter' + i).value.trim();
    if (!twitter) {
      const jugador = tbody.children[i].children[1].textContent;
      twitter = '@' + jugador.replace(/\s/g, '_');
    }
    if (!twitter.startsWith('@')) twitter = '@' + twitter;
    mensaje += `${puesto}) ${twitter}\n`;
  }
  mensaje += `\n¡Gracias por participar!`;
  document.getElementById('mensajeTop8Text').value = mensaje;
}

// ================================
//     OBS
// ================================

async function conectarOBS() {
  const host = document.getElementById('obsHost').value.trim() || "localhost";
  const port = document.getElementById('obsPort').value.trim() || "4455";
  const password = document.getElementById('obsPassword').value.trim() || "";
  const res = await window.ipcRenderer.invoke('conectar-obs', { host, port, password });
  document.getElementById('msgOBS').innerHTML = res.ok
    ? '<span class="text-success">&#x2705; OBS conectado</span>'
    : '<span class="text-error">&#x274C; ' + (res.error || "No se pudo conectar") + '</span>';

  if (res.ok) {
    // Espera 400ms antes de cargar escenas para asegurar conexión establecida
    setTimeout(cargarEscenasOBS, 400);
  } else {
    document.getElementById('obsScenesContainer').innerHTML = "";
  }
}

async function cargarEscenasOBS() {
  const res = await window.ipcRenderer.invoke('get-obs-scenes');
  console.log('Respuesta escenas OBS:', res);
  const contenedor = document.getElementById('obsScenesContainer');
  contenedor.innerHTML = "";
  if (res.ok && res.scenes && res.scenes.length) {
    obsEscenas = res.scenes;
    res.scenes.forEach(scene => {
      const btn = document.createElement('button');
      btn.textContent = scene;
      btn.className = "sb-btn";
      btn.onclick = () => cambiarEscenaOBS(scene);
      contenedor.appendChild(btn);
    });
  } else {
  contenedor.innerHTML = "<span class='text-error'>No se pudieron cargar las escenas.</span>";
  }
}

async function cambiarEscenaOBS(scene) {
  const res = await window.ipcRenderer.invoke('cambiar-escena-obs', scene);
  document.getElementById('msgOBS').innerHTML = res.ok
    ? `<span class="text-success">&#x2705; Cambiado a "${scene}"</span>`
    : `<span class="text-error">&#x274C; ${res.error || "No se pudo cambiar"}</span>`;
}
async function capturarEscenaOBS() {
  const res = await window.ipcRenderer.invoke('capturar-escena-obs');
  const msg = document.getElementById('msgCapturaOBS');
  if (res.ok) {
    msg.textContent = "✅ Captura copiada al portapapeles";
  } else {
    msg.textContent = "❌ Error: " + (res.error || "No se pudo capturar");
  }
  setTimeout(() => { msg.textContent = ""; }, 2500);
}

function twittearMensaje() {
  // Genera el mensaje Top 8 actual
  const tbody = document.getElementById('top8Table');
  let mensaje = `Resultados ${window.nombreTorneoActual || ""}\n\n`;
  for (let i = 0; i < tbody.children.length; ++i) {
    const puesto = tbody.children[i].children[0].textContent;
    let twitter = document.getElementById('top8twitter' + i).value.trim();
    if (!twitter) {
      // Si no hay twitter, usa @Jugador_con_guion
      const jugador = tbody.children[i].children[1].textContent;
      twitter = '@' + jugador.replace(/\s/g, '_');
    }
    if (!twitter.startsWith('@')) twitter = '@' + twitter;
    mensaje += `${puesto}) ${twitter}\n`;
  }
  mensaje += `\n¡Gracias por participar!`;
  // Abre Twitter with el mensaje generado
  window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(mensaje)}`, '_blank');
}

// ================================
//     TORNEOS
// ================================

async function cargarTorneos() {
  const apiKey = document.getElementById('apikey').value.trim();
  const msg = document.getElementById('msgMatches');
  const tournamentList = document.getElementById('tournamentList');
  if (!apiKey) {
    mostrarNotificacion("❌ Ingresa tu API Key primero.", "error");
    return;
  }

  msg.textContent = "Cargando torneos...";
  try {
    const res = await window.ipcRenderer.invoke('get-tournaments');
    if (!res.ok) throw new Error(res.error || "Error al obtener los torneos.");
    
    // Muestra todos los torneos sin filtrar
    const todosTorneos = res.tournaments;
    console.log("Torneos recibidos:", todosTorneos);
    
    tournamentList.innerHTML = '<option value="">Selecciona un torneo...</option>';
    todosTorneos.forEach(tournament => {
      const option = document.createElement('option');
      option.value = tournament.url; // Se usa el slug del torneo
      option.textContent = tournament.name; // Nombre del torneo
      tournamentList.appendChild(option);
    });

    msg.textContent = todosTorneos.length > 0
      ? "✅ Torneos cargados."
      : "⚠️ No se encontraron torneos.";
  } catch (error) {
    msg.textContent = `❌ ${error.message}`;
  }
}

async function cargarTorneosTop8() {
  const apiKey = document.getElementById('apikey').value.trim();
  const select = document.getElementById('tournamentTop8');
  if (!apiKey) {
    select.innerHTML = '<option value="">Ingresa tu API Key primero</option>';
    return;
  }
  select.innerHTML = '<option value="">Cargando torneos...</option>';
  try {
    const res = await ipcRenderer.invoke('get-tournaments');
    if (!res.ok) throw new Error(res.error || "Error al obtener torneos.");
    // Ordena los torneos de más nuevo a más antiguo
    const sortedTournaments = res.tournaments
      .filter(t => t.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (sortedTournaments.length === 0) {
      select.innerHTML = '<option value="">No se encontraron torneos</option>';
      return;
    }
    let options = '<option value="">Selecciona un torneo...</option>';
    sortedTournaments.forEach(tournament => {
      options += `<option value="${tournament.url}">${tournament.name}</option>`;
    });
    select.innerHTML = options;
    
    // Si ya existe un torneo seleccionado para Top 8, restáuralo
    if (window.ultimoTorneoTop8) {
      select.value = window.ultimoTorneoTop8;
    }
    
    // Actualiza la variable global cada vez que se cambia la selección
    select.onchange = () => {
      window.ultimoTorneoTop8 = select.value;
      cargarTop8(); // Se carga el Top 8 automáticamente al seleccionar
    };
  } catch (error) {
    select.innerHTML = `<option value="">❌ ${error.message}</option>`;
  }
}

async function cargarTorneosBracket() {
  const apiKey = document.getElementById('apikey').value.trim();
  const select = document.getElementById('tournamentBracket');
  if (!apiKey) {
    select.innerHTML = '<option value="">Ingresa tu API Key primero</option>';
    return;
  }
  select.innerHTML = '<option value="">Cargando torneos...</option>';
  try {
    const res = await ipcRenderer.invoke('get-tournaments');
    if (!res.ok) throw new Error(res.error || "Error al obtener torneos.");
    // Ordenar por fecha de creación (más nuevo a más antiguo)
    const sorted = res.tournaments
      .filter(t => t.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    if (!sorted.length) {
      select.innerHTML = '<option value="">No se encontraron torneos</option>';
      return;
    }
    let options = '<option value="">Selecciona un torneo...</option>';
    sorted.forEach(tournament => {
      options += `<option value="${tournament.url}">${tournament.name}</option>`;
    });
    select.innerHTML = options;
    
    // Si ya existe un torneo seleccionado en la sesión, restáuralo
    if (window.ultimoTorneoBracket) {
      select.value = window.ultimoTorneoBracket;
    }
    
    // Actualiza la variable global cada vez que se cambia la selección
    select.onchange = async () => {
      window.ultimoTorneoBracket = select.value;
      mostrarBracket();

      // Nuevo: obtener y guardar los matches y el top 8 del torneo seleccionado
      if (select.value) {
        // 1. Obtener matches y participantes
        const resMatches = await window.ipcRenderer.invoke('get-matches-and-participants', select.value);
        // 2. Obtener Top 8
        const resTop8 = await ipcRenderer.invoke('get-top8', select.value);

        if (resMatches.ok && resMatches.matches && resTop8.top8) {
          const matchesFormateados = resMatches.matches.map((m, idx) => ({
            id: m.identifier || m.id || `m${idx+1}`,
            p1: m.player1_name,
            p2: m.player2_name,
            p1s: Number((m.scores_csv || '').split('-')[0]) || 0,
            p2s: Number((m.scores_csv || '').split('-')[1]) || 0
          }));

          // Guardar matches cargados globalmente
        } else {
          mostrarNotificacion('❌ No se pudieron obtener los matches o el Top 8.', 'error');
        }
      }
    };
  } catch (error) {
    select.innerHTML = `<option value="">❌ ${error.message}</option>`;
  }
}


async function buscarTorneosMatches() {
  const apiKey = document.getElementById('apikey').value.trim();
  const msg = document.getElementById('msgMatches');
  const tournamentList = document.getElementById('tournamentList');
  if (!apiKey) {
    msg.textContent = "❌ Ingresa tu API Key primero.";
    return;
  }

  msg.textContent = "Cargando torneos...";
  try {
    const res = await window.ipcRenderer.invoke('get-tournaments');
    if (!res.ok) throw new Error(res.error || "Error al obtener los torneos.");
    
    const todosTorneos = res.tournaments;
    console.log("Torneos recibidos:", todosTorneos);
    
    // Cargar todos los torneos ordenados de más nuevo a más antiguo
    const torneosOrdenados = todosTorneos
      .filter(t => t.created_at)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    tournamentList.innerHTML = '<option value="">Selecciona un torneo...</option>';
    torneosOrdenados.forEach(t => {
      const option = document.createElement('option');
      option.value = t.url;
      // Mostrar estado del torneo junto al nombre
      const estado = t.state ? ` (${t.state})` : '';
      option.textContent = t.name + estado;
      tournamentList.appendChild(option);
    });

    // Restaurar el último torneo seleccionado si existe
    if (ultimoTorneoMatches && torneosOrdenados.some(t => t.url === ultimoTorneoMatches)) {
      tournamentList.value = ultimoTorneoMatches;
      // Quitar la llamada automática a cargarMatches()
      // cargarMatches(); // <-- ELIMINA o comenta esta línea
    }

    // Guardar el último torneo seleccionado cada vez que cambie
    tournamentList.onchange = () => {
      ultimoTorneoMatches = tournamentList.value;
      // Ya no se llama cargarMatches() aquí
    };

    msg.textContent = torneosOrdenados.length > 0
      ? "✅ Torneos cargados."
      : "⚠️ No se encontraron torneos.";
  } catch (error) {
    msg.textContent = `❌ ${error.message}`;
  }
}

// Muestra una notificación flotante en la esquina superior derecha
function mostrarNotificacion(mensaje, tipo = "info", duracion = 3000) {
  const contenedor = document.getElementById('notificaciones-app');
  if (!contenedor) return;
  const div = document.createElement('div');
  div.className = `notificacion-flotante ${tipo}`;
  div.textContent = mensaje;
  contenedor.appendChild(div);
  setTimeout(() => {
    div.style.opacity = '0';
    setTimeout(() => div.remove(), 400);
  }, duracion);
}

// ================================
//     RUTAS PERSONALIZADAS
// ================================

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

async function elegirRuta(tipo) {
  const res = await ipcRenderer.invoke('elegir-ruta', tipo);
  if (res.ok && res.ruta) {
    const input = document.getElementById(rutaId(tipo));
    if (input) {
      input.value = res.ruta;
      // Guarda todas las rutas actuales, incluyendo 'usuarios'
      const rutas = {};
      for (const t of ['scoreboard', 'bracket', 'top8', 'apikey', 'usuarios']) {
        const inp = document.getElementById(rutaId(t));
        rutas[t] = inp ? inp.value : '';
      }
      await ipcRenderer.invoke('guardar-rutas', rutas);
    }
  }
}

async function guardarTodasLasRutas() {
  const rutas = {};
  for (const t of ['scoreboard', 'bracket', 'top8', 'apikey', 'usuarios']) {
    const inp = document.getElementById(rutaId(t));
    rutas[t] = inp ? inp.value : '';
  }
  console.log('[guardarTodasLasRutas] Rutas a guardar:', rutas);
  const resultado = await ipcRenderer.invoke('guardar-rutas', rutas);
  console.log('[guardarTodasLasRutas] Resultado del guardado:', resultado);
  
  if (resultado.ok) {
    alert('¡Rutas guardadas correctamente!');
  } else {
    alert('Error al guardar las rutas');
  }
}

async function cargarRutas() {
  console.log('[cargarRutas] Iniciando carga de rutas...');
  const res = await ipcRenderer.invoke('cargar-rutas');
  console.log('[cargarRutas] Respuesta del servidor:', res);
  
  if (res.ok && res.rutas) {
    console.log('[cargarRutas] Rutas encontradas:', res.rutas);
    for (const tipo of ['scoreboard', 'bracket', 'top8', 'apikey', 'usuarios']) {
      const inputId = rutaId(tipo);
      const input = document.getElementById(inputId);
      console.log(`[cargarRutas] Procesando ${tipo} -> input ID: ${inputId}, input existe: ${!!input}`);
      
      if (res.rutas[tipo] !== undefined && input) {
        input.value = res.rutas[tipo];
        console.log(`[cargarRutas] Asignado ${tipo}: "${res.rutas[tipo]}" al input ${inputId}`);
      } else if (!input) {
        console.warn(`[cargarRutas] Input ${inputId} no encontrado en el DOM`);
      }
    }
  } else {
    console.warn('[cargarRutas] No se pudieron cargar las rutas:', res);
  }
}

function rutaId(tipo) {
  if (tipo === 'apikey') return 'rutaApiKey';
  if (tipo === 'usuarios') return 'rutaUsuarios';
  return 'ruta' + tipo.charAt(0).toUpperCase() + tipo.slice(1);
}

// ================================
//     PREVIEW MATCH
// ================================

function mostrarPreviewMatch() {
  const select = document.getElementById('selectMatch');
  const matchId = select.value;
  const match = matchesCargados.find(m => String(m.id) === String(matchId));
  const div = document.getElementById('preview-match');
  if (!div) return;

  if (!match) {
    div.innerHTML = '';
    return;
  }

  const score1 = document.getElementById('p1Score')?.textContent || '0';
  const score2 = document.getElementById('p2Score')?.textContent || '0';

  div.innerHTML = `
    <div style="display:flex;justify-content:center;align-items:center;gap:2em;">
      <div>
        <strong>${match.player1_name}</strong>
        <div>Score: <span>${score1}</span></div>
      </div>
      <div style="font-size:2em;">VS</div>
      <div>
        <strong>${match.player2_name}</strong>
        <div>Score: <span>${score2}</span></div>
      </div>
    </div>
  `;
}

// Llama a esta función cada vez que cambies el score
document.getElementById('p1Score').addEventListener('DOMSubtreeModified', mostrarPreviewMatch);
document.getElementById('p2Score').addEventListener('DOMSubtreeModified', mostrarPreviewMatch);

// ================================
//     RUTAS PERSONALIZADAS
// ================================

function abrirRutas() {
  window.ipcRenderer.invoke('abrir-ventana-rutas');
}




// Construye un diccionario round_name -> [matches]
const matchesByRoundName = {};
Object.values(rondasTop8).flat().forEach(m => {
  if (!matchesByRoundName[m.round_name]) matchesByRoundName[m.round_name] = [];
  matchesByRoundName[m.round_name].push(m);
});

// Render visual solo con los bloques definidos y en orden
let html = `<div class="bracket-visual-rows">`;

// Winners row
html += `<div class="bracket-row bracket-row-winners">`;
["Winners Semis", "Winners Final", "Grand Final", "Grand Final Reset"].forEach(key => {
  if ((matchesByRoundName[key] || []).length > 0) {
    html += buildBracketRound(key, matchesByRoundName[key], key);
  }
});
html += `</div>`;

// Losers row
html += `<div class="bracket-row bracket-row-losers">`;
["Losers Top 8", "Losers Quarters", "Losers Semis", "Losers Finals"].forEach(key => {
  if ((matchesByRoundName[key] || []).length > 0) {
    html += buildBracketRound(key, matchesByRoundName[key], key);
  }
});
html += `</div>`;

html += `</div>`;
container.innerHTML = html;
async function llenarPersonajesTop8DesdeTxt() {
  const res = await ipcRenderer.invoke('leer-personajes-txt');
  if (res.ok) {
    for (let i = 0; i < 8; ++i) {
      const select = document.getElementById('top8char' + i);
      if (select) {
        select.innerHTML = res.personajes.map(
          char => `<option value="${char}">${char}</option>`
        ).join('');
      }
    }
  } else {
    // Si falla, puedes dejar la lista por defecto o mostrar un mensaje
    console.warn(res.error);
  }
}
async function llenarUsuariosTop8DesdeTxt() {
  const res = await ipcRenderer.invoke('leer-usuarios-txt');
  if (res.ok) {
    // Ordena alfabéticamente (ignorando mayúsculas/minúsculas)
    const usuariosOrdenados = res.usuarios.slice().sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
    for (let i = 0; i < 8; ++i) {
      const select = document.getElementById('top8twitter' + i);
      if (select) {
        select.innerHTML = usuariosOrdenados.map(
          usuario => `<option value="${usuario}">${usuario}</option>`
        ).join('');
      }
    }
  } else {
    // Si falla, puedes dejar la lista por defecto o mostrar un mensaje
    console.warn(res.error);
  }
}

// ...al final de scoreboard.js
window.addEventListener('DOMContentLoaded', function() {
  const saved = localStorage.getItem('scoreboard-style');
  if (saved === 'light') {
    document.body.classList.add('light-mode');
    const styleSel = document.getElementById('styleSel');
    if (styleSel) styleSel.value = 'light';
  }

  // No cargar rutas automáticamente - se cargan al ir a la pestaña de rutas
  
  // Initialize Challonge sub-tabs to show first one by default
  showChallongeSubTab(0);
});

['scoreboard', 'bracket', 'top8', 'twitch', 'obs', 'rutas', 'startgg'].forEach(id => {
  const link = document.getElementById('css-' + id);
  if (link) link.disabled = true;
});
const tabCssIds = ['scoreboard', 'bracket', 'top8', 'twitch', 'obs', 'rutas', 'startgg'];
const activeId = tabCssIds[n];
const activeLink = document.getElementById('css-' + activeId);
if (activeLink) activeLink.disabled = false;

// ================================
//      TEMPORIZADOR
// ================================


// ================================
//  CARGAR MATCH CHALLONGE EN SCOREBOARD (desde widget flotante)
// ================================
function cargarMatchChallongeEnScoreboard() {
  // Selector de match en el widget flotante
  const matchSelector = document.getElementById('challongeMatchSelector');
  if (!matchSelector || matchSelector.style.display === 'none') {
    mostrarNotificacion('Selecciona un match válido en el widget.', 'error');
    return;
  }
  const selectedOption = matchSelector.options[matchSelector.selectedIndex];
  if (!selectedOption || !selectedOption.dataset.match) {
    mostrarNotificacion('Selecciona un match válido.', 'error');
    return;
  }
  let match;
  try {
    match = JSON.parse(selectedOption.dataset.match);
  } catch (e) {
    mostrarNotificacion('Error al leer datos del match.', 'error');
    return;
  }

  // Separar tag y nombre si corresponde
  function splitTagAndName(fullName) {
    if (typeof fullName === 'string' && fullName.includes(' | ')) {
      const [tag, ...rest] = fullName.split(' | ');
      return { tag: tag.trim(), name: rest.join(' | ').trim() };
    }
    return { tag: '', name: fullName };
  }

  // Jugador 1
  const p1 = splitTagAndName(match.player1_name);
  document.getElementById('p1NameInput').value = p1.name;
  document.getElementById('p1TagInput').value = p1.tag;

  // Jugador 2
  const p2 = splitTagAndName(match.player2_name);
  document.getElementById('p2NameInput').value = p2.name;
  document.getElementById('p2TagInput').value = p2.tag;

  // Ronda
  let roundName = '';
  if (match.round !== undefined && match.round !== null) {
    roundName = `Ronda ${match.round}`;
  } else {
    roundName = `Match #${match.id}`;
  }

  // Actualizar tanto el campo de evento (sbEvent) como el campo editable de ronda (sbRound)
  document.getElementById('sbEvent').value = roundName;
  document.getElementById('sbEvent').textContent = roundName;
  document.getElementById('sbRound').value = roundName;
  window.currentRoundName = roundName;

  // Scores
  if (match.scores_csv) {
    const parts = match.scores_csv.split('-');
    if (parts.length === 2) {
      document.getElementById('p1Score').textContent = parts[0].trim();
      document.getElementById('p2Score').textContent = parts[1].trim();
    }
  } else {
    document.getElementById('p1Score').textContent = '0';
    document.getElementById('p2Score').textContent = '0';
  }

  if (typeof updateVisual === 'function') updateVisual();
  mostrarNotificacion('Match cargado en el scoreboard.', 'success');
}
function fijarTimer() {
  const minutos = parseInt(document.getElementById('timerInput').value, 10);
  if (isNaN(minutos) || minutos <= 0) {
    document.getElementById('msgTimer').textContent = '⏱️ Ingresa minutos válidos';
    setTimeout(() => document.getElementById('msgTimer').textContent = '', 2000);
    return;
  }
  // Guardar el tiempo de finalización en el JSON
  const ahora = Date.now();
  timerEndTimestamp = ahora + minutos * 60 * 1000;
  mostrarTimer(timerEndTimestamp - ahora);
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    const restante = timerEndTimestamp - Date.now();
    if (restante <= 0) {
      mostrarTimer(0);
      clearInterval(timerInterval);
      document.getElementById('msgTimer').textContent = '⏰ ¡Tiempo finalizado!';
      setTimeout(() => document.getElementById('msgTimer').textContent = '', 3000);
    } else {
      mostrarTimer(restante);
    }
  }, 1000);
  document.getElementById('msgTimer').textContent = '⏱️ Timer fijado';
  setTimeout(() => document.getElementById('msgTimer').textContent = '', 2000);
  guardarTimerEnScoreboard(timerEndTimestamp);
}

function resetearTimer() {
  // Detener cualquier timer en curso
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
  
  // Resetear variables globales
  timerEndTimestamp = null;
  
  // Mostrar 00:00 en pantalla
  mostrarTimer(0);
  
  // Limpiar el input
  document.getElementById('timerInput').value = '';
  
  // Guardar el estado reseteado en el JSON
  guardarTimerEnScoreboard(null);
  
  // Mostrar mensaje de confirmación
  document.getElementById('msgTimer').textContent = '🔄 Timer reseteado';
  setTimeout(() => document.getElementById('msgTimer').textContent = '', 2000);
}

function mostrarTimer(msRestante) {
  const el = document.getElementById('timerDisplay');
  if (!el) return;
  if (msRestante <= 0) {
    el.textContent = '00:00';
    return;
  }
  const totalSec = Math.floor(msRestante / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  el.textContent = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

async function guardarTimerEnScoreboard(timestamp) {
  // Cargar scoreboard actual
  const resLoad = await ipcRenderer.invoke('load-json');
  let data = resLoad.ok && resLoad.data ? resLoad.data : {};
  data.timerEndTimestamp = timestamp;
  await ipcRenderer.invoke('save-json', data, 'scoreboard');
}

// Al cargar la pestaña comentaristas, mostrar el timer si existe
async function cargarTimerAlAbrir() {
  // Siempre resetear el timer al cargar - no importa lo que diga el JSON
  mostrarTimer(0);
  timerEndTimestamp = null;
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}



