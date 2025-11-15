// Backend API storage service (no direct Supabase access)
import { ScreenshotData } from '../../shared/types/analysis';
import { BackendApiService } from './BackendApiService';

export interface SupabaseUploadResult {
  success: boolean;
  screenshotId?: string;
  storageUrl?: string;
  error?: string;
}

export interface SupabaseConfig {
  url: string;
  serviceKey: string;
  bucketName: string;
}

export class ScreenshotSupabaseService {
  private config: SupabaseConfig | null = null;
  private bucketName: string = 'screenshots';
  private backendApi: BackendApiService;

  constructor() {
    // Initialize backend storage service
    console.log('[ScreenshotSupabaseService] Initializing backend storage service...');
    this.backendApi = BackendApiService.getInstance();
    this.initializeBackendStorage();
  }

  /**
   * Initialize storage service to use backend API
   */
  private initializeBackendStorage(): void {
    const backendUrl = process.env.ONLYWORKS_SERVER_URL;

    console.log('[ScreenshotSupabaseService] Initializing storage via backend...');
    console.log('[ScreenshotSupabaseService] Backend URL:', backendUrl ? '✅ Set' : '❌ Not Set');

    if (!backendUrl) {
      console.error('[ScreenshotSupabaseService] ❌ Missing ONLYWORKS_SERVER_URL');
      throw new Error('Backend URL is required for storage operations');
    }

    this.config = {
      url: backendUrl,
      serviceKey: '', // Not needed for backend approach
      bucketName: this.bucketName
    };

    console.log('[ScreenshotSupabaseService] ✅ Storage service initialized (using backend API)');
    // No need to create bucket - backend will handle this
  }

  /**
   * Check backend storage health (replaces bucket creation)
   */
  private async checkStorageHealth(): Promise<void> {
    if (!this.config?.url) {
      throw new Error('Backend URL not configured');
    }

    try {
      const response = await fetch(`${this.config.url}/health`);
      if (!response.ok) {
        throw new Error(`Backend health check failed: ${response.status}`);
      }
      console.log('[ScreenshotSupabaseService] ✅ Backend storage health check passed');
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Backend health check failed:', error);
      throw error;
    }
  }

