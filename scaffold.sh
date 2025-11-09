#!/bin/bash

# OnlyWorks Application Scaffold
# This script sets up a complete desktop productivity app with screenshot capture,
# AI analysis, and OAuth authentication - all handled server-side for production readiness.

set -e

echo "🚀 OnlyWorks Application Scaffold"
echo "================================="

# Configuration
PROJECT_NAME="onlyworks-v2"
BACKEND_NAME="onlyworks-backend-server"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."

    command -v node >/dev/null 2>&1 || { print_error "Node.js is required but not installed. Aborting."; exit 1; }
    command -v npm >/dev/null 2>&1 || { print_error "npm is required but not installed. Aborting."; exit 1; }
    command -v git >/dev/null 2>&1 || { print_error "git is required but not installed. Aborting."; exit 1; }

    print_status "Prerequisites check completed"
}

# Create project structure
create_project_structure() {
    print_info "Creating project structure..."

    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"

    # Frontend structure
    mkdir -p src/{main,renderer}/{components,services,stores,pages,utils}
    mkdir -p src/main/services
    mkdir -p src/renderer/{components/{auth,capture,analysis},pages,services,stores,utils}
    mkdir -p public assets

    # Backend structure
    mkdir -p "../$BACKEND_NAME"
    cd "../$BACKEND_NAME"
    mkdir -p api/{auth/{oauth/google},screenshots,analysis,health}
    mkdir -p src/{services,utils,middleware}
    mkdir -p docs tests

    cd "../$PROJECT_NAME"
    print_status "Project structure created"
}

# Initialize frontend (Electron app)
setup_frontend() {
    print_info "Setting up Electron frontend..."

    # Package.json for frontend
    cat > package.json << 'EOF'
{
  "name": "onlyworks-v2",
  "version": "1.0.0",
  "description": "AI-powered productivity tracker with screenshot analysis",
  "main": "dist/main/main.js",
  "scripts": {
    "start": "electron .",
    "dev": "npm run build:dev && electron .",
    "build": "npm run build:main && npm run build:renderer",
    "build:dev": "npm run build:main:dev && npm run build:renderer:dev",
    "build:main": "webpack --config webpack.main.config.js --mode=production",
    "build:main:dev": "webpack --config webpack.main.config.js --mode=development",
    "build:renderer": "webpack --config webpack.renderer.config.js --mode=production",
    "build:renderer:dev": "webpack --config webpack.renderer.config.js --mode=development",
    "watch": "npm run build:dev && electron . --watch",
    "package": "npm run build && electron-builder",
    "test": "jest"
  },
  "keywords": ["productivity", "ai", "electron", "screenshot", "analysis"],
  "author": "OnlyWorks",
  "license": "MIT",
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0",
    "electron": "^27.0.0",
    "electron-builder": "^24.0.0",
    "typescript": "^5.0.0",
    "webpack": "^5.0.0",
    "webpack-cli": "^5.0.0",
    "ts-loader": "^9.0.0",
    "html-webpack-plugin": "^5.0.0",
    "css-loader": "^6.0.0",
    "style-loader": "^3.0.0",
    "tailwindcss": "^3.0.0",
    "autoprefixer": "^10.0.0",
    "postcss": "^8.0.0",
    "postcss-loader": "^7.0.0"
  },
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "zustand": "^4.0.0",
    "electron-store": "^8.0.0",
    "dotenv": "^16.0.0"
  }
}
EOF

    # Main process files
    cat > src/main/main.ts << 'EOF'
import { app, BrowserWindow, ipcMain, screen } from 'electron';
import * as path from 'path';
import { config } from 'dotenv';
import { AuthService } from './services/AuthService';
import { CaptureService } from './services/CaptureService';
import { AnalysisService } from './services/AnalysisService';
import { ScreenshotUploadService } from './services/ScreenshotUploadService';

// Load environment variables
config();

class OnlyWorksApp {
  private mainWindow: BrowserWindow | null = null;
  private authService: AuthService;
  private captureService: CaptureService;
  private analysisService: AnalysisService;
  private uploadService: ScreenshotUploadService;

  constructor() {
    this.authService = AuthService.getInstance();
    this.captureService = new CaptureService();
    this.analysisService = new AnalysisService();
    this.uploadService = new ScreenshotUploadService();
  }

