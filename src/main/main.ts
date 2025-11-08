import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import { isDev } from './utils/env';
import { createOverlayWindow, closeOverlayWindow } from './overlayWindow';
import { AuthService } from './services/authService';

class OnlyWorksApp {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private authService: AuthService;

  constructor() {
    this.authService = AuthService.getInstance();
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

    // Authentication handlers
    ipcMain.handle('auth:init-oauth', async (event, provider: string) => {
      try {
        return await this.authService.initOAuth(provider);
      } catch (error) {
        console.error('Auth init error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:open-oauth-window', async (event, authUrl: string) => {
      try {
        return await this.authService.openOAuthWindow(authUrl);
      } catch (error) {
        console.error('Auth window error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:store-session', async (event, session: any) => {
      try {
        await this.authService.storeSession(session);
      } catch (error) {
        console.error('Store session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:get-stored-session', async () => {
      try {
        return await this.authService.getStoredSession();
      } catch (error) {
        console.error('Get stored session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:clear-session', async () => {
      try {
        await this.authService.clearSession();
      } catch (error) {
        console.error('Clear session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:validate-session', async (event, session: any) => {
      try {
        return await this.authService.validateSession(session);
      } catch (error) {
        console.error('Validate session error:', error);
        throw error;
      }
    });

    ipcMain.handle('auth:refresh-token', async (event, refreshToken: string) => {
      try {
        return await this.authService.refreshAuthToken(refreshToken);
      } catch (error) {
        console.error('Refresh token error:', error);
        throw error;
      }
    });

    // Add more IPC handlers as needed
  }
}

// Create app instance
new OnlyWorksApp();