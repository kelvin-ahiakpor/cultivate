/**
 * Test Khaya API with long text (to check character limits)
 * Run: node test-long-translation.js
 */

require('dotenv').config();

const KHAYA_API_KEY = process.env.KHAYA_API_KEY;

const longText = `Great question! Ghana's diverse climate and soil conditions support many excellent crops. Here are the best options based on different regions and purposes:

## **Staple Food Crops:**
- **Maize** - Grows well across Ghana, especially in Brong-Ahafo, Northern, and Ashanti regions. Two growing seasons possible in forest zones
- **Cassava** - Very adaptable, drought-tolerant, grows in most regions. Great for food security
- **Yam** - Thrives in Brong-Ahafo, Northern, and parts of Volta Region. High market value
- **Rice** - Best in Northern Region and irrigated valleys. Growing local demand
- **Plantain** - Excellent in forest zones (Western, Central, Eastern, Ashanti regions)

## **Cash Crops:**
- **Cocoa** - Ghana's top export! Best in Western, Central, Eastern, and Ashanti regions (forest belt)
- **Cashew** - Thriving in Northern Ghana (Brong-Ahafo, Northern regions)
- **Oil Palm** - Western, Central, and Eastern regions with good rainfall
- **Coconut** - Coastal areas

## **Vegetables (High Value):**
- **Tomatoes** - Upper East, Brong-Ahafo during dry season
- **Peppers (hot & sweet)** - Most regions, good market demand
- **Onions** - Northern regions during dry season
- **Garden eggs** - Grows well nationwide

## **Legumes:**
- **Groundnuts** - Northern regions
- **Soybeans** - Northern and Brong-Ahafo regions
- **Cowpea (beans)** - Northern Ghana

**To give you more specific advice, could you share:**
- Which region you're farming in?
- What's your farm size?
- Are you looking for food crops or cash crops?

This will help me recommend the best options for your specific situation!`;

async function testLongTranslation() {
  console.log('📝 Testing Khaya API with long text...');
  console.log(`Input length: ${longText.length} characters\n`);
  console.log('─'.repeat(60));

  try {
    const startTime = Date.now();

    const response = await fetch('https://translation-api.ghananlp.org/v1/translate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Ocp-Apim-Subscription-Key': KHAYA_API_KEY,
      },
      body: JSON.stringify({
        in: longText,
        lang: 'en-tw',
      }),
    });

    const elapsed = Date.now() - startTime;

    console.log(`Status: ${response.status} ${response.statusText}`);
    console.log(`Time: ${elapsed}ms\n`);

    const data = await response.json();

    if (typeof data === 'string') {
      console.log('✅ Translation received!\n');
      console.log('TRANSLATED TEXT (Twi):');
      console.log('─'.repeat(60));
      console.log(data);
      console.log('─'.repeat(60));
      console.log(`\nOutput length: ${data.length} characters`);
      console.log(`Compression ratio: ${((data.length / longText.length) * 100).toFixed(1)}%`);
    } else if (data.statusCode) {
      console.error('❌ API Error:', data);
    } else {
      console.log('Response:', JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testLongTranslation();
