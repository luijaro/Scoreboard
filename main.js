// =========================
//      DEPENDENCIAS
// =========================
const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron'); // Importa módulos de Electron
const fs = require('fs'); // Importa el módulo 'fs' para operaciones de archivos
const path = require('path'); // Importa el módulo 'path' para manipulación de rutas
const fetch = require('node-fetch'); // Importa 'node-fetch' para realizar solicitudes HTTP
const tmi = require('tmi.js'); // Importa 'tmi.js' para interactuar con el chat de Twitch
const http = require('http'); // Servidor HTTP para Stream Deck
const url = require('url'); // Para parsear URLs

const userDataDir = path.join(app.getPath('documents'), 'js');
if (!fs.existsSync(userDataDir)) {
  fs.mkdirSync(userDataDir, { recursive: true });
}
const configFile = path.join(userDataDir, 'scoreboard-config.json'); // Define la ruta del archivo de configuración

let saveDir = null; // Variable para almacenar el directorio de guardado
let userApiKey = null; // Variable para almacenar la API key del usuario
let twitchBot = null; // Variable para almacenar el cliente de Twitch bot
let twitchChannelActual = ''; // Variable para almacenar el canal actual de Twitch

// =========================
//   STREAM DECK HTTP SERVER
// =========================
let httpServer = null; // Servidor HTTP para Stream Deck
let currentScoreboardData = {}; // Cache de datos actuales del scoreboard
let mainWindow = null; // Referencia a la ventana principal

// =========================
//   UTILIDAD: CARPETA
// =========================
// Función para asegurar que el directorio de guardado exista
// function ensureSaveDir(win) {
//   const os = require('os');
//   const documentsDir = path.join(os.homedir(), 'Documents');
//   const defaultDir = path.join(documentsDir, 'data_scoreboard');

//   console.log('Intentando usar carpeta:', defaultDir);

//   if (saveDir) return saveDir;
//   if (fs.existsSync(configFile)) {
//     try {
//       const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
//       if (config.saveDir && fs.existsSync(config.saveDir)) {
//         saveDir = config.saveDir;
//         return saveDir;
//       }
//     } catch (e) {}
//   }

//   if (!fs.existsSync(defaultDir)) {
//     try {
//       fs.mkdirSync(defaultDir, { recursive: true });
//       console.log('Carpeta creada:', defaultDir);
//     } catch (err) {
//       console.error('Error creando carpeta:', err);
//     }
//   }
//   saveDir = defaultDir;
//   fs.writeFileSync(configFile, JSON.stringify({ saveDir }), 'utf8');
//   return saveDir;
// }

