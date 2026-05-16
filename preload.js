// preload.js seguro para exponer ipcRenderer
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ipcRenderer', {
  invoke: (channel, ...args) => ipcRenderer.invoke(channel, ...args)
});
