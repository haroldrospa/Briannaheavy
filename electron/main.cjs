const { app, BrowserWindow, Menu, ipcMain, shell, dialog } = require('electron');
const path = require('path');
const { startLocalServer } = require('./server.cjs');

let mainWindow = null;
let localServer = null;
let serverUrl = null;

// Evitar múltiples instancias simultáneas
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(initApp);
}

async function initApp() {
  try {
    const isDev = process.env.NODE_ENV === 'development';
    const distPath = path.join(__dirname, '../dist');

    // Iniciar el servidor local embebido con soporte SPA y API DGII
    const local = await startLocalServer(distPath);
    localServer = local.server;
    serverUrl = isDev && process.env.VITE_DEV_SERVER_URL 
      ? process.env.VITE_DEV_SERVER_URL 
      : local.url;

    createMainWindow();
    setupMenu();
    setupIpc();
  } catch (err) {
    console.error('Error al inicializar la aplicación:', err);
    dialog.showErrorBox(
      'Error de Inicialización',
      `No se pudo iniciar el servicio local de Brianna Heavy:\n${err.message}`
    );
    app.quit();
  }
}

function createMainWindow() {
  const iconPath = path.join(__dirname, '../build/icon.ico');

  mainWindow = new BrowserWindow({
    title: 'Brianna Heavy Equipment - Facturación & POS',
    icon: iconPath,
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 650,
    show: false,
    backgroundColor: '#0f172a',
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: true
    }
  });

  // Maximizar ventana para experiencia óptima de punto de venta y escritorio
  mainWindow.maximize();

  mainWindow.loadURL(serverUrl);

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Abrir enlaces externos en el navegador predeterminado de Windows
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.startsWith(serverUrl)) {
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function setupMenu() {
  const isMac = process.platform === 'darwin';

  const template = [
    {
      label: 'Archivo',
      submenu: [
        {
          label: 'Imprimir pantalla / Factura actual',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.print({ silent: false, printBackground: true });
            }
          }
        },
        { type: 'separator' },
        isMac ? { role: 'close' } : { label: 'Salir', role: 'quit', accelerator: 'Alt+F4' }
      ]
    },
    {
      label: 'Edición',
      submenu: [
        { label: 'Deshacer', role: 'undo' },
        { label: 'Rehacer', role: 'redo' },
        { type: 'separator' },
        { label: 'Cortar', role: 'cut' },
        { label: 'Copiar', role: 'copy' },
        { label: 'Pegar', role: 'paste' },
        { label: 'Seleccionar todo', role: 'selectAll' }
      ]
    },
    {
      label: 'Ver',
      submenu: [
        { label: 'Recargar', role: 'reload', accelerator: 'F5' },
        { label: 'Recarga forzada', role: 'forceReload', accelerator: 'Ctrl+F5' },
        { type: 'separator' },
        { label: 'Pantalla completa', role: 'togglefullscreen', accelerator: 'F11' },
        { type: 'separator' },
        { label: 'Aumentar Zoom', role: 'zoomIn', accelerator: 'CmdOrCtrl+Plus' },
        { label: 'Reducir Zoom', role: 'zoomOut', accelerator: 'CmdOrCtrl+-' },
        { label: 'Restablecer Zoom', role: 'resetZoom', accelerator: 'CmdOrCtrl+0' }
      ]
    },
    {
      label: 'Ventana',
      submenu: [
        { label: 'Minimizar', role: 'minimize' },
        { label: 'Zoom / Maximizar', role: 'zoom' },
        { type: 'separator' },
        { label: 'Cerrar', role: 'close' }
      ]
    },
    {
      label: 'Ayuda',
      submenu: [
        {
          label: 'Acerca de Brianna Heavy Equipment',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Acerca de Brianna Heavy Equipment',
              message: 'Brianna Heavy Equipment - Sistema de Gestión & POS',
              detail: `Versión Desktop para Windows: 1.0.0\nPlataforma: Windows x64 Nativo\nEmpresa: Brianna Heavy Equipment S.R.L.\nFacturación Electrónica DGII (e-CF) integrada.`,
              icon: path.join(__dirname, '../build/icon.ico')
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function syncThermalPrinterDevMode(printerName = '4BARCODE 4B-2074B') {
  if (process.platform !== 'win32') return;
  try {
    const { exec } = require('child_process');
    const psCmd = `powershell -NoProfile -ExecutionPolicy Bypass -Command "$d = (Get-ItemProperty -Path 'HKCU:\\Printers\\DevModes2' -ErrorAction SilentlyContinue).'${printerName}'; if ($d) { Set-ItemProperty -Path 'HKCU:\\Printers\\DevModePerUser' -Name '${printerName}' -Value $d -ErrorAction SilentlyContinue }"`;
    exec(psCmd, () => {});
  } catch (e) {}
}

function setupIpc() {
  ipcMain.handle('app:version', () => app.getVersion());

  ipcMain.handle('window:minimize', () => {
    if (mainWindow) mainWindow.minimize();
  });

  ipcMain.handle('window:maximize', () => {
    if (mainWindow) {
      if (mainWindow.isMaximized()) {
        mainWindow.unmaximize();
      } else {
        mainWindow.maximize();
      }
    }
  });

  ipcMain.handle('window:close', () => {
    if (mainWindow) mainWindow.close();
  });

  ipcMain.handle('window:isMaximized', () => {
    return mainWindow ? mainWindow.isMaximized() : false;
  });

  ipcMain.handle('printer:get-list', async () => {
    if (!mainWindow) return [];
    return await mainWindow.webContents.getPrintersAsync();
  });

  ipcMain.handle('printer:print', async (event, options = {}) => {
    if (!mainWindow) return { success: false, error: 'Ventana no disponible' };
    return new Promise((resolve) => {
      const printOptions = {
        silent: options.silent === true,
        printBackground: options.printBackground !== false,
        deviceName: options.deviceName || '',
        color: false,
        margins: options.margins || { marginType: 'none' },
        copies: options.copies || 1
      };

      if (options.pageSize) {
        printOptions.pageSize = options.pageSize;
      }

      mainWindow.webContents.print(printOptions, (success, failureReason) => {
        if (!success) {
          console.warn('[Printer Error]', failureReason);
          resolve({ success: false, error: failureReason });
        } else {
          resolve({ success: true });
        }
      });
    });
  });

  ipcMain.handle('printer:print-label-html', async (event, data = {}) => {
    const { 
      html, 
      deviceName, 
      widthMm = 30, 
      heightMm = 20, 
      copies = 1,
      silent = true 
    } = data;

    return new Promise((resolve) => {
      try {
        if (deviceName && deviceName.includes('4BARCODE')) {
          syncThermalPrinterDevMode(deviceName);
        }

        const printWin = new BrowserWindow({
          show: false,
          width: 400,
          height: 400,
          webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
          }
        });

        const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    @page {
      size: ${widthMm}mm ${heightMm}mm;
      margin: 0 !important;
    }
    * {
      box-sizing: border-box !important;
      margin: 0;
      padding: 0;
    }
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background-color: #ffffff !important;
      color: #000000 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .label-page {
      width: ${widthMm}mm !important;
      height: ${heightMm}mm !important;
      max-width: ${widthMm}mm !important;
      max-height: ${heightMm}mm !important;
      overflow: hidden !important;
      page-break-inside: avoid !important;
      break-inside: avoid !important;
      page-break-after: always !important;
      break-after: page !important;
      box-sizing: border-box !important;
      margin: 0 auto !important;
      padding: 0 !important;
      border: none !important;
    }
    .label-page:last-child {
      page-break-after: avoid !important;
      break-after: avoid !important;
    }
  </style>
</head>
<body>
${html}
</body>
</html>`;

        printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`);

        printWin.webContents.once('did-finish-load', () => {
          setTimeout(() => {
            printWin.webContents.print(
              {
                silent: silent !== false,
                deviceName: deviceName || '',
                color: false,
                margins: { marginType: 'none' },
                pageSize: { width: Math.round(widthMm * 1000), height: Math.round(heightMm * 1000) },
                copies: 1
              },
              (success, failureReason) => {
                try {
                  printWin.close();
                } catch (e) {}
                if (!success) {
                  console.warn('[print-label-html error]:', failureReason);
                  resolve({ success: false, error: failureReason });
                } else {
                  resolve({ success: true });
                }
              }
            );
          }, 150);
        });

        printWin.webContents.on('did-fail-load', (e, code, desc) => {
          try { printWin.close(); } catch (err) {}
          resolve({ success: false, error: desc });
        });
      } catch (err) {
        console.error('[print-label-html exception]:', err);
        resolve({ success: false, error: err.message });
      }
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (localServer) {
      localServer.close();
    }
    app.quit();
  }
});
