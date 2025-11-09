import { desktopCapturer, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Screenshot, ActivityCallback } from '@shared/types';
import { ScreenshotUploadService } from './ScreenshotUploadService';

export class CaptureService {
  private isMonitoring = false;
  private activityCallbacks: ActivityCallback[] = [];
  private screenshotsDir: string;
  private uiohook: any;
  private uploadService: ScreenshotUploadService;
  private currentSessionId: string | null = null;
  private captureInterval: NodeJS.Timeout | null = null;
  private captureFrequency = 15000; // 15 seconds default

  constructor(dataPath: string) {
    this.screenshotsDir = path.join(dataPath, 'screenshots');
    this.ensureDirectoryExists();
    this.initializeUIOHook();
    this.uploadService = ScreenshotUploadService.getInstance();
  }

  private ensureDirectoryExists() {
    if (!fs.existsSync(this.screenshotsDir)) {
      fs.mkdirSync(this.screenshotsDir, { recursive: true });
    }
  }

  private initializeUIOHook() {
    try {
      this.uiohook = require('uiohook-napi');
    } catch (error) {
      console.warn('UIOHook not available, activity monitoring disabled:', error);
    }
  }

  async startMonitoring(sessionId?: string): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    this.currentSessionId = sessionId || null;
    console.log('Screenshot monitoring started for session:', sessionId);

    if (this.uiohook) {
      // Mouse events
      this.uiohook.on('click', () => {
        this.notifyActivity('click');
      });

      // Keyboard events
      this.uiohook.on('keydown', () => {
        this.notifyActivity('keypress');
      });

      this.uiohook.start();
    }

    // Start automatic screenshot capture
    this.startAutomaticCapture();
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    this.currentSessionId = null;
    console.log('Screenshot monitoring stopped');

    // Stop automatic capture
    this.stopAutomaticCapture();

    if (this.uiohook) {
      this.uiohook.stop();
    }
  }

  async captureScreen(): Promise<Screenshot> {
    try {
      const displays = screen.getAllDisplays();
      const primaryDisplay = displays.find(display => display.bounds.x === 0 && display.bounds.y === 0) || displays[0];

      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: {
          width: primaryDisplay.size.width,
          height: primaryDisplay.size.height
        }
      });

      if (sources.length === 0) {
        throw new Error('No screen sources available');
      }

      const source = sources[0];
      const timestamp = Date.now();
      const id = uuidv4();
      const filename = `screenshot_${timestamp}.png`;
      const filePath = path.join(this.screenshotsDir, filename);

      // Convert thumbnail to buffer and save
      const buffer = source.thumbnail.toPNG();
      fs.writeFileSync(filePath, buffer);

      const screenshot: Screenshot = {
        id,
        sessionId: this.currentSessionId || '',
        filePath,
        timestamp,
        metadata: {
          screenSize: {
            width: primaryDisplay.size.width,
            height: primaryDisplay.size.height
          }
        }
      };

      console.log(`Screenshot captured: ${filename}`);

      // Upload screenshot if session is active
      if (this.currentSessionId && this.isMonitoring) {
        this.uploadService.queueScreenshot({
          sessionId: this.currentSessionId,
          filePath,
          timestamp,
          captureTriger: 'timer_15s'
        });
      }

      return screenshot;

    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      throw error;
    }
  }

  onActivity(callback: ActivityCallback): void {
    this.activityCallbacks.push(callback);
  }

  private notifyActivity(type: 'click' | 'keypress' | 'window-change'): void {
    this.activityCallbacks.forEach(callback => {
      try {
        callback(type);
      } catch (error) {
        console.error('Error in activity callback:', error);
      }
    });
  }

  getScreenshotsDirectory(): string {
    return this.screenshotsDir;
  }

  private startAutomaticCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
    }

    console.log(`Starting automatic screenshot capture every ${this.captureFrequency}ms`);

    this.captureInterval = setInterval(async () => {
      if (this.isMonitoring && this.currentSessionId) {
        try {
          await this.captureScreen();
        } catch (error) {
          console.error('Automatic screenshot capture failed:', error);
        }
      }
    }, this.captureFrequency);
  }

  private stopAutomaticCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
      console.log('Automatic screenshot capture stopped');
    }
  }

  setCaptureFrequency(frequencyMs: number): void {
    this.captureFrequency = frequencyMs;
    if (this.isMonitoring) {
      // Restart with new frequency
      this.startAutomaticCapture();
    }
  }

  getCurrentSessionId(): string | null {
    return this.currentSessionId;
  }

  setCurrentSessionId(sessionId: string | null): void {
    this.currentSessionId = sessionId;
  }

  getUploadQueueSize(): number {
    return this.uploadService.getQueueSize();
  }

  isUploadInProgress(): boolean {
    return this.uploadService.isUploadInProgress();
  }

  cleanup(): void {
    this.stopMonitoring();
    this.activityCallbacks = [];
  }
}