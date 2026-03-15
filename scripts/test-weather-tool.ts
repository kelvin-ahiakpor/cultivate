/**
 * Quick test for the weather tool
 * Run: npx tsx scripts/test-weather-tool.ts
 */

import { getWeatherTool } from "@/lib/tools/weather";

async function testWeatherTool() {
  console.log("🌤️  Testing Weather Tool...\n");

  try {
    // Test with a Ghana city (Ho, Volta Region)
    console.log("📍 Testing location: Ho, Ghana");
    const result = await getWeatherTool.execute({
      location: "Ho",
    } as any);

    console.log("\n✅ Weather data retrieved successfully!\n");
    console.log("Raw result:", JSON.stringify(result, null, 2));

    console.log("Current Weather:");
    console.log(`  Location: ${result.location}`);
    console.log(`  Temperature: ${result.current.temperature}°C`);
    console.log(`  Condition: ${result.current.description}`);
    console.log(`  Humidity: ${result.current.humidity}%`);
    console.log(`  Precipitation: ${result.current.precipitation}mm\n`);

    console.log("5-Day Forecast:");
    result.forecast.forEach((day, i) => {
      console.log(
        `  ${i + 1}. ${day.dayOfWeek} (${day.date}): ${day.maxTemp}°C / ${day.minTemp}°C, ${day.condition}, ${day.precipitation}mm rain`
      );
    });

    console.log("\n✅ Test passed! Weather tool is working correctly.");

  } catch (error) {
    console.error("\n❌ Test failed:");
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

testWeatherTool();
