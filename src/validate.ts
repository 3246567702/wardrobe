import type { Wardrobe } from "./types";
export function validateWardrobe(data: Wardrobe): string[] {
  const errors: string[] = [],
    ids = new Set<string>(),
    lookIds = new Set<string>();
  const categories = ["top", "bottom", "dress", "outer", "shoes", "accessory"],
    scenes = ["commute", "outing", "sport"];
  if (data.version !== 1) errors.push("Unsupported data version");
  for (const item of data.items) {
    if (!/^[a-zA-Z0-9_-]+$/.test(item.id) || ids.has(item.id))
      errors.push(`Invalid/duplicate item ID: ${item.id}`);
    ids.add(item.id);
    if (
      !item.name ||
      !categories.includes(item.category) ||
      !/^#[0-9a-fA-F]{6}$/.test(item.hex)
    )
      errors.push(`Invalid item attributes: ${item.id}`);
    if (!item.scenes.length || item.scenes.some((s) => !scenes.includes(s)))
      errors.push(`Invalid scenes: ${item.id}`);
    if (
      !Number.isFinite(item.minTemp) ||
      !Number.isFinite(item.maxTemp) ||
      item.minTemp > item.maxTemp
    )
      errors.push(`Invalid temperature range: ${item.id}`);
    if (
      !/^images\/[a-zA-Z0-9_./-]+\.(svg|png|webp|jpe?g)$/i.test(item.image) ||
      item.image.includes("..")
    )
      errors.push(`Invalid image path: ${item.id}`);
  }
  for (const item of data.items)
    for (const id of item.compatibleWith)
      if (
        !ids.has(id) ||
        !data.items.find((i) => i.id === id)?.compatibleWith.includes(item.id)
      )
        errors.push(`Missing/asymmetric compatibility: ${item.id} -> ${id}`);
  for (const look of data.outfits) {
    if (!/^[a-zA-Z0-9_-]+$/.test(look.id) || lookIds.has(look.id))
      errors.push(`Invalid/duplicate look ID: ${look.id}`);
    lookIds.add(look.id);
    if (new Set(look.itemIds).size !== look.itemIds.length)
      errors.push(`Duplicate pieces: ${look.id}`);
    const pieces = look.itemIds.map((id) =>
      data.items.find((i) => i.id === id),
    );
    if (pieces.some((p) => !p)) {
      errors.push(`Broken outfit reference: ${look.id}`);
      continue;
    }
    const cats = pieces.map((p) => p!.category);
    if (
      !cats.includes("shoes") ||
      !(
        cats.includes("dress") ||
        (cats.includes("top") && cats.includes("bottom"))
      )
    )
      errors.push(`Incomplete outfit: ${look.id}`);
    if (
      new Set(cats).size !== cats.length ||
      (cats.includes("dress") &&
        (cats.includes("top") || cats.includes("bottom")))
    )
      errors.push(`Overlapping collage slots: ${look.id}`);
    if (
      !look.scenes.length ||
      look.scenes.some(
        (s) =>
          !scenes.includes(s) || pieces.some((p) => !p!.scenes.includes(s)),
      )
    )
      errors.push(`Inconsistent scenes: ${look.id}`);
    if (
      !Number.isFinite(look.minTemp) ||
      !Number.isFinite(look.maxTemp) ||
      look.minTemp > look.maxTemp
    )
      errors.push(`Invalid look temperatures: ${look.id}`);
    if (
      look.rainSafe &&
      (!pieces.some((p) => p!.category === "outer" && p!.rainSafe) ||
        !pieces.some((p) => p!.category === "shoes" && p!.rainSafe))
    )
      errors.push(`Rain look missing protection: ${look.id}`);
    if (look.windproof && !pieces.some((p) => p!.windproof))
      errors.push(`Wind look missing protection: ${look.id}`);
    for (const swap of look.swaps)
      if (
        !look.itemIds.includes(swap.from) ||
        !ids.has(swap.to) ||
        data.items.find((i) => i.id === swap.from)?.category !==
          data.items.find((i) => i.id === swap.to)?.category
      )
        errors.push(`Invalid swap: ${look.id}`);
    if (
      look.cover &&
      (!look.cover.startsWith("images/") || look.cover.includes(".."))
    )
      errors.push(`Invalid cover: ${look.id}`);
  }
  for (const [name, value] of Object.entries(data.rules))
    if (!Number.isFinite(value)) errors.push(`Invalid rule: ${name}`);
  return errors;
}
