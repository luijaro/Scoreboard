async function buscarStartGG() {
  const texto = document.getElementById('startggSlug').value.trim();
  const resultsDiv = document.getElementById('startggResults');
  if (!texto) {
    resultsDiv.textContent = "❌ Ingresa texto para buscar.";
    return;
  }
  resultsDiv.textContent = "Buscando...";
  // Si el slug termina en /events, consulta directamente los eventos y muestra estado de torneo y eventos
  if (/\/events$/.test(texto)) {
    try {
      const res = await window.ipcRenderer.invoke('startgg-get-events', texto.replace(/\/events$/, ''));
      if (res.error) {
        resultsDiv.textContent = "❌ " + res.error;
        return;
      }
      // Estado del torneo principal
      let estadoTorneo = '';
      const state = res.state || res.tournament?.state || res.status || '';
      if (state === 'ACTIVE') estadoTorneo = '<span style="color:#27ae60;font-weight:bold;">En progreso</span>';
      else if (state === 'COMPLETED') estadoTorneo = '<span style="color:#e67e22;font-weight:bold;">Terminado</span>';
      else estadoTorneo = `<span style="color:#aaa;">${state}</span>`;

      let eventosHtml = '';
      if (res.ok && res.events && res.events.length > 0) {
        // Consultar estado de cada evento
        const eventosConEstado = await Promise.all(res.events.map(async ev => {
          let estadoEv = '';
          try {
            const evRes = await window.ipcRenderer.invoke('startgg-get-event-state', ev.id);
            const evState = evRes?.state || evRes?.event?.state || evRes?.status || '';
            if (evState === 'ACTIVE') estadoEv = '<span style="color:#27ae60;font-weight:bold;">En progreso</span>';
            else if (evState === 'COMPLETED') estadoEv = '<span style="color:#e67e22;font-weight:bold;">Terminado</span>';
            else estadoEv = `<span style="color:#aaa;">${evState}</span>`;
          } catch (e) {
            estadoEv = '<span style="color:#aaa;">?</span>';
          }
          let top8Btn = '';
          if (estadoEv.includes('Terminado')) {
            top8Btn = `<button class=\"sb-btn\" style=\"margin-left:0.5em; background:#8e44ad;color:#fff;\" onclick=\"generarTop8StartGG('${ev.id}','${ev.name.replace(/'/g, "\\'")}')\">Generar Top 8</button>`;
          }
          return `<button class=\"sb-btn\" style=\"margin:0.2em 0;\" onclick=\"consultarMatchesStartGG('${ev.id}', '${ev.name.replace(/'/g, "\\'")}')\">${ev.name}</button> ${estadoEv} ${top8Btn}`;
        }));
        eventosHtml = eventosConEstado.join('');
      } else {
        eventosHtml = "No se encontraron eventos para este torneo.";
      }
      resultsDiv.innerHTML = `<b>Eventos de ${res.tournamentName}:</b> ${estadoTorneo}<br>${eventosHtml}`;
    } catch (e) {
      resultsDiv.textContent = "❌ Error: " + e.message;
    }
    return;
  }
  // Si no termina en /events, busca torneos normalmente
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
      tournaments.map(t => {
        // Estado del torneo: "ACTIVE" (en progreso), "COMPLETED" (terminado), etc.
        let estado = '';
        // Buscar el estado en diferentes lugares
        const state = t.state || t.tournament?.state || t.status || '';
        if (state === 'ACTIVE') estado = '<span style="color:#27ae60;font-weight:bold;">En progreso</span>';
        else if (state === 'COMPLETED') estado = '<span style="color:#e67e22;font-weight:bold;">Terminado</span>';
        else estado = `<span style="color:#aaa;">${state}</span>`;
        return `<button class="sb-btn" style="margin:0.2em 0;" onclick="consultarStartGG('${t.slug.replace(/'/g, "\\'")}')">${t.name} (${t.slug})</button> ${estado}`;
      }).join("<br>");
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
    // Estado del torneo
    let estado = '';
    const state = res.state || res.tournament?.state || res.status || '';
    if (state === 'ACTIVE') estado = '<span style=\"color:#27ae60;font-weight:bold;\">En progreso</span>';
    else if (state === 'COMPLETED') estado = '<span style=\"color:#e67e22;font-weight:bold;\">Terminado</span>';
    else estado = `<span style=\"color:#aaa;\">${state}</span>`;

    let eventosHtml = '';
    if (res.ok && res.events && res.events.length > 0) {
      // Consulta el estado de cada evento
      const eventosConEstado = await Promise.all(res.events.map(async ev => {
        let estadoEv = '';
        try {
          // Consulta el estado del evento
          const evRes = await window.ipcRenderer.invoke('startgg-get-event-state', ev.id);
          const evState = evRes?.state || evRes?.event?.state || evRes?.status || '';
          if (evState === 'ACTIVE') estadoEv = '<span style=\"color:#27ae60;font-weight:bold;\">En progreso</span>';
          else if (evState === 'COMPLETED') estadoEv = '<span style=\"color:#e67e22;font-weight:bold;\">Terminado</span>';
          else estadoEv = `<span style=\"color:#aaa;\">${evState}</span>`;
        } catch (e) {
          estadoEv = '<span style=\"color:#aaa;\">?</span>';
        }
        // Mostrar botón Generar Top 8 si el evento está terminado
        let top8Btn = '';
        if (estadoEv.includes('Terminado')) {
          top8Btn = `<button class=\"sb-btn\" style=\"margin-left:0.5em; background:#8e44ad;color:#fff;\" onclick=\"generarTop8StartGG('${ev.id}','${ev.name.replace(/'/g, "\\'")}')\">Generar Top 8</button>`;
        }
        return `<button class=\"sb-btn\" style=\"margin:0.2em 0;\" onclick=\"consultarMatchesStartGG('${ev.id}', '${ev.name.replace(/'/g, "\\'")}')\">${ev.name}</button> ${estadoEv} ${top8Btn}`;
      }));
      eventosHtml = eventosConEstado.join('');
    } else {
      eventosHtml = "No se encontraron eventos para este torneo.";
    }

    resultsDiv.innerHTML = `<b>Eventos de ${res.tournamentName}:</b> ${estado}<br>${eventosHtml}`;
  } catch (e) {
    resultsDiv.textContent = "❌ Error: " + e.message;
  }
}
// ...existing code...


