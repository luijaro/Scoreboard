// =========================
//      DEPENDENCIAS
// =========================
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const tmi = require('tmi.js');
const configFile = path.join(app.getPath('userData'), 'scoreboard-config.json');

let saveDir = null;
let userApiKey = null;
let twitchBot = null;
let twitchChannelActual = '';

// =========================
//   UTILIDAD: CARPETA
// =========================
function ensureSaveDir(win) {
  if (saveDir) return saveDir;
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      if (config.saveDir && fs.existsSync(config.saveDir)) {
        saveDir = config.saveDir;
        return saveDir;
      }
    } catch (e) {}
  }
  const result = dialog.showOpenDialogSync(win, {
    title: 'Selecciona la carpeta donde se guardará tu JSON',
    properties: ['openDirectory', 'createDirectory']
  });
  if (result && result[0]) {
    saveDir = result[0];
    fs.writeFileSync(configFile, JSON.stringify({ saveDir }), 'utf8');
    return saveDir;
  } else {
    // Si cancela, por defecto el escritorio
    saveDir = path.join(require('os').homedir(), 'Desktop');
    fs.writeFileSync(configFile, JSON.stringify({ saveDir }), 'utf8');
    return saveDir;
  }
}

// =========================
//      CREAR VENTANA
// =========================
function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  win.loadFile('index.html');
  win.once('ready-to-show', () => {
    ensureSaveDir(win);
  });
}

app.on('browser-window-created', (_, win) => {
  win.setMenu(null);
});

app.whenReady().then(createWindow);

// =========================
//     IPC HANDLERS
// =========================

// -------- Scoreboard JSON --------
ipcMain.handle('save-json', async (event, data) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'scoreboard.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, file };
});

ipcMain.handle('open-folder', async () => {
  const dir = ensureSaveDir();
  shell.openPath(dir);
  return { ok: true, dir };
});

ipcMain.handle('load-json', async () => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'scoreboard.json');
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ok: true, data, file };
  }
  return { ok: false, file };
});

// -------- Guardar/Cargar API Key y Credenciales Twitch --------
ipcMain.handle('save-api-key', async (event, { apiKey, twitchOAuth, twitchUser, twitchChannel }) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'apikey.json');
  let data = {};
  if (fs.existsSync(file)) {
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) {}
  }
  if (apiKey) data.apiKey = apiKey;
  if (twitchOAuth) data.twitchOAuth = twitchOAuth;
  if (twitchUser) data.twitchUser = twitchUser;
  if (twitchChannel) data.twitchChannel = twitchChannel;
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true };
});

ipcMain.handle('load-api-key', async () => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'apikey.json');
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      ok: true,
      apiKey: data.apiKey || '',
      twitchOAuth: data.twitchOAuth || '',
      twitchUser: data.twitchUser || '',
      twitchChannel: data.twitchChannel || ''
    };
  }
  return { ok: false, apiKey: '', twitchOAuth: '', twitchUser: '', twitchChannel: '' };
});

// =========================
//        CHALLONGE
// =========================

// Obtener jugadores desde Challonge
ipcMain.handle('get-participants', async (event, slug) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'apikey.json');
  let apiKey = '';
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      apiKey = data.apiKey || '';
    } catch (e) {}
  }
  if (!apiKey) return { error: 'API key no establecida.' };

  const url = `https://api.challonge.com/v1/tournaments/${slug}/participants.json?api_key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error consultando Challonge');
    const data = await res.json();
    const participants = data.map(p => ({
      id: p.participant.id,
      name: p.participant.name,
      final_rank: p.participant.final_rank || null
    }));
    return { participants };
  } catch (e) {
    return { error: 'No se pudo consultar Challonge: ' + e.message };
  }
});

// Obtener Top 8
ipcMain.handle('get-top8', async (event, slug) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'apikey.json');
  let apiKey = '';
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      apiKey = data.apiKey || '';
    } catch (e) {}
  }
  if (!apiKey) return { error: 'API key no establecida.' };

  const url = `https://api.challonge.com/v1/tournaments/${slug}/participants.json?api_key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error consultando Challonge');
    const data = await res.json();
    const top8 = data
      .map(p => p.participant)
      .filter(p => typeof p.final_rank === 'number')
      .sort((a, b) => a.final_rank - b.final_rank)
      .slice(0, 8);
    return { top8 };
  } catch (e) {
    return { error: 'No se pudo consultar Challonge: ' + e.message };
  }
});