// =========================
//      CREAR VENTANA
// =========================
// Función para crear la ventana principal de la aplicación
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 750,  //Antes: 720
    resizable: false, // Evita que el usuario cambie el tamaño
    icon: path.join(__dirname, 'icon.ico'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile('index.html');
  mainWindow.once('ready-to-show', () => {
    // ensureSaveDir(mainWindow);
    // Abrir las herramientas de desarrollador para ver la consola
    //mainWindow.webContents.openDevTools();
  });
  
  // Limpiar la referencia cuando se cierre la ventana
  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.on('browser-window-created', (_, win) => { // Cuando se crea una ventana
  win.setMenu(null); // Elimina el menú de la ventana
});

app.whenReady().then(() => {
  createWindow();
  startStreamDeckServer();
}); // Cuando la aplicación está lista, crea la ventana y inicia el servidor

// =========================
//   STREAM DECK HTTP SERVER
// =========================

function startStreamDeckServer() {
  const PORT = 3001;
  
  httpServer = http.createServer((req, res) => {
    // Configurar CORS para permitir cualquier origen
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    const parsedUrl = url.parse(req.url, true);
    const pathname = parsedUrl.pathname;
    const method = req.method;

    console.log(`[Stream Deck] ${method} ${pathname}`);

    try {
      if (method === 'GET') {
        handleStreamDeckRequest(pathname, res);
      } else if (method === 'OPTIONS') {
        // Responder a preflight requests
        res.writeHead(200);
        res.end();
      } else {
        res.writeHead(405, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Method not allowed' }));
      }
    } catch (error) {
      console.error('[Stream Deck] Error:', error);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal server error' }));
    }
  });

  httpServer.listen(PORT, 'localhost', () => {
    console.log(`[Stream Deck] Servidor HTTP iniciado en http://localhost:${PORT}`);
  });

  httpServer.on('error', (error) => {
    console.error('[Stream Deck] Error del servidor:', error);
  });
}

async function handleStreamDeckRequest(pathname, res) {
  const parts = pathname.split('/').filter(p => p);
  
  if (parts.length === 0) {
    // Endpoint de estado
    res.writeHead(200);
    res.end(JSON.stringify({ 
      status: 'active', 
      message: 'Stream Deck Server is running',
      endpoints: [
        'GET /score/player1/+1 - Increase player 1 score',
        'GET /score/player1/-1 - Decrease player 1 score', 
        'GET /score/player2/+1 - Increase player 2 score',
        'GET /score/player2/-1 - Decrease player 2 score',
        'GET /reset-scores - Reset both scores to 0',
        'GET /timer/reset - Reset timer',
        'GET /timer/5 - Set timer to 5 minutes',
        'GET /timer/10 - Set timer to 10 minutes',
        'GET /timer/15 - Set timer to 15 minutes',
        'GET /timer/20 - Set timer to 20 minutes',
        'GET /swap-players - Swap player positions',
        'GET /game/GGST - Change to Guilty Gear Strive',
        'GET /game/SF6 - Change to Street Fighter 6',
        'GET /game/T8 - Change to Tekken 8',
        'GET /game/UNI2 - Change to Under Night In-Birth 2',
        'GET /game/GBVSR - Change to Granblue Versus Rising',
        'GET /game/BBCF - Change to BlazBlue Central Fiction',
        'GET /game/MBTL - Change to Melty Blood Type Lumina',
        'GET /game/COTW - Change to City of the Wolves',
        'GET /game/GVSR - Change to Granblue Versus (Original)',
        'GET /game/HFTF - Change to Heritage for the Future',
        'GET /game/MBAACC - Change to Melty Blood Actress Again',
        'GET /game/SCON4 - Change to Soul Calibur VI',
        'GET /game/SF3 - Change to Street Fighter 3rd Strike',
        'GET /game/VSAV - Change to Vampire Savior'
      ]
    }));
    return;
  }

  let success = false;
  let message = 'Unknown command';

  if (parts[0] === 'score' && parts.length === 3) {
    // /score/player1/+1 o /score/player2/-1
    const player = parts[1]; // 'player1' o 'player2'
    const action = parts[2]; // '+1' o '-1'
    
    if ((player === 'player1' || player === 'player2') && (action === '+1' || action === '-1')) {
      success = await changeScoreViaAPI(player, action);
      message = success ? `Score changed for ${player} by ${action}` : 'Failed to change score';
    }
  } else if (parts[0] === 'reset-scores') {
    success = await resetScoresViaAPI();
    message = success ? 'Scores reset to 0-0' : 'Failed to reset scores';
  } else if (parts[0] === 'timer' && parts[1] === 'reset') {
    success = await resetTimerViaAPI();
    message = success ? 'Timer reset' : 'Failed to reset timer';
  } else if (parts[0] === 'timer' && parts.length === 2) {
    // /timer/5, /timer/10, /timer/15, /timer/20
    const minutes = parseInt(parts[1]);
    if ([5, 10, 15, 20].includes(minutes)) {
      success = await setTimerViaAPI(minutes);
      message = success ? `Timer set to ${minutes} minutes` : 'Failed to set timer';
    } else {
      message = 'Invalid timer value. Use 5, 10, 15, or 20 minutes.';
    }
  } else if (parts[0] === 'swap-players') {
    success = await swapPlayersViaAPI();
    message = success ? 'Players swapped' : 'Failed to swap players';
  } else if (parts[0] === 'game' && parts.length === 2) {
    // /game/GGST, /game/SF6, etc.
    const gameCode = parts[1].toUpperCase();
    const validGames = ['GGST', 'SF6', 'T8', 'UNI2', 'GBVSR', 'BBCF', 'MBTL', 'COTW', 'GVSR', 'HFTF', 'MBAACC', 'SCON4', 'SF3', 'VSAV'];
    
    if (validGames.includes(gameCode)) {
      success = await changeGameViaAPI(gameCode);
      message = success ? `Game changed to ${gameCode}` : 'Failed to change game';
    } else {
      message = `Invalid game code. Valid games: ${validGames.join(', ')}`;
    }
  }

  res.writeHead(success ? 200 : 400);
  res.end(JSON.stringify({ success, message }));
}

async function changeScoreViaAPI(player, action) {
  try {
    // Cargar datos actuales
    const loadResult = await loadScoreboardData();
    if (!loadResult.ok) return false;
    
    const data = loadResult.data;
    const scoreField = player === 'player1' ? 'score1' : 'score2';
    const delta = action === '+1' ? 1 : -1;
    
    // Cambiar el score
    data[scoreField] = Math.max(0, (data[scoreField] || 0) + delta);
    
    // Guardar en archivo
    const saveResult = await saveScoreboardData(data);
    
    // Enviar comando a la ventana para actualizar la UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-deck-score-change', {
        player: player,
        action: action,
        newScore: data[scoreField]
      });
    }
    
    console.log(`[Stream Deck] Score changed: ${player} ${action} -> ${data[scoreField]}`);
    
    return saveResult.ok;
  } catch (error) {
    console.error('[Stream Deck] Error changing score:', error);
    return false;
  }
}

async function resetScoresViaAPI() {
  try {
    const loadResult = await loadScoreboardData();
    if (!loadResult.ok) return false;
    
    const data = loadResult.data;
    data.score1 = 0;
    data.score2 = 0;
    
    const saveResult = await saveScoreboardData(data);
    
    // Enviar comando a la ventana para actualizar la UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-deck-reset-scores');
    }
    
    console.log('[Stream Deck] Scores reset to 0-0');
    
    return saveResult.ok;
  } catch (error) {
    console.error('[Stream Deck] Error resetting scores:', error);
    return false;
  }
}