  private createWindow(): void {
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      },
      titleBarStyle: 'hiddenInset',
      show: false,
    });

    if (process.env.NODE_ENV === 'development') {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
      this.mainWindow.webContents.openDevTools();
    } else {
      this.mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
    }

    this.mainWindow.once('ready-to-show', () => {
      this.mainWindow?.show();
    });

    this.mainWindow.on('closed', () => {
      this.mainWindow = null;
    });
  }

  private setupIpcHandlers(): void {
    // Authentication handlers
    ipcMain.handle('auth:init-oauth', async (_, provider: string) => {
      return await this.authService.initOAuth(provider);
    });

    ipcMain.handle('auth:open-oauth-window', async (_, authUrl: string) => {
      return await this.authService.openOAuthWindow(authUrl);
    });

    ipcMain.handle('auth:store-session', async (_, session: any) => {
      return await this.authService.storeSession(session);
    });

    ipcMain.handle('auth:get-stored-session', async () => {
      return await this.authService.getStoredSession();
    });

    ipcMain.handle('auth:clear-session', async () => {
      return await this.authService.clearSession();
    });

    ipcMain.handle('auth:validate-session', async (_, session: any) => {
      return await this.authService.validateSession(session);
    });

    ipcMain.handle('auth:refresh-token', async (_, refreshToken: string) => {
      return await this.authService.refreshAuthToken(refreshToken);
    });

    // Screenshot capture handlers
    ipcMain.handle('capture:take-screenshot', async () => {
      const screenshot = await this.captureService.takeScreenshot();
      if (screenshot) {
        // Upload to server and get analysis
        const uploadResult = await this.uploadService.uploadScreenshot(screenshot);
        if (uploadResult.success) {
          const analysis = await this.analysisService.requestAnalysis(uploadResult.screenshotId);
          return { screenshot: uploadResult, analysis };
        }
      }
      return null;
    });

    ipcMain.handle('capture:start-session', async (_, sessionData: any) => {
      return await this.captureService.startCaptureSession(sessionData);
    });

    ipcMain.handle('capture:stop-session', async (_, sessionId: string) => {
      return await this.captureService.stopCaptureSession(sessionId);
    });

    // Analysis handlers
    ipcMain.handle('analysis:get-session-analysis', async (_, sessionId: string) => {
      return await this.analysisService.getSessionAnalysis(sessionId);
    });

    ipcMain.handle('analysis:get-productivity-insights', async (_, timeRange: string) => {
      return await this.analysisService.getProductivityInsights(timeRange);
    });
  }

  public async initialize(): Promise<void> {
    await app.whenReady();
    this.createWindow();
    this.setupIpcHandlers();

    app.on('window-all-closed', () => {
      if (process.platform !== 'darwin') {
        app.quit();
      }
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        this.createWindow();
      }
    });
  }
}

// Initialize application
const onlyWorksApp = new OnlyWorksApp();
onlyWorksApp.initialize().catch(console.error);
EOF

    # Preload script
    cat > src/main/preload.ts << 'EOF'
import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use the ipcRenderer
contextBridge.exposeInMainWorld('api', {
  // Authentication methods
  initOAuth: (provider: string) => ipcRenderer.invoke('auth:init-oauth', provider),
  openOAuthWindow: (authUrl: string) => ipcRenderer.invoke('auth:open-oauth-window', authUrl),
  storeSession: (session: any) => ipcRenderer.invoke('auth:store-session', session),
  getStoredSession: () => ipcRenderer.invoke('auth:get-stored-session'),
  clearSession: () => ipcRenderer.invoke('auth:clear-session'),
  validateSession: (session: any) => ipcRenderer.invoke('auth:validate-session', session),
  refreshAuthToken: (refreshToken: string) => ipcRenderer.invoke('auth:refresh-token', refreshToken),

  // Screenshot capture methods
  takeScreenshot: () => ipcRenderer.invoke('capture:take-screenshot'),
  startCaptureSession: (sessionData: any) => ipcRenderer.invoke('capture:start-session', sessionData),
  stopCaptureSession: (sessionId: string) => ipcRenderer.invoke('capture:stop-session', sessionId),

  // Analysis methods
  getSessionAnalysis: (sessionId: string) => ipcRenderer.invoke('analysis:get-session-analysis', sessionId),
  getProductivityInsights: (timeRange: string) => ipcRenderer.invoke('analysis:get-productivity-insights', timeRange),
});

// Type definitions for the exposed API
declare global {
  interface Window {
    api: {
      // Authentication
      initOAuth: (provider: string) => Promise<string>;
      openOAuthWindow: (authUrl: string) => Promise<any>;
      storeSession: (session: any) => Promise<void>;
      getStoredSession: () => Promise<any>;
      clearSession: () => Promise<void>;
      validateSession: (session: any) => Promise<boolean>;
      refreshAuthToken: (refreshToken: string) => Promise<any>;

      // Screenshot capture
      takeScreenshot: () => Promise<any>;
      startCaptureSession: (sessionData: any) => Promise<any>;
      stopCaptureSession: (sessionId: string) => Promise<void>;

      // Analysis
      getSessionAnalysis: (sessionId: string) => Promise<any>;
      getProductivityInsights: (timeRange: string) => Promise<any>;
    };
  }
}
EOF

    # AuthService
    cat > src/main/services/AuthService.ts << 'EOF'
import { BrowserWindow, shell } from 'electron';
import Store from 'electron-store';

interface AuthSession {
  access_token: string;
  refresh_token?: string;
  expires_at?: number;
  user: {
    id: string;
    email: string;
    name?: string;
    avatar_url?: string;
    provider?: string;
  };
}

const store = new Store({
  name: 'auth-session',
  encryptionKey: 'onlyworks-auth-key',
});

export class AuthService {
  private static instance: AuthService;
  private serverUrl: string;

  constructor() {
    this.serverUrl = process.env.ONLYWORKS_SERVER_URL || 'http://localhost:3001';
  }

  static getInstance(): AuthService {
    if (!AuthService.instance) {
      AuthService.instance = new AuthService();
    }
    return AuthService.instance;
  }

