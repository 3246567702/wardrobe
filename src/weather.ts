import type { City, Forecast, WeatherDay } from "./types";
export function readLocal<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") ?? fallback;
  } catch {
    return fallback;
  }
}
export function saveLocal(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* Browsing remains available when storage is disabled. */
  }
}
export function cityDate(timezone: string, now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function datesFrom(start: string, count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start + "T12:00:00Z");
    date.setUTCDate(date.getUTCDate() + i);
    return date.toISOString().slice(0, 10);
  });
}
async function getJson(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("天气服务暂时不可用");
  return response.json();
}
export async function searchCities(name: string): Promise<City[]> {
  const params = new URLSearchParams({
    name,
    count: "8",
    language: "zh",
    format: "json",
  });
  const json = await getJson(
    `https://geocoding-api.open-meteo.com/v1/search?${params}`,
  );
  return (json.results || []).map((c: City) => ({
    id: c.id,
    name: c.name,
    latitude: c.latitude,
    longitude: c.longitude,
    timezone: c.timezone || "Asia/Shanghai",
    admin1: c.admin1,
    country: c.country,
  }));
}
export function cachedForecast(city: City): Forecast | null {
  const cached = readLocal<Forecast | null>(
    "wardrobe.weather." + city.id,
    null,
  );
  return cached &&
    cached.city?.id === city.id &&
    Array.isArray(cached.days) &&
    cached.days.every(
      (d) => typeof d.date === "string" && Number.isFinite(d.feelsMax),
    )
    ? cached
    : null;
}
export async function getForecast(
  city: City,
  force = false,
): Promise<Forecast> {
  const cached = cachedForecast(city),
    today = cityDate(city.timezone);
  if (
    !force &&
    cached &&
    Date.now() - cached.fetchedAt < 3600000 &&
    cached.days.some((d) => d.date === today)
  )
    return cached;
  const daily =
    "weather_code,temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max";
  const params = new URLSearchParams({
    latitude: String(city.latitude),
    longitude: String(city.longitude),
    timezone: city.timezone,
    forecast_days: "7",
    daily,
  });
  const json = await getJson(
      `https://api.open-meteo.com/v1/forecast?${params}`,
    ),
    d = json.daily;
  const days: WeatherDay[] = d.time.map((date: string, i: number) => ({
    date,
    min: d.temperature_2m_min[i],
    max: d.temperature_2m_max[i],
    feelsMin: d.apparent_temperature_min[i],
    feelsMax: d.apparent_temperature_max[i],
    code: d.weather_code[i],
    rainProbability: d.precipitation_probability_max[i],
    rainMm: d.precipitation_sum[i],
    wind: d.wind_speed_10m_max[i],
  }));
  if (
    days.length !== 7 ||
    days.some((day) =>
      Object.values(day).some(
        (v) =>
          v === null ||
          v === undefined ||
          (typeof v === "number" && !Number.isFinite(v)),
      ),
    )
  )
    throw new Error("天气数据不完整，请稍后重试");
  const forecast = { city, fetchedAt: Date.now(), days };
  saveLocal("wardrobe.weather." + city.id, forecast);
  return forecast;
}
export function weatherLabel(code: number) {
  if (code === 0) return "晴";
  if (code <= 3) return "多云";
  if (code <= 48) return "雾";
  if (code <= 67) return "雨";
  if (code <= 77) return "雪";
  if (code <= 82) return "阵雨";
  if (code <= 86) return "阵雪";
  return "雷雨";
}
export function weatherIcon(code: number) {
  if (code === 0) return "sun";
  if (code <= 3) return "cloud";
  if (code <= 48) return "cloud";
  if (code <= 67 || (code >= 80 && code <= 82) || code >= 95) return "rain";
  return "snow";
}
