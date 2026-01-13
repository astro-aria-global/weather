import { Hono } from "hono";

// This is a script to fetch weather data from API and save it into R2 bucket.

type Bindings = {
  OPENWEATHERMAP_APIKEY: SecretsStoreSecret;
  OPEN_BUCKET: R2Bucket;
};

const app = new Hono<{ Bindings: Bindings }>();

const scheduled = async (
  event: ScheduledEvent,
  env: Bindings,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ctx: ExecutionContext,
) => {
  const scheduledAt = new Date(event.scheduledTime).toISOString();
  console.log("Cron Event Triggered at:", scheduledAt);

  // Step 1: Define location with latitude and longitude
  const lat = "41.8583";
  const lon = "127.8558";

  try {
    // Step 2: Fetch apikey from cloudflare secret store
    const apiKey = await env.OPENWEATHERMAP_APIKEY.get();
    if (!apiKey) {
      throw new Error("API key not found in Secrets Store");
    }

    // Step 3: Fetch current weather data from OpenWeatherMap API
    const apiUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ja`;

    const response = await fetch(apiUrl);
    if (!response.ok) {
      throw new Error(`OpenWeatherMap API Error: ${response.statusText}`);
    }

    const weatherData = await response.json();
    const weatherString = JSON.stringify(weatherData, null, 2);

    // Step 4: Save pretty weather data to r2 bucket
    await env.OPEN_BUCKET.put("weather", weatherString, {
      httpMetadata: {
        contentType: "application/json",
      },
    });
    console.log("Event Succeeded.");
  } catch (error) {
    console.error("Event Failed:", error);
  }
};

export default { app, scheduled };