  async initOAuth(provider: string): Promise<string> {
    try {
      console.log('[AuthService] Initiating OAuth for provider:', provider);
      const response = await fetch(`${this.serverUrl}/api/auth/oauth/${provider}/init`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`OAuth init failed: ${response.status}`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'OAuth initialization failed');
      }

      return data.data.auth_url;
    } catch (error) {
      console.error('OAuth initialization error:', error);
      throw error;
    }
  }

  async openOAuthWindow(authUrl: string): Promise<AuthSession | null> {
    return new Promise((resolve) => {
      let isResolved = false;
      const safeResolve = (value: AuthSession | null) => {
        if (!isResolved) {
          isResolved = true;
          resolve(value);
        }
      };

      const authWindow = new BrowserWindow({
        width: 500,
        height: 600,
        show: true,
        resizable: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
        parent: BrowserWindow.getFocusedWindow() || undefined,
        modal: true,
        title: 'Sign in to OnlyWorks',
      });

      authWindow.loadURL(authUrl);

      const handleCallback = async (url: string) => {
        if (authWindow.isDestroyed()) return;

        const urlObj = new URL(url);
        const isCallback = urlObj.searchParams.has('code') || url.includes('#access_token=');

        if (isCallback) {
          console.log('[AuthService] Detected OAuth callback');
          const code = urlObj.searchParams.get('code');

          if (code) {
            try {
              const response = await fetch(`${this.serverUrl}/api/auth/callback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code, provider: 'google' }),
              });

              const data = await response.json();
              if (data.success && data.data) {
                const session: AuthSession = {
                  access_token: data.data.access_token,
                  refresh_token: data.data.refresh_token,
                  expires_at: data.data.expires_at,
                  user: data.data.user,
                };

                await this.storeSession(session);
                this.safeCloseWindow(authWindow);
                safeResolve(session);
                return;
              }
            } catch (error) {
              console.error('Code exchange error:', error);
            }
          }

          this.safeCloseWindow(authWindow);
          safeResolve(null);
        }
      };

      authWindow.webContents.on('will-redirect', (_, url) => {
        if (!isResolved) handleCallback(url);
      });

      authWindow.webContents.on('did-navigate', (_, url) => {
        if (!isResolved) handleCallback(url);
      });

      authWindow.on('closed', () => safeResolve(null));

      authWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
      });
    });
  }

  private safeCloseWindow(window: BrowserWindow): void {
    try {
      if (!window.isDestroyed()) {
        window.close();
      }
    } catch (error) {
      console.error('Error closing window:', error);
    }
  }

  async storeSession(session: AuthSession): Promise<void> {
    try {
      store.set('session', session);
    } catch (error) {
      console.error('Failed to store session:', error);
      throw error;
    }
  }

  async getStoredSession(): Promise<AuthSession | null> {
    try {
      return store.get('session') as AuthSession || null;
    } catch (error) {
      console.error('Failed to get stored session:', error);
      return null;
    }
  }

  async clearSession(): Promise<void> {
    try {
      store.delete('session');
    } catch (error) {
      console.error('Failed to clear session:', error);
      throw error;
    }
  }

  async validateSession(session: AuthSession): Promise<boolean> {
    try {
      if (session.expires_at && session.expires_at <= Date.now()) {
        return false;
      }

      const response = await fetch(`${this.serverUrl}/api/auth/validate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ access_token: session.access_token }),
      });

      return response.ok;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  async refreshAuthToken(refreshToken: string): Promise<AuthSession | null> {
    try {
      const response = await fetch(`${this.serverUrl}/api/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      if (data.success) {
        const session: AuthSession = data.data;
        await this.storeSession(session);
        return session;
      }

      return null;
    } catch (error) {
      console.error('Token refresh error:', error);
      return null;
    }
  }
}
EOF

    # CaptureService
    cat > src/main/services/CaptureService.ts << 'EOF'
import { screen, desktopCapturer } from 'electron';

export class CaptureService {
  private captureInterval: NodeJS.Timeout | null = null;
  private currentSessionId: string | null = null;
  private serverUrl: string;

  constructor() {
    this.serverUrl = process.env.ONLYWORKS_SERVER_URL || 'http://localhost:3001';
  }

  async takeScreenshot(): Promise<string | null> {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: screen.getPrimaryDisplay().workAreaSize,
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      const source = sources[0];
      return source.thumbnail.toDataURL();
    } catch (error) {
      console.error('Screenshot capture error:', error);
      return null;
    }
  }

  async startCaptureSession(sessionData: any): Promise<{ success: boolean; sessionId?: string }> {
    try {
      // Create session on server
      const response = await fetch(`${this.serverUrl}/api/sessions/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionData),
      });

      const result = await response.json();
      if (result.success) {
        this.currentSessionId = result.data.sessionId;

        // Start periodic screenshot capture
        this.captureInterval = setInterval(async () => {
          const screenshot = await this.takeScreenshot();
          if (screenshot && this.currentSessionId) {
            await this.uploadScreenshot(screenshot, this.currentSessionId);
          }
        }, 30000); // Capture every 30 seconds

        return { success: true, sessionId: this.currentSessionId };
      }

      return { success: false };
    } catch (error) {
      console.error('Failed to start capture session:', error);
      return { success: false };
    }
  }

  async stopCaptureSession(sessionId: string): Promise<void> {
    try {
      if (this.captureInterval) {
        clearInterval(this.captureInterval);
        this.captureInterval = null;
      }

      await fetch(`${this.serverUrl}/api/sessions/stop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      this.currentSessionId = null;
    } catch (error) {
      console.error('Failed to stop capture session:', error);
    }
  }

  private async uploadScreenshot(screenshotData: string, sessionId: string): Promise<void> {
    try {
      await fetch(`${this.serverUrl}/api/screenshots/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshot: screenshotData,
          sessionId,
          timestamp: Date.now(),
        }),
      });
    } catch (error) {
      console.error('Failed to upload screenshot:', error);
    }
  }
}
EOF

    # AnalysisService
    cat > src/main/services/AnalysisService.ts << 'EOF'
export class AnalysisService {
  private serverUrl: string;

  constructor() {
    this.serverUrl = process.env.ONLYWORKS_SERVER_URL || 'http://localhost:3001';
  }

