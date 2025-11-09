// Load environment variables first
import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('Environment loaded. ONLYWORKS_SERVER_URL:', process.env.ONLYWORKS_SERVER_URL);

import { app, BrowserWindow, ipcMain } from 'electron';
import { isDev } from './utils/env';
import { createOverlayWindow, closeOverlayWindow } from './overlayWindow';
import { AuthService } from './services/authService';
import { BackendApiService } from './services/BackendApiService';
import { SecureApiProxyService } from './services/SecureApiProxyService';

class OnlyWorksApp {
  private mainWindow: BrowserWindow | null = null;
  private overlayWindow: BrowserWindow | null = null;
  private authService: AuthService;
  private backendApi: BackendApiService;
  private secureApiProxy: SecureApiProxyService;

  constructor() {
    this.authService = AuthService.getInstance();
    this.backendApi = BackendApiService.getInstance();
    this.secureApiProxy = SecureApiProxyService.getInstance();
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

    // Backend API handlers
    ipcMain.handle('api:health-check', async () => {
      try {
        return await this.backendApi.healthCheck();
      } catch (error) {
        console.error('Health check error:', error);
        throw error;
      }
    });

    // User management
    ipcMain.handle('api:get-user-profile', async () => {
      try {
        return await this.backendApi.getUserProfile();
      } catch (error) {
        console.error('Get user profile error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:update-user-profile', async (event, profileData: any) => {
      try {
        return await this.backendApi.updateUserProfile(profileData);
      } catch (error) {
        console.error('Update user profile error:', error);
        throw error;
      }
    });

    // Session management
    ipcMain.handle('api:start-session', async (event, sessionData: { session_name?: string; goal_description?: string }) => {
      try {
        return await this.backendApi.startSession(sessionData);
      } catch (error) {
        console.error('Start session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:end-session', async (event, sessionId: string) => {
      try {
        return await this.backendApi.endSession(sessionId);
      } catch (error) {
        console.error('End session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:pause-session', async (event, sessionId: string) => {
      try {
        return await this.backendApi.pauseSession(sessionId);
      } catch (error) {
        console.error('Pause session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:resume-session', async (event, sessionId: string) => {
      try {
        return await this.backendApi.resumeSession(sessionId);
      } catch (error) {
        console.error('Resume session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-active-session', async () => {
      try {
        return await this.backendApi.getActiveSession();
      } catch (error) {
        console.error('Get active session error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-user-sessions', async (event, options: any = {}) => {
      try {
        return await this.backendApi.getUserSessions(options);
      } catch (error) {
        console.error('Get user sessions error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-session-by-id', async (event, sessionId: string) => {
      try {
        return await this.backendApi.getSessionById(sessionId);
      } catch (error) {
        console.error('Get session by ID error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:update-session-scores', async (event, sessionId: string, scores: any) => {
      try {
        return await this.backendApi.updateSessionScores(sessionId, scores);
      } catch (error) {
        console.error('Update session scores error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:get-session-stats', async (event, dateFrom?: string, dateTo?: string) => {
      try {
        return await this.backendApi.getSessionStats(dateFrom, dateTo);
      } catch (error) {
        console.error('Get session stats error:', error);
        throw error;
      }
    });

    // Generic API handlers
    ipcMain.handle('api:get', async (event, endpoint: string) => {
      try {
        return await this.backendApi.get(endpoint);
      } catch (error) {
        console.error('API GET error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:post', async (event, endpoint: string, body?: any) => {
      try {
        return await this.backendApi.post(endpoint, body);
      } catch (error) {
        console.error('API POST error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:put', async (event, endpoint: string, body?: any) => {
      try {
        return await this.backendApi.put(endpoint, body);
      } catch (error) {
        console.error('API PUT error:', error);
        throw error;
      }
    });

    ipcMain.handle('api:delete', async (event, endpoint: string) => {
      try {
        return await this.backendApi.delete(endpoint);
      } catch (error) {
        console.error('API DELETE error:', error);
        throw error;
      }
    });

    // Secure API Proxy handlers
    ipcMain.handle('secure-api:call', async (event, request: any) => {
      try {
        return await this.secureApiProxy.makeSecureApiCall(request);
      } catch (error) {
        console.error('Secure API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:gemini', async (event, prompt: string, imageData?: string) => {
      try {
        return await this.secureApiProxy.callGeminiAI(prompt, imageData);
      } catch (error) {
        console.error('Gemini API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:openai', async (event, prompt: string, model?: string) => {
      try {
        return await this.secureApiProxy.callOpenAI(prompt, model);
      } catch (error) {
        console.error('OpenAI API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:custom', async (event, endpoint: string, method: string, options: any) => {
      try {
        return await this.secureApiProxy.callCustomAPI(endpoint, method as any, options);
      } catch (error) {
        console.error('Custom API call error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:test-connectivity', async () => {
      try {
        return await this.secureApiProxy.testApiConnectivity();
      } catch (error) {
        console.error('API connectivity test error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:update-credentials', async (event, credentials: any) => {
      try {
        return await this.secureApiProxy.updateCredentials(credentials);
      } catch (error) {
        console.error('Update credentials error:', error);
        throw error;
      }
    });

    ipcMain.handle('secure-api:clear-credentials', async () => {
      try {
        return await this.secureApiProxy.clearCredentials();
      } catch (error) {
        console.error('Clear credentials error:', error);
        throw error;
      }
    });
  }
}

// Create app instance
new OnlyWorksApp();