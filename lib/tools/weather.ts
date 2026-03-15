/**
 * Weather Tool for Cultivate Agents
 *
 * Uses OpenWeatherMap API to fetch current weather and 5-day forecast.
 * Enables location-aware agricultural advice (planting timing, harvest decisions, pest management).
 *
 * Implementation follows Mastra framework pattern (MASTRA-GUIDE.md Section 2)
 */

import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const getWeatherTool = createTool({
  id: "getWeather",

  description:
    "Fetches current weather and 5-day forecast for a location. " +
    "Call this when the farmer asks about TIMING decisions: planting dates, harvest timing, " +
    "pest management (humidity-related), or irrigation scheduling. " +
    "Also call for direct weather questions like 'What's the weather today?'. " +
    "DON'T call for general crop information, pest identification, or fertilizer advice unless timing is involved.",

  inputSchema: z.object({
    location: z.string().describe("City name (e.g., 'Ho', 'Accra') or GPS coordinates in 'lat,lon' format"),
  }),

  outputSchema: z.object({
    location: z.string(),
    current: z.object({
      temperature: z.number().describe("Temperature in Celsius"),
      humidity: z.number().describe("Humidity percentage"),
      condition: z.string().describe("Weather condition: clear, rain, clouds, etc."),
      precipitation: z.number().describe("Precipitation in mm (last 3 hours)"),
      description: z.string().describe("Detailed weather description"),
    }),
    forecast: z.array(z.object({
      date: z.string().describe("Date in YYYY-MM-DD format"),
      dayOfWeek: z.string().describe("Day of the week"),
      maxTemp: z.number().describe("Maximum temperature in Celsius"),
      minTemp: z.number().describe("Minimum temperature in Celsius"),
      precipitation: z.number().describe("Expected precipitation in mm"),
      condition: z.string().describe("Weather condition"),
      humidity: z.number().describe("Average humidity percentage"),
    })),
  }),

  execute: async (args) => {
    const { location } = args;

    // Validation: location is required
    if (!location || location.trim() === "") {
      throw new Error(
        "Location not provided. Please ask the farmer for their city or region " +
        "(e.g., 'Ho', 'Accra', 'Volta Region')."
      );
    }

    // Get API key from environment
    const apiKey = process.env.OPENWEATHER_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Weather service configuration missing. Please contact support."
      );
    }

    try {
      // Call OpenWeatherMap 5-day forecast API
      // Note: Free tier provides forecast in 3-hour intervals
      const url = `https://api.openweathermap.org/data/2.5/forecast?q=${encodeURIComponent(location)}&appid=${apiKey}&units=metric`;

      const response = await fetch(url);

      // Handle API errors
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        if (response.status === 404) {
          throw new Error(
            `Location "${location}" not found. Please provide a valid city name ` +
            `(e.g., 'Ho', 'Accra', 'Kumasi') or GPS coordinates.`
          );
        }

        if (response.status === 401) {
          throw new Error("Weather service authentication failed. Please contact support.");
        }

        throw new Error(
          `Weather service error (${response.status}): ${errorData.message || "Unknown error"}`
        );
      }

      const data = await response.json();

      // Validate response structure
      if (!data.list || data.list.length === 0) {
        throw new Error("Weather service returned no data. Please try again.");
      }

      // Extract current weather (first data point)
      const current = data.list[0];

      // Group forecast by day (OpenWeatherMap returns 3-hour intervals)
      // We'll take one reading per day (around noon) for simplicity
      const dailyForecasts: Record<string, any> = {};

      for (const item of data.list) {
        const date = item.dt_txt.split(" ")[0]; // "2026-03-14"
        const hour = parseInt(item.dt_txt.split(" ")[1].split(":")[0]); // 12 from "12:00:00"

        // Take the reading closest to noon (12:00)
        if (!dailyForecasts[date] || Math.abs(hour - 12) < Math.abs(dailyForecasts[date].hour - 12)) {
          dailyForecasts[date] = {
            ...item,
            hour,
            date,
          };
        }
      }

      // Format forecast data (next 5 days)
      const forecast = Object.values(dailyForecasts)
        .slice(0, 5)
        .map((item: any) => {
          const date = new Date(item.dt * 1000);
          const dayOfWeek = date.toLocaleDateString('en-US', { weekday: 'long' });

          return {
            date: item.date,
            dayOfWeek,
            maxTemp: Math.round(item.main.temp_max),
            minTemp: Math.round(item.main.temp_min),
            precipitation: item.rain?.["3h"] || 0,
            condition: item.weather[0].main.toLowerCase(),
            humidity: item.main.humidity,
          };
        });

      // Return structured weather data
      return {
        location: data.city.name + (data.city.country ? `, ${data.city.country}` : ""),
        current: {
          temperature: Math.round(current.main.temp),
          humidity: current.main.humidity,
          condition: current.weather[0].main.toLowerCase(),
          precipitation: current.rain?.["3h"] || 0,
          description: current.weather[0].description,
        },
        forecast,
      };

    } catch (error) {
      // Re-throw known errors
      if (error instanceof Error) {
        throw error;
      }

      // Handle unexpected errors
      throw new Error(
        "Weather service temporarily unavailable. Please provide general seasonal advice " +
        "based on Ghana's typical weather patterns: major season (March-April), minor season (August-September)."
      );
    }
  },
});
