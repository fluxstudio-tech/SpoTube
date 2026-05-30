const { app, BrowserWindow, ipcMain, dialog, net, Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');
const youtubedl = require('youtube-dl-exec');

let mainWindow;
let tray = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      backgroundThrottling: false,
      preload: path.join(__dirname, 'preload.js')
    },
    backgroundColor: '#121212'
  });

  mainWindow.loadURL('http://localhost:5173');

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith('http://')) {
      require('electron').shell.openExternal(url);
      return { action: 'deny' };
    }
    return { action: 'allow' };
  });

  mainWindow.on('close', function (event) {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
    return false;
  });
}

const initializeTray = () => {
  let iconPath = path.join(__dirname, '..', '..', 'public', 'favicon.ico');
  if (!fs.existsSync(iconPath)) iconPath = path.join(__dirname, 'icon.png');

  let trayIcon = nativeImage.createEmpty();
  try {
    if (fs.existsSync(iconPath)) {
      trayIcon = nativeImage.createFromPath(iconPath);
    } else {
      trayIcon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAAQSURBVBhXY/jPwMAAAwEA+wEBAf9lGzQAAAAASUVORK5CYII=');
    }
  } catch (e) {}

  tray = new Tray(trayIcon);
  const contextMenu = Menu.buildFromTemplate([
    { label: 'Uygulamayı Göster', click: () => { mainWindow.show(); } },
    { type: 'separator' },
    { label: 'Programdan Çık (Kapat)', click: () => {
      app.isQuiting = true;
      app.quit();
    }}
  ]);
  tray.setToolTip('SpoTube');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    mainWindow.show();
  });
};

app.whenReady().then(() => {
  createWindow();
  initializeTray();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {});

ipcMain.on('window-controls', (event, action) => {
  if (!mainWindow) return;
  if (action === 'close') {
    mainWindow.hide();
  }
  if (action === 'minimize') mainWindow.minimize();
  if (action === 'maximize') {
    mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize();
  }
});

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory', 'createDirectory'],
    title: 'Müziklerin İneceği Klasörü Seçin',
    buttonLabel: 'Buraya İndir'
  });

  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle('download-media', async (event, track, folder, format) => {
  try {
    if (!fs.existsSync(folder)) throw new Error('Seçilen klasör bulunamadı.');

    const safeTitle = track.title.replace(/[^\w\s.-şğçöüıŞĞÇÖÜİ]/gi, '').trim();
    const filePath = path.join(folder, `SpoTube_${safeTitle}.%(ext)s`);

    const result = await youtubedl(`https://www.youtube.com/watch?v=${track.id}`, {
      output: filePath,
      format: format === 'mp4' ? 'b' : 'ba',
      noCheckCertificates: true,
      noWarnings: true
    });

    return { success: true, filePath: folder };
  } catch (err) {
    console.error('Download Error:', err);
    return { success: false, error: err.message || JSON.stringify(err) };
  }
});
