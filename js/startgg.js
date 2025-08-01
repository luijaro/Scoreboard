// Nueva función para buscar y mostrar eventos de un torneo Start.gg
async function buscarStartGG() {
  const slugInput = document.getElementById('startggSlug');
  // Asegura que el input esté habilitado y editable
  if (slugInput) {
    slugInput.removeAttribute('readonly');
    slugInput.removeAttribute('disabled');
  }
  const texto = slugInput ? slugInput.value.trim() : '';
  // Guardar el slug en localStorage
  if (texto) {
    localStorage.setItem('ultimoStartggSlug', texto);
  }
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
    // Consultar el estado de cada evento
    // Usar Promise.all para obtener el estado antes de renderizar
    const eventosConEstado = await Promise.all(eventos.map(async ev => {
      let estadoEv = '';
      try {
        const evRes = await window.ipcRenderer.invoke('startgg-get-event-state', ev.id);
        const evState = evRes?.state || evRes?.event?.state || evRes?.status || '';
        if (evState === 'ACTIVE') estadoEv = '<span style="color:#27ae60;font-weight:bold;">En progreso</span>';
        else if (evState === 'COMPLETED') estadoEv = '<span style="color:#e67e22;font-weight:bold;">Terminado</span>';
        else if (!evState || evState === '?' || evState === 'null' || evState === 'undefined') estadoEv = '<span style="color:#aaa;">Desconocido</span>';
        else estadoEv = `<span style="color:#aaa;">${evState}</span>`;
      } catch (e) {
        estadoEv = '<span style="color:#aaa;">Desconocido</span>';
      }
      return `
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
        <div style='font-size:0.98em; margin-bottom:0.7em;'>Estado: ${estadoEv}</div>
        <div style='display:flex; gap:0.7em; margin-bottom:0.2em;'>
          <button class='sb-btn sgg-btn' style='background:#27ae60; color:#fff; font-weight:600; border-radius:7px; box-shadow:0 1px 4px #0003;' title='Top 8' onclick='generarTop8StartGG(${ev.id}, "${ev.name.replace(/'/g, "\\'")}")'><i class="fa fa-trophy"></i> Top 8</button>
          <button class='sb-btn sgg-btn' style='background:#2980b9; color:#fff; font-weight:600; border-radius:7px; box-shadow:0 1px 4px #0003;' title='Bracket' onclick='guardarBracketStartGG(${ev.id}, "${ev.name.replace(/'/g, "\\'")}")'><i class="fa fa-sitemap"></i> Bracket</button>
          <button class='sb-btn sgg-btn' style='background:#e67e22; color:#fff; font-weight:600; border-radius:7px; box-shadow:0 1px 4px #0003;' title='Matches' onclick='consultarMatchesStartGG(${ev.id}, "${ev.name.replace(/'/g, "\\'")}")'><i class="fa fa-gamepad"></i> Matches</button>
        </div>
      </div>`;
    }));
    html += eventosConEstado.join('');
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


// Guardar el bracket directamente al hacer clic en el botón Bracket
async function guardarBracketStartGG(eventId, eventName) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = `Guardando bracket de ${eventName}...`;
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-matches', eventId);
    if (res.error) {
      resultsDiv.textContent = '❌ ' + res.error;
      return;
    }
    if (!res.sets || res.sets.length === 0) {
      resultsDiv.textContent = `No se encontraron matches para guardar.`;
      return;
    }
    // Usa el nombre del torneo actual y la fecha actual
    const torneo = eventName || '';
    const fecha = new Date().toLocaleDateString('es-CL');
    await guardarBracketEnJson(torneo, fecha, res.sets);
    resultsDiv.textContent = `✅ Bracket guardado correctamente en bracket.json`;
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
    
    // Obtener personajes del juego seleccionado en scoreboard
    let personajes = ["akatsuki", "nanase", "hyde", "gordeau", "merkava", "hilda", "chaos", "vatista", "carmine", "seth", "yuzuriha", "eltnum", "wagner", "enkidu", "londrekia", "phonon", "byakuya", "sion", "akira", "kuon", "kaguya"];
    try {
      const gameSelect = document.getElementById('gameSel');
      if (gameSelect && gameSelect.value) {
        const resPersonajes = await window.ipcRenderer.invoke('get-personajes', gameSelect.value);
        if (resPersonajes.personajes && resPersonajes.personajes.length > 0) {
          personajes = resPersonajes.personajes.map(p => p.nombre);
        }
      }
    } catch (e) {
      console.warn('Error obteniendo personajes del juego seleccionado:', e);
    }
    
    // Construir datos para top8.json, prellenando personaje y twitter
    const personajeDefault = personajes[0] || '';
    const twitterDefault = twitters[0] || '';
    const juegoDefault = document.getElementById('gameSel')?.value || '';
    const eventoNombre = eventName || res.eventName || '';
    window.top8EventoActual = eventoNombre; // Guardar globalmente para el guardado posterior
    const top8Data = {
      evento: eventoNombre,
      fecha: new Date().toISOString().slice(0, 10),
      top8: jugadores.map(j => ({
        nombre: j.nombre,
        personaje: personajeDefault,
        juego: juegoDefault,
        twitter: twitterDefault,
        final_rank: j.final_rank
      }))
    };
    // Guardar usando el handler save-json
    const resSave = await window.ipcRenderer.invoke('save-json', top8Data, 'top8');
    if (resSave.ok) {
      // Renderizar tabla editable de Top 8
      let html = `<div style='margin-bottom:1em;color:#27ae60;font-weight:bold;'>✅ Top 8 generado y guardado.</div>`;
      html += `<table id='top8Table' style='width:100%;border-collapse:collapse;background:#23243a;color:#fff;font-family:Montserrat,sans-serif;'>`;
      html += `<thead><tr style='background:#191b22;'>
        <th style='padding:0.7em 0.5em;'>Puesto</th>
        <th style='padding:0.7em 0.5em;'>Jugador</th>
        <th style='padding:0.7em 0.5em;'>Personaje</th>
        <th style='padding:0.7em 0.5em;'>Twitter</th>
      </tr></thead><tbody>`;
      top8Data.top8.forEach((j, index) => {
        html += `<tr>
          <td style='text-align:center;font-weight:bold;'>${j.final_rank}</td>
          <td style='text-align:center;'>${j.nombre}</td>
          <td style='text-align:center;'>
            <select id='char${index}' style='background:#23243a;color:#fff;border-radius:6px;padding:0.3em 0.7em;'>
              ${personajes.map(p => `<option value="${p}"${p===personajes[0]?" selected":""}>${p}</option>`).join("")}
            </select>
          </td>
          <td style='text-align:center;'>
            <select id='twitter${index}' style='background:#23243a;color:#fff;border-radius:6px;padding:0.3em 0.7em;'>
              ${twitters.map(t => `<option value="${t}"${t===twitters[0]?" selected":""}>${t}</option>`).join("")}
            </select>
          </td>
        </tr>`;
      });
      html += `</tbody></table>`;
      html += `<div style='margin-top:1em;display:flex;justify-content:space-between;gap:1em;'>
        <button class='sb-btn' style='background:#8e44ad;color:#fff;font-weight:bold;border-radius:7px;padding:0.7em 1.5em;' onclick='actualizarTop8StartGG("${eventId}", "${eventName.replace(/'/g, "\\'")}");'>
          <i class="fa fa-refresh"></i> Actualizar Top 8
        </button>
        <button class='sb-btn' style='background:#27ae60;color:#fff;font-weight:bold;border-radius:7px;padding:0.7em 1.5em;' onclick='guardarTop8Actualizado();'>
          <i class="fa fa-save"></i> Guardar Cambios
        </button>
      </div>`;
      resultsDiv.innerHTML = html;
    } else {
      resultsDiv.textContent = '❌ Error al guardar Top 8.';
    }
  } catch (e) {
    resultsDiv.textContent = '❌ Error: ' + e.message;
  }
}

