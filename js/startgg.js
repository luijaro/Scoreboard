async function buscarStartGG() {
  const texto = document.getElementById('startggSlug').value.trim();
  const resultsDiv = document.getElementById('startggResults');
  if (!texto) {
    resultsDiv.textContent = "❌ Ingresa texto para buscar.";
    return;
  }
  resultsDiv.textContent = "Buscando...";
  try {
    const res = await window.ipcRenderer.invoke('startgg-search-tournaments', texto);
    if (res.error) {
      resultsDiv.textContent = "❌ " + res.error;
      return;
    }
    const tournaments = res.data?.tournaments?.nodes || [];
    if (tournaments.length === 0) {
      resultsDiv.textContent = "No se encontraron torneos.";
      return;
    }
    resultsDiv.innerHTML = "<b>Torneos encontrados:</b><br>" +
      tournaments.map(t =>
        `<button class="sb-btn" style="margin:0.2em 0;" onclick="consultarStartGG('${t.slug.replace(/'/g, "\\'")}')">${t.name} (${t.slug})</button>`
      ).join("<br>");
  } catch (e) {
    resultsDiv.textContent = "❌ Error: " + e.message;
  }
}

// Función para consultar la API con el slug seleccionado
async function consultarStartGG(slug) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = "Buscando eventos del torneo...";
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-events', slug);
    if (res.error) {
      resultsDiv.textContent = "❌ " + res.error;
      return;
    }
    if (res.ok && res.events && res.events.length > 0) {
      resultsDiv.innerHTML = `<b>Eventos de ${res.tournamentName}:</b><br>` +
        res.events.map(ev =>
          `<button class="sb-btn" style="margin:0.2em 0;" onclick="consultarMatchesStartGG('${ev.id}', '${ev.name.replace(/'/g, "\\'")}')">${ev.name}</button>`
        ).join('');
    } else {
      resultsDiv.textContent = "No se encontraron eventos para este torneo.";
    }
  } catch (e) {
    resultsDiv.textContent = "❌ Error: " + e.message;
  }
}

async function guardarStartggToken() {
  const token = document.getElementById('startggToken').value.trim();
  const msg = document.getElementById('msgStartggToken');
  if (!token) {
    msg.textContent = "❌ Ingresa un token válido.";
    return;
  }
  // Pide la ruta del apikey.json desde el config
  const res = await window.ipcRenderer.invoke('cargar-rutas');
  if (!res.ok || !res.rutas || !res.rutas.apikey) {
    msg.textContent = "❌ No se ha configurado la ruta de API Key.";
    return;
  }
  const apikeyPath = res.rutas.apikey;
  const ok = await window.ipcRenderer.invoke('guardar-apikey-token', apikeyPath, token);
  if (ok && ok.ok) {
    msg.textContent = "✅ Token guardado.";
  } else {
    msg.textContent = "❌ Error al guardar el token.";
  }
}

async function cargarStartggToken() {
  const res = await window.ipcRenderer.invoke('cargar-rutas');
  if (res.ok && res.rutas && res.rutas.apikey) {
    const apikeyPath = res.rutas.apikey;
    const data = await window.ipcRenderer.invoke('leer-apikey-json', apikeyPath);
    if (data && data.startgg) {
      document.getElementById('startggToken').value = data.startgg;
    }
  }
}
// Llama a cargarStartggToken() cuando se muestre la pestaña

async function consultarMatchesStartGG(eventId, eventName) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = "Buscando matches del evento...";
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-matches', eventId);
    if (res.error) {
      resultsDiv.textContent = "❌ " + res.error;
      return;
    }
    if (res.ok && res.sets && res.sets.length > 0) {
      resultsDiv.innerHTML = `<b>Matches de ${eventName}:</b><br>` +
        res.sets.map(set => {
          const p1 = set.slots[0]?.entrant?.name || 'TBD';
          const p2 = set.slots[1]?.entrant?.name || 'TBD';
          const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
          const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
          const round = set.fullRoundText || '';
          // Botón para enviar al Scoreboard
          return `<button class="sb-btn" style="margin-bottom:0.5em; width:100%; text-align:left;"
            onclick="enviarMatchAlScoreboard('${escapeQuotes(p1)}','${escapeQuotes(p2)}','${s1}','${s2}','${escapeQuotes(round)}')">
            <b>${round}</b>: ${p1} <b>${s1}</b> vs <b>${s2}</b> ${p2}
          </button>`;
        }).join('');
    } else {
      resultsDiv.textContent = "No se encontraron matches para este evento.";
    }
  } catch (e) {
    resultsDiv.textContent = "❌ Error: " + e.message;
  }
}

// Helper para escapar comillas simples/dobles en nombres
function escapeQuotes(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function enviarMatchAlScoreboard(p1, p2, s1, s2, round) {
  showTab(0);

  document.getElementById('p1NameInput').value = p1;
  document.getElementById('p2NameInput').value = p2;
  document.getElementById('p1Score').textContent = s1;
  document.getElementById('p2Score').textContent = s2;
  document.getElementById('sbEvent').textContent = round;

  document.getElementById('p1Name').textContent = p1;
  document.getElementById('p2Name').textContent = p2;

  // Guarda el round en la variable global para que el Scoreboard lo incluya
  window.currentRoundName = round;

  // Llama a la función global del Scoreboard para guardar todos los datos
  if (typeof guardarScoreboard === "function") guardarScoreboard();
}