
// ================================
//         CARGA INICIAL
// ================================
let obsEscenas = [];
window.ipcRenderer = require('electron').ipcRenderer;

(async function cargarScoreboardAlAbrir() {
  const res = await ipcRenderer.invoke('load-json');
  if (res.ok && res.data) {
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
    if (typeof updateVisual === "function") updateVisual();
  }
})();

window.addEventListener('DOMContentLoaded', cambiarJuego);

// ================================
//           TABS
// ================================
function showTab(n) {
  document.querySelectorAll('.tab-btn').forEach((btn, i) => btn.classList.toggle('active', i === n));
  document.querySelectorAll('.tab-panel').forEach((p, i) => p.classList.toggle('active', i === n));
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
const { ipcRenderer } = require('electron');

document.querySelectorAll('.sb-input, .sb-dropdown').forEach(el => {
  el.addEventListener('input', updateVisual);
});

function updateVisual() {
  document.getElementById('p1Name').textContent = document.getElementById('p1NameInput').value;
  document.getElementById('p1Tag').textContent = document.getElementById('p1TagInput').value;
  document.getElementById('p2Name').textContent = document.getElementById('p2NameInput').value;
  document.getElementById('p2Tag').textContent = document.getElementById('p2TagInput').value;
  const p1Char = document.getElementById('p1Char').value;
  const p2Char = document.getElementById('p2Char').value;
  document.querySelector('.sb-side .sb-player-img').src = imgPersonajes[p1Char] || '';
  document.querySelector('.sb-side.right .sb-player-img').src = imgPersonajes[p2Char] || '';
}

function changeScore(player, delta) {
  const id = player === 1 ? 'p1Score' : 'p2Score';
  let score = parseInt(document.getElementById(id).textContent) || 0;
  score = Math.max(0, score + delta);
  document.getElementById(id).textContent = score;
}

function swap() {
  let p1Name = document.getElementById('p1NameInput').value;
  let p2Name = document.getElementById('p2NameInput').value;
  let p1Tag = document.getElementById('p1TagInput').value;
  let p2Tag = document.getElementById('p2TagInput').value;
  let p1Score = document.getElementById('p1Score').textContent;
  let p2Score = document.getElementById('p2Score').textContent;
  let p1Char = document.getElementById('p1Char').value;
  let p2Char = document.getElementById('p2Char').value;
  document.getElementById('p1NameInput').value = p2Name;
  document.getElementById('p2NameInput').value = p1Name;
  document.getElementById('p1TagInput').value = p2Tag;
  document.getElementById('p2TagInput').value = p1Tag;
  document.getElementById('p1Score').textContent = p2Score;
  document.getElementById('p2Score').textContent = p1Score;
  document.getElementById('p1Char').value = p2Char;
  document.getElementById('p2Char').value = p1Char;
  updateVisual();
}

function resetScores() {
  document.getElementById('p1Score').textContent = 0;
  document.getElementById('p2Score').textContent = 0;
}

function getScoreboardData() {
  return {
    player1: document.getElementById('p1NameInput').value,
    player2: document.getElementById('p2NameInput').value,
    score1: Number(document.getElementById('p1Score').textContent),
    score2: Number(document.getElementById('p2Score').textContent),
    tag1: document.getElementById('p1TagInput').value,
    tag2: document.getElementById('p2TagInput').value,
    char1: document.getElementById('p1Char').value,
    char2: document.getElementById('p2Char').value,
    game: document.getElementById('gameSel').value
  };
}

async function guardarScoreboard() {
  const data = getScoreboardData();
  const res = await ipcRenderer.invoke('save-json', data);
  const msg = document.getElementById('msgGuardado');
  if (res.ok) {
    msg.textContent = '✅ ¡Guardado!';
    setTimeout(() => { msg.textContent = ''; }, 3000);
  } else {
    msg.textContent = '❌ Error al guardar';
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

// Ejemplo de uso cuando subes el score:
function changeScore(player, delta) {
  const id = player === 1 ? 'p1Score' : 'p2Score';
  let score = parseInt(document.getElementById(id).textContent) || 0;
  score = Math.max(0, score + delta);
  animateScore(id, score);
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
  const slug = document.getElementById('slugTop8').value.trim();
  const msg = document.getElementById('msgTop8');
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
      </tr>
    `;
  });

  // --- Agrega estas líneas aquí ---
  const titleRes = await ipcRenderer.invoke('get-tournament-title', slug);
  let nombreTorneo = titleRes.title || slug;
  mostrarMensajeTop8(nombreTorneo, r.top8);
  // --- hasta aquí ---

  setTimeout(() => msg.textContent = '', 2500);
}



async function guardarTop8() {
  const tbody = document.getElementById('top8Table');
  if (!tbody.children.length) return;
  const top8Data = [];
  for (let i = 0; i < tbody.children.length; ++i) {
    const jugador = tbody.children[i].children[1].textContent;
    const personaje = document.getElementById('top8char' + i).value;
    top8Data.push({ nombre: jugador, personaje });
  }
  const dir = await ipcRenderer.invoke('open-folder');
  const res = await ipcRenderer.invoke('save-json', { top8: top8Data });
  document.getElementById('msgTop8').textContent = res.ok ? "✅ Top 8 guardado." : "❌ Error al guardar";
  setTimeout(() => { document.getElementById('msgTop8').textContent = ''; }, 3000);
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
    document.getElementById('msgApi').textContent = "API Key vacía";
    return;
  }
  await ipcRenderer.invoke('save-api-key', { apiKey, twitchOAuth, twitchUser, twitchChannel });
  document.getElementById('msgApi').textContent = "Datos guardados.";
  setTimeout(() => { document.getElementById('msgApi').textContent = ''; }, 2000);
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
  }
})();

async function cargarJugadoresChallonge() {
  const slug = document.getElementById('slugChallonge').value.trim();
  if (!slug) return;
  document.getElementById('msgChallonge').textContent = "Consultando...";
  const r = await ipcRenderer.invoke('get-participants', slug);
  if (r.error) {
    document.getElementById('msgChallonge').textContent = r.error;
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
  const slug = document.getElementById('slugBracket').value.trim();
  const iframe = document.getElementById('challongeBracket');
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

async function cargarMatches() {
  const slug = document.getElementById('editSlug').value.trim();
  if (!slug) {
    document.getElementById('msgMatches').textContent = "Falta slug.";
    return;
  }
  document.getElementById('msgMatches').textContent = "Cargando matches...";
  const res = await ipcRenderer.invoke('get-matches-and-participants', slug);
  if (res.error) {
    document.getElementById('msgMatches').textContent = res.error;
    document.getElementById('selectMatch').style.display = "none";
    return;
  }
  matchesCargados = res.matches || [];
  const select = document.getElementById('selectMatch');
  select.innerHTML = matchesCargados.map(m =>
    `<option value="${m.id}">
      [${m.round > 0 ? "Winners" : "Losers"} R${Math.abs(m.round)}] ${m.player1_name} vs ${m.player2_name}
    </option>`
  ).join('');
  select.style.display = "";
  document.getElementById('msgMatches').textContent = "Selecciona un match";
  select.onchange = mostrarMatchEnScoreboard;
  if (matchesCargados.length) {
    select.selectedIndex = 0;
    mostrarMatchEnScoreboard();
  }
}

function mostrarMatchEnScoreboard() {
  const select = document.getElementById('selectMatch');
  const matchId = select.value;
  const match = matchesCargados.find(m => String(m.id) === String(matchId));
  if (!match) return;
  document.getElementById('p1NameInput').value = match.player1_name;
  document.getElementById('p2NameInput').value = match.player2_name;
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
    document.getElementById('msgReportChallonge').textContent = "Selecciona un match primero.";
    return;
  }
  const slug = document.getElementById('editSlug').value.trim();
  if (!slug) {
    document.getElementById('msgReportChallonge').textContent = "Falta slug del torneo.";
    return;
  }
  const score1 = document.getElementById('p1Score').textContent.trim();
  const score2 = document.getElementById('p2Score').textContent.trim();
  const match = matchesCargados.find(m => String(m.id) === String(matchId));
  if (!match) {
    document.getElementById('msgReportChallonge').textContent = "Match no encontrado.";
    return;
  }
  const scoreCsv = `${score1}-${score2}`;
  let winnerId = null;
  if (Number(score1) > Number(score2)) winnerId = match.player1_id;
  else if (Number(score2) > Number(score1)) winnerId = match.player2_id;
  else {
    document.getElementById('msgReportChallonge').textContent = "Empate no permitido.";
    return;
  }

  document.getElementById('msgReportChallonge').textContent = "Enviando...";
  const res = await ipcRenderer.invoke('report-match-score', { slug, matchId, scoreCsv, winnerId });
  document.getElementById('msgReportChallonge').textContent = res.ok
    ? "✅ Resultado reportado correctamente."
    : "❌ " + res.error;
}

function confirmarYReportar() {
  if (confirm("¿Estás seguro que quieres reportar el resultado a Challonge? Esta acción no se puede deshacer.")) {
    reportarResultadoChallonge();
  }
}

// ================================
//     Top 8 Redes
// ================================

console.log('Intentando cargar top 8', slug);
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
    // Si tienes el campo twitter, úsalo; si no, usa el nombre reemplazando espacios por guión bajo
    let tag = p.twitter ? `@${p.twitter.replace(/^@/,'')}` : `@${p.name.replace(/\s/g,'_')}`;
    mensaje += `${rankNum}) ${tag}\n`;
  });

  mensaje += `\n¡Gracias por participar!`;
  return mensaje;
}

function mostrarMensajeTop8(nombreTorneo, top8) {
  // Ordena por final_rank (por si acaso)
  top8 = top8.slice().sort((a, b) => a.final_rank - b.final_rank);
  const mensaje = generarMensajeTop8(nombreTorneo, top8);
  document.getElementById('mensajeTop8Text').value = mensaje;
}

function copiarMensajeTop8() {
  const textarea = document.getElementById('mensajeTop8Text');
  textarea.select();
  document.execCommand('copy');
  document.getElementById('msgTop8Copy').textContent = "¡Mensaje copiado!";
  setTimeout(() => {
    document.getElementById('msgTop8Copy').textContent = "";
  }, 2000);
}



// ================================
//     OBS
// ================================

async function conectarOBS() {
  const host = document.getElementById('obsHost').value.trim() || "localhost";
  const port = document.getElementById('obsPort').value.trim() || "4455";
  const password = document.getElementById('obsPassword').value.trim() || "";
  const res = await window.ipcRenderer.invoke('conectar-obs', { host, port, password });
  document.getElementById('msgOBS').textContent = res.ok ? "✅ OBS conectado" : "❌ " + res.error;
  if (res.ok) {
  setTimeout(cargarEscenasOBS, 400);
} else {
  document.getElementById('obsScenesContainer').innerHTML = "";
}
}



async function conectarOBS() {
  const host = document.getElementById('obsHost').value.trim() || "localhost";
  const port = document.getElementById('obsPort').value.trim() || "4455";
  const password = document.getElementById('obsPassword').value.trim() || "";
  const res = await window.ipcRenderer.invoke('conectar-obs', { host, port, password });
  document.getElementById('msgOBS').innerHTML = res.ok
    ? '<span style="color:#8fff9f">&#x2705; OBS conectado</span>'
    : '<span style="color:#ffb3b3">&#x274C; ' + (res.error || "No se pudo conectar") + '</span>';

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
    contenedor.innerHTML = "<span style='color:#ffb3b3'>No se pudieron cargar las escenas.</span>";
  }
}

async function cambiarEscenaOBS(scene) {
  const res = await window.ipcRenderer.invoke('cambiar-escena-obs', scene);
  document.getElementById('msgOBS').innerHTML = res.ok
    ? `<span style="color:#8fff9f">&#x2705; Cambiado a "${scene}"</span>`
    : `<span style="color:#ffb3b3">&#x274C; ${res.error || "No se pudo cambiar"}</span>`;
}
