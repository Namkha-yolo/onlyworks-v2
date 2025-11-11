// Test script for AI analysis functionality
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

console.log('\n=== Testing AI Analysis Setup ===\n');

// 1. Check environment variables
console.log('1. Environment Variables Check:');
console.log('   GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? `✅ Set (${process.env.GOOGLE_API_KEY.length} chars)` : '❌ Not Set');
console.log('   ONLYWORKS_SERVER_URL:', process.env.ONLYWORKS_SERVER_URL || '❌ Not Set');
console.log('   AI_PROVIDER:', process.env.AI_PROVIDER || 'Not Set');

// 2. Test Gemini API directly
async function testGeminiAPI() {
  console.log('\n2. Testing Gemini API directly:');

  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.log('   ❌ Cannot test - No API key found');
    return false;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  try {
    console.log('   Making test request to Gemini API...');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: 'Say "Hello, OnlyWorks AI is working!" if you receive this message.'
          }]
        }],
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 100,
        }
      }),
    });

    console.log(`   Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.log(`   ❌ API Error: ${errorText}`);

      // Parse common errors
      if (response.status === 400 && errorText.includes('API_KEY_INVALID')) {
        console.log('   ⚠️  The API key appears to be invalid. Please check your GOOGLE_API_KEY in .env');
      } else if (response.status === 403) {
        console.log('   ⚠️  The API key is not authorized or quota exceeded');
      }
      return false;
    }

    const data = await response.json();
    const result = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    console.log('   ✅ API Response:', result.substring(0, 100));
    return true;

  } catch (error) {
    console.log(`   ❌ Network/Connection Error: ${error.message}`);
    return false;
  }
}

// 3. Check backend server
async function testBackendServer() {
  console.log('\n3. Testing Backend Server:');

  const serverUrl = process.env.ONLYWORKS_SERVER_URL || 'http://localhost:8080';

  try {
    console.log(`   Checking ${serverUrl}/api/health...`);
    const response = await fetch(`${serverUrl}/api/health`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (response.ok) {
      const data = await response.json();
      console.log(`   ✅ Backend is running:`, data);
      return true;
    } else {
      console.log(`   ❌ Backend returned status ${response.status}`);
      return false;
    }
  } catch (error) {
    console.log(`   ❌ Backend not accessible: ${error.message}`);
    console.log('   ⚠️  Make sure the backend server is running on port 8080');
    return false;
  }
}

// Run all tests
async function runTests() {
  const geminiOk = await testGeminiAPI();
  const backendOk = await testBackendServer();

  console.log('\n=== Summary ===\n');
  console.log('Gemini API:', geminiOk ? '✅ Working' : '❌ Not Working');
  console.log('Backend Server:', backendOk ? '✅ Working' : '❌ Not Working');

  if (!geminiOk) {
    console.log('\n⚠️  AI Analysis Issue Detected:');
    console.log('1. Check that GOOGLE_API_KEY is set correctly in .env');
    console.log('2. Verify the API key is valid at https://makersuite.google.com/app/apikey');
    console.log('3. Ensure the Gemini API is enabled for your project');
  }

  if (!backendOk) {
    console.log('\n⚠️  Backend Server Issue:');
    console.log('1. Start the backend server in a separate terminal');
    console.log('2. Check that it\'s running on port 8080');
  }

  console.log('\n');
}

// Run the tests
runTests().catch(console.error);