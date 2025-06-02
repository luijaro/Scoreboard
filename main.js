// =========================
//      DEPENDENCIAS
// =========================
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron'); // Importa módulos de Electron
const fs = require('fs'); // Importa el módulo 'fs' para operaciones de archivos
const path = require('path'); // Importa el módulo 'path' para manipulación de rutas
const fetch = require('node-fetch'); // Importa 'node-fetch' para realizar solicitudes HTTP
const tmi = require('tmi.js'); // Importa 'tmi.js' para interactuar con el chat de Twitch
const configFile = path.join(app.getPath('userData'), 'scoreboard-config.json'); // Define la ruta del archivo de configuración

let saveDir = null; // Variable para almacenar el directorio de guardado
let userApiKey = null; // Variable para almacenar la API key del usuario
let twitchBot = null; // Variable para almacenar el cliente de Twitch bot
let twitchChannelActual = ''; // Variable para almacenar el canal actual de Twitch

// =========================
//   UTILIDAD: CARPETA
// =========================
// Función para asegurar que el directorio de guardado exista
function ensureSaveDir(win) {
  const os = require('os');
  const documentsDir = path.join(os.homedir(), 'Documents');
  const defaultDir = path.join(documentsDir, 'data_scoreboard');

  console.log('Intentando usar carpeta:', defaultDir);

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

  if (!fs.existsSync(defaultDir)) {
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
      console.log('Carpeta creada:', defaultDir);
    } catch (err) {
      console.error('Error creando carpeta:', err);
    }
  }
  saveDir = defaultDir;
  fs.writeFileSync(configFile, JSON.stringify({ saveDir }), 'utf8');
  return saveDir;
}

