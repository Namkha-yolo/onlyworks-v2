# Secure API Usage Examples

This document shows how to use the SecureApiProxyService to make API calls without exposing credentials to the renderer process.

## Architecture Overview

```
Renderer Process (Frontend)          Main Process (Backend)
┌─────────────────────────┐         ┌─────────────────────────────┐
│  React Components       │   IPC   │  SecureApiProxyService      │
│  ├─ window.api calls    │ ──────► │  ├─ Encrypted credential    │
│  ├─ No credentials      │         │  │   storage                 │
│  ├─ Simple API calls    │         │  ├─ Direct API calls        │
│  └─ Secure by design   │         │  ├─ Error handling          │
└─────────────────────────┘         │  └─ Response formatting     │
                                    └─────────────────────────────┘
```

## Key Benefits

- ✅ **Zero Credential Exposure**: API keys never leave the main process
- ✅ **Encrypted Storage**: Credentials stored using Electron's safeStorage
- ✅ **Type Safety**: Full TypeScript support with proper interfaces
- ✅ **Error Handling**: Consistent error responses across all APIs
- ✅ **Easy Integration**: Simple window.api calls from renderer

## Usage Examples

### 1. Basic Setup (Environment Variables)

```bash
# .env file
GOOGLE_API_KEY=your_google_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
```

The service automatically loads credentials from environment variables on startup.

### 2. Google Gemini AI Calls

```typescript
// In your React component
const analyzeScreenshot = async (imageData: string) => {
  try {
    const result = await window.api.callGeminiAI(
      'Analyze this screenshot for productivity insights. What application is being used and what is the productivity score (1-10)?',
      imageData
    );

    if (result.success) {
      console.log('AI Analysis:', result.data);
      // Process the AI response
      setAnalysisResult(result.data);
    } else {
      console.error('AI call failed:', result.error?.message);
      setError(result.error?.message);
    }
  } catch (error) {
    console.error('API call error:', error);
  }
};
```

### 3. OpenAI Calls

```typescript
// In your React component
const getChatResponse = async () => {
  try {
    const result = await window.api.callOpenAI(
      'Suggest 3 productivity tips for software developers',
      'gpt-3.5-turbo'
    );

    if (result.success) {
      const message = result.data.choices[0]?.message?.content;
      setResponse(message);
    } else {
      setError(result.error?.message);
    }
  } catch (error) {
    console.error('OpenAI call failed:', error);
  }
};
```

### 4. Custom API Calls

```typescript
// For APIs that don't require authentication
const fetchPublicData = async () => {
  try {
    const result = await window.api.callCustomAPI(
      'https://api.github.com/users/octocat',
      'GET'
    );

    if (result.success) {
      setUserData(result.data);
    }
  } catch (error) {
    console.error('Custom API call failed:', error);
  }
};

// For APIs with custom authentication
const callPrivateAPI = async () => {
  try {
    const result = await window.api.callCustomAPI(
      'https://api.example.com/data',
      'POST',
      {
        body: { query: 'search term' },
        headers: { 'Custom-Header': 'value' },
        apiKeyName: 'example-api' // Refers to stored credential
      }
    );

    if (result.success) {
      setApiData(result.data);
    }
  } catch (error) {
    console.error('Private API call failed:', error);
  }
};
```

### 5. Advanced Generic API Calls

```typescript
// For maximum flexibility
const makeAdvancedApiCall = async () => {
  try {
    const result = await window.api.secureApiCall({
      service: 'google-ai',
      method: 'POST',
      endpoint: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
      body: {
        contents: [{
          parts: [{ text: 'Hello, how are you?' }]
        }]
      }
    });

    if (result.success) {
      console.log('Response:', result.data);
    }
  } catch (error) {
    console.error('Advanced API call failed:', error);
  }
};
```

### 6. Testing API Connectivity

```typescript
// Check which APIs are available
const checkConnectivity = async () => {
  try {
    const status = await window.api.testApiConnectivity();
    console.log('API Status:', status);
    // Example: { 'google-ai': true, 'openai': false }

    Object.entries(status).forEach(([service, connected]) => {
      console.log(`${service}: ${connected ? 'Available' : 'Not configured'}`);
    });
  } catch (error) {
    console.error('Connectivity test failed:', error);
  }
};
```

