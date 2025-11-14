import { net } from 'electron';

// Utility for exponential backoff retry
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const exponentialBackoff = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt === maxRetries) {
        throw lastError;
      }

      const delayMs = baseDelay * Math.pow(2, attempt);
      console.log(`[BackendAPI] Retry attempt ${attempt + 1}/${maxRetries + 1} in ${delayMs}ms`);
      await delay(delayMs);
    }
  }

  throw lastError!;
};

export interface BackendConfig {
  baseUrl: string;
  timeout: number;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
  };
  message?: string;
}

export class BackendApiService {
  private static instance: BackendApiService;
  private config: BackendConfig;
  private authToken: string | null = null;
  private useFallback: boolean = false;

  constructor(config?: BackendConfig) {
    this.config = {
      baseUrl: config?.baseUrl || process.env.ONLYWORKS_SERVER_URL || 'https://onlyworks-backend-server.onrender.com',
      timeout: config?.timeout || 30000
    };

    // No default auth token - users must authenticate through OAuth
    this.authToken = null;
    console.log('[BackendAPI] Initialized without default authentication - OAuth required');
  }

  static getInstance(config?: BackendConfig): BackendApiService {
    if (!BackendApiService.instance) {
      BackendApiService.instance = new BackendApiService(config);
    }
    return BackendApiService.instance;
  }

  setAuthToken(token: string): void {
    this.authToken = token;
  }

  clearAuthToken(): void {
    this.authToken = null;
  }

  /**
   * Fetch-based request as fallback for net module issues
   */
  private async makeFetchRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;

      console.log(`[BackendAPI] [FETCH] === REQUEST START ===`);
      console.log(`[BackendAPI] [FETCH] ${method} ${url}`);
      if (body) console.log(`[BackendAPI] [FETCH] Body:`, JSON.stringify(body, null, 2));

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add auth token if available
      if (this.authToken) {
        requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
        console.log(`[BackendAPI] [FETCH] Using auth token: ${this.authToken.substring(0, 20)}...`);
      } else {
        console.log(`[BackendAPI] [FETCH] No auth token available`);
      }

      console.log(`[BackendAPI] [FETCH] Headers:`, requestHeaders);

      const response = await fetch(url, {
        method,
        headers: requestHeaders,
        body: body && (method === 'POST' || method === 'PUT') ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(this.config.timeout)
      });

      console.log(`[BackendAPI] [FETCH] Response status: ${response.status}`);
      console.log(`[BackendAPI] [FETCH] Response headers:`, Object.fromEntries(response.headers.entries()));

      const responseText = await response.text();
      console.log(`[BackendAPI] [FETCH] Raw response data:`, responseText);

      let parsedData;
      try {
        parsedData = responseText ? JSON.parse(responseText) : {};
        console.log(`[BackendAPI] [FETCH] Parsed response:`, parsedData);
      } catch {
        parsedData = { message: responseText };
      }

