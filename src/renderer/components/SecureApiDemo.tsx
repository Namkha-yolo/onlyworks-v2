import React, { useState, useEffect } from 'react';

interface ApiTestResult {
  service: string;
  success: boolean;
  response?: any;
  error?: string;
  timestamp: string;
}

interface ConnectivityStatus {
  [key: string]: boolean;
}

const SecureApiDemo: React.FC = () => {
  const [prompt, setPrompt] = useState('Analyze this screenshot for productivity insights');
  const [imageData, setImageData] = useState<string | null>(null);
  const [results, setResults] = useState<ApiTestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [connectivity, setConnectivity] = useState<ConnectivityStatus>({});

  // Test API connectivity on component mount
  useEffect(() => {
    testConnectivity();
  }, []);

  const testConnectivity = async () => {
    try {
      console.log('[SecureAPIDemo] Testing API connectivity...');
      const status = await window.api.testApiConnectivity();
      setConnectivity(status);
      console.log('[SecureAPIDemo] Connectivity status:', status);
    } catch (error) {
      console.error('[SecureAPIDemo] Connectivity test failed:', error);
    }
  };

  const addResult = (service: string, success: boolean, response?: any, error?: string) => {
    const result: ApiTestResult = {
      service,
      success,
      response,
      error,
      timestamp: new Date().toLocaleTimeString()
    };
    setResults(prev => [result, ...prev]);
  };

  const callGeminiAI = async () => {
    setLoading(true);
    try {
      console.log('[SecureAPIDemo] Calling Gemini AI...');
      const result = await window.api.callGeminiAI(prompt, imageData || undefined);

      if (result.success) {
        addResult('Gemini AI', true, result.data);
        console.log('[SecureAPIDemo] Gemini AI success:', result.data);
      } else {
        addResult('Gemini AI', false, undefined, result.error?.message);
        console.error('[SecureAPIDemo] Gemini AI error:', result.error);
      }
    } catch (error) {
      addResult('Gemini AI', false, undefined, (error as Error).message);
      console.error('[SecureAPIDemo] Gemini AI call failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const callOpenAI = async () => {
    setLoading(true);
    try {
      console.log('[SecureAPIDemo] Calling OpenAI...');
      const result = await window.api.callOpenAI(prompt, 'gpt-3.5-turbo');

      if (result.success) {
        addResult('OpenAI GPT-3.5', true, result.data);
        console.log('[SecureAPIDemo] OpenAI success:', result.data);
      } else {
        addResult('OpenAI GPT-3.5', false, undefined, result.error?.message);
        console.error('[SecureAPIDemo] OpenAI error:', result.error);
      }
    } catch (error) {
      addResult('OpenAI GPT-3.5', false, undefined, (error as Error).message);
      console.error('[SecureAPIDemo] OpenAI call failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const callCustomAPI = async () => {
    setLoading(true);
    try {
      console.log('[SecureAPIDemo] Calling custom API...');
      // Example: JSONPlaceholder API (no auth needed)
      const result = await window.api.callCustomAPI(
        'https://jsonplaceholder.typicode.com/posts/1',
        'GET'
      );

      if (result.success) {
        addResult('JSONPlaceholder', true, result.data);
        console.log('[SecureAPIDemo] Custom API success:', result.data);
      } else {
        addResult('JSONPlaceholder', false, undefined, result.error?.message);
        console.error('[SecureAPIDemo] Custom API error:', result.error);
      }
    } catch (error) {
      addResult('JSONPlaceholder', false, undefined, (error as Error).message);
      console.error('[SecureAPIDemo] Custom API call failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const takeScreenshot = async () => {
    try {
      // Simulate taking a screenshot (this would normally come from a capture service)
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 400;
      canvas.height = 300;

      if (ctx) {
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = '#333';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Mock Screenshot for Demo', canvas.width / 2, canvas.height / 2);
        ctx.fillText(`Generated: ${new Date().toLocaleTimeString()}`, canvas.width / 2, canvas.height / 2 + 30);

        const dataURL = canvas.toDataURL('image/png');
        setImageData(dataURL);
        console.log('[SecureAPIDemo] Mock screenshot generated');
      }
    } catch (error) {
      console.error('[SecureAPIDemo] Screenshot generation failed:', error);
    }
  };

  const clearCredentials = async () => {
    try {
      console.log('[SecureAPIDemo] Clearing API credentials...');
      const success = await window.api.clearApiCredentials();
      if (success) {
        setConnectivity({});
        addResult('Credentials', true, 'All API credentials cleared');
        console.log('[SecureAPIDemo] Credentials cleared successfully');
      } else {
        addResult('Credentials', false, undefined, 'Failed to clear credentials');
        console.error('[SecureAPIDemo] Failed to clear credentials');
      }
    } catch (error) {
      addResult('Credentials', false, undefined, (error as Error).message);
      console.error('[SecureAPIDemo] Clear credentials error:', error);
    }
  };

  const testBackendConnectivity = async () => {
    setLoading(true);
    try {
      console.log('[SecureAPIDemo] Testing backend connectivity...');

      // Test health endpoint
      const healthResult = await window.api.healthCheck();
      console.log('[SecureAPIDemo] Health check result:', healthResult);
      addResult('Backend Health', healthResult.success, healthResult.data, healthResult.error?.message);

      // Test user profile endpoint (should fail without auth)
      const profileResult = await window.api.getUserProfile();
      console.log('[SecureAPIDemo] Profile result:', profileResult);
      addResult('User Profile (No Auth)', profileResult.success, profileResult.data, profileResult.error?.message);

      // Test sessions endpoint
      const sessionsResult = await window.api.getUserSessions();
      console.log('[SecureAPIDemo] Sessions result:', sessionsResult);
      addResult('User Sessions (No Auth)', sessionsResult.success, sessionsResult.data, sessionsResult.error?.message);

    } catch (error) {
      addResult('Backend Test', false, undefined, (error as Error).message);
      console.error('[SecureAPIDemo] Backend connectivity test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCredentials = async () => {
    try {
      // In a real app, you'd show a form for users to enter their API keys
      const googleApiKey = window.prompt('Enter Google API Key (for Gemini):');
      if (!googleApiKey) return;

      console.log('[SecureAPIDemo] Updating credentials...');
      const success = await window.api.updateApiCredentials({
        googleApiKey
      });

      if (success) {
        addResult('Credentials', true, 'API credentials updated');
        testConnectivity(); // Retest connectivity
        console.log('[SecureAPIDemo] Credentials updated successfully');
      } else {
        addResult('Credentials', false, undefined, 'Failed to update credentials');
        console.error('[SecureAPIDemo] Failed to update credentials');
      }
    } catch (error) {
      addResult('Credentials', false, undefined, (error as Error).message);
      console.error('[SecureAPIDemo] Update credentials error:', error);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Secure API Demo</h2>
      <p className="text-gray-600 mb-6">
        This demo shows how to make secure API calls without exposing credentials to the renderer process.
        All API keys are stored encrypted in the main process only.
      </p>

      {/* Connectivity Status */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">API Connectivity Status</h3>
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(connectivity).map(([service, connected]) => (
            <div key={service} className="flex items-center">
              <div
                className={`w-3 h-3 rounded-full mr-2 ${
                  connected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              <span className={connected ? 'text-green-700' : 'text-red-700'}>
                {service}: {connected ? 'Connected' : 'Not Available'}
              </span>
            </div>
          ))}
        </div>
        <button
          onClick={testConnectivity}
          className="mt-3 px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600"
        >
          Retest Connectivity
        </button>
      </div>

      {/* Credential Management */}
      <div className="bg-yellow-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Credential Management</h3>
        <p className="text-sm text-gray-600 mb-3">
          API credentials are encrypted and stored securely in the main process.
          They are never exposed to the renderer process.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={updateCredentials}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Add/Update API Keys
          </button>
          <button
            onClick={clearCredentials}
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
          >
            Clear All Credentials
          </button>
        </div>
      </div>

      {/* Backend Connectivity Testing */}
      <div className="bg-blue-50 rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Backend Server Testing</h3>
        <p className="text-sm text-gray-600 mb-3">
          Test connectivity to the OnlyWorks backend server to diagnose serverless function issues.
        </p>
        <div className="flex space-x-3">
          <button
            onClick={testBackendConnectivity}
            disabled={loading}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Testing...' : 'Test Backend Connectivity'}
          </button>
          <button
            onClick={testConnectivity}
            className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600"
          >
            Retest API Connectivity
          </button>
        </div>
      </div>

      {/* API Testing Controls */}
      <div className="bg-white border rounded-lg p-4 mb-6">
        <h3 className="font-semibold mb-3">Test API Calls</h3>

        {/* Prompt Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            AI Prompt
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md"
            rows={3}
            placeholder="Enter your prompt for AI analysis..."
          />
        </div>

        {/* Screenshot Section */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Screenshot (Optional for Vision APIs)
          </label>
          <div className="flex items-center space-x-3">
            <button
              onClick={takeScreenshot}
              className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
            >
              Generate Mock Screenshot
            </button>
            {imageData && (
              <span className="text-sm text-green-600">Screenshot ready</span>
            )}
          </div>
          {imageData && (
            <div className="mt-2">
              <img src={imageData} alt="Mock screenshot" className="max-w-xs border rounded" />
            </div>
          )}
        </div>

        {/* API Call Buttons */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={callGeminiAI}
            disabled={loading || !connectivity['google-ai']}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Call Gemini AI'}
          </button>
          <button
            onClick={callOpenAI}
            disabled={loading || !connectivity['openai']}
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Call OpenAI'}
          </button>
          <button
            onClick={callCustomAPI}
            disabled={loading}
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:bg-gray-400"
          >
            {loading ? 'Loading...' : 'Call Custom API'}
          </button>
        </div>
      </div>

      {/* Results Section */}
      <div className="bg-white border rounded-lg p-4">
        <h3 className="font-semibold mb-3">API Call Results</h3>
        {results.length === 0 ? (
          <p className="text-gray-500">No API calls made yet. Try calling an API above.</p>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {results.map((result, index) => (
              <div
                key={index}
                className={`border rounded p-3 ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-medium">
                    {result.service}
                    <span
                      className={`ml-2 px-2 py-1 text-xs rounded ${
                        result.success
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {result.success ? 'Success' : 'Failed'}
                    </span>
                  </h4>
                  <span className="text-xs text-gray-500">{result.timestamp}</span>
                </div>

                {result.error && (
                  <p className="text-red-600 text-sm mb-2">Error: {result.error}</p>
                )}

                {result.response && (
                  <div className="bg-white border rounded p-2">
                    <pre className="text-xs overflow-x-auto">
                      {JSON.stringify(result.response, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SecureApiDemo;