/**
 * Check if translations complete properly (not cut off mid-sentence)
 */

require('dotenv').config();
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;

async function testCompletion(charCount) {
  // Generate text of exact length
  const baseText = "Maize farming in Ghana requires good planning. ";
  let text = "";
  while (text.length < charCount) {
    text += baseText;
  }
  text = text.substring(0, charCount);

  console.log(`\n${'='.repeat(70)}`);
  console.log(`Testing ${charCount} characters`);
  console.log(`${'='.repeat(70)}`);
  console.log(`Input ends with: "...${text.substring(text.length - 50)}"`);

  const response = await fetch('https://translation-api.ghananlp.org/v1/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
    },
    body: JSON.stringify({ in: text, lang: 'en-tw' }),
  });

  const data = await response.json();

  if (typeof data === 'string') {
    console.log(`\nOutput: ${data.length} chars (${((data.length / text.length) * 100).toFixed(1)}%)`);
    console.log(`Output ends with: "...${data.substring(data.length - 50)}"`);

    // Check if it looks truncated (ends with incomplete character or mid-word)
    const lastChar = data[data.length - 1];
    const lastFewChars = data.substring(data.length - 5);

    if (lastChar === '<' || lastChar === '>' || /[a-zA-Z]$/.test(lastFewChars)) {
      console.log(`\n⚠️ LOOKS TRUNCATED! Last char: "${lastChar}"`);
      return false;
    } else {
      console.log(`\n✅ LOOKS COMPLETE! Last char: "${lastChar}"`);
      return true;
    }
  } else {
    console.log('❌ Error:', data);
    return false;
  }
}

async function run() {
  console.log('🧪 Testing if translations complete properly...\n');

  // Test increasing sizes to find truncation point
  const sizes = [200, 400, 600, 800, 1000, 1200];

  for (let i = 0; i < sizes.length; i++) {
    const complete = await testCompletion(sizes[i]);

    if (i < sizes.length - 1) {
      console.log('\n⏳ Waiting 6 seconds...');
      await new Promise(resolve => setTimeout(resolve, 6000));
    }

    if (!complete) {
      console.log(`\n📊 TRUNCATION STARTS AROUND ${sizes[i]} characters`);
      break;
    }
  }
}

run();
