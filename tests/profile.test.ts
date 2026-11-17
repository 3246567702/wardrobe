import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateProfile, isLocalResource } from "../src/profile-validation";
import { renderMarkdown } from "../src/markdown";
import type { PersonalProfile } from "../src/types";

const profile = JSON.parse(
  readFileSync("public/data/profile.json", "utf8"),
) as PersonalProfile;
test("unfilled profile is valid and does not invent personal details", () => {
  assert.deepEqual(validateProfile(profile), []);
  assert.equal(profile.heightCm, null);
  assert.equal(profile.weightKg, null);
  assert.ok(profile.photos.every((p) => p.image === null));
});
test("profile validates measurements and unique photo/document IDs", () => {
  const invalid = structuredClone(profile);
  invalid.heightCm = -1;
  invalid.photos.push(invalid.photos[0]);
  invalid.documents.push(invalid.documents[0]);
  const errors = validateProfile(invalid);
  assert.ok(errors.some((e) => e.includes("measurement")));
  assert.ok(errors.some((e) => e.includes("photos ID")));
  assert.ok(errors.some((e) => e.includes("documents ID")));
});
test("resource paths support nested local photos and disallow traversal or external scripts", () => {
  assert.equal(
    isLocalResource("images/profile/front.jpg", "images", ["jpg"]),
    true,
  );
  for (const path of [
    "images/../private.jpg",
    "https://example.com/photo.jpg",
    "javascript:alert(1)",
    "images/%2e%2e/secret.jpg",
  ])
    assert.equal(isLocalResource(path, "images", ["jpg"]), false);
  const invalid = structuredClone(profile);
  invalid.photos[0].image = "images/../private.jpg";
  invalid.documents[0].path = "documents/guide.html";
  assert.equal(validateProfile(invalid).length, 2);
});
test("malformed profile structure is rejected", () => {
  assert.ok(validateProfile(null).length);
  assert.ok(validateProfile({}).length);
  const invalid = structuredClone(profile) as unknown as Record<
    string,
    unknown
  >;
  invalid.photos = [{ id: "front", title: "front", description: "" }];
  invalid.sizes = { other: "L" };
  assert.ok(validateProfile(invalid).some((e) => e.includes("photo")));
  assert.ok(validateProfile(invalid).some((e) => e.includes("sizes")));
});
test("document reader renders paragraphs/lists/code while escaping HTML", () => {
  const html = renderMarkdown(
    "# Guide\n\nHello\n\n## Steps\n\n- First\n- Second\n\n1. One\n2. Two\n\n```\n<img onerror=alert(1)>\n```\n\n<script>alert(1)</script>",
  );
  assert.match(html, /<h2>Guide<\/h2>/);
  assert.match(html, /<ul><li>First<\/li><li>Second<\/li><\/ul>/);
  assert.match(html, /<ol><li>One<\/li><li>Two<\/li><\/ol>/);
  assert.ok(html.includes("&lt;script&gt;"));
  assert.ok(!html.includes("<script>"));
  assert.ok(!html.includes("<img "));
});
