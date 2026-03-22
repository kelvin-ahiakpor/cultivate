require('dotenv').config();
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;

async function testShort() {
  console.log('Testing SHORT message translation (should work)...\n');
  
  const shortText = "Good morning! How can I help you with your farm today?";
  console.log(`Input (${shortText.length} chars): "${shortText}"\n`);
  
  const response = await fetch('https://translation-api.ghananlp.org/v1/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
    },
    body: JSON.stringify({ in: shortText, lang: 'en-tw' }),
  });
  
  const data = await response.json();
  
  if (typeof data === 'string') {
    console.log(`✅ Translated (${data.length} chars):\n"${data}"\n`);
    console.log(`Compression: ${((data.length / shortText.length) * 100).toFixed(1)}%`);
  } else {
    console.log('❌ Error:', data);
  }
}

testShort();
