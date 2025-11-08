// Simple test file to check if window.api is available
console.log('=== Testing window.api availability ===');
console.log('window:', typeof window);
console.log('window.api:', typeof window.api);
if (window.api) {
  console.log('window.api methods:', Object.keys(window.api));
} else {
  console.log('window.api is not available!');
}

// Test the actual login flow
async function testOAuth() {
  try {
    console.log('Testing OAuth flow...');
    if (window.api && window.api.initOAuth) {
      const authUrl = await window.api.initOAuth('google');
      console.log('OAuth URL received:', authUrl);
    } else {
      console.log('window.api.initOAuth is not available');
    }
  } catch (error) {
    console.error('OAuth test error:', error);
  }
}

// Auto-run test after page loads
setTimeout(testOAuth, 1000);