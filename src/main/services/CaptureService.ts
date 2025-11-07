import { desktopCapturer, screen } from 'electron';
import * as path from 'path';
import * as fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { Screenshot, ActivityCallback } from '@shared/types';

export class CaptureService {
  private isMonitoring = false;
  private activityCallbacks: ActivityCallback[] = [];
  private screenshotsDir: string;
  private uiohook: any;

  constructor(dataPath: string) {
    this.screenshotsDir = path.join(dataPath, 'screenshots');
    this.ensureDirectoryExists();
    this.initializeUIOHook();
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

  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    console.log('Screenshot monitoring started');

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
  }

  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) return;

    this.isMonitoring = false;
    console.log('Screenshot monitoring stopped');

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
        sessionId: '', // Will be set by session service
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

  cleanup(): void {
    this.stopMonitoring();
    this.activityCallbacks = [];
  }
}