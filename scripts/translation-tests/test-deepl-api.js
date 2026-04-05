/**
 * Test script for DeepL API
 * Run: node scripts/translation-tests/test-deepl-api.js
 */

require('dotenv').config();

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.error('❌ DEEPL_API_KEY not found in .env');
  process.exit(1);
}

async function testDeepLAPI() {
  console.log('🧪 Testing DeepL API...\n');

  console.log('Test: English → French');
  console.log('Input: "Hello, how are you?"\n');

  try {
    const params = new URLSearchParams({
      auth_key: DEEPL_API_KEY,
      text: 'Hello, how are you?',
      target_lang: 'FR',
    });

    const response = await fetch('https://api-free.deepl.com/v2/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params,
    });

    console.log('Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.translations && data.translations[0]) {
      console.log('\n✅ Translation successful!');
      console.log('Translated text:', data.translations[0].text);
    } else {
      console.log('\n⚠️  Translation failed');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testDeepLAPI();
