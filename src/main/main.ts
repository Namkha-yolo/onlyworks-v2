import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { isDev } from './utils/env';
import { createOverlayWindow, closeOverlayWindow } from './overlayWindow';

class OnlyWorksApp {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;

  constructor() {
    this.init();
  }

  private init() {
    // Handle app ready
    app.whenReady().then(() => {
      this.createMainWindow();
      this.createOverlay();
      this.setupIPC();

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
          this.createMainWindow();
          this.createOverlay();
        }
      });
    });

    // Handle app window closed
    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    // Security: Prevent new window creation
    app.on('web-contents-created', (_, contents) => {
      contents.setWindowOpenHandler(() => {
        return { action: 'deny' };
      });
    });
  }

  private createMainWindow() {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      minWidth: 800,
      minHeight: 600,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hidden',
      trafficLightPosition: { x: 20, y: 12 },
      show: false,
    });

    // Load the app
    this.mainWindow.loadFile(path.join(__dirname, 'index.html'));

    if (isDev()) {
      this.mainWindow.webContents.openDevTools();
    }

    // Show window when ready
    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private createOverlay() {
    this.overlayWindow = createOverlayWindow();

    this.overlayWindow.on('closed', () => {
      this.overlayWindow = null;
    });
  }

  private setupIPC() {
    // Test IPC
    ipcMain.handle('ping', () => {
      return 'pong';
    });

    // Open/focus dashboard
    ipcMain.handle('open-dashboard', () => {
      if (this.mainWindow) {
        if (this.mainWindow.isMinimized()) {
          this.mainWindow.restore();
        }
        this.mainWindow.show();
        this.mainWindow.focus();
      }
    });

    // Add more IPC handlers as needed
  }
}

// Create app instance
new OnlyWorksApp();