async function resetTimerViaAPI() {
  try {
    const loadResult = await loadScoreboardData();
    if (!loadResult.ok) return false;
    
    const data = loadResult.data;
    data.timerEndTimestamp = null;
    
    const saveResult = await saveScoreboardData(data);
    
    // Enviar comando a la ventana para actualizar la UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-deck-reset-timer');
    }
    
    console.log('[Stream Deck] Timer reset');
    
    return saveResult.ok;
  } catch (error) {
    console.error('[Stream Deck] Error resetting timer:', error);
    return false;
  }
}

async function setTimerViaAPI(minutes) {
  try {
    const loadResult = await loadScoreboardData();
    if (!loadResult.ok) return false;
    
    const data = loadResult.data;
    
    // Calcular timestamp de finalización (ahora + minutos)
    const now = Date.now();
    data.timerEndTimestamp = now + (minutes * 60 * 1000);
    
    const saveResult = await saveScoreboardData(data);
    
    // Enviar comando a la ventana para actualizar la UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-deck-set-timer', { 
        minutes: minutes, 
        endTimestamp: data.timerEndTimestamp 
      });
    }
    
    console.log(`[Stream Deck] Timer set to ${minutes} minutes`);
    
    return saveResult.ok;
  } catch (error) {
    console.error('[Stream Deck] Error setting timer:', error);
    return false;
  }
}

async function swapPlayersViaAPI() {
  try {
    const loadResult = await loadScoreboardData();
    if (!loadResult.ok) return false;
    
    const data = loadResult.data;
    
    // Intercambiar todos los datos de jugadores
    const temp = {
      player: data.player1,
      score: data.score1,
      tag: data.tag1,
      char: data.char1,
      country: data.country1
    };
    
    data.player1 = data.player2;
    data.score1 = data.score2;
    data.tag1 = data.tag2;
    data.char1 = data.char2;
    data.country1 = data.country2;
    
    data.player2 = temp.player;
    data.score2 = temp.score;
    data.tag2 = temp.tag;
    data.char2 = temp.char;
    data.country2 = temp.country;
    
    const saveResult = await saveScoreboardData(data);
    
    // Enviar comando a la ventana para actualizar la UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-deck-swap-players');
    }
    
    console.log('[Stream Deck] Players swapped');
    
    return saveResult.ok;
  } catch (error) {
    console.error('[Stream Deck] Error swapping players:', error);
    return false;
  }
}

async function changeGameViaAPI(gameCode) {
  try {
    const loadResult = await loadScoreboardData();
    if (!loadResult.ok) return false;
    
    const data = loadResult.data;
    
    // Cambiar el juego actual
    data.game = gameCode;
    
    const saveResult = await saveScoreboardData(data);
    
    // Enviar comando a la ventana para actualizar la UI
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('stream-deck-change-game', gameCode);
    }
    
    console.log(`[Stream Deck] Game changed to ${gameCode}`);
    
    return saveResult.ok;
  } catch (error) {
    console.error('[Stream Deck] Error changing game:', error);
    return false;
  }
}

// Funciones auxiliares para cargar/guardar datos
async function loadScoreboardData() {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  let file;
  if (rutas.scoreboard) {
    file = rutas.scoreboard;
  } else {
    file = path.join(userDataDir, 'scoreboard.json');
  }
  
  if (fs.existsSync(file)) {
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      return { ok: true, data, file };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }
  return { ok: false, error: 'File not found' };
}

async function saveScoreboardData(data) {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  let file;
  if (rutas.scoreboard) {
    file = rutas.scoreboard;
  } else {
    file = path.join(userDataDir, 'scoreboard.json');
  }
  
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true, file };
  } catch (error) {
    return { ok: false, error: error.message };
  }
}

