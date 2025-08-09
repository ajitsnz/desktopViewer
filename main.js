const { app, BrowserWindow, desktopCapturer, ipcMain, Menu, dialog, powerMonitor } = require('electron');
const path = require('path');

let mainWindow;
let qualityChoice = 'best';

function sendMenuAction(type, data) {
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('menu-action', { type, data });
  }
}

function buildMenu() {
  const template = [
    {
      label: 'Connection',
      submenu: [
        { label: 'Connect', accelerator: 'CmdOrCtrl+K', click: () => sendMenuAction('connect') },
        { type: 'separator' },
        {
          label: 'Quality',
          submenu: [
            { label: 'Speed (720p 15fps)', type: 'radio', checked: qualityChoice === 'speed', click: () => { qualityChoice = 'speed'; sendMenuAction('quality', 'speed'); } },
            { label: 'Best (1080p 30fps)', type: 'radio', checked: qualityChoice === 'best', click: () => { qualityChoice = 'best'; sendMenuAction('quality', 'best'); } }
          ]
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { label: 'Swap', accelerator: 'CmdOrCtrl+S', click: () => sendMenuAction('swap') },
        { label: 'Remote Full', click: () => sendMenuAction('remote-full') },
        { label: 'Local Full', click: () => sendMenuAction('local-full') },
        { label: 'Side by Side', click: () => sendMenuAction('side') },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { role: 'reload' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Sources',
      submenu: [
        { label: 'Refresh Sources', accelerator: 'F5', click: () => sendMenuAction('refresh-sources') }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'About',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: 'About DesktopShare',
              message: 'DesktopShare\nFree to use.\nSimple peer-to-peer desktop sharing demonstration.',
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  mainWindow.loadFile('index.html');
  buildMenu();
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
  powerMonitor.on('lock-screen', () => { if (mainWindow) mainWindow.webContents.send('system-lock'); });
  powerMonitor.on('unlock-screen', () => { if (mainWindow) mainWindow.webContents.send('system-unlock'); });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// Expose screen sources to renderer
ipcMain.handle('GET_SOURCES', async () => {
  const sources = await desktopCapturer.getSources({ types: ['screen', 'window'] });
  return sources.map(s => ({ id: s.id, name: s.name, thumbnail: s.thumbnail.toDataURL() }));
});
