/**
 * Simple API test for OpenWeatherMap
 * Run: npx tsx scripts/test-weather-api.ts
 */

import "dotenv/config";

async function testWeatherAPI() {
  console.log("🌤️  Testing OpenWeatherMap API...\n");

  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.error("❌ OPENWEATHER_API_KEY not found in .env");
    process.exit(1);
  }

  console.log("✅ API key found");
  console.log("📍 Testing location: Accra, Ghana\n");

  try {
    const url = `https://api.openweathermap.org/data/2.5/forecast?q=Accra,GH&appid=${apiKey}&units=metric`;
    const response = await fetch(url);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error (${response.status}): ${error.message}`);
    }

    const data = await response.json();

    console.log("✅ API call successful!\n");
    console.log(`Location: ${data.city.name}, ${data.city.country}`);
    console.log(`Coordinates: ${data.city.coord.lat}, ${data.city.coord.lon}`);
    console.log(`Timezone: ${data.city.timezone / 3600}h offset\n`);

    const current = data.list[0];
    console.log("Current Weather:");
    console.log(`  Temperature: ${Math.round(current.main.temp)}°C`);
    console.log(`  Feels like: ${Math.round(current.main.feels_like)}°C`);
    console.log(`  Humidity: ${current.main.humidity}%`);
    console.log(`  Condition: ${current.weather[0].description}`);
    console.log(`  Precipitation: ${current.rain?.["3h"] || 0}mm\n`);

    console.log(`Total forecast points: ${data.list.length} (next ${Math.round(data.list.length / 8)} days)\n`);

    console.log("✅ OpenWeatherMap API is working correctly!");
    console.log("✅ Ready to integrate with Mastra agent!");

  } catch (error) {
    console.error("\n❌ API test failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testWeatherAPI();