// =========================
//     IPC HANDLERS
// =========================
// Handler para obtener los matches de un evento Start.gg
ipcMain.handle('startgg-get-matches', async (event, eventId) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const apikeyPath = rutas.apikey || path.join(userDataDir, 'apikey.json');
  let token = '';
  if (fs.existsSync(apikeyPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(apikeyPath, 'utf8'));
      token = data.startgg || '';
    } catch (e) {}
  }
  if (!token) return { error: 'No hay token de start.gg configurado.' };
  // Consulta sets (matches) del evento y de cada fase/pool si existen
  let allSets = [];
  try {
    // 1. Consulta las fases del evento
    const queryPhases = `
      query EventPhases {
        event(id: ${eventId}) {
          phases {
            id
            name
          }
        }
      }
    `;
    const resPhases = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ query: queryPhases })
    });
    const dataPhases = await resPhases.json();
    const phases = dataPhases.data?.event?.phases || [];
    console.log(`[startgg-get-matches] Fases encontradas: ${phases.length}`);
    // Crear diccionario de phaseId -> phaseName
    const phaseIdToName = {};
    phases.forEach(phase => {
      phaseIdToName[phase.id] = phase.name;
    });
    // 2. Si hay fases, consulta los sets de cada fase
    if (phases.length > 0) {
      for (const phase of phases) {
        for (let page = 1; page <= 20; page++) {
          const querySets = `
            query PhaseSets {
              phase(id: ${phase.id}) {
                sets(perPage: 100, page: ${page}) {
                  nodes {
                    id
                    fullRoundText
                    slots {
                      entrant { name }
                      standing { stats { score { value } } }
                    }
                  }
                }
              }
            }
          `;
          const res = await fetch('https://api.start.gg/gql/alpha', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Bearer ' + token
            },
            body: JSON.stringify({ query: querySets })
          });
          const data = await res.json();
          const sets = data.data?.phase?.sets?.nodes || [];
          // Asigna el phaseId y el nombre de la fase a cada set
          sets.forEach(set => {
            set.phaseId = phase.id;
            set.fase = phaseIdToName[phase.id] || '';
          });
          console.log(`[startgg-get-matches] Fase ${phase.name} (${phase.id}) - Página ${page}: ${sets.length} sets recibidos`);
          if (sets.length === 0) break;
          allSets = allSets.concat(sets);
          if (sets.length < 100) break;
        }
      }
    } else {
      // Si no hay fases, consulta sets del evento como antes
      for (let page = 1; page <= 20; page++) {
        const querySets = `
          query EventSets {
            event(id: ${eventId}) {
              sets(perPage: 100, page: ${page}) {
                nodes {
                  id
                  fullRoundText
                  slots {
                    entrant { name }
                    standing { stats { score { value } } }
                  }
                }
              }
            }
          }
        `;
        const res = await fetch('https://api.start.gg/gql/alpha', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
          },
          body: JSON.stringify({ query: querySets })
        });
        const data = await res.json();
        const sets = data.data?.event?.sets?.nodes || [];
        // No hay phaseId, pero puedes asignar fase vacía
        sets.forEach(set => {
          set.fase = '';
        });
        console.log(`[startgg-get-matches] Evento - Página ${page}: ${sets.length} sets recibidos`);
        if (sets.length === 0) break;
        allSets = allSets.concat(sets);
        if (sets.length < 100) break;
      }
    }
    console.log(`[startgg-get-matches] Total sets recibidos: ${allSets.length}`);
    if (allSets.length > 0) {
      console.log('[startgg-get-matches] Ejemplo de set:', allSets[0]);
    }
    return { ok: true, sets: allSets };
  } catch (e) {
    console.error('[startgg-get-matches] Error:', e);
    return { error: e.message };
  }
});

// Handler para obtener los eventos de un torneo Start.gg
ipcMain.handle('save-bracket-json', async (event, bracketData) => {
  // Ruta absoluta para bracket.json
  // Leer ruta personalizada de bracket.json desde el archivo de configuración
  let config = {};
  if (fs.existsSync(configFile)) {
    try {
      config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
    } catch (e) {}
  }
  const rutas = config.rutas || {};
  // Usar la ruta personalizada si existe, si no usar la ruta por defecto
  const bracketPath = rutas.bracket || path.resolve(__dirname, 'example', 'json', 'bracket.json');
  try {
    fs.writeFileSync(bracketPath, JSON.stringify(bracketData, null, 2), 'utf8');
    return { ok: true, file: bracketPath };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('startgg-get-events', async (event, tournamentSlug) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const apikeyPath = rutas.apikey || path.join(userDataDir, 'apikey.json');
  let token = '';
  if (fs.existsSync(apikeyPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(apikeyPath, 'utf8'));
      token = data.startgg || '';
    } catch (e) {}
  }
  if (!token) return { error: 'No hay token de start.gg configurado.' };
  // Consulta eventos del torneo
  const queryEvents = `
    query TournamentBySlug {
      tournament(slug: "${tournamentSlug}") {
        id
        name
        events {
          id
          name
          slug
        }
      }
    }
  `;
  try {
    const resEvents = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ query: queryEvents })
    });
    const dataEvents = await resEvents.json();
    const events = dataEvents.data?.tournament?.events || [];
    return { ok: true, tournamentName: dataEvents.data?.tournament?.name, events };
  } catch (e) {
    return { error: e.message };
  }
});

// -------- Scoreboard JSON --------
// Handler para guardar el JSON del scoreboard
ipcMain.handle('save-json', async (event, data, tipo = 'scoreboard') => {
  console.log(`[save-json] Handler llamado. Tipo: ${tipo}`);
  console.log('[save-json] Datos recibidos:', data);
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  let file;
  if (rutas[tipo]) {
    file = rutas[tipo];
  } else {
    // Por defecto, guarda en Documentos/js/
    file = path.join(userDataDir, tipo + '.json');
  }
  console.log(`[save-json] Guardando en archivo: ${file}`);
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    console.log(`[save-json] Archivo guardado exitosamente: ${file}`);
    return { ok: true, file };
  } catch (e) {
    console.error(`[save-json] Error guardando archivo: ${file}`, e);
    return { ok: false, error: e.message };
  }
});