### 7. Credential Management

```typescript
// Update API credentials (typically done in settings)
const updateCredentials = async () => {
  try {
    const success = await window.api.updateApiCredentials({
      googleApiKey: 'new_google_key',
      openaiApiKey: 'new_openai_key',
      customApiKeys: {
        'example-api': 'example_key'
      }
    });

    if (success) {
      console.log('Credentials updated successfully');
      // Refresh connectivity status
      checkConnectivity();
    }
  } catch (error) {
    console.error('Failed to update credentials:', error);
  }
};

// Clear all credentials
const clearCredentials = async () => {
  try {
    const success = await window.api.clearApiCredentials();
    if (success) {
      console.log('All credentials cleared');
    }
  } catch (error) {
    console.error('Failed to clear credentials:', error);
  }
};
```

## Error Handling

All API calls return a consistent response format:

```typescript
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
```

### Example Error Handling

```typescript
const handleApiCall = async () => {
  const result = await window.api.callGeminiAI('Hello');

  if (result.success) {
    // Success: use result.data
    console.log('Success:', result.data);
  } else {
    // Error: handle result.error
    switch (result.error?.code) {
      case 'API_CALL_ERROR':
        console.error('Network or API error:', result.error.message);
        break;
      case 'HTTP_401':
        console.error('Authentication failed - check API key');
        break;
      case 'HTTP_429':
        console.error('Rate limit exceeded - try again later');
        break;
      default:
        console.error('Unknown error:', result.error?.message);
    }
  }
};
```

## React Hook Example

```typescript
// Custom hook for Google AI calls
import { useState, useCallback } from 'react';

interface UseGeminiAI {
  callGemini: (prompt: string, image?: string) => Promise<void>;
  response: any | null;
  loading: boolean;
  error: string | null;
}

export const useGeminiAI = (): UseGeminiAI => {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callGemini = useCallback(async (prompt: string, image?: string) => {
    setLoading(true);
    setError(null);

    try {
      const result = await window.api.callGeminiAI(prompt, image);

      if (result.success) {
        setResponse(result.data);
      } else {
        setError(result.error?.message || 'AI call failed');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  return { callGemini, response, loading, error };
};

// Usage in component
const MyComponent = () => {
  const { callGemini, response, loading, error } = useGeminiAI();

  const analyzeImage = () => {
    callGemini('Describe this image', imageData);
  };

  return (
    <div>
      <button onClick={analyzeImage} disabled={loading}>
        {loading ? 'Analyzing...' : 'Analyze Image'}
      </button>
      {error && <p style={{ color: 'red' }}>Error: {error}</p>}
      {response && <pre>{JSON.stringify(response, null, 2)}</pre>}
    </div>
  );
};
```

## Security Features

### 1. Credential Encryption
```typescript
// Credentials are automatically encrypted using Electron's safeStorage
// If safeStorage is not available, falls back to electron-store encryption
```

### 2. Process Isolation
```typescript
// Renderer process never has access to raw API keys
// All API calls are proxied through the main process
// Credentials are stored only in the main process memory and encrypted storage
```

### 3. Type Safety
```typescript
// Full TypeScript support prevents API misuse
// Compile-time checks for correct parameter types
// IntelliSense support in your IDE
```

## Best Practices

1. **Always Check Success**: Every API call returns a success flag - check it!
2. **Handle Errors Gracefully**: Provide user-friendly error messages
3. **Test Connectivity**: Use `testApiConnectivity()` to check API availability
4. **Secure Credential Input**: Never log or expose API keys in the renderer
5. **Rate Limiting**: Handle rate limit errors appropriately
6. **Fallback Strategies**: Have backup plans when APIs are unavailable

## Production Deployment

### Environment Variables
```bash
# Production .env
GOOGLE_API_KEY=prod_google_key
OPENAI_API_KEY=prod_openai_key
NODE_ENV=production
```

### Credential Management
- Use environment variables for API keys in production
- Consider using a secret management service
- Rotate API keys regularly
- Monitor API usage and costs

This secure API system ensures your credentials stay safe while providing a simple, powerful interface for making API calls from your Electron app.