// Nueva función para actualizar el Top 8 (regenerarlo)
async function actualizarTop8StartGG(eventId, eventName) {
  if (confirm('¿Estás seguro de que quieres actualizar el Top 8? Esto reemplazará los datos actuales.')) {
    await generarTop8StartGG(eventId, eventName);
  }
}

// Nueva función para guardar los cambios del Top 8 editado
async function guardarTop8Actualizado() {
  try {
    const tabla = document.getElementById('top8Table');
    if (!tabla) {
      alert('❌ No se encontró la tabla del Top 8');
      return;
    }
    console.log('[guardarTop8Actualizado] Tabla encontrada:', tabla);
    console.log('[guardarTop8Actualizado] HTML de la tabla:', tabla.outerHTML.substring(0, 500));
    
    // Buscar directamente las filas del tbody
    const filas = tabla.querySelectorAll('tbody tr');
    console.log('[guardarTop8Actualizado] Filas encontradas:', filas.length);
    
    // También intentar con un selector más específico
    const filasAlternativo = document.querySelectorAll('#top8Table tbody tr');
    console.log('[guardarTop8Actualizado] Filas alternativo:', filasAlternativo.length);
    
    if (!filas.length && !filasAlternativo.length) {
      alert('❌ No hay filas en la tabla del Top 8. No se guardará el archivo.');
      return;
    }
    
    // Usar las filas que funcionen
    const filasFinales = filas.length > 0 ? filas : filasAlternativo;
    // Recuperar el nombre del evento de la variable global o del JSON actual
    let eventoNombre = window.top8EventoActual || '';
    if (!eventoNombre) {
      // Intentar leer el evento del JSON actual
      try {
        const resLoad = await window.ipcRenderer.invoke('load-json', 'top8');
        if (resLoad.ok && resLoad.data && resLoad.data.evento) {
          eventoNombre = resLoad.data.evento;
        }
      } catch {}
    }
    const top8Data = {
      evento: eventoNombre,
      fecha: new Date().toISOString().slice(0, 10),
      top8: []
    };
    filasFinales.forEach((fila, index) => {
      const puesto = fila.cells[0].textContent;
      const jugador = fila.cells[1].textContent;
      const personajeSelect = fila.querySelector(`#char${index}`);
      const twitterSelect = fila.querySelector(`#twitter${index}`);
      
      console.log(`[guardarTop8Actualizado] Fila ${index}:`, {
        puesto,
        jugador,
        personajeSelect: personajeSelect?.value,
        twitterSelect: twitterSelect?.value
      });
      
      if (personajeSelect && twitterSelect) {
        top8Data.top8.push({
          nombre: jugador,
          personaje: personajeSelect.value,
          juego: document.getElementById('gameSel')?.value || '',
          twitter: twitterSelect.value,
          final_rank: parseInt(puesto)
        });
      } else {
        console.warn(`[guardarTop8Actualizado] No se encontraron selects para fila ${index}`);
      }
    });
    // Log para depuración
    console.log('[guardarTop8Actualizado] Datos a guardar:', top8Data);
    // Guardar los datos actualizados
    const resSave = await window.ipcRenderer.invoke('save-json', top8Data, 'top8');
    console.log('[guardarTop8Actualizado] Respuesta del backend:', resSave);
    if (resSave.ok) {
      alert('✅ Top 8 actualizado y guardado correctamente');
    } else {
      alert('❌ Error al guardar Top 8 actualizado');
    }
  } catch (e) {
    alert('❌ Error: ' + e.message);
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
  // Cargar el último slug buscado en el input
  const ultimoSlug = localStorage.getItem('ultimoStartggSlug');
  if (ultimoSlug && document.getElementById('startggSlug')) {
    document.getElementById('startggSlug').value = ultimoSlug;
  }
});