// Handler para cargar el JSON del scoreboard
ipcMain.handle('load-json', async (event, tipo = 'scoreboard') => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  let file;
  if (rutas[tipo]) {
    file = rutas[tipo];
  } else {
    file = path.join(userDataDir, tipo + '.json');
  }
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ok: true, data, file };
  }
  return { ok: false, file };
});

// -------- Guardar/Cargar API Key y Credenciales Twitch --------
// Handler para guardar la API key y las credenciales de Twitch
ipcMain.handle('save-api-key', async (event, { apiKey, twitchOAuth, twitchUser, twitchChannel, startgg }) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
  let data = {};
  if (fs.existsSync(file)) {
    try { data = JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) {}
  }
  if (apiKey) data.apiKey = apiKey;
  if (twitchOAuth) data.twitchOAuth = twitchOAuth;
  if (twitchUser) data.twitchUser = twitchUser;
  if (twitchChannel) data.twitchChannel = twitchChannel;
  if (startgg) data.startgg = startgg;
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true };
});

// Handler para cargar la API key y las credenciales de Twitch
ipcMain.handle('load-api-key', async () => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return {
      ok: true,
      apiKey: data.apiKey || '',
      twitchOAuth: data.twitchOAuth || '',
      twitchUser: data.twitchUser || '',
      twitchChannel: data.twitchChannel || '',
      token: data.startgg || ''
    };
  }
  return { ok: false, apiKey: '', twitchOAuth: '', twitchUser: '', twitchChannel: '' };
});

// =========================
//        CHALLONGE
// =========================

// Obtener jugadores desde Challonge
ipcMain.handle('get-participants', async (event, slug) => {
  let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
}
const rutas = config.rutas || {};
const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
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
let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
}
const rutas = config.rutas || {};
const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
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

// Obtener matches y participantes (solo matches abiertos) + información del torneo
ipcMain.handle('get-matches-and-participants', async (event, slug) => {
let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
}
const rutas = config.rutas || {};
const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
let apiKey = '';
if (fs.existsSync(file)) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    apiKey = data.apiKey || '';
  } catch (e) {}
}
  if (!apiKey) return { ok: false, error: 'API key no establecida.' };

  const urlTournament = `https://api.challonge.com/v1/tournaments/${slug}.json?api_key=${apiKey}`;
  const urlPart = `https://api.challonge.com/v1/tournaments/${slug}/participants.json?api_key=${apiKey}`;
  const urlMatch = `https://api.challonge.com/v1/tournaments/${slug}/matches.json?api_key=${apiKey}`;
  try {
    const [tournamentRes, partRes, matchRes] = await Promise.all([
      fetch(urlTournament),
      fetch(urlPart),
      fetch(urlMatch)
    ]);
    if (!tournamentRes.ok || !partRes.ok || !matchRes.ok) throw new Error('Error consultando Challonge');
    
    const tournamentData = await tournamentRes.json();
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
    
    return { 
      ok: true, 
      matches, 
      participantes: Object.values(participantes),
      tournament_type: tournamentData.tournament.tournament_type,
      tournament_state: tournamentData.tournament.state
    };
  } catch (e) {
    return { ok: false, error: 'No se pudo consultar Challonge: ' + e.message };
  }
});