  /**
   * Upload a single screenshot via backend API
   */
  async uploadScreenshot(screenshot: ScreenshotData & { fileBuffer?: Buffer }): Promise<SupabaseUploadResult> {
    if (!this.config?.url) {
      console.error('[ScreenshotSupabaseService] Backend URL not configured');
      throw new Error('Backend URL is required for storage operations');
    }

    try {
      if (!screenshot.fileBuffer && !screenshot.base64Data) {
        return {
          success: false,
          error: 'No image data found (neither fileBuffer nor base64Data)'
        };
      }

      console.log(`[ScreenshotSupabaseService] Uploading screenshot ${screenshot.id} via backend...`);

      let result;

      // Use fileBuffer if available (preferred method)
      if (screenshot.fileBuffer) {
        console.log(`[ScreenshotSupabaseService] Using file buffer upload (${screenshot.fileBuffer.length} bytes)`);

        const fileName = `${screenshot.id}.png`;
        const additionalData = {
          screenshot_id: screenshot.id,
          sessionId: screenshot.sessionId,
          timestamp: screenshot.timestamp,
          window_title: screenshot.metadata?.windowTitle || '',
          active_app: screenshot.metadata?.activeApp || ''
        };

        result = await this.backendApi.uploadFile('/api/screenshots/upload', screenshot.fileBuffer, fileName, additionalData);
      } else {
        // Fallback to base64 (legacy)
        console.log(`[ScreenshotSupabaseService] Using base64 upload (legacy)`);

        const uploadData = {
          screenshot_id: screenshot.id,
          sessionId: screenshot.sessionId,
          base64_data: screenshot.base64Data,
          timestamp: screenshot.timestamp,
          window_title: screenshot.metadata?.windowTitle || '',
          active_app: screenshot.metadata?.activeApp || ''
        };

        result = await this.backendApi.uploadScreenshotData(uploadData);
      }

      if (result.success && result.data) {
        const storageUrl = result.data.storage_url || result.data.data?.file_storage_key || result.data.file_storage_key;
        console.log(`[ScreenshotSupabaseService] ✅ Screenshot uploaded successfully: ${storageUrl}`);
        return {
          success: true,
          screenshotId: screenshot.id,
          storageUrl
        };
      } else {
        return {
          success: false,
          error: result.error?.message || 'Unknown backend error'
        };
      }
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown upload error'
      };
    }
  }

  /**
   * Upload multiple screenshots in batch
   */
  async uploadBatch(screenshots: ScreenshotData[]): Promise<SupabaseUploadResult[]> {
    if (!this.config?.url) {
      throw new Error('Backend URL not configured for batch upload');
    }

    console.log(`[ScreenshotSupabaseService] Starting batch upload of ${screenshots.length} screenshots via backend`);

    const startTime = Date.now();
    const results: SupabaseUploadResult[] = [];

    // Process uploads concurrently but limit concurrency to avoid overwhelming backend
    const concurrencyLimit = 3;
    const chunks: ScreenshotData[][] = [];

    for (let i = 0; i < screenshots.length; i += concurrencyLimit) {
      chunks.push(screenshots.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(screenshot => this.uploadScreenshot(screenshot));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Small delay between chunks to be respectful to backend
      if (chunks.indexOf(chunk) < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const successCount = results.filter(r => r.success).length;
    const duration = Date.now() - startTime;

    console.log(`[ScreenshotSupabaseService] Batch upload complete: ${successCount}/${screenshots.length} successful in ${duration}ms`);

    return results;
  }

  /**
   * Delete screenshots from storage via backend API
   */
  async deleteScreenshots(sessionId: string, screenshotIds: string[]): Promise<boolean> {
    if (!this.config?.url) {
      console.error('[ScreenshotSupabaseService] Backend URL not configured');
      return false;
    }

    try {
      const response = await fetch(`${this.config.url}/api/screenshots/delete`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          session_id: sessionId,
          screenshot_ids: screenshotIds
        })
      });

      if (!response.ok) {
        console.error('[ScreenshotSupabaseService] Delete failed:', response.status);
        return false;
      }

      console.log(`[ScreenshotSupabaseService] Deleted ${screenshotIds.length} screenshots for session ${sessionId}`);
      return true;
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Delete failed:', error);
      return false;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    bucketSize: number;
    fileCount: number;
    isConfigured: boolean;
  }> {
    if (!this.config?.url) {
      return {
        bucketSize: 0,
        fileCount: 0,
        isConfigured: false
      };
    }

    try {
      const response = await fetch(`${this.config.url}/api/storage/stats`);

      if (!response.ok) {
        console.error('[ScreenshotSupabaseService] Stats request failed:', response.status);
        return {
          bucketSize: 0,
          fileCount: 0,
          isConfigured: true
        };
      }

      const data = await response.json();

      return {
        bucketSize: data.bucket_size || 0,
        fileCount: data.file_count || 0,
        isConfigured: true
      };
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Stats failed:', error);
      return {
        bucketSize: 0,
        fileCount: 0,
        isConfigured: true
      };
    }
  }

  /**
   * Test backend connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.config?.url) {
      return false;
    }

    try {
      const response = await fetch(`${this.config.url}/health`);
      console.log('[ScreenshotSupabaseService] Backend connection test:', response.ok);
      return response.ok;
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Connection test error:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.config?.url);
  }

  /**
   * Get configuration status
   */
  getStatus(): {
    configured: boolean;
    bucketName: string;
    hasCredentials: boolean;
  } {
    return {
      configured: this.isConfigured(),
      bucketName: this.bucketName,
      hasCredentials: !!process.env.ONLYWORKS_SERVER_URL
    };
  }
}