import type { PersonalProfile, ProfilePhoto, ProfileDocument } from "./types";

export function isLocalResource(
  value: unknown,
  folder: string,
  extensions: string[],
) {
  return (
    typeof value === "string" &&
    new RegExp(
      `^${folder}/[a-zA-Z0-9_/-]+\\.(${extensions.join("|")})$`,
      "i",
    ).test(value) &&
    !value.includes("..")
  );
}
export function validateProfile(value: unknown): string[] {
  if (!value || typeof value !== "object") return ["Profile must be an object"];
  const p = value as PersonalProfile,
    errors: string[] = [];
  if (p.version !== 1) errors.push("Unsupported profile version");
  for (const [key, value] of Object.entries({
    displayName: p.displayName,
    bodyNotes: p.bodyNotes,
    updatedAt: p.updatedAt,
  }))
    if (value !== null && typeof value !== "string")
      errors.push(`Invalid profile field: ${key}`);
  for (const [key, value] of Object.entries({
    heightCm: p.heightCm,
    weightKg: p.weightKg,
    ...p.measurements,
  }))
    if (
      value !== null &&
      (typeof value !== "number" || !Number.isFinite(value) || value <= 0)
    )
      errors.push(`Invalid measurement: ${key}`);
  if (
    !p.sizes ||
    !["top", "bottom", "shoes"].every((key) => Object.hasOwn(p.sizes, key)) ||
    Object.values(p.sizes).some((v) => v !== null && typeof v !== "string")
  )
    errors.push("Invalid sizes");
  if (
    !p.measurements ||
    !["shouldersCm", "chestCm", "waistCm", "hipsCm"].every((key) =>
      Object.hasOwn(p.measurements, key),
    )
  )
    errors.push("Invalid measurements");
  if (
    !p.preferences ||
    ![
      p.preferences.styleWords,
      p.preferences.favoriteColors,
      p.preferences.avoidColors,
    ].every((v) => Array.isArray(v) && v.every((s) => typeof s === "string")) ||
    (p.preferences.notes !== null && typeof p.preferences.notes !== "string")
  )
    errors.push("Invalid preferences");
  for (const [key, entries] of [
    ["photos", p.photos],
    ["documents", p.documents],
  ] as const) {
    if (!Array.isArray(entries)) {
      errors.push(`Invalid ${key}`);
      continue;
    }
    const ids = new Set<string>();
    for (const entry of entries) {
      if (!entry || typeof entry !== "object") {
        errors.push(`Invalid ${key} entry`);
        continue;
      }
      if (!/^[a-zA-Z0-9_-]+$/.test(entry.id) || ids.has(entry.id))
        errors.push(`Invalid/duplicate ${key} ID: ${entry.id}`);
      ids.add(entry.id);
      if (
        typeof entry.title !== "string" ||
        !entry.title ||
        typeof entry.description !== "string"
      )
        errors.push(`Invalid ${key} text: ${entry.id}`);
      if (key === "photos") {
        const photo = entry as ProfilePhoto;
        if (
          photo.image !== null &&
          !isLocalResource(photo.image, "images", [
            "svg",
            "png",
            "webp",
            "jpg",
            "jpeg",
          ])
        )
          errors.push(`Invalid profile photo: ${entry.id}`);
      } else {
        const doc = entry as ProfileDocument;
        if (
          !["markdown", "pdf"].includes(doc.format) ||
          !isLocalResource(
            doc.path,
            "documents",
            doc.format === "pdf" ? ["pdf"] : ["md"],
          ) ||
          (doc.updatedAt !== null && typeof doc.updatedAt !== "string")
        )
          errors.push(`Invalid profile document: ${entry.id}`);
      }
    }
  }
  return errors;
}