  async requestAnalysis(screenshotId: string): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/analysis/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ screenshotId }),
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Analysis request error:', error);
      return null;
    }
  }

  async getSessionAnalysis(sessionId: string): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/analysis/session/${sessionId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Session analysis error:', error);
      return null;
    }
  }

  async getProductivityInsights(timeRange: string): Promise<any> {
    try {
      const response = await fetch(`${this.serverUrl}/api/analysis/insights?timeRange=${timeRange}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Productivity insights error:', error);
      return null;
    }
  }
}
EOF

    # ScreenshotUploadService
    cat > src/main/services/ScreenshotUploadService.ts << 'EOF'
export class ScreenshotUploadService {
  private serverUrl: string;

  constructor() {
    this.serverUrl = process.env.ONLYWORKS_SERVER_URL || 'http://localhost:3001';
  }

  async uploadScreenshot(screenshotData: string): Promise<{ success: boolean; screenshotId?: string }> {
    try {
      const response = await fetch(`${this.serverUrl}/api/screenshots/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshot: screenshotData,
          timestamp: Date.now(),
        }),
      });

      const result = await response.json();
      return result.success
        ? { success: true, screenshotId: result.data.screenshotId }
        : { success: false };
    } catch (error) {
      console.error('Screenshot upload error:', error);
      return { success: false };
    }
  }
}
EOF

    print_status "Frontend services created"
}

# Setup backend server
setup_backend() {
    print_info "Setting up backend server..."

    cd "../$BACKEND_NAME"

    # Backend package.json
    cat > package.json << 'EOF'
{
  "name": "onlyworks-backend-server",
  "version": "1.0.0",
  "description": "Backend server for OnlyWorks Desktop App",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js",
    "deploy": "vercel --prod",
    "test": "jest"
  },
  "dependencies": {
    "@google/generative-ai": "^0.21.0",
    "@supabase/supabase-js": "^2.39.3",
    "compression": "^1.7.4",
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "helmet": "^7.1.0",
    "multer": "^1.4.5",
    "sharp": "^0.32.0",
    "uuid": "^9.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.1",
    "jest": "^29.0.0"
  },
  "engines": {
    "node": ">=18.x"
  }
}
EOF

    # Main server file
    cat > index.js << 'EOF'
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? ['https://onlyworks-backend-server.vercel.app']
    : ['http://localhost:3000', 'http://localhost:8080'],
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'OnlyWorks Backend Server is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Routes
app.use('/api/auth', require('./api/auth/index'));
app.use('/api/screenshots', require('./api/screenshots/index'));
app.use('/api/analysis', require('./api/analysis/index'));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Internal server error',
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 OnlyWorks Backend Server running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
EOF

    # OAuth authentication routes
    mkdir -p api/auth/oauth/google

    cat > api/auth/index.js << 'EOF'
const express = require('express');
const router = express.Router();

// OAuth routes
router.use('/oauth', require('./oauth/index'));

// Auth validation
router.post('/validate', require('./validate'));
router.post('/refresh', require('./refresh'));
router.post('/callback', require('./callback'));

module.exports = router;
EOF

    cat > api/auth/oauth/index.js << 'EOF'
const express = require('express');
const router = express.Router();

router.use('/google', require('./google/index'));

module.exports = router;
EOF

    cat > api/auth/oauth/google/index.js << 'EOF'
const express = require('express');
const router = express.Router();

router.get('/init', require('./init'));

module.exports = router;
EOF

    cat > api/auth/oauth/google/init.js << 'EOF'
const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: {
        code: 'METHOD_NOT_ALLOWED',
        message: 'Method not allowed',
        timestamp: new Date().toISOString()
      }
    });
  }

  try {
    // Initialize Supabase client
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
    const supabase = createClient(process.env.SUPABASE_URL, supabaseKey);

    console.log('[OAuth Init] Using', process.env.SUPABASE_SERVICE_ROLE_KEY ? 'service role' : 'anon key');

    // Get OAuth URL from Supabase Auth
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        skipBrowserRedirect: true,
        redirectTo: `${process.env.SERVER_URL || 'https://onlyworks-backend-server.vercel.app'}/api/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent'
        },
        scopes: 'email profile'
      },
    });

    if (error) {
      throw error;
    }

    return res.status(200).json({
      success: true,
      data: {
        auth_url: data.url
      },
      provider: 'google',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Supabase OAuth init error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'OAUTH_INIT_ERROR',
        message: 'Failed to initialize OAuth with Supabase',
        timestamp: new Date().toISOString()
      }
    });
  }
};
EOF

    cat > api/auth/callback.js << 'EOF'
module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, provider = 'google' } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_CODE',
          message: 'Authorization code is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('[Auth Callback] Attempting direct Google OAuth token exchange...');

    // Exchange code directly with Google
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${process.env.SERVER_URL || 'https://onlyworks-backend-server.vercel.app'}/api/auth/callback`
      })
    });

    if (!tokenResponse.ok) {
      throw new Error(`Google OAuth failed: ${tokenResponse.status}`);
    }

    const tokens = await tokenResponse.json();
    console.log('[Auth Callback] Received tokens from Google:', {
      access_token: !!tokens.access_token,
      refresh_token: !!tokens.refresh_token
    });

    // Get user info from Google
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`
      }
    });

    if (!userResponse.ok) {
      throw new Error(`Google user info failed: ${userResponse.status}`);
    }

    const googleUser = await userResponse.json();
    console.log('[Auth Callback] Received user info from Google:', {
      id: googleUser.id,
      email: googleUser.email
    });

    // Create session object in expected format
    const sessionData = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: Date.now() + (tokens.expires_in * 1000),
      user: {
        id: googleUser.id,
        email: googleUser.email,
        name: googleUser.name,
        avatar_url: googleUser.picture,
        provider: 'google'
      }
    };

    return res.status(200).json({
      success: true,
      data: sessionData
    });

  } catch (error) {
    console.error('OAuth callback error:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: new Date().toISOString()
      }
    });
  }
};
EOF

    cat > api/auth/validate.js << 'EOF'
module.exports = async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Access token required' }
      });
    }

    // Validate token with Google
    const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${access_token}`);

    if (response.ok) {
      const tokenInfo = await response.json();
      return res.json({
        success: true,
        data: { valid: true, tokenInfo }
      });
    } else {
      return res.json({
        success: false,
        data: { valid: false }
      });
    }
  } catch (error) {
    console.error('Token validation error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Validation failed' }
    });
  }
};
EOF

    cat > api/auth/refresh.js << 'EOF'
