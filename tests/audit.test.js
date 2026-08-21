"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");

const ROOT = path.resolve(__dirname, "..");
const read = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), "utf8");

const REQUIRED_FILES = [
  "index.html",
  "manifest.webmanifest",
  "sw.js",
  "icons/icon.svg",
  "icons/icon-maskable.svg",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/icon-maskable-512.png",
  "icons/apple-touch-icon.png",
  "css/tokens.css",
  "css/app.css",
  "css/status.css",
  "concepts/index.html",
  "concepts/gallery.css",
  "concepts/images/battlefield.webp",
  "concepts/images/astral-concord.webp",
  "concepts/images/gravebound-court.webp",
  "concepts/images/structures.webp",
  "concepts/images/combat-readability.webp",
  "concepts/images/minimal-menu.webp",
  "concepts/images/mobile-landscape.webp",
  "concepts/images/production-rally.webp",
  "concepts/feasibility/index.html",
  "concepts/feasibility/proof.css",
  "concepts/feasibility/images/production-battlefield-environment-v4.webp",
  "concepts/feasibility/images/structure-atlas-v2.webp",
  "concepts/feasibility/images/entity-team-color-v4.webp",
  "concepts/feasibility/images/structure-damage-v3.webp",
  "concepts/feasibility/images/entity-directional-method-v5.webp",
  "concepts/feasibility/images/astral-baked-motion-v5.webp",
  "concepts/feasibility/images/gravebound-baked-motion-v5.webp",
  "concepts/feasibility/images/astral-baked-motion-static-v5.webp",
  "concepts/feasibility/images/gravebound-baked-motion-static-v5.webp",
  "concepts/feasibility/images/astral-baked-motion-audit-v5.webp",
  "concepts/feasibility/images/gravebound-baked-motion-audit-v5.webp",
  "concepts/feasibility/phase1a/README.md",
  "concepts/feasibility/phase1a/manifest.json",
  "js/config.js",
  "js/core.js",
  "js/simulation.js",
  "js/ai.js",
  "js/render.js",
  "js/input.js",
  "js/game.js",
  "js/status.js",
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  "CHANGELOG.md",
  "VERSION.txt",
  "docs/GAME_DESIGN.md",
  "docs/ARCHITECTURE.md",
  "docs/NETCODE.md",
  "docs/REDESIGN.md",
  "docs/PRODUCTION_ART.md",
  "docs/PHASE1A_HANDOFF.md",
  "docs/CONVERSATION_DECISIONS.md",
  "docs/NEW_CHAT_PROMPT.txt",
  "docs/STATUS.md",
  "docs/ASSETS.md",
  "tests/fixtures/visual-capture.html",
  "tests/fixtures/visual-capture.js",
  "tests/feasibility-gallery.test.js",
  "tests/phase1a-production-assets.test.js",
  ".github/workflows/ci.yml",
  ".github/workflows/pages.yml",
  ".github/workflows/visual.yml",
  ".github/scripts/stage-pages.js"
];

test("required source and project-standard files exist", () => {
  for (const relativePath of REQUIRED_FILES) {
    assert.ok(fs.statSync(path.join(ROOT, relativePath), { throwIfNoEntry: false })?.isFile(), `missing ${relativePath}`);
  }
});

