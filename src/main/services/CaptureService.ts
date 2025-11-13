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
  private captureFrequency = 5000; // 5 seconds default
  private clickCaptureEnabled = true;

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
      // Mouse events - capture screenshot on click
      this.uiohook.on('click', async () => {
        this.notifyActivity('click');

        // Capture screenshot on click if enabled
        if (this.clickCaptureEnabled && this.currentSessionId) {
          try {
            await this.captureScreenWithTrigger('click');
          } catch (error) {
            console.error('Failed to capture screenshot on click:', error);
          }
        }
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

  async captureScreenWithTrigger(trigger: string): Promise<Screenshot> {
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

      console.log(`Screenshot captured (${trigger}): ${filename}`);

      // Upload screenshot if session is active
      if (this.currentSessionId && this.isMonitoring) {
        this.uploadService.queueScreenshot({
          sessionId: this.currentSessionId,
          filePath,
          timestamp,
          captureTriger: trigger
        });
      }

      return screenshot;

    } catch (error) {
      console.error('Failed to capture screenshot:', error);
      throw error;
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
          captureTriger: 'timer_5s'
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
          await this.captureScreenWithTrigger('timer_5s');
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

  setClickCaptureEnabled(enabled: boolean): void {
    this.clickCaptureEnabled = enabled;
    console.log(`Click capture ${enabled ? 'enabled' : 'disabled'}`);
  }

  isClickCaptureEnabled(): boolean {
    return this.clickCaptureEnabled;
  }

  cleanup(): void {
    this.stopMonitoring();
    this.activityCallbacks = [];
  }
}