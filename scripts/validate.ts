import { readFileSync, existsSync } from "node:fs";
import { validateWardrobe } from "../src/validate";
import type { Wardrobe, PersonalProfile } from "../src/types";
import { validateProfile } from "../src/profile-validation";
const data = JSON.parse(
  readFileSync("public/data/wardrobe.json", "utf8"),
) as Wardrobe;
const errors = validateWardrobe(data);
const profile = JSON.parse(
  readFileSync("public/data/profile.json", "utf8"),
) as PersonalProfile;
errors.push(...validateProfile(profile));
for (const path of [
  ...data.items.map((i) => i.image),
  ...data.outfits.flatMap((o) => (o.cover ? [o.cover] : [])),
  ...profile.photos.flatMap((p) => (p.image ? [p.image] : [])),
  ...profile.documents.map((d) => d.path),
])
  if (!existsSync("public/" + path)) errors.push("Missing resource: " + path);
if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(
  `Validated ${data.items.length} items, ${data.outfits.length} looks, profile and ${profile.documents.length} documents.`,
);
