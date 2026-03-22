/**
 * Test how Khaya handles markdown formatting
 */

require('dotenv').config();
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;

const tests = [
  {
    name: "Plain text (no markdown)",
    text: "Maize is a great crop for Ghana. Plant during the rainy season. Harvest after 3-4 months."
  },
  {
    name: "With headings and bold",
    text: `## Best Crops for Ghana

**Maize** - Plant during rainy season
**Cassava** - Drought tolerant
**Yam** - High market value`
  },
  {
    name: "With bullets",
    text: `Best practices for maize:
- Plant in April-May
- Space 75cm apart
- Apply fertilizer at 3 weeks
- Harvest when dry`
  },
  {
    name: "Full markdown (headings + bold + bullets)",
    text: `## Maize Farming Guide

### Planting
- **Season**: April-May (rainy season)
- **Spacing**: 75cm apart in rows
- **Depth**: 5cm deep

### Care
- Apply **NPK fertilizer** at 3 weeks
- Weed regularly
- Watch for pests

### Harvest
Harvest when kernels are **hard and dry** (3-4 months).`
  }
];

async function testMarkdown(test) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST: ${test.name}`);
  console.log(`Input (${test.text.length} chars):`);
  console.log(`${'─'.repeat(70)}`);
  console.log(test.text);
  console.log(`${'─'.repeat(70)}`);

  try {
    const response = await fetch('https://translation-api.ghananlp.org/v1/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
      },
      body: JSON.stringify({
        in: test.text,
        lang: 'en-tw',
      }),
    });

    const data = await response.json();

    if (typeof data === 'string') {
      console.log(`\nOutput (${data.length} chars, ${((data.length / test.text.length) * 100).toFixed(1)}%):`);
      console.log(`${'─'.repeat(70)}`);
      console.log(data);
      console.log(`${'─'.repeat(70)}`);

      // Check markdown preservation
      const issues = [];

      if (test.text.includes('##') && !data.includes('##')) {
        issues.push('❌ Headings (##) removed');
      } else if (test.text.includes('##') && data.includes('##')) {
        issues.push('⚠️ Headings (##) present but may be mangled');
      }

      if (test.text.includes('**') && !data.includes('**')) {
        issues.push('❌ Bold (**) removed');
      } else if (test.text.includes('**')) {
        const inputBold = (test.text.match(/\*\*/g) || []).length;
        const outputBold = (data.match(/\*\*/g) || []).length;
        if (inputBold !== outputBold) {
          issues.push(`⚠️ Bold markers mismatched (${inputBold} → ${outputBold})`);
        }
      }

      if (test.text.includes('\n-') && !data.includes('\n-')) {
        issues.push('❌ Bullets (-) removed');
      }

      console.log(`\n${issues.length === 0 ? '✅ No obvious markdown issues' : issues.join('\n')}`);

      return data;
    } else {
      console.log('❌ API Error:', data);
      return null;
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return null;
  }
}

async function run() {
  console.log('\n🧪 TESTING MARKDOWN PRESERVATION IN TRANSLATION\n');

  for (let i = 0; i < tests.length; i++) {
    await testMarkdown(tests[i]);

    if (i < tests.length - 1) {
      console.log('\n⏳ Waiting 6 seconds (rate limit)...');
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('CONCLUSION');
  console.log('='.repeat(70));
  console.log('Check above for markdown preservation issues.');
  console.log('Khaya API is text-aware, NOT markdown-aware.');
  console.log('Headings/bold/bullets may be preserved but formatting can break.');
}

run();
