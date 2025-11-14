// Backend API storage service (no direct Supabase access)
import { ScreenshotData } from '../../shared/types/analysis';

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

  constructor() {
    // Initialize backend storage service
    console.log('[ScreenshotSupabaseService] Initializing backend storage service...');
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
  async uploadScreenshot(screenshot: ScreenshotData): Promise<SupabaseUploadResult> {
    if (!this.config?.url) {
      console.error('[ScreenshotSupabaseService] Backend URL not configured');
      throw new Error('Backend URL is required for storage operations');
    }

    try {
      if (!screenshot.base64Data) {
        return {
          success: false,
          error: 'No image data found'
        };
      }

      console.log(`[ScreenshotSupabaseService] Uploading screenshot ${screenshot.id} via backend...`);

      // Prepare upload data
      const uploadData = {
        screenshot_id: screenshot.id,
        session_id: screenshot.sessionId,
        base64_data: screenshot.base64Data,
        timestamp: screenshot.timestamp,
        window_title: screenshot.metadata?.windowTitle || '',
        application: screenshot.metadata?.activeApp || ''
      };

      // Send to backend API
      const response = await fetch(`${this.config.url}/api/screenshots/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(uploadData)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[ScreenshotSupabaseService] Backend upload failed:', response.status, errorText);
        return {
          success: false,
          error: `Backend upload failed: ${response.status} ${errorText}`
        };
      }

      const result = await response.json();

      if (result.success) {
        console.log(`[ScreenshotSupabaseService] ✅ Screenshot uploaded successfully: ${result.storage_url}`);
        return {
          success: true,
          screenshotId: screenshot.id,
          storageUrl: result.storage_url
        };
      } else {
        return {
          success: false,
          error: result.error || 'Unknown backend error'
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