// =========================
//      CREAR VENTANA
// =========================
// Función para crear la ventana principal de la aplicación
function createWindow() {
  const win = new BrowserWindow({
    width: 1280, // Ancho estándar
    height: 720, // Alto estándar
    resizable: false, // Evita que el usuario cambie el tamaño
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

app.on('browser-window-created', (_, win) => { // Cuando se crea una ventana
  win.setMenu(null); // Elimina el menú de la ventana
});

app.whenReady().then(createWindow); // Cuando la aplicación está lista, crea la ventana

// =========================
//     IPC HANDLERS
// =========================

// -------- Scoreboard JSON --------
// Handler para guardar el JSON del scoreboard
ipcMain.handle('save-json', async (event, data) => {
  const dir = ensureSaveDir(); // Obtiene el directorio de guardado
  const file = path.join(dir, 'scoreboard.json'); // Define la ruta del archivo
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); // Guarda los datos en el archivo JSON
  return { ok: true, file }; // Retorna un objeto con el estado y la ruta del archivo
});

// Handler para abrir la carpeta de guardado
ipcMain.handle('open-folder', async () => {
  const dir = ensureSaveDir(); // Obtiene el directorio de guardado
  shell.openPath(dir); // Abre el directorio en el explorador de archivos
  return { ok: true, dir }; // Retorna un objeto con el estado y el directorio
});

// Handler para cargar el JSON del scoreboard
ipcMain.handle('load-json', async () => {
  const dir = ensureSaveDir(); // Obtiene el directorio de guardado
  const file = path.join(dir, 'scoreboard.json'); // Define la ruta del archivo
  if (fs.existsSync(file)) { // Verifica si el archivo existe
    const data = JSON.parse(fs.readFileSync(file, 'utf8')); // Lee y parsea el archivo de configuración
    return { ok: true, data, file }; // Retorna un objeto con el estado, los datos y la ruta del archivo
  }
  return { ok: false, file }; // Retorna un objeto con el estado y la ruta del archivo
});

// -------- Guardar/Cargar API Key y Credenciales Twitch --------
// Handler para guardar la API key y las credenciales de Twitch
ipcMain.handle('save-api-key', async (event, { apiKey, twitchOAuth, twitchUser, twitchChannel }) => {
  const dir = ensureSaveDir(); // Obtiene el directorio de guardado
  const file = path.join(dir, 'apikey.json'); // Define la ruta del archivo
  let data = {}; // Inicializa un objeto para almacenar los datos
  if (fs.existsSync(file)) { // Verifica si el archivo existe
    try {
      data = JSON.parse(fs.readFileSync(file, 'utf8')); // Lee y parsea el archivo de configuración
    } catch (e) {} // Ignora errores al leer el archivo
  }
  if (apiKey) data.apiKey = apiKey; // Asigna la API key si se proporciona
  if (twitchOAuth) data.twitchOAuth = twitchOAuth; // Asigna el OAuth de Twitch si se proporciona
  if (twitchUser) data.twitchUser = twitchUser; // Asigna el usuario de Twitch si se proporciona
  if (twitchChannel) data.twitchChannel = twitchChannel; // Asigna el canal de Twitch si se proporciona
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8'); // Guarda los datos en el archivo JSON
  return { ok: true }; // Retorna un objeto con el estado
});

// Handler para cargar la API key y las credenciales de Twitch
ipcMain.handle('load-api-key', async () => {
  const dir = ensureSaveDir(); // Obtiene el directorio de guardado
  const file = path.join(dir, 'apikey.json'); // Define la ruta del archivo
  if (fs.existsSync(file)) { // Verifica si el archivo existe
    const data = JSON.parse(fs.readFileSync(file, 'utf8')); // Lee y parsea el archivo JSON
    return { // Retorna un objeto con el estado y los datos
      ok: true,
      apiKey: data.apiKey || '', // Retorna la API key o una cadena vacía si no existe
      twitchOAuth: data.twitchOAuth || '', // Retorna el OAuth de Twitch o una cadena vacía si no existe
      twitchUser: data.twitchUser || '', // Retorna el usuario de Twitch o una cadena vacía si no existe
      twitchChannel: data.twitchChannel || '' // Retorna el canal de Twitch o una cadena vacía si no existe
    };
  }
  return { ok: false, apiKey: '', twitchOAuth: '', twitchUser: '', twitchChannel: '' }; // Retorna un objeto con el estado y cadenas vacías
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
  if (!apiKey) return { ok: false, error: 'API key no establecida.' };

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
    // Solo matches sin ganador y sin "TBD"
    const matches = matchData
      .filter(m =>
        !m.match.winner_id &&
        participantes[m.match.player1_id]?.name &&
        participantes[m.match.player2_id]?.name &&
        participantes[m.match.player1_id].name !== 'TBD' &&
        participantes[m.match.player2_id].name !== 'TBD'
      )
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
    return { ok: true, matches, participantes: Object.values(participantes) };
  } catch (e) {
    return { ok: false, error: 'No se pudo consultar Challonge: ' + e.message };
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
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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
    // 1. Obtén el nombre de la escena actual:
    const { currentProgramSceneName } = await obs.call('GetCurrentProgramScene');
    // 2. Captura la screenshot de la escena actual usando el nombre obtenido:
    const { imageData } = await obs.call('GetSourceScreenshot', {
      sourceName: currentProgramSceneName, // <- nombre de la escena actual
      imageFormat: 'png',
      imageWidth: 1920,   // O el tamaño que necesites
      imageHeight: 1080
    });
    const image = nativeImage.createFromDataURL(`data:image/png;base64,${imageData}`);
    clipboard.writeImage(image);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message || 'No se pudo capturar la escena' };
  }
});

// Obtener torneos
ipcMain.handle('get-tournaments', async () => {
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

  const url = `https://api.challonge.com/v1/tournaments.json?api_key=${apiKey}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Error consultando Challonge');
    const data = await res.json();
    const tournaments = data.map(t => ({
      id: t.tournament.id,
      name: t.tournament.name,
      url: t.tournament.url,
      created_at: t.tournament.created_at,
      state: t.tournament.state // <-- AGREGA ESTA LÍNEA
    }));
    return { ok: true, tournaments };
  } catch (e) {
    return { ok: false, error: 'No se pudo consultar Challonge: ' + e.message };
  }
});

