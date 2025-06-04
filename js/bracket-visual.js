window.addEventListener('DOMContentLoaded', () => {
  const btn = document.querySelector('#tab-bracket .sb-btn');
  if (btn) btn.onclick = renderBracketVisual;
});

async function renderBracketVisual() {
  const slug = document.getElementById('tournamentBracket').value.trim();
  const container = document.getElementById('bracket-visual-container');
  container.innerHTML = '';
  if (!slug) {
    container.innerHTML = '<div style="color:#ffb3b3;text-align:center;">Selecciona un torneo primero.</div>';
    return;
  }

  // Obtén matches y participantes usando el endpoint global
  const res = await window.ipcRenderer.invoke('get-all-matches-and-participants', slug);
  if (!res.ok || !res.matches || !res.matches.length) {
    container.innerHTML = '<div style="color:#ffb3b3;text-align:center;">No se encontraron matches para este torneo.</div>';
    return;
  }

  // Mapea IDs a nombres
  const participantes = {};
  (res.participantes || []).forEach(p => {
    participantes[p.id] = p.name;
  });

  // Detecta el número de ronda más alto en winners
  const winnerRounds = res.matches.filter(m => m.round > 0).map(m => m.round);
  const maxWinnerRound = Math.max(...winnerRounds);
  const rondas = {};
  res.matches.forEach(m => {
    const ronda = Number(m.round);
    if (!rondas[ronda]) rondas[ronda] = [];
    rondas[ronda].push(m);
  });

  // Detecta Grand Final y Reset
  const grandFinalMatches = (rondas[maxWinnerRound] || []).filter(m => {
    if (!m.scores_csv) return false;
    const [s1, s2] = m.scores_csv.split('-').map(s => Number(s.trim() || '0'));
    return s1 > 0 || s2 > 0;
  });

  // Asigna round_name a TODOS los matches
  const losersRounds = Object.keys(rondas).map(Number).filter(r => r < 0).sort((a, b) => a - b);
  const matchesAll = res.matches.map(m => {
    let p1sc = "0", p2sc = "0";
    if (m.scores_csv && m.scores_csv.includes('-')) {
      [p1sc, p2sc] = m.scores_csv.split('-').map(s => s.trim());
    }
    let round_name = "";
    if (m.round === maxWinnerRound) {
      if (grandFinalMatches.length === 2) {
        const idx = rondas[maxWinnerRound].findIndex(x => x.id === m.id);
        round_name = idx === 0 ? "Grand Final" : "Grand Final Reset";
      } else {
        round_name = "Grand Final";
      }
    } else if (m.round === maxWinnerRound - 1) {
      round_name = "Winners Final";
    } else if (m.round === maxWinnerRound - 2) {
      round_name = "Winners Semis";
    } else if (m.round < 0) {
      // Losers: ordena de menos a más negativo (más antiguo a más reciente)
      const sortedLosers = losersRounds.slice().sort((a, b) => a - b);
      const idx = sortedLosers.indexOf(m.round);
      const losersNames = [
        "Losers Finals",
        "Losers Semis",
        "Losers Quarters",
        "Losers Top 8"
      ];
      // El más negativo (idx 0) es "Losers Finals", el más cercano a 0 es "Losers Top 8"
      round_name = losersNames[idx] || `Losers Ronda ${Math.abs(m.round)}`;
    } else {
      round_name = `Ronda ${m.round}`;
    }
    return {
      ...m,
      player1_sc: p1sc,
      player2_sc: p2sc,
      round_name
    };
  });

  // Agrupa matches por round_name
  const bloquesTop8 = [
    "Winners Semis",
    "Winners Final",
    "Grand Final",
    "Grand Final Reset",
    "Losers Top 8",
    "Losers Quarters",
    "Losers Semis",
    "Losers Finals"
  ];
  const matchesByRoundName = {};
  bloquesTop8.forEach(key => { matchesByRoundName[key] = []; });
  matchesAll.forEach(m => {
    if (m.round_name && matchesByRoundName[m.round_name] !== undefined) {
      matchesByRoundName[m.round_name].push(m);
    }
  });

  // Render visual solo con los bloques definidos y en orden
  let html = `<div class="bracket-visual-rows">`;

  // Winners row
  html += `<div class="bracket-row bracket-row-winners">`;
  ["Winners Semis", "Winners Final", "Grand Final", "Grand Final Reset"].forEach(key => {
    if (matchesByRoundName[key].length > 0) {
      html += buildBracketRound(key, matchesByRoundName[key], key, participantes);
    }
  });
  html += `</div>`;

  // Losers row
  html += `<div class="bracket-row bracket-row-losers">`;
  ["Losers Top 8", "Losers Quarters", "Losers Semis", "Losers Finals"].forEach(key => {
    if (matchesByRoundName[key].length > 0) {
      html += buildBracketRound(key, matchesByRoundName[key], key, participantes);
    }
  });
  html += `</div>`;

  html += `</div>`;
  container.innerHTML = html;

  await guardarBracketJSON(slug, matchesAll, participantes);

  // Después de await guardarBracketJSON(...)
  if (window.mostrarNotificacion) {
    mostrarNotificacion('✅ Bracket guardado.', 'success');
  }
}

// Helper para renderizar cada bloque de ronda
function buildBracketRound(ronda, matches, title, participantes) {
  let html = `<div class="bracket-round"><div class="bracket-round-title">${title}</div><div class="bracket-matches">`;
  matches.forEach(m => {
    let p1sc = m.player1_sc || "0";
    let p2sc = m.player2_sc || "0";
    let p1score = Number(p1sc), p2score = Number(p2sc);
    let p1Loser = p1score < p2score;
    let p2Loser = p2score < p1score;
    html += `
      <div class="bracket-match">
        <div class="bracket-player">
          <span class="bracket-player-name">${m.player1_name || participantes[m.player1_id] || '-'}</span>
          <span class="bracket-score${p1Loser ? ' loser' : ''}">${p1sc}</span>
        </div>
        <div class="bracket-player">
          <span class="bracket-player-name">${m.player2_name || participantes[m.player2_id] || '-'}</span>
          <span class="bracket-score${p2Loser ? ' loser' : ''}">${p2sc}</span>
        </div>
      </div>
    `;
  });
  html += `</div></div>`;
  return html;
}

async function guardarBracketJSON(slug, matchesAll, participantes) {
  const bracketData = {
    torneo: slug,
    fecha: new Date().toLocaleDateString(),
    matches: matchesAll,
    participantes: participantes
  };
  // Usa el handler 'save-json' y el tipo 'bracket' para guardar en la ruta personalizada
  await window.ipcRenderer.invoke('save-json', bracketData, 'bracket');
}