module.exports = async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: { message: 'Refresh token required' }
      });
    }

    // Refresh token with Google
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refresh_token: refresh_token,
        grant_type: 'refresh_token'
      })
    });

    if (!response.ok) {
      throw new Error('Token refresh failed');
    }

    const tokens = await response.json();

    return res.json({
      success: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token || refresh_token,
        expires_at: Date.now() + (tokens.expires_in * 1000)
      }
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    return res.status(500).json({
      success: false,
      error: { message: 'Refresh failed' }
    });
  }
};
EOF

    # Screenshots API
    cat > api/screenshots/index.js << 'EOF'
const express = require('express');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// In-memory storage for demo (use database in production)
const screenshots = new Map();

// Configure multer for handling base64 data
const upload = multer();

// Upload screenshot
router.post('/upload', upload.none(), (req, res) => {
  try {
    const { screenshot, sessionId, timestamp } = req.body;

    if (!screenshot) {
      return res.status(400).json({
        success: false,
        error: { message: 'Screenshot data required' }
      });
    }

    const screenshotId = uuidv4();
    const screenshotData = {
      id: screenshotId,
      data: screenshot,
      sessionId: sessionId || null,
      timestamp: timestamp || Date.now(),
      uploadedAt: Date.now()
    };

    screenshots.set(screenshotId, screenshotData);

    console.log(`[Screenshots] Uploaded screenshot ${screenshotId} for session ${sessionId}`);

    res.json({
      success: true,
      data: {
        screenshotId,
        uploadedAt: screenshotData.uploadedAt
      }
    });
  } catch (error) {
    console.error('Screenshot upload error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Upload failed' }
    });
  }
});

// Get screenshot
router.get('/:screenshotId', (req, res) => {
  try {
    const { screenshotId } = req.params;
    const screenshot = screenshots.get(screenshotId);

    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: { message: 'Screenshot not found' }
      });
    }

    res.json({
      success: true,
      data: screenshot
    });
  } catch (error) {
    console.error('Screenshot retrieval error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Retrieval failed' }
    });
  }
});

module.exports = router;
EOF

    # Analysis API
    cat > api/analysis/index.js << 'EOF'
const express = require('express');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const router = express.Router();

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

// In-memory storage for demo
const analyses = new Map();
const sessionAnalyses = new Map();

// Analyze screenshot
router.post('/analyze', async (req, res) => {
  try {
    const { screenshotId, customPrompt } = req.body;

    if (!screenshotId) {
      return res.status(400).json({
        success: false,
        error: { message: 'Screenshot ID required' }
      });
    }

    // Get screenshot data (you'd fetch from your storage)
    const screenshot = global.screenshots?.get(screenshotId);
    if (!screenshot) {
      return res.status(404).json({
        success: false,
        error: { message: 'Screenshot not found' }
      });
    }

    const prompt = customPrompt || `
      Analyze this screenshot for productivity insights. Identify:
      1. What application or website is being used
      2. The type of activity (productive work, social media, entertainment, etc.)
      3. Productivity score (1-10)
      4. Any focus or distraction indicators
      5. Suggestions for improvement

      Provide a JSON response with these fields:
      {
        "application": "string",
        "activity_type": "string",
        "productivity_score": number,
        "focus_indicators": ["string"],
        "distractions": ["string"],
        "suggestions": ["string"]
      }
    `;

    // Convert base64 to format expected by Gemini
    const imageData = screenshot.data.split(',')[1]; // Remove data:image/png;base64, prefix

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: imageData,
          mimeType: 'image/png'
        }
      }
    ]);

    const analysisText = result.response.text();

    // Try to parse as JSON, fallback to text analysis
    let analysis;
    try {
      analysis = JSON.parse(analysisText);
    } catch (e) {
      analysis = {
        application: 'Unknown',
        activity_type: 'Analysis',
        productivity_score: 5,
        focus_indicators: [],
        distractions: [],
        suggestions: [analysisText]
      };
    }

    // Store analysis
    const analysisData = {
      id: `analysis_${Date.now()}`,
      screenshotId,
      analysis,
      timestamp: Date.now()
    };

    analyses.set(analysisData.id, analysisData);

    // Update session analysis if screenshot belongs to a session
    if (screenshot.sessionId) {
      const sessionAnalysis = sessionAnalyses.get(screenshot.sessionId) || {
        sessionId: screenshot.sessionId,
        screenshots: [],
        totalProductivityScore: 0,
        averageProductivityScore: 0,
        activities: {},
        startTime: Date.now(),
        lastUpdate: Date.now()
      };

      sessionAnalysis.screenshots.push(analysisData);
      sessionAnalysis.totalProductivityScore += analysis.productivity_score;
      sessionAnalysis.averageProductivityScore = sessionAnalysis.totalProductivityScore / sessionAnalysis.screenshots.length;
      sessionAnalysis.lastUpdate = Date.now();

      // Track activity types
      const activityType = analysis.activity_type || 'Unknown';
      sessionAnalysis.activities[activityType] = (sessionAnalysis.activities[activityType] || 0) + 1;

      sessionAnalyses.set(screenshot.sessionId, sessionAnalysis);
    }

    console.log(`[Analysis] Analyzed screenshot ${screenshotId}: ${analysis.productivity_score}/10`);

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Analysis failed' }
    });
  }
});

