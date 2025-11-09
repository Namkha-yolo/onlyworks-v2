import { safeStorage } from 'electron';
import Store from 'electron-store';

interface ApiCredentials {
  googleApiKey?: string;
  openaiApiKey?: string;
  customApiKeys?: Record<string, string>;
}

interface ApiCallRequest {
  service: 'google-ai' | 'openai' | 'custom';
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  endpoint: string;
  body?: any;
  params?: Record<string, string>;
  customHeaders?: Record<string, string>;
}

interface ApiCallResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
}

// Encrypted storage for API credentials
const credentialsStore = new Store({
  name: 'api-credentials',
  encryptionKey: 'onlyworks-secure-api-keys', // In production, use environment variable
});

export class SecureApiProxyService {
  private static instance: SecureApiProxyService;

  constructor() {
    // Initialize with environment variables if available
    this.initializeCredentialsFromEnv();
  }

  static getInstance(): SecureApiProxyService {
    if (!SecureApiProxyService.instance) {
      SecureApiProxyService.instance = new SecureApiProxyService();
    }
    return SecureApiProxyService.instance;
  }

  private initializeCredentialsFromEnv(): void {
    try {
      const credentials: ApiCredentials = {};

      // Load from environment variables
      if (process.env.GOOGLE_API_KEY) {
        credentials.googleApiKey = process.env.GOOGLE_API_KEY;
      }
      if (process.env.OPENAI_API_KEY) {
        credentials.openaiApiKey = process.env.OPENAI_API_KEY;
      }

      // Store encrypted credentials
      if (Object.keys(credentials).length > 0) {
        this.storeCredentials(credentials);
        console.log('[SecureAPI] Credentials loaded from environment');
      }
    } catch (error) {
      console.error('[SecureAPI] Failed to initialize credentials:', error);
    }
  }

  /**
   * Securely store API credentials using Electron's safeStorage
   */
  private storeCredentials(credentials: ApiCredentials): void {
    try {
      if (safeStorage.isEncryptionAvailable()) {
        const encrypted = safeStorage.encryptString(JSON.stringify(credentials));
        credentialsStore.set('credentials', encrypted.toString('base64'));
      } else {
        // Fallback to electron-store's built-in encryption
        credentialsStore.set('credentials', credentials);
      }
      console.log('[SecureAPI] Credentials stored securely');
    } catch (error) {
      console.error('[SecureAPI] Failed to store credentials:', error);
    }
  }

  /**
   * Retrieve and decrypt API credentials
   */
  private getCredentials(): ApiCredentials {
    try {
      const stored = credentialsStore.get('credentials') as string | ApiCredentials;

      if (!stored) return {};

      if (typeof stored === 'string' && safeStorage.isEncryptionAvailable()) {
        // Decrypt using safeStorage
        const buffer = Buffer.from(stored, 'base64');
        const decrypted = safeStorage.decryptString(buffer);
        return JSON.parse(decrypted);
      } else {
        // Use electron-store's built-in encryption
        return stored as ApiCredentials;
      }
    } catch (error) {
      console.error('[SecureAPI] Failed to retrieve credentials:', error);
      return {};
    }
  }

  /**
   * Update API credentials (only callable from main process)
   */
  async updateCredentials(newCredentials: Partial<ApiCredentials>): Promise<boolean> {
    try {
      const existing = this.getCredentials();
      const updated = { ...existing, ...newCredentials };
      this.storeCredentials(updated);
      return true;
    } catch (error) {
      console.error('[SecureAPI] Failed to update credentials:', error);
      return false;
    }
  }

