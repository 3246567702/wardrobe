import { readFileSync, existsSync } from "node:fs";
import { validateWardrobe } from "../src/validate";
import type { Wardrobe } from "../src/types";
const data = JSON.parse(
  readFileSync("public/data/wardrobe.json", "utf8"),
) as Wardrobe;
const errors = validateWardrobe(data);
for (const path of [
  ...data.items.map((i) => i.image),
  ...data.outfits.flatMap((o) => (o.cover ? [o.cover] : [])),
])
  if (!existsSync("public/" + path)) errors.push("Missing image: " + path);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Validated ${data.items.length} items, ${data.outfits.length} looks and all image references.`,
);