// Get session analysis
router.get('/session/:sessionId', (req, res) => {
  try {
    const { sessionId } = req.params;
    const analysis = sessionAnalyses.get(sessionId);

    if (!analysis) {
      return res.status(404).json({
        success: false,
        error: { message: 'Session analysis not found' }
      });
    }

    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Session analysis error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get session analysis' }
    });
  }
});

// Get productivity insights
router.get('/insights', (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    // Calculate time range
    const now = Date.now();
    const timeRangeMs = {
      '1h': 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    };

    const startTime = now - (timeRangeMs[timeRange] || timeRangeMs['24h']);

    // Aggregate session data
    const recentSessions = Array.from(sessionAnalyses.values())
      .filter(session => session.startTime >= startTime);

    const insights = {
      timeRange,
      totalSessions: recentSessions.length,
      averageProductivityScore: 0,
      topActivities: {},
      totalScreenTime: 0,
      focusTime: 0,
      distractionTime: 0,
      suggestions: []
    };

    if (recentSessions.length > 0) {
      insights.averageProductivityScore = recentSessions.reduce((sum, session) =>
        sum + session.averageProductivityScore, 0) / recentSessions.length;

      // Aggregate activities
      recentSessions.forEach(session => {
        Object.entries(session.activities).forEach(([activity, count]) => {
          insights.topActivities[activity] = (insights.topActivities[activity] || 0) + count;
        });
      });

      // Calculate time metrics
      insights.totalScreenTime = recentSessions.reduce((sum, session) =>
        sum + (session.lastUpdate - session.startTime), 0);

      // Generate insights
      if (insights.averageProductivityScore < 5) {
        insights.suggestions.push('Consider taking more breaks to improve focus');
        insights.suggestions.push('Try using productivity apps or techniques like Pomodoro');
      }
    }

    console.log(`[Insights] Generated insights for ${timeRange}: ${insights.totalSessions} sessions`);

    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Insights error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to generate insights' }
    });
  }
});

module.exports = router;
EOF

    # Environment file template
    cat > .env.example << 'EOF'
# Server Configuration
PORT=3001
NODE_ENV=development
SERVER_URL=http://localhost:3001

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google AI Configuration
GOOGLE_API_KEY=your_google_api_key

# Supabase Configuration (Optional)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
EOF

    # Vercel configuration
    cat > vercel.json << 'EOF'
{
  "version": 2,
  "builds": [
    {
      "src": "index.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "/index.js"
    },
    {
      "src": "/(.*)",
      "dest": "/index.js"
    }
  ],
  "env": {
    "NODE_ENV": "production"
  }
}
EOF

    cd "../$PROJECT_NAME"
    print_status "Backend server created"
}

# Create frontend React components
setup_frontend_components() {
    print_info "Setting up frontend React components..."

    # Renderer HTML
    cat > src/renderer/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OnlyWorks - AI-Powered Productivity Tracker</title>
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: #333;
        }
        #root {
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script src="./app.js"></script>
</body>
</html>
EOF

    # Main App component
    cat > src/renderer/App.tsx << 'EOF'
import React from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from './components/auth/AuthProvider';
import { Dashboard } from './pages/Dashboard';
import './styles/globals.css';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-500 to-purple-600">
        <Dashboard />
      </div>
    </AuthProvider>
  );
};

const container = document.getElementById('root');
const root = createRoot(container!);
root.render(<App />);
EOF

    # Auth Provider
    cat > src/renderer/components/auth/AuthProvider.tsx << 'EOF'
import React, { createContext, useContext, useEffect, useState } from 'react';

