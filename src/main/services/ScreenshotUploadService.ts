import { BackendApiService } from './BackendApiService';
import { ScreenshotSupabaseService } from './ScreenshotSupabaseService';
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
  private supabaseService: ScreenshotSupabaseService;
  private uploadQueue: ScreenshotMetadata[] = [];
  private isProcessing = false;
  private screenshotCounter = 0; // Track for batch processing

  constructor() {
    this.backendApi = BackendApiService.getInstance();
    this.supabaseService = new ScreenshotSupabaseService();
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
      this.screenshotCounter++;

      // Skip if this is already a Supabase URL (already uploaded)
      if (metadata.filePath.startsWith('supabase://')) {
        console.log('[ScreenshotUpload] Screenshot already uploaded to Supabase, skipping re-upload');
        return {
          success: true,
          storageKey: metadata.filePath
        };
      }

      // Check if file exists before reading
      try {
        await fs.access(metadata.filePath);
      } catch (error) {
        console.error('[ScreenshotUpload] File not found:', metadata.filePath);
        return {
          success: false,
          error: `File not found: ${metadata.filePath}`
        };
      }

      // Read file as buffer (no base64 conversion needed)
      const fileBuffer = await fs.readFile(metadata.filePath);
      const stats = await fs.stat(metadata.filePath);

      // Create screenshot data object for Supabase
      const screenshotData = {
        id: uuidv4(),
        sessionId: metadata.sessionId,
        fileBuffer,  // Pass buffer directly instead of base64
        timestamp: new Date(metadata.timestamp).toISOString(),
        metadata: {
          fileSize: stats.size,
          captureTriger: metadata.captureTriger || 'timer_5s',
          windowTitle: metadata.windowTitle || 'Unknown Window',
          activeApp: metadata.activeApp || 'Unknown App'
        }
      };

      // Upload to Supabase
      const supabaseResult = await this.supabaseService.uploadScreenshot(screenshotData);

      if (!supabaseResult.success) {
        console.warn('[ScreenshotUpload] Supabase upload failed, using backend fallback:', supabaseResult.error);
      }

      // Always store metadata in backend
      const backendData = {
        file_storage_key: supabaseResult.storageUrl || `local://${metadata.filePath}`,
        file_size_bytes: stats.size,
        timestamp: new Date(metadata.timestamp).toISOString(),
        capture_trigger: metadata.captureTriger || 'timer_5s',
        window_title: metadata.windowTitle,
        active_app: metadata.activeApp
      };

      const response = await this.backendApi.uploadScreenshot(metadata.sessionId, backendData);

      if (response.success && response.data) {
        console.log('[ScreenshotUpload] Screenshot uploaded successfully:', response.data.id, `(${this.screenshotCounter} total)`);

        // Check if we need to trigger batch processing
        if (this.screenshotCounter % 30 === 0) {
          console.log('[ScreenshotUpload] Triggering batch processing for 30 screenshots');
          this.triggerBatchProcessing(metadata.sessionId);
        }

        return {
          success: true,
          screenshotId: response.data.id,
          storageKey: supabaseResult.storageUrl || backendData.file_storage_key
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

  // Trigger batch processing for AI analysis
  private async triggerBatchProcessing(sessionId: string): Promise<void> {
    try {
      console.log('[ScreenshotUpload] Triggering batch processing for session:', sessionId);

      // Call backend to trigger batch analysis
      const response = await this.backendApi.triggerBatchProcessing?.(sessionId);

      if (response?.success) {
        console.log('[ScreenshotUpload] Batch processing triggered successfully');
      } else {
        console.error('[ScreenshotUpload] Batch processing trigger failed:', response?.error);
      }
    } catch (error) {
      console.error('[ScreenshotUpload] Error triggering batch processing:', error);
    }
  }

  // Get current screenshot counter
  getScreenshotCounter(): number {
    return this.screenshotCounter;
  }

  // Reset screenshot counter (useful for new sessions)
  resetScreenshotCounter(): void {
    this.screenshotCounter = 0;
    console.log('[ScreenshotUpload] Screenshot counter reset');
  }
}

export default ScreenshotUploadService;