async function consultarMatchesStartGG(eventId, eventName) {
  const resultsDiv = document.getElementById('startggResults');
  resultsDiv.textContent = "Buscando brackets del evento...";
  try {
    const res = await window.ipcRenderer.invoke('startgg-get-matches', eventId);
    console.log('Respuesta startgg-get-matches:', res);
    if (res.error) {
      resultsDiv.textContent = "❌ " + res.error;
      return;
    }
    if (res.ok && res.sets && res.sets.length > 0) {
      // Primero filtrar todos los matches en progreso con dos luchadores
      const matchesEnProgreso = res.sets.filter(set => {
        const p1 = set.slots[0]?.entrant?.name || 'TBD';
        const p2 = set.slots[1]?.entrant?.name || 'TBD';
        const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
        const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
        
        const tieneDosLuchadores = p1 !== 'TBD' && p2 !== 'TBD';
        const sinGanador = !set.winnerId && !set.winner_id;
        const scoresIncompletos = s1 === '' || s2 === '' || s1 === null || s2 === null;
        
        return tieneDosLuchadores && (sinGanador || scoresIncompletos);
      });
      
      if (matchesEnProgreso.length === 0) {
        resultsDiv.innerHTML = `<div style='color:#e67e22; font-size:0.95em;'>No hay matches en progreso con dos luchadores en este evento.</div>`;
        return;
      }
      
      // Extraer brackets únicos solo de los matches en progreso
      const bracketsMap = new Map();
      matchesEnProgreso.forEach(set => {
        const fase = set.fase || 'Sin fase';
        const round = set.fullRoundText || 'Sin ronda';
        
        // Determinar categoría principal basada en el texto de la ronda y fase
        let category = '';
        const roundLower = round.toLowerCase();
        const faseLower = fase.toLowerCase();
        const combined = `${faseLower} ${roundLower}`;
        
        if (combined.includes('grand final') || combined.includes('grandfinal')) {
          category = 'Grand Final';
        } else if (combined.includes('losers final') || combined.includes('loser final')) {
          category = 'Losers Final';
        } else if (combined.includes('winners final') || combined.includes('winner final')) {
          category = 'Winners Final';
        } else if (combined.includes('top 8') || combined.includes('top8') || 
                   combined.includes('quarter') || combined.includes('semifinals') ||
                   combined.includes('semi final')) {
          category = 'Top 8';
        } else if (combined.includes('top 16') || combined.includes('top16')) {
          category = 'Top 16';
        } else if (combined.includes('top 32') || combined.includes('top32')) {
          category = 'Top 32';
        } else if (combined.includes('top 64') || combined.includes('top64')) {
          category = 'Top 64';
        } else if (combined.includes('pools') || combined.includes('pool')) {
          category = 'Pools';
        } else if (combined.includes('bracket')) {
          category = 'Brackets';
        } else {
          // Para otras rondas, usar el nombre de la fase o ronda más descriptiva
          category = fase.length > round.length ? fase : round;
        }
        
        const key = `${category}|${fase}|${round}`;
        
        if (!bracketsMap.has(key)) {
          bracketsMap.set(key, {
            category: category,
            fase: fase,
            round: round,
            displayName: fase === round ? fase : `${fase} - ${round}`,
            count: 0
          });
        }
        bracketsMap.get(key).count++;
      });
      
      if (bracketsMap.size === 0) {
        resultsDiv.innerHTML = `<div style='color:#e67e22; font-size:0.95em;'>No se encontraron fases con matches en progreso en este evento.</div>`;
        return;
      }
      
      // Ordenar categorías por importancia
      const categoryOrder = ['Grand Final', 'Losers Final', 'Winners Final', 'Top 8', 'Top 16', 'Top 32', 'Top 64', 'Brackets', 'Pools'];
      const sortedBrackets = Array.from(bracketsMap.entries()).sort((a, b) => {
        const orderA = categoryOrder.indexOf(a[1].category);
        const orderB = categoryOrder.indexOf(b[1].category);
        
        if (orderA === -1 && orderB === -1) return a[1].category.localeCompare(b[1].category);
        if (orderA === -1) return 1;
        if (orderB === -1) return -1;
        return orderA - orderB;
      });
      
      // Mostrar selector de brackets
      let html = `
        <div style='color:#ffe8b2; font-size:1.1em; margin-bottom:1em; font-weight:bold;'>
          📋 Fases con matches en progreso (${matchesEnProgreso.length} total):
        </div>
        <div style='margin-bottom:1em;'>
          <select id='bracketSelector' style='
            background:#23243a; color:#ffe8b2; border:1px solid #8e44ad; border-radius:6px;
            padding:0.5em 1em; font-size:1em; width:100%; max-width:400px;
          '>
            <option value=''>-- Selecciona una fase --</option>
      `;
      
      sortedBrackets.forEach(([key, bracket]) => {
        html += `<option value='${key}'>${bracket.category} (${bracket.count} matches)</option>`;
      });
      
      html += `
          </select>
          <button class='sb-btn' style='
            background:#8e44ad; color:#fff; font-weight:bold; margin-left:1em;
            border-radius:7px; padding:0.5em 1.5em;
          ' onclick='mostrarMatchesDeBracket(${eventId}, "${eventName}")'>
            <i class="fa fa-eye"></i> Ver Matches
          </button>
          <button class='sb-btn' style='
            background:#27ae60; color:#fff; font-weight:bold; margin-left:0.5em;
            border-radius:7px; padding:0.5em 1.2em;
          ' onclick='actualizarMatches(${eventId}, "${eventName}")' 
          title='Actualizar matches en tiempo real'>
            <i class="fa fa-refresh"></i> Actualizar
          </button>
        </div>
        <div id='bracketMatches'></div>
      `;
      
      resultsDiv.innerHTML = html;
      
      // Guardar los sets en una variable global para acceso posterior
      window.currentEventSets = res.sets;
      
    } else {
      resultsDiv.innerHTML = `<div style='color:#e67e22; font-size:0.95em;'>No se encontraron matches en este evento.</div>`;
    }
  } catch (error) {
    console.error('Error consultando matches:', error);
    resultsDiv.textContent = "❌ Error al consultar matches: " + error.message;
  }
}

