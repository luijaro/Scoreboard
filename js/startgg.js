// Nueva función para buscar y mostrar eventos de un torneo Start.gg
async function buscarStartGG() {
  const texto = document.getElementById('startggSlug').value.trim();
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.innerHTML = '';
  if (!texto) {
    resultsDiv.textContent = "❌ Ingresa un slug o link de torneo.";
    return;
  }
  resultsDiv.textContent = "Buscando...";
  // Extraer slug si viene en formato de link
  let slug = texto;
  const match = texto.match(/tournament\/([\w\-]+)/);
  if (match) slug = match[1];
  try {
    // Consulta eventos del torneo
    const res = await window.ipcRenderer.invoke('startgg-get-events', slug);
    if (res.error) {
      resultsDiv.textContent = "❌ " + res.error;
      return;
    }
    const torneo = res.tournamentName || res.tournament?.name || slug;
    const eventos = res.events || [];
    if (!eventos.length) {
      resultsDiv.innerHTML = `<b>Eventos de ${torneo}:</b><br>No se encontraron eventos para este torneo.`;
      return;
    }
    let html = `<b style="font-size:1.2em; color:#ffe8b2;">Eventos de ${torneo}:</b><br><div class='sgg-eventos-list' style='display:flex; flex-wrap:wrap; gap:2em; margin-top:1em;'>`;
    eventos.forEach(ev => {
      html += `
      <div class='sgg-event-card' style='
        background:#23243a;
        border:2px solid #8e44ad;
        border-radius:14px;
        box-shadow:0 2px 12px #0006;
        padding:1.2em 1.5em;
        min-width:260px;
        max-width:340px;
        margin-bottom:1em;
        transition:box-shadow .2s,transform .2s;
        position:relative;'>
        <div style='font-weight:700; font-size:1.18em; color:#ffe8b2; margin-bottom:0.3em;'>${ev.name}</div>
        <div style='font-size:0.98em; color:#aaa; margin-bottom:0.7em;'>ID: <span style='color:#ffe8b2;'>${ev.id}</span></div>
        <div style='display:flex; gap:0.7em; margin-bottom:0.2em;'>
          <button class='sb-btn sgg-btn' style='background:#27ae60; color:#fff; font-weight:600; border-radius:7px; box-shadow:0 1px 4px #0003;' title='Top 8' onclick='generarTop8StartGG(${ev.id}, "${ev.name.replace(/'/g, "\\'")}")'><i class="fa fa-trophy"></i> Top 8</button>
          <button class='sb-btn sgg-btn' style='background:#2980b9; color:#fff; font-weight:600; border-radius:7px; box-shadow:0 1px 4px #0003;' title='Bracket' onclick='mostrarBracketStartGG(${ev.id}, "${ev.name.replace(/'/g, "\\'")}")'><i class="fa fa-sitemap"></i> Bracket</button>
          <button class='sb-btn sgg-btn' style='background:#e67e22; color:#fff; font-weight:600; border-radius:7px; box-shadow:0 1px 4px #0003;' title='Matches' onclick='consultarMatchesStartGG(${ev.id}, "${ev.name.replace(/'/g, "\\'")}")'><i class="fa fa-gamepad"></i> Matches</button>
        </div>
      </div>`;
    });
    html += `</div>`;
    resultsDiv.innerHTML = html;
    // Agrega efecto hover a las tarjetas
    setTimeout(() => {
      document.querySelectorAll('.sgg-event-card').forEach(card => {
        card.addEventListener('mouseenter', () => {
          card.style.boxShadow = '0 4px 24px #8e44ad99';
          card.style.transform = 'scale(1.03)';
        });
        card.addEventListener('mouseleave', () => {
          card.style.boxShadow = '0 2px 12px #0006';
          card.style.transform = 'scale(1)';
        });
      });
    }, 100);
  } catch (e) {
    resultsDiv.textContent = "❌ Error: " + e.message;
  }
}