interface User {
  id: string;
  email: string;
  name?: string;
  avatar_url?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    initializeAuth();
  }, []);

  const initializeAuth = async () => {
    try {
      const session = await window.api.getStoredSession();
      if (session) {
        const isValid = await window.api.validateSession(session);
        if (isValid) {
          setUser(session.user);
        } else {
          await window.api.clearSession();
        }
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async () => {
    try {
      setIsLoading(true);
      const authUrl = await window.api.initOAuth('google');
      const session = await window.api.openOAuthWindow(authUrl);

      if (session) {
        setUser(session.user);
      }
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await window.api.clearSession();
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const value: AuthContextType = {
    user,
    isLoading,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
EOF

    # Dashboard component
    cat > src/renderer/pages/Dashboard.tsx << 'EOF'
import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/auth/AuthProvider';

export const Dashboard: React.FC = () => {
  const { user, isLoading, login, logout } = useAuth();
  const [isCapturing, setIsCapturing] = useState(false);
  const [currentSession, setCurrentSession] = useState<string | null>(null);
  const [lastScreenshot, setLastScreenshot] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full mx-4">
          <h1 className="text-2xl font-bold text-center mb-6">OnlyWorks</h1>
          <p className="text-gray-600 text-center mb-6">
            AI-powered productivity tracking with screenshot analysis
          </p>
          <button
            onClick={login}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
          >
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  const startSession = async () => {
    try {
      const result = await window.api.startCaptureSession({
        goal: 'Productivity tracking session',
        startTime: Date.now()
      });

      if (result.success) {
        setCurrentSession(result.sessionId);
        setIsCapturing(true);
      }
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  };

  const stopSession = async () => {
    if (currentSession) {
      try {
        await window.api.stopCaptureSession(currentSession);
        setIsCapturing(false);
        setCurrentSession(null);
      } catch (error) {
        console.error('Failed to stop session:', error);
      }
    }
  };

  const takeScreenshot = async () => {
    try {
      const result = await window.api.takeScreenshot();
      if (result) {
        setLastScreenshot(result.screenshot?.screenshotId);
        setAnalysis(result.analysis);
      }
    } catch (error) {
      console.error('Failed to take screenshot:', error);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">OnlyWorks Dashboard</h1>
              <p className="text-gray-600">Welcome back, {user.name || user.email}</p>
            </div>
            <div className="flex items-center space-x-4">
              {user.avatar_url && (
                <img
                  src={user.avatar_url}
                  alt="Profile"
                  className="w-10 h-10 rounded-full"
                />
              )}
              <button
                onClick={logout}
                className="text-red-500 hover:text-red-600"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        {/* Session Controls */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-semibold mb-4">Session Control</h2>
          <div className="flex space-x-4">
            {!isCapturing ? (
              <button
                onClick={startSession}
                className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg"
              >
                Start Tracking Session
              </button>
            ) : (
              <button
                onClick={stopSession}
                className="bg-red-500 hover:bg-red-600 text-white px-6 py-2 rounded-lg"
              >
                Stop Session
              </button>
            )}
            <button
              onClick={takeScreenshot}
              className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-lg"
            >
              Take Screenshot
            </button>
          </div>
          {isCapturing && currentSession && (
            <div className="mt-4 p-3 bg-green-50 rounded border border-green-200">
              <p className="text-green-700">
                🟢 Session active: {currentSession}
              </p>
            </div>
          )}
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Latest Analysis</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="font-medium text-gray-700">Application</h3>
                <p className="text-lg">{analysis.application || 'Unknown'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">Activity Type</h3>
                <p className="text-lg">{analysis.activity_type || 'Unknown'}</p>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">Productivity Score</h3>
                <div className="flex items-center">
                  <div className="bg-gray-200 rounded-full h-4 w-32 mr-2">
                    <div
                      className="bg-blue-500 h-4 rounded-full"
                      style={{ width: `${(analysis.productivity_score || 0) * 10}%` }}
                    ></div>
                  </div>
                  <span className="text-lg font-semibold">
                    {analysis.productivity_score || 0}/10
                  </span>
                </div>
              </div>
              <div>
                <h3 className="font-medium text-gray-700">Suggestions</h3>
                <ul className="list-disc list-inside">
                  {(analysis.suggestions || []).map((suggestion: string, index: number) => (
                    <li key={index} className="text-sm text-gray-600">
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Today's Sessions</h3>
            <p className="text-3xl font-bold text-blue-500">0</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Average Productivity</h3>
            <p className="text-3xl font-bold text-green-500">-</p>
          </div>
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-2">Focus Time</h3>
            <p className="text-3xl font-bold text-purple-500">0h</p>
          </div>
        </div>
      </div>
    </div>
  );
};
EOF

    # Global styles
    cat > src/renderer/styles/globals.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}
EOF

    print_status "Frontend components created"
}

# Create build configuration
setup_build_config() {
    print_info "Setting up build configuration..."

    # Webpack main config
    cat > webpack.main.config.js << 'EOF'
const path = require('path');

module.exports = {
  entry: './src/main/main.ts',
  target: 'electron-main',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  output: {
    filename: 'main.js',
    path: path.resolve(__dirname, 'dist/main'),
  },
};
EOF

    # Webpack renderer config
    cat > webpack.renderer.config.js << 'EOF'
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/renderer/App.tsx',
  target: 'electron-renderer',
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          'style-loader',
          'css-loader',
          'postcss-loader',
        ],
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './src/renderer/index.html',
    }),
  ],
  output: {
    filename: 'app.js',
    path: path.resolve(__dirname, 'dist/renderer'),
  },
};
EOF

    # TypeScript configuration
    cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["ES2020", "DOM"],
    "module": "commonjs",
    "moduleResolution": "node",
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "removeComments": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "skipLibCheck": true,
    "jsx": "react"
  },
  "include": [
    "src/**/*"
  ],
  "exclude": [
    "node_modules",
    "dist"
  ]
}
EOF

    # Tailwind configuration
    cat > tailwind.config.js << 'EOF'
module.exports = {
  content: [
    "./src/renderer/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}
EOF

    # PostCSS configuration
    cat > postcss.config.js << 'EOF'
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
EOF

    # Environment file
    cat > .env << 'EOF'
# Development Configuration
NODE_ENV=development
ONLYWORKS_SERVER_URL=http://localhost:3001

# For production, update to your deployed backend URL
# ONLYWORKS_SERVER_URL=https://your-backend.vercel.app
EOF

    print_status "Build configuration created"
}

# Create documentation
create_documentation() {
    print_info "Creating documentation..."

    cat > README.md << 'EOF'
# OnlyWorks - AI-Powered Productivity Tracker

OnlyWorks is a desktop productivity application that uses AI to analyze screenshots and provide insights about your work patterns. It features automatic screenshot capture, AI-powered analysis using Google's Gemini, and comprehensive productivity tracking.

## Features

- 🔐 **Secure OAuth Authentication** - Google OAuth integration
- 📸 **Automatic Screenshot Capture** - Intelligent screenshot capture during work sessions
- 🤖 **AI-Powered Analysis** - Google Gemini analyzes screenshots for productivity insights
- 📊 **Productivity Insights** - Detailed analytics and recommendations
- 🖥️ **Cross-Platform Desktop App** - Built with Electron for Windows, macOS, and Linux
- 🌐 **Server-Side Processing** - All sensitive operations handled securely on the server

## Architecture

### Frontend (Electron App)
- **React** with TypeScript for the UI
- **Zustand** for state management
- **Tailwind CSS** for styling
- **Electron** for desktop app functionality

### Backend (Node.js/Express)
- **Express.js** server with REST API
- **Google OAuth** for authentication
- **Google Gemini AI** for screenshot analysis
- **Supabase** for optional database features
- **Vercel** for deployment

## Quick Start

### 1. Install Dependencies

```bash
# Frontend dependencies
npm install

# Backend dependencies
cd ../onlyworks-backend-server
npm install
```

### 2. Environment Configuration

**Frontend (.env):**
```env
NODE_ENV=development
ONLYWORKS_SERVER_URL=http://localhost:3001
```

**Backend (.env):**
```env
PORT=3001
NODE_ENV=development
SERVER_URL=http://localhost:3001

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Google AI
GOOGLE_API_KEY=your_google_api_key

# Optional: Supabase
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Development

```bash
# Start backend server
cd onlyworks-backend-server
npm run dev

# Start frontend app (in new terminal)
cd onlyworks-v2
npm run dev
```

### 4. Production Build

```bash
# Build frontend
npm run build

# Package desktop app
npm run package
```

## API Configuration

### Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URIs:
   - `http://localhost:3001/api/auth/callback` (development)
   - `https://your-backend.vercel.app/api/auth/callback` (production)

### Google AI Setup

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Create an API key for Gemini
3. Add the API key to your environment variables

## Deployment

### Backend (Vercel)

1. Deploy to Vercel:
```bash
cd onlyworks-backend-server
npm run deploy
```

2. Set environment variables in Vercel dashboard:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`
   - `GOOGLE_API_KEY`
   - `NODE_ENV=production`
   - `SERVER_URL=https://your-app.vercel.app`

### Frontend (Electron)

1. Build the application:
```bash
npm run build
```

2. Package for distribution:
```bash
npm run package
```

## Usage

1. **Authentication**: Sign in with your Google account
2. **Start Session**: Click "Start Tracking Session" to begin productivity monitoring
3. **Screenshot Analysis**: Screenshots are automatically captured and analyzed
4. **View Insights**: Review productivity scores, activity types, and recommendations
5. **Session Management**: Stop sessions when done working

## Privacy & Security

- All screenshots are processed server-side and not stored permanently
- OAuth tokens are securely managed and refreshed automatically
- AI analysis happens on Google's servers with enterprise-grade security
- No personal data is stored without explicit consent

## Development

### Project Structure

```
onlyworks-v2/
├── src/
│   ├── main/              # Electron main process
│   │   ├── services/      # Auth, Capture, Analysis services
│   │   ├── main.ts        # Main process entry
│   │   └── preload.ts     # Preload script
│   └── renderer/          # React frontend
│       ├── components/    # React components
│       ├── pages/         # Page components
│       ├── stores/        # State management
│       └── services/      # Frontend services
└── dist/                  # Built application

onlyworks-backend-server/
├── api/
│   ├── auth/             # Authentication endpoints
│   ├── screenshots/      # Screenshot upload/retrieval
│   └── analysis/         # AI analysis endpoints
├── src/
│   ├── services/         # Backend services
│   └── utils/            # Utility functions
└── index.js              # Server entry point
```

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the API endpoints in the backend code
EOF

    print_status "Documentation created"
}

# Initialize git repositories
initialize_git() {
    print_info "Initializing git repositories..."

    # Frontend repository
    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Build outputs
dist/
build/

# Environment files
.env
.env.local
.env.production

# IDE files
.vscode/
.idea/
*.swp
*.swo

# OS files
.DS_Store
Thumbs.db

# Electron
out/
*.log
EOF

    git init
    git add .
    git commit -m "Initial commit: OnlyWorks frontend

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

    # Backend repository
    cd "../$BACKEND_NAME"

    cat > .gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*

# Environment files
.env
.env.local
.env.production

# IDE files
.vscode/
.idea/

# OS files
.DS_Store
Thumbs.db

# Vercel
.vercel

# Logs
*.log
EOF

    git init
    git add .
    git commit -m "Initial commit: OnlyWorks backend server

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>"

    cd "../$PROJECT_NAME"
    print_status "Git repositories initialized"
}

# Main execution
main() {
    echo ""
    print_info "Starting OnlyWorks application scaffold..."
    echo ""

    check_prerequisites
    create_project_structure
    setup_frontend
    setup_backend
    setup_frontend_components
    setup_build_config
    create_documentation
    initialize_git

    echo ""
    print_status "OnlyWorks application scaffold completed successfully!"
    echo ""

    print_info "Next Steps:"
    echo "1. Configure environment variables in both frontend and backend"
    echo "2. Set up Google OAuth credentials"
    echo "3. Get Google AI API key for Gemini"
    echo "4. Install dependencies: cd $PROJECT_NAME && npm install"
    echo "5. Install backend deps: cd ../$BACKEND_NAME && npm install"
    echo "6. Start development: npm run dev (backend) & npm run dev (frontend)"
    echo ""

    print_warning "Don't forget to:"
    echo "- Add your Google OAuth credentials to environment variables"
    echo "- Configure your Google AI API key"
    echo "- Update redirect URIs in Google Console"
    echo "- Deploy backend to Vercel for production"
    echo ""

    print_status "Happy coding! 🚀"
}

# Run the scaffold
main "$@"