// Nueva función para mostrar matches de un bracket específico
function mostrarMatchesDeBracket(eventId, eventName) {
  const selector = document.getElementById('bracketSelector');
  const selectedBracket = selector.value;
  
  if (!selectedBracket) {
    alert('Por favor selecciona una fase.');
    return;
  }
  
  const [category, fase, round] = selectedBracket.split('|');
  const setsDelBracket = window.currentEventSets.filter(set => {
    const setFase = set.fase || 'Sin fase';
    const setRound = set.fullRoundText || 'Sin ronda';
    return setFase === fase && setRound === round;
  });
  
  // Filtrar solo matches con dos luchadores y en progreso
  const matchesEnProgreso = setsDelBracket.filter(set => {
    const p1 = set.slots[0]?.entrant?.name || 'TBD';
    const p2 = set.slots[1]?.entrant?.name || 'TBD';
    const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
    const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
    
    const tieneDosLuchadores = p1 !== 'TBD' && p2 !== 'TBD';
    const sinGanador = !set.winnerId && !set.winner_id;
    const scoresIncompletos = s1 === '' || s2 === '' || s1 === null || s2 === null;
    
    return tieneDosLuchadores && (sinGanador || scoresIncompletos);
  });
  
  const bracketMatchesDiv = document.getElementById('bracketMatches');
  
  if (matchesEnProgreso.length === 0) {
    bracketMatchesDiv.innerHTML = `
      <div style='color:#e67e22; font-size:0.95em; margin-top:1em; padding:1em; background:#332222; border-radius:8px;'>
        📋 No hay matches en progreso con dos luchadores en ${category}.
      </div>
    `;
    return;
  }
  
  let html = `
    <div style='color:#ffe8b2; font-size:1em; margin:1em 0 0.5em 0; font-weight:bold;'>
      🥊 Matches de ${category} (${matchesEnProgreso.length} en progreso):
    </div>
    <div style='margin-bottom:1em;'>
      <input type='text' id='matchSearchInput' placeholder='🔍 Buscar match por nombre de jugador...' 
        style='
          width:100%; max-width:400px; padding:0.7em 1em; border-radius:8px; 
          border:1px solid #8e44ad; background:#23243a; color:#ffe8b2;
          font-size:0.95em; font-family:Montserrat,sans-serif;
        '
        oninput='filtrarMatches()'
      />
    </div>
    <div id='matchesGrid' style='display:grid; grid-template-columns:repeat(3, 1fr); gap:0.8em; margin-top:0.8em;'>
  `;
  
  matchesEnProgreso.forEach((set, index) => {
    const p1 = set.slots[0]?.entrant?.name || 'TBD';
    const p2 = set.slots[1]?.entrant?.name || 'TBD';
    const s1 = set.slots[0]?.standing?.stats?.score?.value ?? '';
    const s2 = set.slots[1]?.standing?.stats?.score?.value ?? '';
    const round = set.fullRoundText || '';
    const faseOriginal = set.fase || '';
    
    // Determinar si se debe agregar " - Pools" al texto del round
    let roundDisplay = round;
    if (faseOriginal) {
      const faseOriginalLower = faseOriginal.toLowerCase();
      // Si la fase original es Round 1, Round 2, Bracket, etc. (no Top 8, Top 16, etc.)
      if (faseOriginalLower.includes('round') || 
          faseOriginalLower.includes('bracket') ||
          (faseOriginalLower.includes('pool') && !faseOriginalLower.includes('top'))) {
        roundDisplay = round + ' - Pools';
      }
    }
    
    html += `
      <button class="sb-btn match-item" data-index="${index}" data-players="${p1.toLowerCase()} ${p2.toLowerCase()}" style='
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        background:#23243a; color:#ffe8b2; border-radius:8px; border:1px solid #8e44ad;
        box-shadow:0 1px 4px #0003; padding:0.8em 0.6em; height:auto; min-height:80px;
        font-size:0.85em; font-family:Montserrat,sans-serif; font-weight:500;
        transition:background .18s,box-shadow .18s; cursor:pointer; text-align:center;
      '
      onclick="enviarMatchAlScoreboard('${escapeQuotes(p1)}','${escapeQuotes(p2)}','${s1}','${s2}','${escapeQuotes(roundDisplay)}','${escapeQuotes(faseOriginal)}')"
      onmouseover="this.style.background='#2a2b42'" 
      onmouseout="this.style.background='#23243a'"
      title="Enviar al scoreboard">
        <div style='font-weight:bold; margin-bottom:0.4em; font-size:0.95em; line-height:1.2;'>
          ${p1} <span style='color:#27ae60;'>${s1}</span> vs <span style='color:#e67e22;'>${s2}</span> ${p2}
        </div>
        <div style='font-size:0.8em; color:#aaa; line-height:1.1;'>
          ${roundDisplay}
        </div>
      </button>
    `;
  });
  
  html += '</div>';
  bracketMatchesDiv.innerHTML = html;
}