      if (response.ok) {
        console.log(`[BackendAPI] [FETCH] === REQUEST SUCCESS ===`);
        return {
          success: true,
          data: parsedData
        };
      } else {
        console.log(`[BackendAPI] [FETCH] === REQUEST FAILED (HTTP ${response.status}) ===`);
        return {
          success: false,
          error: {
            code: `HTTP_${response.status}`,
            message: parsedData.message || `HTTP ${response.status}: ${response.statusText}`,
            details: parsedData,
            timestamp: new Date().toISOString()
          }
        };
      }

    } catch (error) {
      console.error(`[BackendAPI] [FETCH] === REQUEST FAILED ===`);
      console.error(`[BackendAPI] [FETCH] Error:`, error);
      return {
        success: false,
        error: {
          code: error instanceof Error && error.name === 'AbortError' ? 'TIMEOUT' : 'FETCH_ERROR',
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  private async makeRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    // Use exponential backoff retry for resilience
    return exponentialBackoff(async () => {
      // Try fetch first if fallback is enabled, otherwise try net module
      if (this.useFallback) {
        console.log(`[BackendAPI] Using fetch fallback mode`);
        return this.makeFetchRequest<T>(method, endpoint, body, headers);
      } else {
        try {
          console.log(`[BackendAPI] Trying net module first`);
          return await this.makeNetRequest<T>(method, endpoint, body, headers);
        } catch (error) {
          console.log(`[BackendAPI] Net module failed, falling back to fetch:`, (error as Error).message);
          this.useFallback = true;
          return this.makeFetchRequest<T>(method, endpoint, body, headers);
        }
      }
    }, 2, 1000); // 2 retries, 1 second base delay
  }

  private async makeNetRequest<T = any>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    endpoint: string,
    body?: any,
    headers: Record<string, string> = {}
  ): Promise<ApiResponse<T>> {
    try {
      const url = `${this.config.baseUrl}${endpoint}`;

      console.log(`[BackendAPI] === REQUEST START ===`);
      console.log(`[BackendAPI] ${method} ${url}`);
      console.log(`[BackendAPI] Timeout: ${this.config.timeout}ms`);
      if (body) console.log(`[BackendAPI] Body:`, JSON.stringify(body, null, 2));

      // Prepare headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers
      };

      // Add auth token if available
      if (this.authToken) {
        requestHeaders['Authorization'] = `Bearer ${this.authToken}`;
        console.log(`[BackendAPI] Using auth token: ${this.authToken.substring(0, 20)}...`);
      } else {
        console.log(`[BackendAPI] No auth token available`);
      }

      console.log(`[BackendAPI] Headers:`, requestHeaders);

      return new Promise((resolve, reject) => {
        const request = net.request({
          method,
          url,
        });

        // Set headers
        Object.entries(requestHeaders).forEach(([key, value]) => {
          request.setHeader(key, value);
        });

        // Handle response
        request.on('response', (response) => {
          let data = '';

          response.on('data', (chunk) => {
            data += chunk.toString();
          });

          response.on('end', () => {
            clearTimeout(timeoutId);
            console.log(`[BackendAPI] Response status: ${response.statusCode}`);
            console.log(`[BackendAPI] Response headers:`, response.headers);
            console.log(`[BackendAPI] Raw response data:`, data);

            try {
              const parsedData = data ? JSON.parse(data) : {};
              console.log(`[BackendAPI] Parsed response:`, parsedData);

              if (response.statusCode >= 200 && response.statusCode < 300) {
                console.log(`[BackendAPI] === REQUEST SUCCESS ===`);
                resolve(parsedData);
              } else {
                console.log(`[BackendAPI] === REQUEST FAILED (HTTP ${response.statusCode}) ===`);
                resolve({
                  success: false,
                  error: parsedData.error || {
                    code: 'HTTP_ERROR',
                    message: `HTTP ${response.statusCode}`,
                    timestamp: new Date().toISOString()
                  }
                });
              }
            } catch (parseError) {
              console.error(`[BackendAPI] Parse error:`, parseError);
              console.log(`[BackendAPI] === REQUEST FAILED (PARSE ERROR) ===`);
              resolve({
                success: false,
                error: {
                  code: 'PARSE_ERROR',
                  message: 'Failed to parse response',
                  details: { originalData: data },
                  timestamp: new Date().toISOString()
                }
              });
            }
          });
        });

        // Handle request errors
        request.on('error', (error) => {
          clearTimeout(timeoutId);
          console.error(`[BackendAPI] === REQUEST FAILED (NETWORK ERROR) ===`);
          console.error(`[BackendAPI] Network error:`, error);
          resolve({
            success: false,
            error: {
              code: 'NETWORK_ERROR',
              message: (error as Error).message,
              timestamp: new Date().toISOString()
            }
          });
        });

        // Set timeout using setTimeout
        const timeoutId = setTimeout(() => {
          request.abort();
          resolve({
            success: false,
            error: {
              code: 'TIMEOUT',
              message: `Request timeout after ${this.config.timeout}ms`,
              timestamp: new Date().toISOString()
            }
          });
        }, this.config.timeout);

        // Send request body if provided
        if (body && (method === 'POST' || method === 'PUT')) {
          request.write(JSON.stringify(body));
        }

        request.end();
      });

    } catch (error) {
      console.error(`[BackendAPI] Request setup failed:`, error);
      return {
        success: false,
        error: {
          code: 'REQUEST_SETUP_ERROR',
          message: (error as Error).message,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/health');
  }

  // User endpoints
  async getUserProfile(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/api/users/profile');
  }

  async updateUserProfile(profileData: any): Promise<ApiResponse> {
    return this.makeRequest('PUT', '/api/users/profile', profileData);
  }

  // Session endpoints
  async startSession(sessionData: { session_name?: string; goal_description?: string }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/api/sessions/start', sessionData);
  }

  async endSession(sessionId: string, endData?: {
    duration_seconds?: number;
    end_time?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/api/sessions/${sessionId}/end`, endData);
  }

  async pauseSession(sessionId: string): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/api/sessions/${sessionId}/pause`);
  }

  async resumeSession(sessionId: string): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/api/sessions/${sessionId}/resume`);
  }

  async getActiveSession(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/api/sessions/active');
  }

  async getUserSessions(options: {
    page?: number;
    limit?: number;
    status?: string;
    date_from?: string;
    date_to?: string;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/api/sessions${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest('GET', endpoint);
  }

  async getSessionById(sessionId: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/api/sessions/${sessionId}`);
  }

  async updateSessionScores(sessionId: string, scores: {
    productivity_score?: number;
    focus_score?: number;
  }): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/api/sessions/${sessionId}/scores`, scores);
  }

  async getSessionStats(dateFrom?: string, dateTo?: string): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    if (dateFrom) queryParams.append('date_from', dateFrom);
    if (dateTo) queryParams.append('date_to', dateTo);

    const queryString = queryParams.toString();
    const endpoint = `/api/sessions/stats/summary${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest('GET', endpoint);
  }

  // Screenshot endpoints (future implementation)
  async uploadScreenshot(sessionId: string, screenshotData: {
    file_storage_key: string;
    file_size_bytes: number;
    timestamp?: string;
    capture_trigger?: string;
    window_title?: string;
    active_app?: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', `/api/sessions/${sessionId}/screenshots`, screenshotData);
  }

  // AI Analysis endpoints
  async saveSessionAnalysis(sessionId: string, analysisData: {
    productivity_score: number | null;
    focus_patterns: any;
    recommendations: any;
    insights: any;
    ai_provider: string;
    analysis_type: string;
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', `/api/sessions/${sessionId}/analysis`, analysisData);
  }

  async getSessionAnalysis(sessionId: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/api/sessions/${sessionId}/analysis`);
  }

  async getUserAnalysisInsights(options: {
    page?: number;
    limit?: number;
    date_from?: string;
    date_to?: string;
    analysis_type?: string;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/api/analysis/insights${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest('GET', endpoint);
  }

  async getPersonalizedRecommendations(options: {
    timeframe?: 'daily' | 'weekly' | 'monthly';
    category?: 'productivity' | 'focus' | 'goals';
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/api/analysis/recommendations${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest('GET', endpoint);
  }

  async getWorkingPatternAnalysis(options: {
    weeks?: number;
    include_predictions?: boolean;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/api/analysis/patterns${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest('GET', endpoint);
  }

  // Goals endpoints
  async getGoals(): Promise<ApiResponse> {
    return this.makeRequest('GET', '/api/goals');
  }

  async saveGoals(goalsData: {
    personalGoals?: any;
    teamGoals?: any;
    allGoals?: any[];
  }): Promise<ApiResponse> {
    return this.makeRequest('POST', '/api/goals', goalsData);
  }

  async updateGoal(goalId: string, goalData: any): Promise<ApiResponse> {
    return this.makeRequest('PUT', `/api/goals/${goalId}`, goalData);
  }

  async deleteGoal(goalId: string): Promise<ApiResponse> {
    return this.makeRequest('DELETE', `/api/goals/${goalId}`);
  }

  // Batch processing endpoints
  async triggerBatchProcessing(sessionId: string, options: {
    batchSize?: number;
    analysisType?: string;
  } = {}): Promise<ApiResponse> {
    return this.makeRequest('POST', `/api/batch/trigger/${sessionId}`, options);
  }

  async getBatchStatus(sessionId: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/api/batch/status/${sessionId}`);
  }

  async getBatchReports(sessionId: string, options: {
    limit?: number;
    offset?: number;
  } = {}): Promise<ApiResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const queryString = queryParams.toString();
    const endpoint = `/api/batch/reports/${sessionId}${queryString ? `?${queryString}` : ''}`;

    return this.makeRequest('GET', endpoint);
  }

  async generateSessionSummary(sessionId: string): Promise<ApiResponse> {
    return this.makeRequest('GET', `/api/batch/summary/${sessionId}`);
  }

  // Generic request method for custom endpoints
  async get<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest('GET', endpoint);
  }

  async post<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.makeRequest('POST', endpoint, body);
  }

  async put<T = any>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.makeRequest('PUT', endpoint, body);
  }

  async delete<T = any>(endpoint: string): Promise<ApiResponse<T>> {
    return this.makeRequest('DELETE', endpoint);
  }
}

export default BackendApiService;