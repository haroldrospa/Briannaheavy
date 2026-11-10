const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  platform: process.platform,
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
  isWindowMaximized: () => ipcRenderer.invoke('window:isMaximized'),
  getPrinters: () => ipcRenderer.invoke('printer:get-list'),
  print: (options) => ipcRenderer.invoke('printer:print', options),
  printLabelHtml: (data) => ipcRenderer.invoke('printer:print-label-html', data)
});