// Función para filtrar matches en tiempo real
function filtrarMatches() {
  const searchInput = document.getElementById('matchSearchInput');
  const matchItems = document.querySelectorAll('.match-item');
  
  if (!searchInput || !matchItems.length) return;
  
  const searchTerm = searchInput.value.toLowerCase().trim();
  let visibleCount = 0;
  
  matchItems.forEach(item => {
    const players = item.getAttribute('data-players') || '';
    const isVisible = searchTerm === '' || players.includes(searchTerm);
    
    if (isVisible) {
      item.style.display = 'flex';
      visibleCount++;
    } else {
      item.style.display = 'none';
    }
  });
  
  // Actualizar contador de matches visibles
  const titleDiv = document.querySelector('#bracketMatches div:first-child');
  if (titleDiv && searchTerm !== '') {
    const originalText = titleDiv.textContent;
    const baseText = originalText.split('(')[0];
    titleDiv.textContent = `${baseText}(${visibleCount} mostrados de ${matchItems.length})`;
  } else if (titleDiv && searchTerm === '') {
    const originalText = titleDiv.textContent;
    const baseText = originalText.split('(')[0];
    titleDiv.textContent = `${baseText}(${matchItems.length} en progreso)`;
  }
}

// Función para actualizar matches en tiempo real
async function actualizarMatches(eventId, eventName) {
  const updateBtn = document.querySelector('button[onclick*="actualizarMatches"]');
  const originalText = updateBtn.innerHTML;
  
  // Mostrar estado de carga
  updateBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Actualizando...';
  updateBtn.disabled = true;
  updateBtn.style.background = '#6c757d';
  
  try {
    // Volver a consultar los matches del evento
    await consultarMatchesStartGG(eventId, eventName);
    
    // Si hay un bracket seleccionado, mostrar automáticamente sus matches actualizados
    const bracketSelector = document.getElementById('bracketSelector');
    if (bracketSelector && bracketSelector.value) {
      mostrarMatchesDeBracket(eventId, eventName);
    }
    
    // Mostrar mensaje de éxito temporal
    updateBtn.innerHTML = '<i class="fa fa-check"></i> Actualizado';
    updateBtn.style.background = '#27ae60';
    
    setTimeout(() => {
      updateBtn.innerHTML = originalText;
      updateBtn.style.background = '#27ae60';
      updateBtn.disabled = false;
    }, 2000);
    
  } catch (error) {
    console.error('Error actualizando matches:', error);
    
    // Mostrar error temporal
    updateBtn.innerHTML = '<i class="fa fa-exclamation-triangle"></i> Error';
    updateBtn.style.background = '#e74c3c';
    
    setTimeout(() => {
      updateBtn.innerHTML = originalText;
      updateBtn.style.background = '#27ae60';
      updateBtn.disabled = false;
    }, 3000);
  }
}