// Obtener matches de grupos específicamente
ipcMain.handle('get-group-matches', async (event, slug) => {
let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
}
const rutas = config.rutas || {};
const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
let apiKey = '';
if (fs.existsSync(file)) {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    apiKey = data.apiKey || '';
  } catch (e) {}
}
  if (!apiKey) return { ok: false, error: 'API key no establecida.' };

  try {
    // Obtener información del torneo para confirmar que es de grupos
    const tournamentRes = await fetch(`https://api.challonge.com/v1/tournaments/${slug}.json?api_key=${apiKey}`);
    if (!tournamentRes.ok) throw new Error('Error obteniendo información del torneo');
    
    const tournamentData = await tournamentRes.json();
    const tournamentType = tournamentData.tournament.tournament_type;
    const tournamentState = tournamentData.tournament.state;
    
    if ((!tournamentType || (!tournamentType.toLowerCase().includes('group') && !tournamentType.toLowerCase().includes('round robin'))) && 
        (!tournamentState || !tournamentState.toLowerCase().includes('group'))) {
      return { ok: false, error: 'Este torneo no es de tipo grupo' };
    }

    // Obtener participantes y matches
    const [partRes, matchRes] = await Promise.all([
      fetch(`https://api.challonge.com/v1/tournaments/${slug}/participants.json?api_key=${apiKey}`),
      fetch(`https://api.challonge.com/v1/tournaments/${slug}/matches.json?api_key=${apiKey}`)
    ]);
    
    if (!partRes.ok || !matchRes.ok) throw new Error('Error obteniendo datos del torneo');
    
    const partData = await partRes.json();
    const matchData = await matchRes.json();
    
    console.log('🐛 Debug get-group-matches:');
    console.log('  - Tournament type:', tournamentType);
    console.log('  - Tournament state:', tournamentState);
    console.log('  - Participantes encontrados:', partData.length);
    console.log('  - Matches totales:', matchData.length);
    console.log('  - Primeros 3 participantes:', partData.slice(0, 3));
    console.log('  - Primeros 3 matches:', matchData.slice(0, 3));
    
    // Crear un mapa más flexible de participantes usando group_player_ids
    const participantes = {};
    const playerMapping = {}; // Mapa de player_id -> nombre
    
    partData.forEach(p => {
      const participantId = p.participant.id;
      const participantName = p.participant.name || p.participant.display_name;
      
      participantes[participantId] = {
        id: participantId,
        name: participantName,
        group_name: p.participant.group_id ? `Group ${p.participant.group_id}` : 'Group Stage',
        group_player_ids: p.participant.group_player_ids || []
      };
      
      // CLAVE: Mapear cada group_player_id al nombre del participante
      if (p.participant.group_player_ids && Array.isArray(p.participant.group_player_ids)) {
        p.participant.group_player_ids.forEach(playerId => {
          playerMapping[playerId] = participantName;
        });
      }
    });
    
    console.log('🎯 Group Player IDs mapping:');
    partData.forEach(p => {
      console.log(`  - ${p.participant.name}: participant_id=${p.participant.id}, group_player_ids=${JSON.stringify(p.participant.group_player_ids)}`);
    });
    
    console.log('🔍 Player mapping creado:', playerMapping);
    
    // También intentar obtener el mapping correcto desde la API de matches específicos como fallback
    let fullTournamentData = null;
    
    try {
      // Obtener datos completos del torneo que incluye participantes con IDs correctos
      const fullRes = await fetch(`https://api.challonge.com/v1/tournaments/${slug}.json?include_participants=1&include_matches=1&api_key=${apiKey}`);
      if (fullRes.ok) {
        fullTournamentData = await fullRes.json();
        if (fullTournamentData.tournament && fullTournamentData.tournament.participants) {
          // Agregar cualquier mapeo adicional del API completo
          fullTournamentData.tournament.participants.forEach(p => {
            if (p.participant.group_player_ids && Array.isArray(p.participant.group_player_ids)) {
              p.participant.group_player_ids.forEach(playerId => {
                if (!playerMapping[playerId]) {
                  playerMapping[playerId] = p.participant.name || p.participant.display_name;
                }
              });
            }
          });
          console.log('🔍 Player mapping actualizado con API completo:', Object.keys(playerMapping).length, 'jugadores');
        }
        
        // Si también tenemos matches en el response completo, usarlos
        if (fullTournamentData.tournament && fullTournamentData.tournament.matches) {
          console.log('🔍 Matches from full API:', fullTournamentData.tournament.matches.length);
          console.log('🔍 Sample match IDs:', fullTournamentData.tournament.matches.slice(0, 3).map(m => `${m.match.player1_id} vs ${m.match.player2_id}`));
        }
      }
    } catch (e) {
      console.log('⚠️ No se pudo obtener mapping detallado:', e.message);
    }
    
    console.log('🐛 Mapeando participantes:');
    console.log('  - Participantes por ID:', Object.keys(participantes));
    console.log('  - Player IDs en matches:', matchData.slice(0, 3).map(m => `${m.match.player1_id} vs ${m.match.player2_id}`));
    console.log('  - Player mapping final disponible:', playerMapping);
    
    // Función para buscar nombre de jugador
    function findPlayerName(playerId) {
      // Buscar en el mapping de group_player_ids (que es lo correcto)
      if (playerMapping[playerId]) {
        console.log(`✅ Found player ${playerId} -> ${playerMapping[playerId]}`);
        return playerMapping[playerId];
      }
      // Como fallback, buscar en participantes normales (probablemente no funcionará para grupos)
      if (participantes[playerId]) {
        console.log(`⚠️ Fallback: Found player ${playerId} -> ${participantes[playerId].name}`);
        return participantes[playerId].name;
      }
      // Si no encontramos nada, retornar TBD
      console.log(`❌ Player ${playerId} not found in mapping`);
      return 'TBD';
    }
    
    // Determinar qué matches usar - preferir los de la API completa si tienen group_id
    let matchesToProcess = matchData;
    
    if (fullTournamentData && fullTournamentData.tournament && fullTournamentData.tournament.matches) {
      const fullMatches = fullTournamentData.tournament.matches;
      const groupMatchesFromFull = fullMatches.filter(m => m.match.group_id);
      
      if (groupMatchesFromFull.length > 0) {
        console.log('🎯 Usando matches de la API completa:', groupMatchesFromFull.length, 'matches de grupos');
        matchesToProcess = groupMatchesFromFull;
      }
    }
    
    // Filtrar matches de grupos - solo matches abiertos que tengan group_id
    const groupMatches = matchesToProcess
      .filter(m => m.match.group_id && m.match.state === 'open') // Solo matches de grupos que estén abiertos
      .map(m => {
        const player1_name = findPlayerName(m.match.player1_id);
        const player2_name = findPlayerName(m.match.player2_id);
        
        console.log(`🔍 Match ${m.match.id} (${m.match.state}): ${m.match.player1_id} (${player1_name}) vs ${m.match.player2_id} (${player2_name})`);
        
        return {
          id: m.match.id,
          player1_id: m.match.player1_id,
          player2_id: m.match.player2_id,
          player1_name: player1_name,
          player2_name: player2_name,
          round: m.match.round,
          scores_csv: m.match.scores_csv || '',
          winner_id: m.match.winner_id,
          group_name: "Round Robin", // Cambiar todos los matches de grupos a "Round Robin"
          identifier: m.match.identifier || `Match ${m.match.id}`,
          state: m.match.state
        };
      })
      .filter(m => m.player1_name !== 'TBD' && m.player2_name !== 'TBD'); // Filtrar solo los que no pudimos mapear
    
    console.log('🐛 Después del filtrado:');
    console.log('  - Matches totales encontrados:', matchesToProcess.length);
    console.log('  - Matches con group_id:', matchesToProcess.filter(m => m.match.group_id).length);
    console.log('  - Matches abiertos (state=open):', matchesToProcess.filter(m => m.match.group_id && m.match.state === 'open').length);
    console.log('  - Group matches finales (abiertos y con nombres):', groupMatches.length);
    console.log('  - Group matches:', groupMatches);
    
    return { 
      ok: true, 
      matches: groupMatches,
      participantes: Object.values(participantes)
    };
  } catch (e) {
    return { ok: false, error: 'No se pudieron obtener los matches de grupos: ' + e.message };
  }
});