// Generar Top 8 desde Start.gg y guardar en top8.json
async function generarTop8StartGG(eventId, eventName) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = 'Generando Top 8...';
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-matches', eventId);
    if (res.error) {
      resultsDiv.textContent = '❌ ' + res.error;
      return;
    }
    // Filtrar los 8 mejores jugadores por final_rank si está disponible
    let jugadores = [];
    if (res.sets && res.sets.length > 0) {
      // Agrupar por jugador y rank
      const ranking = {};
      res.sets.forEach(set => {
        set.slots.forEach(slot => {
          const name = slot.entrant?.name;
          const rank = slot.standing?.placement;
          if (name && rank && (!ranking[name] || ranking[name] > rank)) {
            ranking[name] = rank;
          }
        });
      });
      // Ordenar por rank ascendente y tomar los 8 primeros
      jugadores = Object.entries(ranking)
        .sort((a, b) => a[1] - b[1])
        .slice(0, 8)
        .map(([nombre, final_rank]) => ({ nombre, final_rank }));
    }
    if (jugadores.length === 0) {
      resultsDiv.textContent = 'No se pudo generar el Top 8.';
      return;
    }
    // Construir datos para top8.json
    const top8Data = {
      evento: eventName,
      fecha: new Date().toISOString().slice(0, 10),
      top8: jugadores.map(j => ({ nombre: j.nombre, personaje: '', juego: '', twitter: '', final_rank: j.final_rank }))
    };
    // Guardar usando el handler save-json
    const resSave = await window.ipcRenderer.invoke('save-json', top8Data, 'top8');
    if (resSave.ok) {
      resultsDiv.textContent = '✅ Top 8 generado y guardado.';
    } else {
      resultsDiv.textContent = '❌ Error al guardar Top 8.';
    }
  } catch (e) {
    resultsDiv.textContent = '❌ Error: ' + e.message;
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