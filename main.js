const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const configFile = path.join(app.getPath('userData'), 'scoreboard-config.json');
let saveDir = null;
let userApiKey = null;

// Quitar menú superior
app.on('browser-window-created', (_, win) => {
  win.setMenu(null);
});

// Pregunta solo la primera vez
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
//top8
ipcMain.handle('get-top8', async (event, slug) => {
  // Usa la misma lógica que tu handler de Challonge
  if (!userApiKey) return { error: 'API key no establecida.' };
  const url = `https://api.challonge.com/v1/tournaments/${slug}/participants.json?api_key=${userApiKey}`;
  try {
    const res = await require('node-fetch')(url);
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
//twitch integration
const tmi = require('tmi.js');

let twitchBot = null;
let twitchChannelActual = '';

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



//personajes

ipcMain.handle('get-personajes', async (event, juegoFolder) => {
  // juegoFolder es algo como 'SF6', 'UNI2', etc
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

//
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

app.whenReady().then(createWindow);

// Guardar scoreboard JSON
ipcMain.handle('save-json', async (event, data) => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'scoreboard.json');
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  return { ok: true, file };
});

// Abrir carpeta de guardado
ipcMain.handle('open-folder', async () => {
  const dir = ensureSaveDir();
  shell.openPath(dir);
  return { ok: true, dir };
});

// Cargar scoreboard JSON
ipcMain.handle('load-json', async () => {
  const dir = ensureSaveDir();
  const file = path.join(dir, 'scoreboard.json');
  if (fs.existsSync(file)) {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    return { ok: true, data, file };
  }
  return { ok: false, file };
});

// Guardar Challonge API Key
ipcMain.handle('save-config', async (event, { apiKey, oauth, twitchUser, twitchChannel }) => {
  const configPath = path.join(app.getPath('userData'), 'scoreboard-config.json');
  let config = {};
  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    } catch(e) {}
  }
  if (apiKey !== undefined) config.apiKey = apiKey;
  if (oauth !== undefined) config.twitchOAuth = oauth;
  if (twitchUser !== undefined) config.twitchUser = twitchUser;
  if (twitchChannel !== undefined) config.twitchChannel = twitchChannel;
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf8');
  return { ok: true };
});

// Cargar Challonge API Key
ipcMain.handle('load-config', async () => {
  const configPath = path.join(app.getPath('userData'), 'scoreboard-config.json');
  if (fs.existsSync(configPath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      return { ok: true, config };
    } catch(e) {}
  }
  return { ok: false, config: {} };
});


// Obtener jugadores desde Challonge
ipcMain.handle('get-participants', async (event, slug) => {
  if (!userApiKey) return { error: 'API key no establecida.' };
  const url = `https://api.challonge.com/v1/tournaments/${slug}/participants.json?api_key=${userApiKey}`;
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
