"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");
const IMAGE_DIRECTORY = path.join(ROOT, "concepts/images");
const EXPECTED_IMAGES = Object.freeze([
  "battlefield.webp",
  "astral-concord.webp",
  "gravebound-court.webp",
  "structures.webp",
  "combat-readability.webp",
  "minimal-menu.webp",
  "mobile-landscape.webp",
  "production-rally.webp"
]);
const EXPECTED_DIMENSIONS = Object.freeze({
  "battlefield.webp": [1672, 941],
  "astral-concord.webp": [1672, 941],
  "gravebound-court.webp": [1672, 941],
  "structures.webp": [1536, 1024],
  "combat-readability.webp": [1672, 941],
  "minimal-menu.webp": [1672, 941],
  "mobile-landscape.webp": [1798, 875],
  "production-rally.webp": [1672, 941]
});

function vp8Dimensions(bytes) {
  assert.equal(bytes.subarray(12, 16).toString("ascii"), "VP8 ", "review images must use bounded lossy VP8 WebP");
  assert.deepEqual([...bytes.subarray(23, 26)], [0x9d, 0x01, 0x2a], "invalid VP8 key-frame signature");
  return [bytes.readUInt16LE(26) & 0x3fff, bytes.readUInt16LE(28) & 0x3fff];
}

test("concept gallery presents eight mood references without claiming production approval or gameplay", () => {
  const html = read("concepts/index.html");
  assert.match(html, /<html\b[^>]*\blang=["']en["']/i);
  assert.match(html, /id=["']reference-gallery["']/i);
  assert.match(html, /Phase 1 · Reviewed visual references/i);
  assert.match(html, /Mood archive · Target superseded/i);
  assert.match(html, /literal detail and realism are not the production target/i);
  assert.match(html, /not the Phase 1 production approval target/i);
  assert.match(html, /four core animation families/i);
  assert.match(html, /no further approval is required for these eight mood\s+references/i);
  assert.match(html, /not a validated final layout for two, four, or six players/i);
  assert.match(html, /only each faction headquarters is visually unique/i);
  assert.match(html, /Resource Points and Production\s+Outposts share neutral world forms/i);
  assert.doesNotMatch(html, /Concepts 01–08 approved as the Phase 1 direction/i);
  assert.match(html, /directed by XenoVoyage, generated with OpenAI image\s+generation/i);
  assert.doesNotMatch(html, /<(?:canvas|script|form|dialog)\b/i);

  const conceptIds = Array.from(html.matchAll(/<article\b[^>]*\bid=["']concept-(\d{2})["']/gi), (match) => match[1]);
  assert.deepEqual(conceptIds, ["01", "02", "03", "04", "05", "06", "07", "08"]);

  const imageTags = Array.from(html.matchAll(/<img\b[^>]*>/gi), (match) => match[0]);
  assert.equal(imageTags.length, 8);
  const sources = imageTags.map((tag) => tag.match(/\bsrc=["']images\/([^"']+)["']/i)?.[1]);
  assert.deepEqual(sources, EXPECTED_IMAGES);
  for (const [index, tag] of imageTags.entries()) {
    assert.match(tag, /\bwidth=["']\d+["']/i);
    assert.match(tag, /\bheight=["']\d+["']/i);
    assert.match(tag, /\balt=["'][^"']{40,}["']/i);
    assert.match(tag, /\bdecoding=["']async["']/i);
    const declaredDimensions = [
      Number(tag.match(/\bwidth=["'](\d+)["']/i)[1]),
      Number(tag.match(/\bheight=["'](\d+)["']/i)[1])
    ];
    assert.deepEqual(declaredDimensions, EXPECTED_DIMENSIONS[EXPECTED_IMAGES[index]]);
  }
  assert.equal(imageTags.filter((tag) => /\bloading=["']lazy["']/i.test(tag)).length, 7);
  assert.match(imageTags[0], /\bfetchpriority=["']high["']/i);
  assert.equal((html.match(/class=["']frame-action["']/gi) || []).length, 8);
  assert.doesNotMatch(html, /<a\b[^>]*class=["'][^"']*concept-frame[^"']*["'][^>]*aria-label=/i);
  assert.match(html, /selected Astral headquarters/i);
  assert.match(html, /href=["']feasibility\/["']/i);

  for (const image of EXPECTED_IMAGES) {
    assert.match(html, new RegExp(`href=["']images/${image.replaceAll(".", "\\.")}["']`, "i"));
  }
});

test("concept gallery keeps a restrictive local-only image policy", () => {
  const html = read("concepts/index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.match(html, /script-src 'none'/i);
  assert.match(html, /style-src 'self'/i);
  assert.match(html, /img-src 'self'/i);
  assert.match(html, /connect-src 'none'/i);
  assert.doesNotMatch(html, /unsafe-(?:inline|eval)/i);
  assert.doesNotMatch(html, /<(?:img|link)\b[^>]+(?:src|href)=["'](?:https?:|\/)/i);

  const css = read("concepts/gallery.css");
  assert.match(css, /@media\s*\([^)]*max-width/i);
  assert.match(css, /\.frame-action\s*\{[\s\S]*?position:\s*static/i);
  assert.doesNotMatch(css, /\.frame-action\s*\{[\s\S]*?position:\s*absolute/i);
  assert.doesNotMatch(css, /@import|url\(/i);
});

test("concept references are bounded optimized WebP files", () => {
  const actualImages = fs.readdirSync(IMAGE_DIRECTORY).sort();
  assert.deepEqual(actualImages, [...EXPECTED_IMAGES].sort());

  let totalBytes = 0;
  for (const image of EXPECTED_IMAGES) {
    const bytes = fs.readFileSync(path.join(IMAGE_DIRECTORY, image));
    totalBytes += bytes.length;
    assert.equal(bytes.subarray(0, 4).toString("ascii"), "RIFF", `${image} is not a RIFF container`);
    assert.equal(bytes.subarray(8, 12).toString("ascii"), "WEBP", `${image} is not WebP`);
    assert.deepEqual(vp8Dimensions(bytes), EXPECTED_DIMENSIONS[image], `${image} dimensions changed`);
    assert.ok(bytes.length <= 300 * 1024, `${image} exceeds the 300 KiB review-image budget`);
  }
  assert.ok(totalBytes <= 1.5 * 1024 * 1024, "concept set exceeds the 1.5 MiB review budget");
  assert.match(read("docs/ASSETS.md"), new RegExp(`${totalBytes.toLocaleString("en-US")} bytes`));
});

test("concept gallery is delivered but excluded from the offline status shell", () => {
  const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));
  const files = staging.verifyRuntimeFiles();
  for (const image of EXPECTED_IMAGES) assert.ok(files.includes(`concepts/images/${image}`));
  assert.ok(files.includes("concepts/index.html"));
  assert.ok(files.includes("concepts/gallery.css"));
  assert.deepEqual(staging.EXPECTED_SHELL_ASSETS, ["./", "index.html", "css/status.css", "js/status.js"]);
  assert.doesNotMatch(read("sw.js"), /concepts\//i);
});
