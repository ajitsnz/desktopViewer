const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getSources: () => ipcRenderer.invoke('GET_SOURCES'),
  onMenuAction: (cb) => ipcRenderer.on('menu-action', (_e, payload) => cb(payload)),
  onSystemLock: (cb) => ipcRenderer.on('system-lock', cb),
  onSystemUnlock: (cb) => ipcRenderer.on('system-unlock', cb)
});