// Modificar resultados (reportar match)
ipcMain.handle('report-match-score', async (event, { slug, matchId, scoreCsv, winnerId }) => {
  let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
}
const rutas = config.rutas || {};
const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
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
  let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
}
const rutas = config.rutas || {};
const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
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
  let config = {};
if (fs.existsSync(configFile)) {
  try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
}
const rutas = config.rutas || {};
const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
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

ipcMain.handle('elegir-ruta', async (event, tipo) => {
  let filters = [{ name: 'JSON', extensions: ['json'] }];
  let defaultExt = '.json';
  if (tipo === 'usuarios') {
    filters = [{ name: 'Text', extensions: ['txt'] }];
    defaultExt = '.txt';
  }
  const { canceled, filePath } = await dialog.showSaveDialog({
    title: 'Selecciona destino para ' + tipo,
    defaultPath: tipo + defaultExt,
    filters
  });
  if (canceled) return { ok: false };
  // Si es usuarios y el archivo no existe, créalo vacío
  if (tipo === 'usuarios' && filePath && !fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, '', 'utf8');
  }
  return { ok: true, ruta: filePath };
});

ipcMain.handle('abrir-ventana-rutas', () => {
  const win = new BrowserWindow({
    width: 800,      // Nuevo ancho
    height: 650,     // Nuevo alto
    resizable: false,
    title: 'Configurar rutas de archivos',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.loadFile('rutas.html');
});

// Guardar rutas en el archivo de configuración
ipcMain.handle('guardar-rutas', async (event, rutas) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  config.rutas = rutas;
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
  return { ok: true };
});

// Cargar rutas desde el archivo de configuración
ipcMain.handle('cargar-rutas', async () => {
  if (fs.existsSync(configFile)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      return { ok: true, rutas: config.rutas || {} };
    } catch (e) {}
  }
  return { ok: false, rutas: {} };
});

// Inicializar archivo de configuración si no existe
if (!fs.existsSync(configFile)) {
  fs.writeFileSync(configFile, JSON.stringify({ rutas: {} }, null, 2), 'utf8');
}

// =========================
//      NUEVO HANDLER
// =========================
// Handler para obtener el Top 8 (standings) de un evento Start.gg
// Handler para obtener el estado de un evento Start.gg por ID
ipcMain.removeHandler('startgg-get-event-state');
ipcMain.handle('startgg-get-event-state', async (event, eventId) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const apikeyPath = rutas.apikey || path.join(userDataDir, 'apikey.json');
  let token = '';
  if (fs.existsSync(apikeyPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(apikeyPath, 'utf8'));
      token = data.startgg || '';
    } catch (e) {}
  }
  if (!token) return { error: 'No hay token de start.gg configurado.' };
  // Consulta GraphQL para estado del evento
  const query = `
    query EventState($eventId: ID!) {
      event(id: $eventId) {
        id
        name
        state
      }
    }
  `;
  try {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: { eventId } })
    });
    const data = await res.json();
    if (data.errors) return { error: data.errors[0]?.message || 'Error al consultar estado del evento.' };
    return { event: data.data.event, state: data.data.event?.state };
  } catch (e) {
    return { error: e.message };
  }
});