// Obtener matches y participantes (solo matches abiertos)
ipcMain.handle('get-matches-and-participants', async (event, slug) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'apikey.json');
  let apiKey = '';
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      apiKey = data.apiKey || '';
    } catch (e) {}
  }
  if (!apiKey) return { error: 'API key no establecida.' };

  const urlPart = `https://api.challonge.com/v1/tournaments/${slug}/participants.json?api_key=${apiKey}`;
  const urlMatch = `https://api.challonge.com/v1/tournaments/${slug}/matches.json?api_key=${apiKey}`;
  try {
    const [partRes, matchRes] = await Promise.all([
      fetch(urlPart),
      fetch(urlMatch)
    ]);
    if (!partRes.ok || !matchRes.ok) throw new Error('Error consultando Challonge');
    const partData = await partRes.json();
    const matchData = await matchRes.json();
    const participantes = {};
    partData.forEach(p => {
      participantes[p.participant.id] = {
        id: p.participant.id,
        name: p.participant.name
      };
    });
    // SOLO MATCHES ABIERTOS (sin ganador)
    const matches = matchData
      .filter(m => !m.match.winner_id)
      .map(m => ({
        id: m.match.id,
        player1_id: m.match.player1_id,
        player2_id: m.match.player2_id,
        player1_name: participantes[m.match.player1_id]?.name || 'TBD',
        player2_name: participantes[m.match.player2_id]?.name || 'TBD',
        round: m.match.round,
        scores_csv: m.match.scores_csv || '',
        winner_id: m.match.winner_id
      }));
    return { matches, participantes: Object.values(participantes) };
  } catch (e) {
    return { error: 'No se pudo consultar Challonge: ' + e.message };
  }
});

// Modificar resultados (reportar match)
ipcMain.handle('report-match-score', async (event, { slug, matchId, scoreCsv, winnerId }) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'apikey.json');
  let apiKey = '';
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      apiKey = data.apiKey || '';
    } catch (e) {}
  }
  if (!apiKey) return { ok: false, error: 'API key no establecida.' };

  const url = `https://api.challonge.com/v1/tournaments/${slug}/matches/${matchId}.json?api_key=${apiKey}`;
  try {
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        match: {
          scores_csv: scoreCsv,
          winner_id: winnerId
        }
      })
    });
    if (!res.ok) throw new Error(`Error: ${res.statusText}`);
    const data = await res.json();
    return { ok: true, match: data.match };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// =========================
//        PERSONAJES
// =========================
ipcMain.handle('get-personajes', async (event, juegoFolder) => {
  if (!juegoFolder) return { personajes: [] };
  const dir = path.join(process.cwd(), 'personajes', juegoFolder);
  if (!fs.existsSync(dir)) return { personajes: [] };
  const files = fs.readdirSync(dir).filter(f =>
    f.match(/\.(png|jpg|jpeg)$/i)
  );
  const personajes = files.map(f => ({
    nombre: path.parse(f).name,
    imagen: 'personajes/' + juegoFolder + '/' + f
  }));
  return { personajes };
});

// =========================
//       TWITCH INTEGRATION
// =========================

ipcMain.handle('twitch-connect', async (event, { username, oauth, channel }) => {
  try {
    if (twitchBot) {
      await twitchBot.disconnect();
      twitchBot = null;
    }
    twitchBot = new tmi.Client({
      identity: { username, password: oauth },
      channels: [channel]
    });
    await twitchBot.connect();
    twitchChannelActual = channel;
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('twitch-say', async (event, { message }) => {
  try {
    if (!twitchBot || !twitchChannelActual) return { ok: false, error: 'Bot no conectado.' };
    await twitchBot.say(twitchChannelActual, message);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});


ipcMain.handle('get-tournament-title', async (event, slug) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'apikey.json');
  let apiKey = '';
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      apiKey = data.apiKey || '';
    } catch (e) {}
  }
  if (!apiKey) return { error: 'API key no establecida.' };
  const url = `https://api.challonge.com/v1/tournaments/${slug}.json?api_key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error consultando Challonge');
    const data = await res.json();
    return { title: data.tournament.name };
  } catch (e) {
    return { error: 'No se pudo consultar Challonge: ' + e.message };
  }
});


// =============== OBS WEBSOCKET ===============
const OBSWebSocket = require('obs-websocket-js').default;
let obs = null;

ipcMain.handle('conectar-obs', async (event, { host, port, password }) => {
  if (!obs) obs = new OBSWebSocket();
  try {
    await obs.connect(`ws://${host}:${port}`, password);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'No se pudo conectar' };
  }
});

ipcMain.handle('cambiar-escena-obs', async (event, scene) => {
  if (!obs) return { ok: false, error: 'OBS no conectado' };
  try {
    await obs.call('SetCurrentProgramScene', { sceneName: scene });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'No se pudo cambiar la escena' };
  }
});

// Obtener lista de escenas
ipcMain.handle('get-obs-scenes', async () => {
  if (!obs) return { ok: false, error: 'OBS no conectado' };
  try {
    const { scenes } = await obs.call('GetSceneList');
    return { ok: true, scenes: scenes.map(s => s.sceneName) };
  } catch (e) {
    return { ok: false, error: e.message || 'No se pudieron obtener las escenas' };
  }
});


const { clipboard, nativeImage } = require('electron');

ipcMain.handle('capturar-escena-obs', async () => {
  if (!obs) return { ok: false, error: 'OBS no conectado' };
  try {
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    const { imageData } = await obs.call('GetSourceScreenshot', {
      sourceName: currentProgramSceneName,
      imageFormat: 'png',
      imageWidth: 1920,
      imageHeight: 1080
    });
    // Crea imagen a partir de base64
    const image = nativeImage.createFromBuffer(Buffer.from(imageData, 'base64'));
    clipboard.writeImage(image);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'No se pudo capturar la escena' };
  }
});

