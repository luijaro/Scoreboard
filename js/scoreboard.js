// ================================
//         CARGA INICIAL
// ================================
let obsEscenas = [];
window.ipcRenderer = require('electron').ipcRenderer;
let ultimoTorneoMatches = null; // <-- Declaración global

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
  // Bracket
  if (n === 1) {
    cargarTorneosBracket();
  }
  // Top 8
  if (n === 2) {
    cargarTorneosTop8();
  }
  // Credenciales y Matches (ajusta el índice si tu orden es diferente)
  if (n === 4) {
    buscarTorneosMatches();
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
  animateScore(id, score);
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
    game: document.getElementById('gameSel').value,
    round: window.currentRoundName || '' // <-- esto guarda la ronda
  };
}


async function guardarScoreboard() {
  const data = getScoreboardData();
  const res = await ipcRenderer.invoke('save-json', data);
  if (res.ok) {
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
          <input class="sb-input" id="top8twitter${idx}" placeholder="@usuario" style="width:120px;">
        </td>
      </tr>
    `;
  });

  // --- Obtén el nombre del torneo desde Challonge y guárdalo globalmente ---
  const titleRes = await ipcRenderer.invoke('get-tournament-title', slug);
  let nombreTorneo = titleRes.title || slug;
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
  const fecha = new Date().toLocaleDateString('es-CL');

  for (let i = 0; i < tbody.children.length; ++i) {
    const jugador = tbody.children[i].children[1].textContent;
    const personaje = document.getElementById('top8char' + i).value;
    const twitter = document.getElementById('top8twitter' + i).value.trim();
    top8Data.push({ nombre: jugador, personaje, juego, twitter });
  }
  
  const res = await ipcRenderer.invoke('save-json', {
    evento: nombreTorneo,
    fecha: fecha,
    top8: top8Data
  });

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
  await ipcRenderer.invoke('save-api-key', { apiKey, twitchOAuth, twitchUser, twitchChannel });
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
  if (!slug) {
    iframe.src = '';
    return;
  }
  // Puedes ajustar el URL del iframe según tus preferencias
  iframe.src = `https://challonge.com/${slug}/module?theme=2&show_standings=1&show_tournament_name=1`;
}

// ================================
//          MATCHES
// ================================
let matchesCargados = [];

function nombreDeRonda(round, roundsInfo) {
  // roundsInfo: { maxWinners: N, minLosers: -N, maxLosers: -1 }
  // Puedes mejorarlo según el tamaño del bracket (esto es un ejemplo simple para Top 8/16/32)
  if (round > 0) {
    if (round === roundsInfo.maxWinners) return "Winners Finals";
    if (round === roundsInfo.maxWinners - 1) return "Winners Semis";
    if (round === 1) return "Winners R1";
    return "Winners Bracket";
  }
  if (round < 0) {
    if (round === -1) return "Losers Top 8";
    if (round === roundsInfo.minLosers) return "Losers Finals";
    if (round === roundsInfo.minLosers + 1) return "Losers Semis";
    return "Losers Bracket";
  }
  return "";
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
    const res = await window.ipcRenderer.invoke('get-matches-and-participants', tournamentSlug);
    if (!res.ok) throw new Error(res.error || "Error al obtener los matches.");

    // Limpia el select y agrega los matches
    selectMatch.innerHTML = '';
    matchesCargados = res.matches; // <-- Guarda los matches cargados globalmente

    res.matches.forEach(match => {
      const option = document.createElement('option');
      option.value = match.id;
      option.textContent = `Match #${match.id} - ${match.player1_name} vs ${match.player2_name}`;
      selectMatch.appendChild(option);
    });

    selectMatch.style.display = 'block';
    msg.textContent = "✅ Matches cargados.";

    // Asigna el evento para mostrar los datos del match seleccionado
    selectMatch.onchange = mostrarMatchEnScoreboard;

    // Si hay al menos un match, selecciona el primero y muestra sus datos automáticamente
    if (res.matches.length > 0) {
      selectMatch.selectedIndex = 0;
      mostrarMatchEnScoreboard();
    }
  } catch (error) {
    msg.textContent = `❌ ${error.message}`;
  }
}

function mostrarMatchEnScoreboard() {
  const select = document.getElementById('selectMatch');
  const matchId = select.value;
  const match = matchesCargados.find(m => String(m.id) === String(matchId));
  if (!match) return;

  // ========== CALCULA roundsInfo en cada llamada ==========
  const winnerRounds = matchesCargados.filter(m => m.round > 0).map(m => m.round);
  const maxWinners = winnerRounds.length ? Math.max(...winnerRounds) : 1;
  const loserRounds = matchesCargados.filter(m => m.round < 0).map(m => m.round);
  const minLosers = loserRounds.length ? Math.min(...loserRounds) : -1;
  const maxLosers = loserRounds.length ? Math.max(...loserRounds) : -1;
  const roundsInfo = { maxWinners, minLosers, maxLosers };

  const roundName = nombreDeRonda(match.round, roundsInfo);
  document.getElementById('sbEvent').textContent = roundName;
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
  // Abre Twitter con el mensaje generado
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
    select.onchange = () => {
      window.ultimoTorneoBracket = select.value;
      mostrarBracket(); // Se muestra el bracket automáticamente al seleccionar
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

  msg.textContent = "Buscando torneos in progress...";
  try {
    const res = await window.ipcRenderer.invoke('get-tournaments');
    if (!res.ok) throw new Error(res.error || "Error al obtener los torneos.");
    
    const todosTorneos = res.tournaments;
    console.log("Torneos recibidos:", todosTorneos);
    
    const torneosInProgress = todosTorneos.filter(t =>
      t.state && t.state.toLowerCase() === "underway"
    );

    tournamentList.innerHTML = '<option value="">Selecciona un torneo in progress...</option>';
    torneosInProgress.forEach(t => {
      const option = document.createElement('option');
      option.value = t.url;
      option.textContent = t.name;
      tournamentList.appendChild(option);
    });

    // Restaurar el último torneo seleccionado si existe
    if (ultimoTorneoMatches && torneosInProgress.some(t => t.url === ultimoTorneoMatches)) {
      tournamentList.value = ultimoTorneoMatches;
      // Quitar la llamada automática a cargarMatches()
      // cargarMatches(); // <-- ELIMINA o comenta esta línea
    }

    // Guardar el último torneo seleccionado cada vez que cambie
    tournamentList.onchange = () => {
      ultimoTorneoMatches = tournamentList.value;
      // Ya no se llama cargarMatches() aquí
    };

    msg.textContent = torneosInProgress.length > 0
      ? "✅ Torneos cargados."
      : "⚠️ No se encontraron torneos in progress.";
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