// Handler para obtener el Top 8 (standings) de un evento Start.gg
ipcMain.handle('startgg-get-standings', async (event, eventId) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const apikeyPath = rutas.apikey || path.join(userDataDir, 'apikey.json');
  let token = '';
  if (fs.existsSync(apikeyPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(apikeyPath, 'utf8'));
      token = data.startgg || '';
    } catch (e) {}
  }
  if (!token) return { error: 'No hay token de start.gg configurado.' };
  const queryStandings = `
    query EventStandings {
      event(id: ${eventId}) {
        name
        standings(query: { perPage: 8, page: 1 }) {
          nodes {
            placement
            entrant {
              name
            }
          }
        }
      }
    }
  `;
  try {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ query: queryStandings })
    });
    const data = await res.json();
    const nodes = data.data?.event?.standings?.nodes || [];
    const eventName = data.data?.event?.name || '';
    const top8 = nodes.map(n => ({
      nombre: n.entrant?.name || '',
      final_rank: n.placement || null
    }));
    return { ok: true, eventName, top8 };
  } catch (e) {
    return { error: e.message };
  }
});
ipcMain.handle('save-json-custom', async (event, data, ruta) => {
  try {
    fs.writeFileSync(ruta, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('get-all-matches-and-participants', async (event, slug) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const file = rutas.apikey || path.join(userDataDir, 'apikey.json');
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
    // DEVUELVE TODOS LOS MATCHES, sin filtros
    const matches = matchData.map(m => ({
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

ipcMain.handle('leer-personajes-txt', async (event) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const rutaTxt = rutas.personajes;
  if (!rutaTxt || !fs.existsSync(rutaTxt)) return { ok: false, error: 'No se encontró el archivo de personajes.' };
  try {
    const contenido = fs.readFileSync(rutaTxt, 'utf8');
    const personajes = contenido.split('\n').map(l => l.trim()).filter(l => l);
    return { ok: true, personajes };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('leer-usuarios-txt', async (event) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const rutaTxt = rutas.usuarios;
  if (!rutaTxt || !fs.existsSync(rutaTxt)) return { ok: false, error: 'No se encontró el archivo de usuarios.' };
  try {
    const contenido = fs.readFileSync(rutaTxt, 'utf8');
    const usuarios = contenido.split('\n').map(l => l.trim()).filter(l => l);
    return { ok: true, usuarios };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('guardar-apikey-token', async (event, filePath, token) => {
  try {
    let data = {};
    if (fs.existsSync(filePath)) {
      data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
    data.startgg = token; // Cambia aquí
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

// Ejemplo dentro de tu handler de consulta a start.gg
const config = fs.existsSync(configFile) ? JSON.parse(fs.readFileSync(configFile, 'utf8')) : {};
const rutas = config.rutas || {};
const apikeyPath = rutas.apikey || path.join(userDataDir, 'apikey.json');
let token = '';
if (fs.existsSync(apikeyPath)) {
  try {
    const data = JSON.parse(fs.readFileSync(apikeyPath, 'utf8'));
    token = data.startgg || '';
  } catch (e) {}
}
if (!token) return { error: 'No hay token de start.gg configurado.' };
// ...continúa con la consulta usando el token...

ipcMain.handle('leer-apikey-json', async (event, filePath) => {
  if (fs.existsSync(filePath)) {
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } catch (e) { return {}; }
  }
  return {};
});

ipcMain.handle('startgg-get-phase-name', async (event, phaseIds) => {
  let config = {};
  if (fs.existsSync(configFile)) {
    try { config = JSON.parse(fs.readFileSync(configFile, 'utf8')); } catch (e) {}
  }
  const rutas = config.rutas || {};
  const apikeyPath = rutas.apikey || path.join(userDataDir, 'apikey.json');
  let token = '';
  if (fs.existsSync(apikeyPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(apikeyPath, 'utf8'));
      token = data.startgg || '';
    } catch (e) {}
  }
  if (!token) return { error: 'No hay token de start.gg configurado.' };
  // Consulta los nombres de las fases
  const query = `
    query PhaseNames($phaseIds: [ID!]!) {
      phases(ids: $phaseIds) {
        id
        name
      }
    }
  `;
  try {
    const res = await fetch('https://api.start.gg/gql/alpha', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ query, variables: { phaseIds } })
    });
    const data = await res.json();
    if (data.errors) return { error: data.errors[0]?.message || 'Error al consultar nombres de fases.' };
    // Mapea los resultados a un objeto { [phaseId]: nombre }
    const phaseNames = {};
    data.data.phases.forEach(phase => {
      phaseNames[phase.id] = phase.name;
    });
    return { ok: true, phaseNames };
  } catch (e) {
    return { error: e.message };
  }
});

// =========================
//     APP LIFECYCLE
// =========================

app.on('window-all-closed', () => {
  if (httpServer) {
    httpServer.close(() => {
      console.log('[Stream Deck] Servidor HTTP cerrado');
    });
  }
  if (process.platform !== 'darwin') app.quit();
});

app.on('before-quit', () => {
  if (httpServer) {
    httpServer.close();
  }
});