// Helper para escapar comillas simples/dobles en nombres
function escapeQuotes(str) {
  return (str || '').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function enviarMatchAlScoreboard(p1, p2, s1, s2, round, fase) {
  showTab(0);

  // Extraer tag y nombre si existe el delimitador '|'
  function splitTagName(str) {
    if (!str) return { tag: '', name: str };
    const parts = str.split('|');
    if (parts.length === 2) {
      return { tag: parts[0].trim(), name: parts[1].trim() };
    }
    return { tag: '', name: str.trim() };
  }
  const p1Data = splitTagName(p1);
  const p2Data = splitTagName(p2);

  document.getElementById('p1NameInput').value = p1Data.name;
  document.getElementById('p2NameInput').value = p2Data.name;
  document.getElementById('p1TagInput').value = p1Data.tag;
  document.getElementById('p2TagInput').value = p2Data.tag;
  
  // Para matches en progreso, establecer scores como 0-0
  document.getElementById('p1Score').textContent = '0';
  document.getElementById('p2Score').textContent = '0';
  
  // Siempre actualizar el campo de ronda con la información de Start.gg
  const sbRoundElement = document.getElementById('sbRound');
  sbRoundElement.value = round;

  document.getElementById('p1Name').textContent = p1Data.name;
  document.getElementById('p2Name').textContent = p2Data.name;

  // Guarda el round y la fase en variables globales para que el Scoreboard los incluya
  window.currentRoundName = round;
  window.currentFaseOriginal = fase || '';

  // Llama a la función global del Scoreboard para guardar todos los datos
  if (typeof guardarScoreboard === "function") guardarScoreboard();
}

// === GUARDAR BRACKET BUTTON ===
document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnGuardarBracket');
  if (btn) {
    btn.addEventListener('click', async () => {
      // Usa el nombre del torneo actual y la fecha actual
      const torneo = window.nombreTorneoActual || '';
      const fecha = new Date().toLocaleDateString('es-CL');
      // Busca los matches cargados en la última consulta
      if (!window.ultimoStartggSets || !window.ultimoStartggSets.length) {
        alert('No hay matches cargados para guardar.');
        return;
      }
      await guardarBracketEnJson(torneo, fecha, window.ultimoStartggSets);
    });
  }
});