// Mostrar el bracket visual del evento (puedes personalizar)
async function mostrarBracketStartGG(eventId, eventName) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = `Cargando bracket de ${eventName}...`;
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-matches', eventId);
    if (res.error) {
      resultsDiv.textContent = '❌ ' + res.error;
      return;
    }
    if (!res.sets || res.sets.length === 0) {
      resultsDiv.innerHTML = `<h3>Bracket de ${eventName}</h3><div style='margin:1em 0;'>No se encontraron matches.</div>`;
      return;
    }
    // Filtrar solo los sets de Top 16 (rondas relevantes)
    // Puedes ajustar los nombres según el formato del torneo
    const top16Keywords = [
      'Top 16', 'Round of 16', 'Winners Round 1', 'Winners Round 2', 'Winners Quarter-Final', 'Winners Semi-Final', 'Winners Final',
      'Losers Round 1', 'Losers Round 2', 'Losers Round 3', 'Losers Quarter-Final', 'Losers Semi-Final', 'Losers Final',
      'Grand Final', 'Grand Final Reset', 'Final'
    ];
    // Si el torneo usa "Winners Round X" y "Losers Round X", filtra por esos nombres
    const setsTop16 = res.sets.filter(set => {
      const round = (set.fullRoundText || '').toLowerCase();
      // Si el nombre contiene alguna keyword de top16
      return top16Keywords.some(k => round.includes(k.toLowerCase()));
    });
    // Agrupar matches por tipo de ronda SOLO de Top 16
    const winners = {};
    const losers = {};
    const finals = {};
    setsTop16.forEach(set => {
      const round = set.fullRoundText || 'Ronda';
      const roundLower = round.toLowerCase();
      if (roundLower.includes('winner')) {
        if (!winners[round]) winners[round] = [];
        winners[round].push(set);
      } else if (roundLower.includes('loser')) {
        if (!losers[round]) losers[round] = [];
        losers[round].push(set);
      } else if (roundLower.includes('final')) {
        if (!finals[round]) finals[round] = [];
        finals[round].push(set);
      } else {
        // Si no se identifica, lo ponemos en winners por defecto
        if (!winners[round]) winners[round] = [];
        winners[round].push(set);
      }
    });
    let html = `<h3 style='color:#ffe8b2;'>Bracket de ${eventName} (Top 16)</h3>`;
    // Winners bracket
    if (Object.keys(winners).length) {
      html += `<div style='margin-top:1.5em; font-size:1.15em; color:#27ae60; font-weight:bold;'>Winners Bracket</div>`;
      Object.keys(winners).sort().forEach(round => {
        html += `<div style='margin:1.2em 0 0.7em 0; font-weight:bold; color:#8e44ad; font-size:1.1em;'>${round}</div>`;
        html += `<div style='display:flex; flex-wrap:wrap; gap:1em;'>`;
        winners[round].forEach(set => {
          const p1 = set.slots[0]?.entrant?.name || 'TBD';
          const p2 = set.slots[1]?.entrant?.name || 'TBD';
          const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
          const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
          html += `<div style='background:#23243a; border-radius:10px; box-shadow:0 2px 8px #0005; padding:0.7em 1.1em; min-width:220px;'>
            <div style='font-weight:600; color:#ffe8b2;'>${p1} <span style='color:#27ae60;'>${s1}</span> vs <span style='color:#e67e22;'>${s2}</span> ${p2}</div>
          </div>`;
        });
        html += `</div>`;
      });
    }
    // Losers bracket
    if (Object.keys(losers).length) {
      html += `<div style='margin-top:2em; font-size:1.15em; color:#e67e22; font-weight:bold;'>Losers Bracket</div>`;
      Object.keys(losers).sort().forEach(round => {
        html += `<div style='margin:1.2em 0 0.7em 0; font-weight:bold; color:#8e44ad; font-size:1.1em;'>${round}</div>`;
        html += `<div style='display:flex; flex-wrap:wrap; gap:1em;'>`;
        losers[round].forEach(set => {
          const p1 = set.slots[0]?.entrant?.name || 'TBD';
          const p2 = set.slots[1]?.entrant?.name || 'TBD';
          const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
          const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
          html += `<div style='background:#23243a; border-radius:10px; box-shadow:0 2px 8px #0005; padding:0.7em 1.1em; min-width:220px;'>
            <div style='font-weight:600; color:#ffe8b2;'>${p1} <span style='color:#27ae60;'>${s1}</span> vs <span style='color:#e67e22;'>${s2}</span> ${p2}</div>
          </div>`;
        });
        html += `</div>`;
      });
    }
    // Finals
    if (Object.keys(finals).length) {
      html += `<div style='margin-top:2em; font-size:1.15em; color:#ffe8b2; font-weight:bold;'>Finals</div>`;
      Object.keys(finals).sort().forEach(round => {
        html += `<div style='margin:1.2em 0 0.7em 0; font-weight:bold; color:#8e44ad; font-size:1.1em;'>${round}</div>`;
        html += `<div style='display:flex; flex-wrap:wrap; gap:1em;'>`;
        finals[round].forEach(set => {
          const p1 = set.slots[0]?.entrant?.name || 'TBD';
          const p2 = set.slots[1]?.entrant?.name || 'TBD';
          const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
          const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
          html += `<div style='background:#23243a; border-radius:10px; box-shadow:0 2px 8px #0005; padding:0.7em 1.1em; min-width:220px;'>
            <div style='font-weight:600; color:#ffe8b2;'>${p1} <span style='color:#27ae60;'>${s1}</span> vs <span style='color:#e67e22;'>${s2}</span> ${p2}</div>
          </div>`;
        });
        html += `</div>`;
      });
    }
    resultsDiv.innerHTML = html;
  } catch (e) {
    resultsDiv.textContent = `❌ Error: ${e.message}`;
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


// Generar Top 8 real usando standings de Start.gg y guardar en top8.json
async function generarTop8StartGG(eventId, eventName) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = 'Generando Top 8...';
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-standings', eventId);
    if (res.error) {
      resultsDiv.textContent = '❌ ' + res.error;
      return;
    }
    const jugadores = res.top8 || [];
    if (jugadores.length === 0) {
      resultsDiv.textContent = 'No se pudo generar el Top 8.';
      return;
    }
    // Leer usuarios.txt desde rutas
    let twitters = ["@_Aster_Laker", "@Ejemplo1", "@Ejemplo2", "@Ejemplo3"];
    try {
      const resUsuarios = await window.ipcRenderer.invoke('leer-usuarios-txt');
      if (resUsuarios.ok && Array.isArray(resUsuarios.usuarios) && resUsuarios.usuarios.length > 0) {
        twitters = resUsuarios.usuarios;
      }
    } catch {}
    // Construir datos para top8.json
    const top8Data = {
      evento: eventName || res.eventName || '',
      fecha: new Date().toISOString().slice(0, 10),
      top8: jugadores.map(j => ({ nombre: j.nombre, personaje: '', juego: '', twitter: '', final_rank: j.final_rank }))
    };
    // Guardar usando el handler save-json
    const resSave = await window.ipcRenderer.invoke('save-json', top8Data, 'top8');
    if (resSave.ok) {
      // Renderizar tabla editable de Top 8
      const personajes = ["akatsuki", "nanase", "hyde", "gordeau", "merkava", "hilda", "chaos", "vatista", "carmine", "seth", "yuzuriha", "eltnum", "wagner", "enkidu", "londrekia", "phonon", "byakuya", "sion", "akira", "kuon", "kaguya"];
      let html = `<table style='width:100%;border-collapse:collapse;background:#23243a;color:#fff;font-family:Montserrat,sans-serif;'>`;
      html += `<thead><tr style='background:#191b22;'>
        <th style='padding:0.7em 0.5em;'>Puesto</th>
        <th style='padding:0.7em 0.5em;'>Jugador</th>
        <th style='padding:0.7em 0.5em;'>Personaje</th>
        <th style='padding:0.7em 0.5em;'>Twitter</th>
      </tr></thead><tbody>`;
      top8Data.top8.forEach(j => {
        html += `<tr>
          <td style='text-align:center;font-weight:bold;'>${j.final_rank}</td>
          <td style='text-align:center;'>${j.nombre}</td>
          <td style='text-align:center;'>
            <select style='background:#23243a;color:#fff;border-radius:6px;padding:0.3em 0.7em;'>
              ${personajes.map(p => `<option${p==="akatsuki"?" selected":""}>${p}</option>`).join("")}
            </select>
          </td>
          <td style='text-align:center;'>
            <select style='background:#23243a;color:#fff;border-radius:6px;padding:0.3em 0.7em;'>
              ${twitters.map(t => `<option${t==twitters[0]?" selected":""}>${t}</option>`).join("")}
            </select>
          </td>
        </tr>`;
      });
      html += `</tbody></table>`;
      resultsDiv.innerHTML = `<div style='margin-bottom:1em;color:#27ae60;font-weight:bold;'>✅ Top 8 generado y guardado.</div>` + html;
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
  // Si el archivo no existe, créalo vacío antes de guardar el token
  const fsExists = await window.ipcRenderer.invoke('leer-apikey-json', apikeyPath);
  if (!fsExists || Object.keys(fsExists).length === 0) {
    await window.ipcRenderer.invoke('guardar-apikey-token', apikeyPath, '');
  }
  const ok = await window.ipcRenderer.invoke('guardar-apikey-token', apikeyPath, token);
  if (ok && ok.ok) {
    msg.textContent = `✅ Token guardado en: ${apikeyPath}`;
  } else {
    msg.textContent = `❌ Error al guardar el token en: ${apikeyPath}`;
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
// Cargar el token de Start.gg automáticamente al abrir la pestaña
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('startggToken')) {
    cargarStartggToken();
  }
});

