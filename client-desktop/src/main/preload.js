const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  downloadMedia: (track, folder, format) => ipcRenderer.invoke('download-media', track, folder, format)
});
