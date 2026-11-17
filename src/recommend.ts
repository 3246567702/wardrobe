import type { Item, Outfit, Rules, Scene, WeatherDay, Wardrobe } from "./types";
export const sceneNames: Record<Scene, string> = {
  commute: "通勤",
  outing: "出游",
  sport: "运动",
};
export const categoryNames = {
  top: "上衣",
  bottom: "裤裙",
  outer: "外套",
  shoes: "鞋履",
  dress: "连衣裙",
  accessory: "配饰",
};
export function signature(ids: string[]) {
  return [...ids].sort().join("|");
}
export function stableHash(value: string) {
  let hash = 0;
  for (const c of value) hash = (Math.imul(hash, 31) + c.charCodeAt(0)) >>> 0;
  return hash;
}
export function isRainy(day: WeatherDay, rules: Rules) {
  return (
    day.rainProbability >= rules.rainProbability || day.rainMm >= rules.rainMm
  );
}
export function compatible(items: Item[]) {
  return items.every((a) =>
    items.every((b) => a.id === b.id || a.compatibleWith.includes(b.id)),
  );
}
export function eligibleLook(
  outfit: Outfit,
  data: Wardrobe,
  day: WeatherDay,
  scene: Scene,
) {
  const items = outfit.itemIds.map((id) => data.items.find((i) => i.id === id));
  return (
    outfit.scenes.includes(scene) &&
    day.feelsMax >= outfit.minTemp &&
    day.feelsMax <= outfit.maxTemp &&
    items.length > 0 &&
    items.every((i) => i?.available) &&
    (!isRainy(day, data.rules) || outfit.rainSafe) &&
    (day.wind < data.rules.windyKmh || outfit.windproof)
  );
}
export function planWeek(
  data: Wardrobe,
  days: WeatherDay[],
  scene: Scene,
): (Outfit | null)[] {
  const usage = new Map<string, number>();
  return days.map((day) => {
    const options = data.outfits.filter((o) =>
      eligibleLook(o, data, day, scene),
    );
    options.sort(
      (a, b) =>
        (usage.get(a.id) || 0) - (usage.get(b.id) || 0) ||
        stableHash(day.date + scene + a.id) -
          stableHash(day.date + scene + b.id),
    );
    const selected = options[0] || null;
    if (selected) usage.set(selected.id, (usage.get(selected.id) || 0) + 1);
    return selected;
  });
}
export function generateCombination(
  data: Wardrobe,
  day: WeatherDay,
  scene: Scene,
  excludeIds: string[] = [],
): Item[] | null {
  const available = data.items.filter(
    (i) =>
      i.available &&
      i.scenes.includes(scene) &&
      day.feelsMax >= i.minTemp &&
      day.feelsMax <= i.maxTemp,
  );
  const by = (category: Item["category"]) =>
    available.filter((i) => i.category === category);
  const rain = isRainy(day, data.rules),
    outerRequired =
      day.feelsMax < data.rules.jacketBelow ||
      rain ||
      day.wind >= data.rules.windyKmh;
  const outers = by("outer").filter(
    (i) =>
      (!rain || i.rainSafe) && (day.wind < data.rules.windyKmh || i.windproof),
  );
  const shoes = by("shoes").filter((i) => !rain || i.rainSafe);
  const bases = [
    ...by("dress").map((d) => [d]),
    ...by("top").flatMap((top) => by("bottom").map((bottom) => [top, bottom])),
  ];
  const candidates: Item[][] = [];
  for (const base of bases)
    for (const shoe of shoes)
      for (const outer of outerRequired ? outers : [null]) {
        const pieces = [...base, shoe, ...(outer ? [outer] : [])];
        if (
          compatible(pieces) &&
          signature(pieces.map((i) => i.id)) !==
            signature(
              excludeIds.filter(
                (id) =>
                  data.items.find((i) => i.id === id)?.category !== "accessory",
              ),
            )
        )
          candidates.push(pieces);
      }
  candidates.sort(
    (a, b) =>
      stableHash(day.date + scene + signature(a.map((i) => i.id))) -
      stableHash(day.date + scene + signature(b.map((i) => i.id))),
  );
  return candidates[0] || null;
}
export function replacementAdvice(
  data: Wardrobe,
  outfit: Outfit,
  day: WeatherDay,
  scene: Scene,
): { from: Item; to: Item; reason: string }[] {
  const result: { from: Item; to: Item; reason: string }[] = [];
  for (const swap of outfit.swaps) {
    const from = data.items.find((i) => i.id === swap.from),
      to = data.items.find((i) => i.id === swap.to);
    if (
      !from ||
      !to ||
      !outfit.itemIds.includes(from.id) ||
      outfit.itemIds.includes(to.id) ||
      !to.available ||
      !to.scenes.includes(scene) ||
      day.feelsMax < to.minTemp ||
      day.feelsMax > to.maxTemp
    )
      continue;
    if (
      isRainy(day, data.rules) &&
      ["outer", "shoes"].includes(to.category) &&
      !to.rainSafe
    )
      continue;
    if (
      day.wind >= data.rules.windyKmh &&
      to.category === "outer" &&
      !to.windproof
    )
      continue;
    const changed = outfit.itemIds.map((id) =>
      data.items.find((i) => i.id === (id === from.id ? to.id : id))!,
    );
    if (compatible(changed)) result.push({ from, to, reason: swap.reason });
  }
  const outer = outfit.itemIds
    .map((id) => data.items.find((i) => i.id === id)!)
    .find((i) => i.category === "outer");
  if (!outer && day.max - day.min >= data.rules.temperatureSwing) {
    const to = data.items.find(
      (i) =>
        i.category === "outer" &&
        i.available &&
        i.scenes.includes(scene) &&
        day.feelsMin >= i.minTemp &&
        day.feelsMin <= i.maxTemp &&
        (!isRainy(day, data.rules) || i.rainSafe) &&
        compatible([
          ...outfit.itemIds.map((id) => data.items.find((p) => p.id === id)!),
          i,
        ]),
    );
    if (to) {
      const from = data.items.find((i) => i.id === outfit.itemIds[0])!;
      result.push({
        from,
        to,
        reason: `早晚温差较大，出门可以带上${to.name}。`,
      });
    }
  }
  return result.slice(0, 2);
}
