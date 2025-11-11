import * as fs from 'fs';
import * as path from 'path';
import { ScreenshotData } from '../../shared/types/analysis';

export interface LocalUploadResult {
  success: boolean;
  screenshotId?: string;
  storageUrl?: string;
  error?: string;
}

export class LocalScreenshotService {
  private basePath: string;

  constructor() {
    // Store screenshots in user's temp directory
    this.basePath = path.join(process.env.TMPDIR || '/tmp', 'onlyworks-screenshots');
    this.ensureDirectoryExists();
  }

  /**
   * Ensure the base directory exists
   */
  private ensureDirectoryExists(): void {
    try {
      if (!fs.existsSync(this.basePath)) {
        fs.mkdirSync(this.basePath, { recursive: true });
        console.log(`[LocalScreenshotService] Created directory: ${this.basePath}`);
      }
    } catch (error) {
      console.error('[LocalScreenshotService] Failed to create directory:', error);
    }
  }

  /**
   * Save a single screenshot to local filesystem
   */
  async saveScreenshot(screenshot: ScreenshotData): Promise<LocalUploadResult> {
    try {
      // Create session directory
      const sessionId = screenshot.sessionId || 'unknown-session';
      const sessionDir = path.join(this.basePath, sessionId);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      // Convert base64 to buffer
      const base64Data = screenshot.base64Data?.replace(/^data:image\/[a-z]+;base64,/, '') || '';

      if (!base64Data) {
        return {
          success: false,
          error: 'No image data found'
        };
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Generate file path
      const timestamp = new Date(screenshot.timestamp).toISOString().replace(/[:]/g, '-');
      const filename = `${timestamp}_${screenshot.id}.png`;
      const filePath = path.join(sessionDir, filename);

      // Save to filesystem
      fs.writeFileSync(filePath, buffer);

      console.log(`[LocalScreenshotService] Saved screenshot: ${filePath} (${buffer.length} bytes)`);

      return {
        success: true,
        screenshotId: screenshot.id,
        storageUrl: `file://${filePath}`
      };

    } catch (error) {
      console.error('[LocalScreenshotService] Save failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown save error'
      };
    }
  }

  /**
   * Save multiple screenshots in batch
   */
  async saveBatch(screenshots: ScreenshotData[]): Promise<LocalUploadResult[]> {
    console.log(`[LocalScreenshotService] Starting batch save of ${screenshots.length} screenshots`);

    const startTime = Date.now();
    const results: LocalUploadResult[] = [];

    for (const screenshot of screenshots) {
      const result = await this.saveScreenshot(screenshot);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const duration = Date.now() - startTime;

    console.log(`[LocalScreenshotService] Batch save complete: ${successCount}/${screenshots.length} successful in ${duration}ms`);

    return results;
  }

  /**
   * Delete screenshots from local storage
   */
  async deleteScreenshots(sessionId: string, screenshotIds: string[]): Promise<boolean> {
    try {
      const sessionDir = path.join(this.basePath, sessionId);

      if (!fs.existsSync(sessionDir)) {
        console.log(`[LocalScreenshotService] Session directory not found: ${sessionDir}`);
        return true; // Already deleted
      }

      let deletedCount = 0;
      for (const screenshotId of screenshotIds) {
        const files = fs.readdirSync(sessionDir);
        const targetFile = files.find(file => file.includes(screenshotId));

        if (targetFile) {
          const filePath = path.join(sessionDir, targetFile);
          fs.unlinkSync(filePath);
          deletedCount++;
        }
      }

      console.log(`[LocalScreenshotService] Deleted ${deletedCount} screenshots for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[LocalScreenshotService] Delete failed:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  getStorageStats(): {
    bucketSize: number;
    fileCount: number;
    isConfigured: boolean;
    basePath: string;
  } {
    try {
      let fileCount = 0;
      let bucketSize = 0;

      if (fs.existsSync(this.basePath)) {
        const sessionDirs = fs.readdirSync(this.basePath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory());

        for (const sessionDir of sessionDirs) {
          const sessionPath = path.join(this.basePath, sessionDir.name);
          const files = fs.readdirSync(sessionPath);

          fileCount += files.length;

          for (const file of files) {
            const filePath = path.join(sessionPath, file);
            const stats = fs.statSync(filePath);
            bucketSize += stats.size;
          }
        }
      }

      return {
        bucketSize,
        fileCount,
        isConfigured: true,
        basePath: this.basePath
      };
    } catch (error) {
      console.error('[LocalScreenshotService] Stats failed:', error);
      return {
        bucketSize: 0,
        fileCount: 0,
        isConfigured: true,
        basePath: this.basePath
      };
    }
  }

  /**
   * Test local storage
   */
  async testConnection(): Promise<boolean> {
    try {
      // Try to write and read a test file
      const testFile = path.join(this.basePath, 'test.txt');
      fs.writeFileSync(testFile, 'test');
      const content = fs.readFileSync(testFile, 'utf8');
      fs.unlinkSync(testFile);

      console.log('[LocalScreenshotService] Connection test successful');
      return content === 'test';
    } catch (error) {
      console.error('[LocalScreenshotService] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return fs.existsSync(this.basePath);
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    basePath: string;
    exists: boolean;
    writable: boolean;
  } {
    const exists = fs.existsSync(this.basePath);
    let writable = false;

    if (exists) {
      try {
        const testFile = path.join(this.basePath, '.write-test');
        fs.writeFileSync(testFile, '');
        fs.unlinkSync(testFile);
        writable = true;
      } catch {
        writable = false;
      }
    }

    return {
      configured: exists && writable,
      basePath: this.basePath,
      exists,
      writable
    };
  }
}