test("public documentation identifies the rejected prototype and active redesign", () => {
  const readme = read("README.md");
  assert.match(readme, /rejected the `v2026\.8\.15` prototype/);
  assert.match(readme, /docs\/REDESIGN\.md/);
  assert.match(readme, /image above is a non-gameplay composition built from separate assets/i);
  assert.match(readme, /Phase 1B must lock the complete visual and interaction target before any Phase 2 renderer/i);
  assert.match(readme, /rejected prototype remains available at commit \[`7f88655`/i);
  assert.match(readme, /misleading `v2026\.8\.15` tag and GitHub Release were retired without rewriting history/i);
  assert.doesNotMatch(readme, /releases\/tag\/v2026\.8\.15/i);
  assert.doesNotMatch(readme, /Historical prototype controls/);
  assert.doesNotMatch(readme, /docs\/assets\/gameplay\.webp/);
  assert.match(read("AGENTS.md"), /Active redesign override/);
  assert.match(read("AGENTS.md"), /\*\*Project Engineering Standard:\*\* v1\.0/);
  assert.match(read("AGENTS.md"), /\*\*Standard Status:\*\* adopting/);
  assert.match(read("CONTRIBUTING.md"), /docs\/REDESIGN\.md/);
  assert.match(read("docs/ASSETS.md"), /Reviewed redesign mood references/);
  assert.match(read("docs/ASSETS.md"), /Rejected prototype archive/);
  assert.match(read("docs/ASSETS.md"), /1,253,726 bytes/);
  assert.match(read("tests/README.md"), /approved production-art contract/i);
  assert.match(read("docs/STATUS.md"), /Redesign gameplay implementation \| Not started/);
  assert.match(read("docs/STATUS.md"), /owner-supplied capture establishes only the visible portrait mobile state/);
  assert.match(read("docs/STATUS.md"), /product owner approved Phase 0/);
  assert.match(read("docs/STATUS.md"), /reproduced 72\/72 checks on Node\.js 20\.20\.2/i);
  assert.match(read("docs/STATUS.md"), /Engineering standard \| v1\.0 governs the repository and is structurally applied, but remains `adopting`/i);
  assert.match(read("docs/STATUS.md"), /24-file Pages allowlist/i);
  assert.match(read("docs/STATUS.md"), /Pages staged the exact 31-file allowlist plus `\.nojekyll`/i);
  assert.match(read("docs/ASSETS.md"), /2,263,262 bytes/);
  assert.match(read("docs/STATUS.md"), /919cc933a4def3a6688208f3e5a2180cc4d4687e/);
  assert.match(read("docs/STATUS.md"), /main audit run `32347611623` and Pages run `32347611618` completed successfully/i);
  assert.match(read("docs/STATUS.md"), /75ec47c2bca9ea325f5b9508c06d44f3eb1aff1c/);
  assert.match(read("docs/STATUS.md"), /main audit run `32351430376` and Pages run `32351430306` completed successfully/i);
  assert.match(read("docs/STATUS.md"), /match merged source byte for byte/i);
  assert.match(read("docs/STATUS.md"), /all eight local WebP references at their recorded natural dimensions/);
  assert.match(read("docs/STATUS.md"), /0d74dd9174f0db873c1c9ea8cfc824c1ea231660/);
  assert.match(read("docs/STATUS.md"), /main audit run `32496788387` and Pages run `32496788440` completed successfully/i);
  assert.match(read("docs/STATUS.md"), /canonical live index, status, redesign, and production-art documents matched merged source/i);
  assert.match(read("docs/STATUS.md"), /concepts\/feasibility\/phase1a\/.*HTTP 404/i);
  assert.match(read("docs/STATUS.md"), /b68dad6c611e9885967d866b776af38c776acd75/);
  assert.match(read("docs/STATUS.md"), /main audit run `32508895280` and Pages run `32508895290` completed successfully/i);
  assert.match(read("docs/STATUS.md"), /d6ca16927e9dfef4551323d66f6d96930e6e2f38/);
  assert.match(read("docs/STATUS.md"), /main audit run `32509285741` and Pages run `32509285737` completed successfully/i);
  assert.match(read("docs/STATUS.md"), /no `refs\/tags\/v2026\.8\.15` ref and no Release for that tag/i);
  assert.match(read("docs/STATUS.md"), /commit `7f88655f10504f44496fbba2e17871b16a5fe115` still returned successfully and remained an ancestor of `main`/i);
  assert.match(read("docs/STATUS.md"), /Phase 1B planning is active, but its implementation checklist and asset\/runtime work have not started/i);
  assert.match(read("docs/REDESIGN.md"), /Phase 0 and this roadmap baseline/);
  assert.match(read("docs/REDESIGN.md"), /Phase 1A — Production-feasibility proof/);
  assert.match(read("docs/REDESIGN.md"), /faction headquarters, Resource Point, and Production Outpost/);
  assert.match(read("docs/REDESIGN.md"), /one stable idle frame; four right-facing movement frames/i);
  assert.match(read("docs/REDESIGN.md"), /visual pixels never decide walkability/i);
  assert.match(read("docs/REDESIGN.md"), /Checkpoint: \*\*complete on 2026-08-21\*\*/i);
  assert.match(read("docs/REDESIGN.md"), /Phase 1B planning is active; its implementation checklist has not started/i);
  assert.match(read("concepts/feasibility/phase1a/README.md"), /product owner directly approved the corrected Aegis Titan and complete integrated package on 2026-08-21/i);
  assert.match(read("concepts/feasibility/phase1a/README.md"), /pull request `#10` squash-merged as `0d74dd9174f0db873c1c9ea8cfc824c1ea231660`/i);
  assert.match(read("concepts/feasibility/phase1a/README.md"), /Pages payload contains the five review compositions, all 24 actual-scale state playbacks, all six player-color proofs/i);
  assert.match(read("SECURITY.md"), /published approved Phase 1A review are static, non-playable surfaces/i);
  assert.doesNotMatch(read("SECURITY.md"), /current release is a static local browser game/i);
});

test("approved production-art method survives a cold-start handoff", () => {
  const agents = read("AGENTS.md");
  const contributing = read("CONTRIBUTING.md");
  const productionArt = read("docs/PRODUCTION_ART.md");
  const handoff = read("docs/PHASE1A_HANDOFF.md");
  const newChatPrompt = read("docs/NEW_CHAT_PROMPT.txt");
  const decisionRecord = read("docs/CONVERSATION_DECISIONS.md");
  const redesign = read("docs/REDESIGN.md");
  const assets = read("docs/ASSETS.md");

  assert.match(agents, /docs\/PRODUCTION_ART\.md/);
  assert.match(contributing, /docs\/PRODUCTION_ART\.md/);
  assert.match(redesign, /PRODUCTION_ART\.md/);
  assert.match(assets, /PRODUCTION_ART\.md/);
  assert.match(agents, /docs\/PHASE1A_HANDOFF\.md/);
  assert.match(contributing, /docs\/PHASE1A_HANDOFF\.md/);

  assert.match(handoff, /authoritative Phase 1A closure record/i);
  assert.match(handoff, /owner approved the corrected Aegis Titan and complete integrated package on 2026-08-21/i);
  assert.match(handoff, /pull request `#10`, squash commit `0d74dd9174f0db873c1c9ea8cfc824c1ea231660`/i);
  assert.match(handoff, /protected pull requests `#11` and `#12` published the optimized approved Phase 1A visual review/i);
  assert.match(handoff, /rejected `v2026\.8\.15` tag and Release were retired without rewriting history/i);
  assert.match(handoff, /Phase 1B planning is active/i);
  assert.match(handoff, /No Phase 2 renderer work begins before explicit Phase 1B approval/i);
  assert.match(newChatPrompt, /no assumed memory of earlier conversations/i);
  assert.match(newChatPrompt, /Do not edit until that cold-start report is complete/i);
  assert.match(newChatPrompt, /read `AGENTS\.md` completely/i);
  assert.match(newChatPrompt, /read `docs\/STATUS\.md` for current phase, evidence, deployment, and Engineering Standard state/i);
  assert.doesNotMatch(newChatPrompt, /agent\/phase1a|Aegis Titan|v2026|Phase 1A|Public deployment/i);
  assert.match(decisionRecord, /not a verbatim transcript/i);
  assert.match(decisionRecord, /raw transcript would mix obsolete instructions with approved rules/i);

  assert.match(productionArt, /canonical \*\*right-facing\*\* sequence/i);
  assert.match(productionArt, /exact horizontal X mirror/i);
  assert.match(productionArt, /\| Idle \| 1 canonical frame \| Held \|/i);
  assert.match(productionArt, /\| Move \| 4 authored gait frames at the reference cadence of 8 FPS \| Yes \|/i);
  assert.match(productionArt, /upper body remain pixel-identical across the four movement frames/i);
  assert.match(productionArt, /\| Attack or cast \| 6 authored full-body frames at the reference cadence of 12 FPS \| No \|/i);
  assert.match(productionArt, /\| Defeat \| 6 authored full-body frames at the reference cadence of 10 FPS \| No \|/i);
  assert.match(productionArt, /separate, frame-aligned player-color mask/i);
  assert.match(productionArt, /up to six players/i);
  assert.match(productionArt, /Ownership may never rely on hue alone/i);
  assert.match(productionArt, /There are exactly three initial structure categories/i);
  assert.match(productionArt, /environment-only/i);
  assert.match(productionArt, /browser does not assemble limbs, run a full-body bone rig, or deform anatomy/i);
  assert.match(productionArt, /Simulation ticks—not animation frames—own movement distance/i);
  assert.match(productionArt, /Astral Guardian established the approved entity method/i);
  assert.match(productionArt, /Phase 1A package applies that exact contract to the Gravebound Reaver, Starbow, Hollow String, Aegis Titan, and Ossuary Colossus/i);
  assert.match(productionArt, /crystal head, torso, hips, knees, feet, and attack travel all agree on canonical screen-right/i);

  assert.match(agents, /\| Complete automated verification \| `node tests\/run\.js` \|/i);
  assert.match(agents, /\| Stage the exact Pages payload \| `node \.github\/scripts\/stage-pages\.js _site` \|/i);
  assert.match(agents, /### Definition of done/i);
  assert.match(agents, /use `verified` only after every applicable requirement passes/i);
  assert.match(read(".github/pull_request_template.md"), /## Risk and rollback/i);
  assert.match(read(".github/pull_request_template.md"), /## Deletions and migrations/i);
  assert.match(read(".github/pull_request_template.md"), /## GitHub readiness/i);
});

test("VERSION.txt is canonical and required public mirrors match", () => {
  const version = read("VERSION.txt").trim();
  assert.match(version, /^v\d{4}\.\d{1,2}\.\d{1,2}[a-z]?$/);
  assert.match(read("README.md"), new RegExp(`Status build ${version.replaceAll(".", "\\.")}`));
  assert.ok(read("CHANGELOG.md").includes(`## [${version}]`), "changelog current heading does not match VERSION.txt");
  assert.ok(read("docs/STATUS.md").includes(`\`${version}\` in \`VERSION.txt\``), "status version does not match VERSION.txt");
  assert.ok(read("index.html").includes(version), "visible transition page version does not match VERSION.txt");
  assert.ok(read("sw.js").includes(`\${CACHE_PREFIX}${version}`), "service-worker cache version does not match VERSION.txt");
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(Object.hasOwn(packageJson, "version"), false, "package.json must not become a second version owner");
});

test("verification metadata has no install-time or runtime dependencies", () => {
  const packageJson = JSON.parse(read("package.json"));
  assert.equal(packageJson.private, true);
  assert.equal(Object.hasOwn(packageJson, "dependencies"), false);
  assert.equal(Object.hasOwn(packageJson, "devDependencies"), false);
  assert.equal(packageJson.scripts.test, "node tests/run.js");
  assert.match(packageJson.engines.node, /20/);
  assert.equal(fs.existsSync(path.join(ROOT, "package-lock.json")), false, "a lockfile is unnecessary for a zero-package harness");
});

test("status HTML uses only its local relative shell and a restrictive CSP", () => {
  const html = read("index.html");
  assert.match(html, /http-equiv=["']Content-Security-Policy["']/i);
  assert.doesNotMatch(html, /unsafe-eval/i);
  assert.doesNotMatch(html, /<(?:script|link)\b[^>]+(?:src|href)=["'](?:https?:|\/)/i);
  assert.doesNotMatch(html, /<canvas\b/i);
  assert.doesNotMatch(html, /manifest\.webmanifest/i);

  const expectedScripts = ["js/status.js"];
  const scripts = Array.from(html.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi), (match) => match[1]);
  assert.deepEqual(scripts, expectedScripts, "runtime scripts must appear exactly once in dependency order");
  for (const script of scripts) assert.ok(fs.existsSync(path.join(ROOT, script)), `missing ${script}`);

  for (const stylesheet of ["css/status.css"]) {
    assert.equal((html.match(new RegExp(stylesheet.replaceAll(".", "\\."), "g")) || []).length, 1, `${stylesheet} must be linked exactly once`);
  }
  assert.doesNotMatch(html, /css\/(?:tokens|app)\.css/);
  assert.match(html, /docs\/REDESIGN\.md/);
  assert.match(html, /docs\/STATUS\.md/);
});

test("local Markdown links resolve", () => {
  const markdownFiles = REQUIRED_FILES.filter((entry) => entry.endsWith(".md"));
  for (const relativePath of markdownFiles) {
    const source = read(relativePath);
    for (const match of source.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, "");
      if (!rawTarget || /^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;
      const target = decodeURIComponent(rawTarget.split("#", 1)[0]);
      assert.ok(fs.existsSync(path.resolve(ROOT, path.dirname(relativePath), target)), `${relativePath} has broken link ${rawTarget}`);
    }
  }
});

test("workflows are bounded, least-privilege, and deploy the staged allowlist", () => {
  const ci = read(".github/workflows/ci.yml");
  const pages = read(".github/workflows/pages.yml");
  assert.match(ci, /permissions:\s*\n\s+contents: read/);
  assert.match(ci, /timeout-minutes: 10/);
  assert.match(ci, /node tests\/run\.js/);
  assert.match(ci, /persist-credentials: false/);
  assert.match(pages, /permissions:\s*\n\s+contents: read/);
  assert.match(pages, /pages: write/);
  assert.match(pages, /id-token: write/);
  assert.match(pages, /node tests\/run\.js/);
  assert.match(pages, /stage-pages\.js _site/);
  assert.match(pages, /path: _site/);
  assert.doesNotMatch(pages, /path: \.\s*$/m, "Pages must not upload the repository root");
  for (const workflow of [ci, pages]) {
    assert.doesNotMatch(workflow, /uses:\s+[^\s@]+@v\d+/i, "actions must be pinned to immutable commit SHAs");
    for (const action of workflow.matchAll(/uses:\s+([^\s@]+)@([^\s#]+)/g)) {
      assert.match(action[2], /^[a-f0-9]{40}$/, `${action[1]} must use a full commit SHA`);
    }
  }
});

test("Pages allowlist contains only review surfaces and public status documents", () => {
  const staging = require(path.join(ROOT, ".github/scripts/stage-pages.js"));
  const files = staging.verifyRuntimeFiles();
  assert.deepEqual(files, staging.RUNTIME_FILES);
  assert.deepEqual(files.slice(0, 16), [
    "index.html",
    "sw.js",
    "css/status.css",
    "js/status.js",
    "concepts/index.html",
    "concepts/gallery.css",
    "concepts/images/battlefield.webp",
    "concepts/images/astral-concord.webp",
    "concepts/images/gravebound-court.webp",
    "concepts/images/structures.webp",
    "concepts/images/combat-readability.webp",
    "concepts/images/minimal-menu.webp",
    "concepts/images/mobile-landscape.webp",
    "concepts/images/production-rally.webp",
    "concepts/feasibility/index.html",
    "concepts/feasibility/proof.css"
  ]);
  assert.equal(files.length, 57);
  assert.equal(files.filter((entry) => /concepts\/feasibility\/phase1a\//.test(entry)).length, 37);
  assert.deepEqual(files.slice(-4), ["docs/REDESIGN.md", "docs/PRODUCTION_ART.md", "docs/STATUS.md", "docs/ASSETS.md"]);
  const staged = files.join("\n");
  assert.doesNotMatch(staged, /(?:manifest|icon|gameplay|visual-capture|README|LICENSE|CHANGELOG|VERSION|package\.json)/i);
  assert.doesNotMatch(staged, /(?:css\/(?:tokens|app)\.css|js\/(?:config|core|simulation|ai|render|input|game)\.js)/);
  assert.doesNotMatch(staged, /^(?:tests|\.github)\//m);
  assert.doesNotMatch(staged, /concepts\/feasibility\/images\//, "superseded v5 proof must not remain public");
  assert.doesNotMatch(staged, /\/phase1a\/(?:entities\/[^/]+\/(?:atlas\.png|atlas\.json|player-mask\.png)|structures\/[^/]+\.png)/i, "raw Phase 1A masters must remain repository-only");

  for (const relativePath of files.filter((entry) => entry.endsWith(".md"))) {
    for (const match of read(relativePath).matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, "");
      if (!rawTarget || /^(?:https?:|mailto:|#)/i.test(rawTarget)) continue;
      const target = decodeURIComponent(rawTarget.split("#", 1)[0]);
      const stagedTarget = staging.resolvedPublicPath(relativePath, target);
      assert.ok(files.includes(stagedTarget), `${relativePath} links to unstaged ${rawTarget}`);
    }
  }
});

test("public status does not present planned multiplayer as shipped", () => {
  const publicText = `${read("README.md")}\n${read("docs/STATUS.md")}`;
  assert.match(publicText, /multiplayer[^\n]*(?:not shipped|planned)/i);
  assert.match(read("docs/NETCODE.md"), /not a feature of the published rejected prototype/i);
});
