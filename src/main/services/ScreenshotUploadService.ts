import { BackendApiService } from './BackendApiService';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface ScreenshotMetadata {
  sessionId: string;
  filePath: string;
  timestamp: number;
  windowTitle?: string;
  activeApp?: string;
  captureTriger?: string;
}

export interface UploadResult {
  success: boolean;
  screenshotId?: string;
  storageKey?: string;
  error?: string;
}

export class ScreenshotUploadService {
  private static instance: ScreenshotUploadService;
  private backendApi: BackendApiService;
  private uploadQueue: ScreenshotMetadata[] = [];
  private isProcessing = false;

  constructor() {
    this.backendApi = BackendApiService.getInstance();
  }

  static getInstance(): ScreenshotUploadService {
    if (!ScreenshotUploadService.instance) {
      ScreenshotUploadService.instance = new ScreenshotUploadService();
    }
    return ScreenshotUploadService.instance;
  }

  async uploadScreenshot(metadata: ScreenshotMetadata): Promise<UploadResult> {
    try {
      console.log('[ScreenshotUpload] Uploading screenshot:', metadata.filePath);

      // Get file stats
      const stats = await fs.stat(metadata.filePath);
      const fileName = path.basename(metadata.filePath);

      // Generate a unique storage key
      const storageKey = `screenshots/${metadata.sessionId}/${uuidv4()}-${fileName}`;

      // For now, we'll simulate uploading by creating metadata in the backend
      // In a real implementation, you'd upload the file to a storage service first
      const screenshotData = {
        file_storage_key: storageKey,
        file_size_bytes: stats.size,
        timestamp: new Date(metadata.timestamp).toISOString(),
        capture_trigger: metadata.captureTriger || 'timer_15s',
        window_title: metadata.windowTitle,
        active_app: metadata.activeApp
      };

      const response = await this.backendApi.uploadScreenshot(metadata.sessionId, screenshotData);

      if (response.success && response.data) {
        console.log('[ScreenshotUpload] Screenshot uploaded successfully:', response.data.id);

        return {
          success: true,
          screenshotId: response.data.id,
          storageKey: storageKey
        };
      } else {
        console.error('[ScreenshotUpload] Upload failed:', response.error?.message);
        return {
          success: false,
          error: response.error?.message || 'Upload failed'
        };
      }

    } catch (error) {
      console.error('[ScreenshotUpload] Upload error:', error);
      return {
        success: false,
        error: (error as Error).message || 'Unknown upload error'
      };
    }
  }

  async queueScreenshot(metadata: ScreenshotMetadata): Promise<void> {
    console.log('[ScreenshotUpload] Queueing screenshot for upload:', metadata.filePath);

    this.uploadQueue.push(metadata);

    // Start processing queue if not already processing
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.uploadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    console.log('[ScreenshotUpload] Starting queue processing. Queue size:', this.uploadQueue.length);

    while (this.uploadQueue.length > 0) {
      const metadata = this.uploadQueue.shift();
      if (!metadata) continue;

      try {
        const result = await this.uploadScreenshot(metadata);

        if (!result.success) {
          console.error('[ScreenshotUpload] Failed to upload queued screenshot:', result.error);
          // In a real implementation, you might want to retry or save to a retry queue
        }

        // Add a small delay between uploads to avoid overwhelming the backend
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error('[ScreenshotUpload] Queue processing error:', error);
      }
    }

    this.isProcessing = false;
    console.log('[ScreenshotUpload] Queue processing completed');
  }

  getQueueSize(): number {
    return this.uploadQueue.length;
  }

  isUploadInProgress(): boolean {
    return this.isProcessing;
  }

  clearQueue(): void {
    this.uploadQueue = [];
    console.log('[ScreenshotUpload] Upload queue cleared');
  }

  // Batch upload method for multiple screenshots
  async uploadMultipleScreenshots(screenshots: ScreenshotMetadata[]): Promise<UploadResult[]> {
    console.log('[ScreenshotUpload] Batch uploading screenshots:', screenshots.length);

    const results: UploadResult[] = [];

    for (const screenshot of screenshots) {
      const result = await this.uploadScreenshot(screenshot);
      results.push(result);

      // Add delay between uploads
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return results;
  }

  // Utility method to validate file before upload
  async validateScreenshotFile(filePath: string): Promise<boolean> {
    try {
      const stats = await fs.stat(filePath);

      // Check file size (max 10MB for example)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (stats.size > maxSize) {
        console.warn('[ScreenshotUpload] File too large:', filePath, stats.size);
        return false;
      }

      // Check file extension
      const allowedExtensions = ['.png', '.jpg', '.jpeg'];
      const ext = path.extname(filePath).toLowerCase();
      if (!allowedExtensions.includes(ext)) {
        console.warn('[ScreenshotUpload] Invalid file type:', filePath, ext);
        return false;
      }

      return true;
    } catch (error) {
      console.error('[ScreenshotUpload] File validation error:', error);
      return false;
    }
  }
}

export default ScreenshotUploadService;