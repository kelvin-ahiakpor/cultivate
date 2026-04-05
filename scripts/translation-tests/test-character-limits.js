/**
 * Test Khaya API character limits
 * Find the exact truncation point
 */

require('dotenv').config();
const KHAYA_API_KEY = process.env.KHAYA_API_KEY;

const tests = [
  {
    name: "200 chars (safe)",
    text: "Maize is a great crop for Ghana. Plant during the rainy season in April-May. Space plants 75cm apart. Apply fertilizer at 3 weeks. Harvest when kernels are hard and dry after 3-4 months of growth."
  },
  {
    name: "400 chars (should work)",
    text: "Maize is one of Ghana's most important crops. The best planting time is during the major rainy season from April to May. Prepare your land well by clearing and plowing. Plant seeds 75cm apart in rows. Apply NPK fertilizer at 3 weeks after planting. Weed regularly to prevent competition. Watch for fall armyworm pests and treat with neem extract. Harvest when kernels are hard and the husks are dry, typically 3-4 months after planting. Store in a dry place to prevent mold."
  },
  {
    name: "600 chars (might truncate)",
    text: "Maize is one of Ghana's most important staple crops, grown across all regions. The best planting time is during the major rainy season from April to May in the south, or May to June in the north. Prepare your land well by clearing vegetation and plowing to create a fine seedbed. Plant seeds 75cm apart in rows, with rows spaced 75-90cm apart. Apply NPK fertilizer (15-15-15) at 3 weeks after planting, and again at 6 weeks. Weed regularly to prevent competition for nutrients and water. Watch carefully for fall armyworm pests and treat promptly with neem extract or approved pesticides. Harvest when kernels are hard and the husks are brown and dry, typically 3-4 months after planting depending on variety. Store in a dry, well-ventilated place to prevent mold and aflatoxin contamination."
  }
];

async function testLimit(testCase) {
  console.log(`\n${'='.repeat(70)}`);
  console.log(`TEST: ${testCase.name}`);
  console.log(`Input: ${testCase.text.length} characters`);
  console.log(`${'='.repeat(70)}`);

  try {
    const response = await fetch('https://translation-api.ghananlp.org/v1/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
      },
      body: JSON.stringify({
        in: testCase.text,
        lang: 'en-tw',
      }),
    });

    const data = await response.json();

    if (typeof data === 'string') {
      const complete = data.length > testCase.text.length * 0.7; // Consider "complete" if >70% returned
      console.log(`${complete ? '✅' : '⚠️'} Output: ${data.length} characters (${((data.length / testCase.text.length) * 100).toFixed(1)}%)`);
      console.log(`Translation: "${data.substring(0, 100)}${data.length > 100 ? '...' : ''}"`);

      if (!complete) {
        console.log(`\n❌ TRUNCATED! Only got ${data.length}/${testCase.text.length} chars`);
      }

      return { input: testCase.text.length, output: data.length, complete };
    } else {
      console.log('❌ API Error:', data);
      return { input: testCase.text.length, output: 0, complete: false };
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
    return { input: testCase.text.length, output: 0, complete: false };
  }
}

async function runAllTests() {
  console.log('\n🧪 TESTING KHAYA API CHARACTER LIMITS\n');

  const results = [];

  for (const test of tests) {
    const result = await testLimit(test);
    results.push(result);

    // Wait 6 seconds between requests to respect rate limit (10 req/min)
    if (test !== tests[tests.length - 1]) {
      console.log('\n⏳ Waiting 6 seconds (rate limit)...');
      await new Promise(resolve => setTimeout(resolve, 6000));
    }
  }

  console.log(`\n${'='.repeat(70)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(70)}`);
  results.forEach((r, i) => {
    console.log(`${tests[i].name}: ${r.input} chars → ${r.output} chars (${r.complete ? '✅ Complete' : '⚠️ Truncated'})`);
  });

  console.log(`\n📊 Estimated character limit: ~${Math.max(...results.filter(r => r.complete).map(r => r.input))} chars`);
}

runAllTests();
