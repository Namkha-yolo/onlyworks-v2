import { createClient, SupabaseClient } from '@supabase/supabase-js';
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
  private supabase: SupabaseClient | null = null;
  private config: SupabaseConfig | null = null;
  private bucketName: string = 'screenshots';

  constructor() {
    this.initializeSupabase();
  }

  /**
   * Initialize Supabase client with environment variables
   */
  private initializeSupabase(): void {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY; // Use anon key for now

    console.log('[ScreenshotSupabaseService] Initializing Supabase...');
    console.log('[ScreenshotSupabaseService] URL:', supabaseUrl ? '✅ Set' : '❌ Not Set');
    console.log('[ScreenshotSupabaseService] Key:', supabaseKey ? '✅ Set' : '❌ Not Set');

    if (!supabaseUrl || !supabaseKey) {
      console.warn('[ScreenshotSupabaseService] ⚠️ Supabase disabled - credentials not found');
      console.warn('[ScreenshotSupabaseService] Screenshots will use local storage fallback');
      return;
    }

    try {
      this.config = {
        url: supabaseUrl,
        serviceKey: supabaseKey,
        bucketName: this.bucketName
      };

      this.supabase = createClient(supabaseUrl, supabaseKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      });

      console.log('[ScreenshotSupabaseService] Supabase client initialized successfully');
      this.ensureBucketExists();
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Failed to initialize Supabase:', error);
    }
  }

  /**
   * Ensure the screenshots bucket exists
   */
  private async ensureBucketExists(): Promise<void> {
    if (!this.supabase) return;

    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await this.supabase.storage.listBuckets();

      if (listError) {
        console.error('[ScreenshotSupabaseService] Error listing buckets:', listError);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        console.log('[ScreenshotSupabaseService] Creating screenshots bucket...');

        const { error: createError } = await this.supabase.storage.createBucket(this.bucketName, {
          public: false, // Private bucket for security
          allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
          fileSizeLimit: 10485760 // 10MB limit per file
        });

        if (createError) {
          console.error('[ScreenshotSupabaseService] Error creating bucket:', createError);
        } else {
          console.log('[ScreenshotSupabaseService] Screenshots bucket created successfully');
        }
      } else {
        console.log('[ScreenshotSupabaseService] Screenshots bucket already exists');
      }
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Error ensuring bucket exists:', error);
    }
  }

  /**
   * Upload a single screenshot to Supabase Storage
   */
  async uploadScreenshot(screenshot: ScreenshotData): Promise<SupabaseUploadResult> {
    if (!this.supabase || !this.config) {
      // For development, we'll skip Supabase uploads and return success
      console.log('[ScreenshotSupabaseService] Skipping Supabase upload - not configured');
      return {
        success: true,
        screenshotId: `local_${screenshot.id}`,
        storageUrl: `local://screenshot/${screenshot.id}`
      };
    }

    try {
      // Convert base64 to buffer
      const base64Data = screenshot.base64Data?.replace(/^data:image\/[a-z]+;base64,/, '') || '';

      if (!base64Data) {
        return {
          success: false,
          error: 'No image data found'
        };
      }

      const buffer = Buffer.from(base64Data, 'base64');

      // Generate file path: sessions/{sessionId}/screenshots/{timestamp}_{id}.png
      const timestamp = new Date(screenshot.timestamp).toISOString().replace(/[:]/g, '-');
      const filePath = `sessions/${screenshot.sessionId}/screenshots/${timestamp}_${screenshot.id}.png`;

      console.log(`[ScreenshotSupabaseService] Uploading ${filePath} (${buffer.length} bytes)`);

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(filePath, buffer, {
          contentType: 'image/png',
          upsert: true, // Overwrite if exists
          duplex: 'half' // For Node.js compatibility
        });

      if (error) {
        console.error('[ScreenshotSupabaseService] Upload error:', error);
        return {
          success: false,
          error: error.message
        };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      console.log(`[ScreenshotSupabaseService] Upload successful: ${filePath}`);

      return {
        success: true,
        screenshotId: screenshot.id,
        storageUrl: urlData.publicUrl
      };

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
    if (!this.supabase || !this.config) {
      // For development, return successful results for all screenshots
      console.log(`[ScreenshotSupabaseService] Skipping batch upload of ${screenshots.length} screenshots - not configured`);
      return screenshots.map((screenshot) => ({
        success: true,
        screenshotId: `local_${screenshot.id}`,
        storageUrl: `local://screenshot/${screenshot.id}`
      }));
    }

    console.log(`[ScreenshotSupabaseService] Starting batch upload of ${screenshots.length} screenshots`);

    const startTime = Date.now();
    const results: SupabaseUploadResult[] = [];

    // Process uploads concurrently but limit concurrency to avoid rate limits
    const concurrencyLimit = 3;
    const chunks: ScreenshotData[][] = [];

    for (let i = 0; i < screenshots.length; i += concurrencyLimit) {
      chunks.push(screenshots.slice(i, i + concurrencyLimit));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(screenshot => this.uploadScreenshot(screenshot));
      const chunkResults = await Promise.all(chunkPromises);
      results.push(...chunkResults);

      // Small delay between chunks to be respectful to Supabase
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
   * Delete screenshots from storage
   */
  async deleteScreenshots(sessionId: string, screenshotIds: string[]): Promise<boolean> {
    if (!this.supabase || !this.config) {
      console.error('[ScreenshotSupabaseService] Supabase not initialized');
      return false;
    }

    try {
      // Generate file paths for deletion
      const filePaths = screenshotIds.map(id => `sessions/${sessionId}/screenshots/${id}.png`);

      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove(filePaths);

      if (error) {
        console.error('[ScreenshotSupabaseService] Delete error:', error);
        return false;
      }

      console.log(`[ScreenshotSupabaseService] Deleted ${filePaths.length} screenshots for session ${sessionId}`);
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
    if (!this.supabase || !this.config) {
      return {
        bucketSize: 0,
        fileCount: 0,
        isConfigured: false
      };
    }

    try {
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .list('sessions', {
          limit: 1000,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('[ScreenshotSupabaseService] Stats error:', error);
        return {
          bucketSize: 0,
          fileCount: 0,
          isConfigured: true
        };
      }

      const fileCount = data?.length || 0;
      // Note: Supabase doesn't provide direct bucket size info
      // You'd need to implement a custom solution to track this

      return {
        bucketSize: 0, // Would need custom tracking
        fileCount,
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
   * Test Supabase connection
   */
  async testConnection(): Promise<boolean> {
    if (!this.supabase || !this.config) {
      return false;
    }

    try {
      const { data, error } = await this.supabase.storage.listBuckets();

      if (error) {
        console.error('[ScreenshotSupabaseService] Connection test failed:', error);
        return false;
      }

      console.log('[ScreenshotSupabaseService] Connection test successful');
      return true;
    } catch (error) {
      console.error('[ScreenshotSupabaseService] Connection test error:', error);
      return false;
    }
  }

  /**
   * Check if service is properly configured
   */
  isConfigured(): boolean {
    return !!(this.supabase && this.config);
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
      hasCredentials: !!(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY))
    };
  }
}