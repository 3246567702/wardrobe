import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import type { Wardrobe, WeatherDay } from "../src/types";
import {
  planWeek,
  generateCombination,
  eligibleLook,
  compatible,
  signature,
  replacementAdvice,
} from "../src/recommend";
import { cityDate, datesFrom, getForecast } from "../src/weather";
import { validateWardrobe } from "../src/validate";
const data = JSON.parse(
  readFileSync("public/data/wardrobe.json", "utf8"),
) as Wardrobe;
const day = (changes: Partial<WeatherDay> = {}): WeatherDay => ({
  date: "2026-11-17",
  min: 10,
  max: 18,
  feelsMin: 9,
  feelsMax: 16,
  code: 0,
  rainProbability: 0,
  rainMm: 0,
  wind: 8,
  ...changes,
});
test("demo data is complete and cross references are valid", () =>
  assert.deepEqual(validateWardrobe(data), []));
test("rain and wind exclude unsuitable saved outfits", () => {
  const wet = day({ rainProbability: 80, rainMm: 3, wind: 30 });
  const selected = planWeek(data, [wet], "commute")[0];
  assert.ok(selected);
  assert.equal(selected.rainSafe, true);
  assert.equal(selected.windproof, true);
  assert.equal(
    eligibleLook(
      data.outfits.find((o) => o.id === "l01")!,
      data,
      wet,
      "commute",
    ),
    false,
  );
});
test("same inputs stay stable and daily repetition is reduced", () => {
  const days = datesFrom("2026-11-17").map((date) =>
    day({ date, feelsMax: 16 }),
  );
  const first = planWeek(data, days, "outing").map((o) => o?.id);
  assert.deepEqual(
    first,
    planWeek(data, days, "outing").map((o) => o?.id),
  );
  const choices = data.outfits.filter((o) =>
    eligibleLook(o, data, days[0], "outing"),
  ).length;
  assert.equal(new Set(first.slice(0, choices)).size, choices);
});
test("unavailable pieces exclude saved and generated outfits", () => {
  const copy = structuredClone(data);
  copy.items.forEach((i) => {
    i.available = false;
  });
  assert.equal(planWeek(copy, [day()], "commute")[0], null);
  assert.equal(generateCombination(copy, day(), "commute"), null);
});
test("a new rainy outfit is complete, compatible, protected and distinct", () => {
  const wet = day({ feelsMax: 14, rainProbability: 80 });
  const saved = planWeek(data, [wet], "commute")[0]!;
  const generated = generateCombination(data, wet, "commute", saved.itemIds);
  assert.ok(generated);
  assert.ok(generated.some((i) => i.category === "top"));
  assert.ok(generated.some((i) => i.category === "bottom"));
  assert.ok(generated.some((i) => i.category === "shoes" && i.rainSafe));
  assert.ok(generated.some((i) => i.category === "outer" && i.rainSafe));
  assert.ok(compatible(generated));
  assert.notEqual(
    signature(generated.map((i) => i.id)),
    signature(
      saved.itemIds.filter(
        (id) => data.items.find((i) => i.id === id)?.category !== "accessory",
      ),
    ),
  );
});
test("incompatible pieces are never combined", () => {
  const copy = structuredClone(data);
  copy.items.forEach((i) => (i.compatibleWith = []));
  assert.equal(generateCombination(copy, day(), "commute"), null);
});
test("hot sport weather selects shorts and does not add unnecessary outerwear", () => {
  const result = generateCombination(
    data,
    day({ max: 32, feelsMax: 31 }),
    "sport",
  );
  assert.ok(result);
  assert.ok(result.some((i) => i.id === "b04"));
  assert.ok(!result.some((i) => i.category === "outer"));
});
test("unsupported severe cold and missing shoes produce no invented outfit", () => {
  assert.equal(
    generateCombination(data, day({ max: -25, feelsMax: -30 }), "commute"),
    null,
  );
  assert.equal(planWeek(data, [day({ feelsMax: -30 })], "commute")[0], null);
  const copy = structuredClone(data);
  copy.items = copy.items.filter((i) => i.category !== "shoes");
  assert.equal(generateCombination(copy, day(), "commute"), null);
});
test("swap suggestions exclude unavailable replacements", () => {
  const copy = structuredClone(data);
  copy.items.find((i) => i.id === "o02")!.available = false;
  assert.equal(
    replacementAdvice(copy, copy.outfits[0], day(), "commute").length,
    0,
  );
});
test("date calculations support year boundaries, leap days and city timezone", () => {
  assert.deepEqual(datesFrom("2026-12-30", 4), [
    "2026-12-30",
    "2026-12-31",
    "2027-01-01",
    "2027-01-02",
  ]);
  assert.deepEqual(datesFrom("2028-02-28", 3), [
    "2028-02-28",
    "2028-02-29",
    "2028-03-01",
  ]);
  assert.equal(
    cityDate("Asia/Shanghai", new Date("2026-11-16T18:00:00Z")),
    "2026-11-17",
  );
  assert.equal(
    cityDate("America/Los_Angeles", new Date("2026-11-16T18:00:00Z")),
    "2026-11-16",
  );
});
test("validator catches broken references, duplicate slots and asymmetric compatibility", () => {
  const copy = structuredClone(data);
  copy.outfits[0].itemIds.push("missing");
  assert.ok(validateWardrobe(copy).some((e) => e.includes("Broken outfit")));
  const slots = structuredClone(data);
  slots.outfits[0].itemIds.push("t01");
  assert.ok(validateWardrobe(slots).some((e) => e.includes("Overlapping")));
  const comp = structuredClone(data);
  comp.items[0].compatibleWith = [];
  assert.ok(validateWardrobe(comp).some((e) => e.includes("asymmetric")));
});
test("forecast rejects incomplete API data rather than inventing values", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({
        daily: {
          time: ["2026-11-17"],
          temperature_2m_min: [null],
          temperature_2m_max: [null],
          apparent_temperature_min: [null],
          apparent_temperature_max: [null],
          weather_code: [0],
          precipitation_probability_max: [0],
          precipitation_sum: [0],
          wind_speed_10m_max: [1],
        },
      }),
    );
  try {
    await assert.rejects(
      getForecast(
        { id: 1, name: "test", latitude: 0, longitude: 0, timezone: "UTC" },
        true,
      ),
      /不完整/,
    );
  } finally {
    globalThis.fetch = original;
  }
});