async function consultarMatchesStartGG(eventId, eventName) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = "Buscando matches del evento...";
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-matches', eventId);
    // Debug: mostrar cantidad y contenido de sets recibidos
    console.log('Respuesta startgg-get-matches:', res);
    if (res.error) {
      resultsDiv.textContent = "❌ " + res.error;
      return;
    }
    if (res.ok && res.sets && res.sets.length > 0) {
      resultsDiv.innerHTML = `<div style='color:#ffe8b2; font-size:0.95em; margin-bottom:0.7em;'>Recibidos ${res.sets.length} matches.</div>`;
      // Mostrar todos los matches recibidos, sin filtrar
      let html = '';
      const matchButtonStyle = `
        display:flex; flex-direction:column; align-items:flex-start; justify-content:center;
        background:#23243a; color:#ffe8b2; border-radius:8px; border:1px solid #8e44ad;
        box-shadow:0 1px 4px #0003; padding:0.35em 0.5em; margin:0.12em 0;
        font-size:0.92em; font-family:Montserrat,sans-serif; font-weight:500;
        transition:background .18s,box-shadow .18s;
        width:100%; min-width:0; cursor:pointer; height:70px; max-height:70px; overflow:hidden;
      `;
      const gridStyle = `
        display:flex; flex-direction:column; gap:0.18em; margin-top:0.5em; margin-bottom:0.5em;
      `;
      function renderMatrix(matchesArr) {
        let matrixHtml = '';
        for (let i = 0; i < matchesArr.length; i += 3) {
          matrixHtml += `<div style='display:flex; flex-direction:row; gap:0.18em;'>`;
          for (let j = 0; j < 3; j++) {
            const set = matchesArr[i + j];
            if (!set) continue;
            const p1 = set.slots[0]?.entrant?.name || 'TBD';
            const p2 = set.slots[1]?.entrant?.name || 'TBD';
            const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
            const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
            const round = set.fullRoundText || '';
            matrixHtml += `<button class="sb-btn" style="${matchButtonStyle}"
              onclick="enviarMatchAlScoreboard('${escapeQuotes(p1)}','${escapeQuotes(p2)}','${s1}','${s2}','${escapeQuotes(round)}')"
              title="${round}">
              <span style='font-size:0.98em;font-weight:bold;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'>${p1} <span style='color:#27ae60;'>${s1}</span> vs <span style='color:#e67e22;'>${s2}</span> ${p2}</span>
              <span style='font-size:0.92em;color:#aaa;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'><b>${round}</b></span>
            </button>`;
          }
          matrixHtml += `</div>`;
        }
        return matrixHtml;
      }
      html += `<b>Matches de ${eventName} (Todos):</b><div style='${gridStyle}'>` +
        renderMatrix(res.sets) + `</div>`;
      resultsDiv.innerHTML += html;
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