  /**
   * Make a secure API call without exposing credentials
   */
  async makeSecureApiCall<T = any>(request: ApiCallRequest): Promise<ApiCallResponse<T>> {
    try {
      const credentials = this.getCredentials();
      const { service, method, endpoint, body, params, customHeaders = {} } = request;

      // Prepare headers based on service
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'User-Agent': 'OnlyWorks/1.0.0',
        ...customHeaders
      };

      // Add authentication headers based on service
      switch (service) {
        case 'google-ai':
          if (!credentials.googleApiKey) {
            throw new Error('Google AI API key not configured');
          }
          headers['Authorization'] = `Bearer ${credentials.googleApiKey}`;
          break;

        case 'openai':
          if (!credentials.openaiApiKey) {
            throw new Error('OpenAI API key not configured');
          }
          headers['Authorization'] = `Bearer ${credentials.openaiApiKey}`;
          break;

        case 'custom':
          // For custom APIs, you might pass the key name in params
          const keyName = params?.keyName;
          if (keyName && credentials.customApiKeys?.[keyName]) {
            headers['Authorization'] = `Bearer ${credentials.customApiKeys[keyName]}`;
          }
          break;
      }

      // Build URL with query parameters
      let url = endpoint;
      if (params && Object.keys(params).length > 0) {
        const searchParams = new URLSearchParams();
        Object.entries(params).forEach(([key, value]) => {
          if (key !== 'keyName') { // Exclude internal params
            searchParams.append(key, value);
          }
        });
        url += `?${searchParams.toString()}`;
      }

      console.log(`[SecureAPI] ${method} ${service} API call to ${url}`);

      // Make the API call using fetch
      const response = await fetch(url, {
        method,
        headers,
        body: body && (method === 'POST' || method === 'PUT')
          ? JSON.stringify(body)
          : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }

        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: errorData.message || `HTTP ${response.status}: ${response.statusText}`,
            details: errorData,
            timestamp: new Date().toISOString()
          }
        };
      }

      const data = await response.json();
      console.log(`[SecureAPI] ${service} API call successful`);

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error(`[SecureAPI] ${request.service} API call failed:`, error);
      return {
        success: false,
        error: {
          code: 'API_CALL_ERROR',
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  /**
   * Predefined API calls for common services
   */

  // Google AI (Gemini) API calls
  async callGeminiAI(prompt: string, imageData?: string): Promise<ApiCallResponse> {
    const body: any = {
      contents: [{
        parts: [{ text: prompt }]
      }]
    };

    // Add image if provided
    if (imageData) {
      // Remove data URL prefix if present
      const cleanImageData = imageData.replace(/^data:image\/[^;]+;base64,/, '');
      body.contents[0].parts.push({
        inline_data: {
          mime_type: 'image/png',
          data: cleanImageData
        }
      });
    }

    return this.makeSecureApiCall({
      service: 'google-ai',
      method: 'POST',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent',
      body
    });
  }

  // OpenAI API calls
  async callOpenAI(prompt: string, model: string = 'gpt-3.5-turbo'): Promise<ApiCallResponse> {
    return this.makeSecureApiCall({
      service: 'openai',
      method: 'POST',
      endpoint: 'https://api.openai.com/v1/chat/completions',
      body: {
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1000
      }
    });
  }

  // Custom API call helper
  async callCustomAPI(
    endpoint: string,
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',
    options: {
      body?: any;
      params?: Record<string, string>;
      headers?: Record<string, string>;
      apiKeyName?: string;
    } = {}
  ): Promise<ApiCallResponse> {
    return this.makeSecureApiCall({
      service: 'custom',
      method,
      endpoint,
      body: options.body,
      params: options.apiKeyName
        ? { ...options.params, keyName: options.apiKeyName }
        : options.params,
      customHeaders: options.headers
    });
  }

  /**
   * Test API connectivity without exposing credentials
   */
  async testApiConnectivity(): Promise<Record<string, boolean>> {
    const credentials = this.getCredentials();
    const results: Record<string, boolean> = {};

    // Test Google AI
    if (credentials.googleApiKey) {
      try {
        const result = await this.callGeminiAI('Hello');
        results['google-ai'] = result.success;
      } catch {
        results['google-ai'] = false;
      }
    }

    // Test OpenAI
    if (credentials.openaiApiKey) {
      try {
        const result = await this.callOpenAI('Hello');
        results['openai'] = result.success;
      } catch {
        results['openai'] = false;
      }
    }

    return results;
  }

  /**
   * Clear all stored credentials
   */
  async clearCredentials(): Promise<boolean> {
    try {
      credentialsStore.delete('credentials');
      console.log('[SecureAPI] All credentials cleared');
      return true;
    } catch (error) {
      console.error('[SecureAPI] Failed to clear credentials:', error);
      return false;
    }
  }
}