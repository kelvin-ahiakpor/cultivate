/**
 * Test script for Khaya API (Ghana NLP Translation)
 * Run: node test-khaya-api.js
 */

require('dotenv').config();

const KHAYA_API_KEY = process.env.KHAYA_API_KEY;

if (!KHAYA_API_KEY) {
  console.error('❌ KHAYA_API_KEY not found in .env');
  process.exit(1);
}

async function testKhayaAPI() {
  console.log('🧪 Testing Khaya API...\n');

  // Test 1: English to Twi
  console.log('Test 1: English → Twi');
  console.log('Input: "Hello, how are you?"\n');

  try {
    const response = await fetch('https://translation-api.ghananlp.org/v1/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
      },
      body: JSON.stringify({
        in: 'Hello, how are you?',
        lang: 'en-tw',
      }),
    });

    console.log('Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.translatedText) {
      console.log('\n✅ Translation successful!');
      console.log('Translated text:', data.translatedText);
    } else {
      console.log('\n⚠️  No translatedText field in response');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }

  console.log('\n---\n');

  // Test 2: Twi to English
  console.log('Test 2: Twi → English');
  console.log('Input: "Ɛte sɛn?"\n');

  try {
    const response = await fetch('https://translation-api.ghananlp.org/v1/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
      },
      body: JSON.stringify({
        in: 'Ɛte sɛn?',
        lang: 'tw-en',
      }),
    });

    console.log('Status:', response.status, response.statusText);

    const data = await response.json();
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.translatedText) {
      console.log('\n✅ Translation successful!');
      console.log('Translated text:', data.translatedText);
    } else {
      console.log('\n⚠️  No translatedText field in response');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testKhayaAPI();