// Guarda el bracket en bracket.json
async function guardarBracketEnJson(torneo, fecha, sets) {



  // Obtener los phaseId únicos de los sets
  const phaseIdSet = new Set();
  sets.forEach(set => {
    if (set.phaseId || set.phase_id) phaseIdSet.add(set.phaseId || set.phase_id);
  });
  const phaseIds = Array.from(phaseIdSet);

  // Log para depuración
  console.log('[Bracket] phaseIds:', phaseIds);

  // Consultar los nombres de fase por phaseId vía IPC
  let phaseNames = {};
  if (phaseIds.length > 0) {
    try {
      phaseNames = await window.ipcRenderer.invoke('startgg-get-phase-name', phaseIds);
      console.log('[Bracket] phaseNames:', phaseNames);
    } catch (e) {
      console.warn('[Bracket] Error consultando nombres de fase:', e);
      phaseNames = {};
    }
  }

  // Arma los matches y asigna solo el nombre real de la fase
  const matches = sets.map(set => {
    const player1_name = set.player1_name || set.slots?.[0]?.entrant?.name || 'TBD';
    const player2_name = set.player2_name || set.slots?.[1]?.entrant?.name || 'TBD';
    const player1_id = set.player1_id || set.slots?.[0]?.entrant?.id || null;
    const player2_id = set.player2_id || set.slots?.[1]?.entrant?.id || null;
    const player1_sc = set.player1_sc ?? set.slots?.[0]?.standing?.stats?.score?.value ?? '';
    const player2_sc = set.player2_sc ?? set.slots?.[1]?.standing?.stats?.score?.value ?? '';
    const round_name = set.round_name || set.fullRoundText || '';
    const phaseId = set.phaseId || set.phase_id;
    // Preferir el campo 'fase' si viene del backend, si no, usar phaseNames
    let fase = '';
    if (set.fase) {
      fase = set.fase;
    } else if (phaseId && phaseNames[phaseId]) {
      fase = phaseNames[phaseId];
    } else if (phaseId) {
      console.warn(`[Bracket] No se encontró nombre de fase para phaseId: ${phaseId}`);
    }
    let match = {
      id: set.id,
      player1_id,
      player2_id,
      player1_name,
      player2_name,
      round: set.round ?? '',
      scores_csv: `${player1_sc}-${player2_sc}`,
      winner_id: set.winner_id ?? set.winnerId ?? null,
      player1_sc,
      player2_sc,
      round_name,
      fase
    };
    return match;
  });

  // Construye el diccionario de participantes
  const participantes = {};
  matches.forEach(m => {
    if (m.player1_id) participantes[m.player1_id] = m.player1_name;
    if (m.player2_id) participantes[m.player2_id] = m.player2_name;
  });
  const bracketData = { torneo, fecha, matches, participantes };
  const res = await window.ipcRenderer.invoke('save-bracket-json', bracketData);
  if (res.ok) {
    alert('Bracket guardado correctamente en bracket.json');
  } else {
    alert('Error al guardar bracket: ' + res.error);
  }
}