# Video design tokens, plan 1 of 3: model

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the video theme model: a font registry, a token catalog with metadata, a zod theme schema with a JSON Schema export, a resolver layered on Mantine's theme merge, the `classic` and generated `avandar` themes, CSS variables, React providers and hooks, a theme store with localhost routes, and a pixel-parity harness with a captured baseline. Nothing on screen changes.

**Architecture:** One token catalog (`src/videoTheme/tokenCatalog/`) is the single source of truth: every token's kind, label, description, unit, range, and surface. The zod schema, JSON Schema, resolver, CSS variables, usage tracking, and later the editor are all derived by walking it. Theme files are Mantine theme overrides (`colors`, `fontSizes`, `radius`, ...) plus `other.video.{atomic, semantic}` and `components.<Name>.defaultProps`. The resolver merges them with Mantine's `mergeThemeOverrides`, resolves `$references`, and returns a `MantineTheme` that `MantineThemeProvider` and Mantine `useProps` consume directly.

**Tech stack:** TypeScript, React 19, Mantine 9.2 (`mergeThemeOverrides`, `mergeMantineTheme`, `MantineThemeProvider`, `useProps`, `luminance`), zod 4.4 (`.meta`, `z.toJSONSchema`), Remotion 4 (`renderStill`), ffmpeg-static, node:test with tsx.

**Spec:** `docs/superpowers/specs/2026-11-12-video-design-tokens-design.md`. This plan delivers §5.4 step 1 ("Model").

---

## Conventions for every task

- Paths are relative to `apps/ava-video-producer/`. Every command runs from that directory. A path that starts with `<repo>/` is relative to the repository root.
- Run one test file with:
  `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test <file>`
- Typecheck with `pnpm exec tsc --noEmit` (for `src/`) and `pnpm exec tsc --noEmit -p tsconfig.tools.json` (for `scripts/` and `tests/`).
- Follow `<repo>/docs/rules/typescript.md` and `<repo>/docs/rules/testing.md`: `type` over `interface`, no `any`, no `as unknown as`, `_`-prefixed private helpers, functions of 45 lines or fewer, a docstring on every export that says what it is for, and tests named for the behavior they assert.
- Commit after every task in this worktree. End each commit message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Do not edit anything under `<repo>/src/config/Theme`. It is the read-only model.

## Spec corrections this plan makes

The spec is approved. These changes keep its intent and fix problems found while planning. Plans 2 and 3 inherit them.

| # | Spec says | This plan does | Why |
| --- | --- | --- | --- |
| 1 | Semantic group `radius` | Semantic group `corner` | A `$radius.panel` reference would be ambiguous with Mantine's `radius` scale, because `$` references to Mantine keys carry no prefix (`$colors.primary.4`). A test keeps semantic group names disjoint from Mantine keys. |
| 2 | "13 presets" | 12 presets: the 5 network presets plus the 7 nested ones | The spec's own lists add up to 12. `network-graph` is both a network preset and nested in `aperture-detail`. |
| 3 | "The adapter's product `MantineProvider` does not inherit a parent theme" | `ReenactmentThemeBoundary` resets Mantine's theme context. Plan 2 wraps the adapter root in it. | Mantine 9's `MantineProvider` renders `MantineThemeProvider` with `inherit` defaulting to `true`, so product UI inside a themed film would inherit the video theme's type sizes, spacing, and component defaults. |
| 4 | `ink` (light and dark) as an atomic token | `swatch.text` and `swatch.textDark`, chosen by `color.text: { onDark, onLight }` | The `{ onDark, onLight }` pair already models ink switching. A separate `ink` scale would duplicate `#edf7f4`. |
| 5 | Accent "defaults to Mantine's primary" | `color.accent: "$primary"`, where `$primary` reads `colors[primaryColor][primaryShade]` and `primaryShade` is `{ light, dark }` | This reuses Mantine's own primary model, and the accent stays readable when a theme switches to a light ground. |
| 6 | Easing tokens are bezier tuples | A bezier tuple or `{ powerInOut: n }` | `EASE.inOutCubic` is a polynomial with no exact bezier form, and `classic` must reproduce it exactly. |
| 7 | Letter spacing in pixels (implied by "lengths are pixels") | Letter spacing in `em` | One letter-spacing scale then serves both surfaces: the graphic eyebrow (14 px at 2.4 px) and the stage heading (-0.025 em). |
| 8 | Tokens listed with no in-scope reader yet: `color.lineStrong`, `color.series`, status colours, `effect.glow`, `effect.depthBlur`, `stroke.emphasis`, `layout.graphic.rule`, `atomic.hachureGap`, `atomic.amplitude` | Omitted | The spec's "no dead tokens" rule. Plan 2 adds any of them that a renderer turns out to read. `motionBlur.transitionBlur` covers the only blur reader. |
| 9 | `text.graphic` roles: eyebrow, heading, label, detail, caption, pill, code | Adds `body` (the 20 px default `Text`). `code` is added by Plan 2's `CodeFocus` task. | `body` is the most common graphic text. `code`'s values are not confirmed until `CodeFocus` is read. |

## File map

Created:

| File | Responsibility |
| --- | --- |
| `scripts/showcase/bundleShowcaseFilms/bundleShowcaseFilms.ts` | One Remotion bundle and Chrome options for showcase stills (shared by posters and parity) |
| `scripts/videoTheme/themeParity/compareRgbaFrames/compareRgbaFrames.ts` | Pure per-pixel frame comparison with allowed regions and a diff image |
| `scripts/videoTheme/themeParity/rgbaPng/rgbaPng.ts` | PNG to raw RGBA and back through ffmpeg |
| `scripts/videoTheme/themeParity/parityTargets/parityTargets.ts` | The 17 parity targets, their frames, and the §1.6 allowances |
| `scripts/videoTheme/themeParity/themeParity.ts` | `pnpm theme:parity capture|compare` |
| `src/videoTheme/videoFontRegistry/videoFontRegistry.json` | Registered font families (data, readable by `.mjs` scripts) |
| `src/videoTheme/videoFontRegistry/videoFontRegistry.ts` | Typed registry accessors |
| `src/videoTheme/videoTheme.types.ts` | Shared theme, token, and resolved-value types |
| `src/videoTheme/tokenCatalog/defineTokens.ts` | `token()`, `scale()`, composite field specs, control kinds |
| `src/videoTheme/tokenCatalog/mantineTokens.ts` | Mantine-native keys |
| `src/videoTheme/tokenCatalog/atomicTokens.ts` | `other.video.atomic` scales |
| `src/videoTheme/tokenCatalog/semanticTokens.ts` | `other.video.semantic` roles |
| `src/videoTheme/tokenCatalog/componentTokens.ts` | `components.<Name>.defaultProps` (`ProgressBar` here; Plan 2 adds the rest) |
| `src/videoTheme/tokenCatalog/tokenCatalog.ts` | The assembled catalog and path lookups |
| `src/videoTheme/themeReferences/themeReferences.ts` | `$reference` syntax and targets |
| `src/videoTheme/hashVideoTheme/hashVideoTheme.ts` | Canonical JSON and a sync content hash |
| `src/videoTheme/tokenValueSchemas/tokenValueSchemas.ts` | Zod schemas for literal token values by kind |
| `src/videoTheme/videoThemeSchema/videoThemeSchema.ts` | Theme document schema, completeness rule, JSON Schema export |
| `themes/classic.theme.json` | The complete built-in theme (today's look) |
| `src/videoTheme/builtInVideoThemes/builtInVideoThemes.ts` | Bundled built-in themes, libraries, default source |
| `src/videoTheme/createEasingFromToken/createEasingFromToken.ts` | Easing token to easing function |
| `src/videoTheme/normalizeTokenValue/normalizeTokenValue.ts` | Converts a resolved literal to its kind's value (Mantine CSS strings to numbers, stacks to font ids) |
| `src/videoTheme/cssValues/cssValues.ts` | CSS strings for shadows, fills, text shadows, alpha colours |
| `src/videoTheme/VideoThemeError/VideoThemeError.ts` | Error carrying token-path issues |
| `src/videoTheme/getResolvedTokenValue/getResolvedTokenValue.ts` | Reads a resolved value by token path |
| `src/videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers.ts` | Layer merge order, `extends` chains, scoped overrides |
| `src/videoTheme/resolveVideoTheme/resolveTokenTiers.ts` | Reference and composite resolution over the catalog |
| `src/videoTheme/resolveVideoTheme/resolveVideoTheme.ts` | Public resolver: Mantine theme, hash, measured-font rule |
| `src/videoTheme/buildVideoCssVariables/buildVideoCssVariables.ts` | `--video-*` variables |
| `src/videoTheme/tokenUsage/tokenUsage.ts` | Usage context, collector, and read-tracking proxy |
| `src/videoTheme/useVideoTheme/useVideoTheme.ts` | Context, `useVideoTheme`, `useVideoTokens`, `useVideoProps` |
| `src/videoTheme/VideoThemeProvider/VideoThemeProvider.tsx` | Resolves a source and provides it to Mantine, hooks, and CSS |
| `src/videoTheme/VideoThemeScope/VideoThemeScope.tsx` | Nested per-item scopes |
| `src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary.tsx` | Clean Mantine theme context for product UI |
| `src/videoTheme/textContrast/textContrast.ts` | WCAG contrast of every text role |
| `scripts/videoTheme/syncAvandarTheme/createAvandarTheme.ts` | Pure mapping from the Avandar theme to `avandar.theme.json` |
| `scripts/videoTheme/syncAvandarTheme/readAvandarThemeSource.ts` | Runs `read-theme.mjs --for-video` |
| `scripts/videoTheme/syncAvandarTheme/syncAvandarTheme.ts` | `pnpm theme:sync-avandar` |
| `themes/avandar.theme.json` | Generated; never edited by hand |
| `scripts/showcase/themeStore/themeStore.ts` | List, read, create, save themes with validation and atomic writes |
| `scripts/showcase/themeRoutes/themeRoutes.ts` | `/api/themes` routes |

Modified: `scripts/showcase/atlasPosters/renderAtlasPosters.ts`, `src/fonts.ts`, `scripts/buildAtlas/refreshPalette.mjs`, `scripts/read-theme.mjs`, `scripts/showcase/server.ts`, `tests/motion-watch.test.ts`, `package.json`.

---

### Task 1: Shared still-render bundle

Posters and the parity harness must render stills the same way. Move the poster bundling into a shared module.

**Files:**
- Create: `scripts/showcase/bundleShowcaseFilms/bundleShowcaseFilms.ts`
- Modify: `scripts/showcase/atlasPosters/renderAtlasPosters.ts`

- [ ] **Step 1: Create the shared module**

```ts
import fs from "node:fs/promises";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { buildProduct } from "../../build-avandar.mjs";
import { assetReferences, publicAsset } from "../../lib/planHelpers";
import { withWorkspaceAliases } from "../../lib/withWorkspaceAliases.mjs";
import { appRoot } from "../ShowcaseFilms/ShowcaseFilms";
import type { Film } from "../../../src/showcase/showcase.types";

/**
 * Headless Chrome options for rendering showcase stills. Every still script
 * uses the same options so two runs on one machine render identical pixels,
 * for example Atlas posters and theme parity frames.
 */
export const SHOWCASE_STILL_BROWSER_OPTIONS = {
  chromeMode: "headless-shell",
  chromiumOptions: { headless: true, gl: "angle" },
  logLevel: "error",
} as const;

/**
 * Bundles the showcase render entry with one public directory that holds
 * every film's assets, so stills of several films render from one serve URL.
 * Use it before a batch of `renderStill` calls, for example to render poster
 * or parity frames. Returns the serve URL.
 */
export async function bundleShowcaseFilms(
  films: readonly Film[],
  directory: string,
): Promise<string> {
  const publicDir = path.join(directory, "public");
  await fs.mkdir(publicDir, { recursive: true });
  await fs.cp(
    path.join(appRoot, "public/fonts"),
    path.join(publicDir, "fonts"),
    { recursive: true },
  );
  const assets = new Set(
    films.flatMap((film) => (film.plan ? assetReferences(film.plan) : [])),
  );
  for (const asset of assets) {
    const target = path.join(publicDir, asset);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.copyFile(await publicAsset(appRoot, asset), target);
  }
  await buildProduct();
  return bundle({
    webpackOverride: withWorkspaceAliases,
    entryPoint: path.join(appRoot, "src/showcase/render-entry.tsx"),
    rootDir: appRoot,
    outDir: path.join(directory, "bundle"),
    publicDir,
  });
}
```

- [ ] **Step 2: Point the poster script at it**

Replace the whole of `scripts/showcase/atlasPosters/renderAtlasPosters.ts` with:

```ts
import fs from "node:fs/promises";
import path from "node:path";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import {
  CONTINUITY_CATALOG,
  isSceneEntry,
} from "../../../src/continuity/continuityCatalog";
import { requireLicense } from "../../require-license.mjs";
import {
  bundleShowcaseFilms,
  SHOWCASE_STILL_BROWSER_OPTIONS,
} from "../bundleShowcaseFilms/bundleShowcaseFilms";
import { appRoot, ShowcaseFilms } from "../ShowcaseFilms/ShowcaseFilms";
import { getPosterFrameFromPlan } from "./getPosterFrameFromPlan/getPosterFrameFromPlan";

/** Tracked card posters for the Atlas Compositions and Sample films sections. */
const ATLAS_POSTER_DIRECTORY: string = path.join(
  appRoot,
  "showcase/assets/atlas",
);

/** Posters render at half the canvas: sharp on a card, small in Git. */
const POSTER_SCALE = 0.5;

/**
 * Render a still for each named composition or sample film, or for the whole
 * continuity catalog when no ids are given, into the tracked poster folder.
 */
async function renderAtlasPosters(ids: readonly string[]) {
  const { privateKey } = requireLicense();
  const entries = ids.length
    ? CONTINUITY_CATALOG.filter((entry) => ids.includes(entry.id))
    : CONTINUITY_CATALOG;
  if (entries.length !== (ids.length || CONTINUITY_CATALOG.length)) {
    throw new Error("Unknown Atlas composition id");
  }
  // Camera travel blurs a still; with it off, a poster shows the sharp wide
  // composition. Plain storyboard scenes have no camera options.
  const films = await Promise.all(
    entries.map((entry) =>
      ShowcaseFilms.load(entry.id, {
        captions: false,
        ...(isSceneEntry(entry) ? {} : { cameraMotion: false }),
      }),
    ),
  );
  const directory = path.join(appRoot, "out/showcase/atlas-posters");
  await fs.rm(directory, { recursive: true, force: true });
  const serveUrl = await bundleShowcaseFilms(films, directory);
  await fs.mkdir(ATLAS_POSTER_DIRECTORY, { recursive: true });
  const options = SHOWCASE_STILL_BROWSER_OPTIONS;
  const browser = await openBrowser("chrome", options);
  try {
    for (const film of films) {
      const inputProps = { film, withAudio: false };
      const composition = await selectComposition({
        serveUrl,
        id: "showcase-film",
        inputProps,
        puppeteerInstance: browser,
        ...options,
        envVariables: {},
      });
      const frame = film.plan ? getPosterFrameFromPlan(film.plan) : 0;
      const output = path.join(ATLAS_POSTER_DIRECTORY, `${film.id}.jpg`);
      await renderStill({
        licenseKey: privateKey,
        serveUrl,
        composition,
        inputProps,
        frame,
        output,
        imageFormat: "jpeg",
        jpegQuality: 82,
        scale: POSTER_SCALE,
        puppeteerInstance: browser,
        ...options,
        envVariables: {},
      });
      console.log(
        `${film.id}: frame ${frame} → ${path.relative(appRoot, output)}`,
      );
    }
  } finally {
    await browser.close({ silent: true });
  }
}

await renderAtlasPosters(process.argv.slice(2));
```

- [ ] **Step 3: Typecheck and render one poster**

Run: `pnpm exec tsc --noEmit -p tsconfig.tools.json`
Expected: no errors.

Run: `pnpm atlas:posters shared-object-handoff`
Expected: `shared-object-handoff: frame <n> → showcase/assets/atlas/shared-object-handoff.jpg`.

Then run `git status --short showcase/assets/atlas`. If the JPEG bytes changed, restore it with `git checkout showcase/assets/atlas/shared-object-handoff.jpg`. This task changes no pixels.

- [ ] **Step 4: Commit**

```bash
git add scripts/showcase/bundleShowcaseFilms scripts/showcase/atlasPosters/renderAtlasPosters.ts
git commit -m "refactor(video-producer): share the showcase still bundle between scripts" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Per-pixel frame comparison

**Files:**
- Create: `scripts/videoTheme/themeParity/compareRgbaFrames/compareRgbaFrames.ts`
- Test: `scripts/videoTheme/themeParity/compareRgbaFrames/compareRgbaFrames.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { compareRgbaFrames } from "./compareRgbaFrames";

/** A 2×1 frame: a black pixel then a white one. */
function _frame(): Uint8Array {
  return Uint8Array.from([0, 0, 0, 255, 255, 255, 255, 255]);
}

test("identical frames report no differing pixels", () => {
  const result = compareRgbaFrames({
    reference: _frame(),
    current: _frame(),
    width: 2,
    height: 1,
    allowedRegions: [],
  });
  assert.equal(result.differingPixels, 0);
  assert.equal(result.unexplainedPixels, 0);
});

test("a changed pixel outside every allowed region is unexplained and marked magenta", () => {
  const current = _frame();
  current[4] = 254;
  const result = compareRgbaFrames({
    reference: _frame(),
    current,
    width: 2,
    height: 1,
    allowedRegions: [],
  });
  assert.equal(result.unexplainedPixels, 1);
  assert.deepEqual([...result.diff.slice(4, 8)], [255, 0, 255, 255]);
});

test("a changed pixel inside an allowed region counts as differing but explained", () => {
  const current = _frame();
  current[4] = 254;
  const result = compareRgbaFrames({
    reference: _frame(),
    current,
    width: 2,
    height: 1,
    allowedRegions: [{ x: 1, y: 0, width: 1, height: 1 }],
  });
  assert.equal(result.differingPixels, 1);
  assert.equal(result.unexplainedPixels, 0);
  assert.deepEqual([...result.diff.slice(4, 8)], [255, 191, 0, 255]);
});

test("frames of different sizes are rejected", () => {
  assert.throws(() =>
    compareRgbaFrames({
      reference: _frame(),
      current: Uint8Array.from([0, 0, 0, 255]),
      width: 2,
      height: 1,
      allowedRegions: [],
    }),
  );
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/themeParity/compareRgbaFrames/compareRgbaFrames.test.ts`
Expected: FAIL, `Cannot find module './compareRgbaFrames'`.

- [ ] **Step 3: Implement**

```ts
/** A rectangle in frame pixels, inclusive of its top-left corner. */
export type ParityRegion = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

/** What changed between a reference frame and the current render of it. */
export type FrameComparison = Readonly<{
  differingPixels: number;
  /** Differing pixels outside every allowed region. Parity needs zero. */
  unexplainedPixels: number;
  /** RGBA diff image: dimmed reference, amber for allowed, magenta otherwise. */
  diff: Uint8Array;
}>;

const ALLOWED_COLOR = [255, 191, 0, 255] as const;
const UNEXPLAINED_COLOR = [255, 0, 255, 255] as const;

function _isInside(regions: readonly ParityRegion[], x: number, y: number) {
  return regions.some(
    (region) =>
      x >= region.x &&
      x < region.x + region.width &&
      y >= region.y &&
      y < region.y + region.height,
  );
}

/**
 * Compares two same-size RGBA frames pixel by pixel. `theme:parity` uses it
 * to prove a renderer change kept `classic` identical, with the only allowed
 * differences confined to the regions of a deliberate consolidation.
 */
export function compareRgbaFrames(
  options: Readonly<{
    reference: Uint8Array;
    current: Uint8Array;
    width: number;
    height: number;
    allowedRegions: readonly ParityRegion[];
  }>,
): FrameComparison {
  const { reference, current, width, height, allowedRegions } = options;
  const length = width * height * 4;
  if (reference.length !== length || current.length !== length) {
    throw new Error(`Both frames must be ${width}×${height} RGBA`);
  }
  const diff = new Uint8Array(length);
  let differingPixels = 0;
  let unexplainedPixels = 0;
  for (let offset = 0; offset < length; offset += 4) {
    const isSame = [0, 1, 2, 3].every(
      (channel) => reference[offset + channel] === current[offset + channel],
    );
    if (isSame) {
      const gray = Math.round(
        (reference[offset] * 0.2126 +
          reference[offset + 1] * 0.7152 +
          reference[offset + 2] * 0.0722) *
          0.3,
      );
      diff.set([gray, gray, gray, 255], offset);
      continue;
    }
    differingPixels += 1;
    const pixel = offset / 4;
    const isAllowed = _isInside(
      allowedRegions,
      pixel % width,
      Math.floor(pixel / width),
    );
    unexplainedPixels += isAllowed ? 0 : 1;
    diff.set(isAllowed ? ALLOWED_COLOR : UNEXPLAINED_COLOR, offset);
  }
  return { differingPixels, unexplainedPixels, diff };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 4 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/videoTheme/themeParity/compareRgbaFrames
git commit -m "test(video-producer): compare parity frames pixel by pixel" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: PNG to RGBA and back

**Files:**
- Create: `scripts/videoTheme/themeParity/rgbaPng/rgbaPng.ts`
- Test: `scripts/videoTheme/themeParity/rgbaPng/rgbaPng.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { readRgbaFromPng, writePngFromRgba } from "./rgbaPng";

test("RGBA pixels survive a PNG round trip unchanged", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "rgba-png-"));
  try {
    const file = path.join(directory, "frame.png");
    const pixels = Uint8Array.from([
      255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 12, 34, 56, 255,
    ]);
    await writePngFromRgba(file, pixels, { width: 2, height: 2 });
    const decoded = await readRgbaFromPng(file, { width: 2, height: 2 });
    assert.deepEqual([...decoded], [...pixels]);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/themeParity/rgbaPng/rgbaPng.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import { spawn } from "node:child_process";
import { ffmpeg } from "../../../lib/mediaHelpers";

/** The pixel dimensions of a raw frame. */
type FrameSize = Readonly<{ width: number; height: number }>;

/** Runs ffmpeg with binary stdin and collects binary stdout. */
async function _runFfmpeg(
  args: readonly string[],
  input: Uint8Array = new Uint8Array(),
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const child = spawn(ffmpeg, args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => chunks.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = (stderr + chunk.toString()).slice(-4000);
    });
    child.on("error", reject);
    child.on("close", (code) =>
      code === 0
        ? resolve(Buffer.concat(chunks))
        : reject(new Error(`ffmpeg exited ${code}: ${stderr}`)),
    );
    child.stdin.end(input);
  });
}

/**
 * Decodes a PNG into raw RGBA bytes, for pixel comparisons such as the theme
 * parity gate. Rejects a PNG whose size is not the expected one.
 */
export async function readRgbaFromPng(
  file: string,
  size: FrameSize,
): Promise<Uint8Array> {
  const rgba = await _runFfmpeg([
    "-v",
    "error",
    "-i",
    file,
    "-f",
    "rawvideo",
    "-pix_fmt",
    "rgba",
    "-",
  ]);
  if (rgba.length !== size.width * size.height * 4) {
    throw new Error(`${file} is not ${size.width}×${size.height}`);
  }
  return rgba;
}

/**
 * Encodes raw RGBA bytes as a lossless PNG, for example a parity diff image.
 */
export async function writePngFromRgba(
  file: string,
  rgba: Uint8Array,
  size: FrameSize,
): Promise<void> {
  await _runFfmpeg(
    [
      "-v",
      "error",
      "-y",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgba",
      "-s",
      `${size.width}x${size.height}`,
      "-i",
      "-",
      "-frames:v",
      "1",
      file,
    ],
    rgba,
  );
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run the Step 2 command. Expected: 1 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/videoTheme/themeParity/rgbaPng
git commit -m "test(video-producer): read and write parity frames as raw RGBA" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Parity targets and allowances

**Files:**
- Create: `scripts/videoTheme/themeParity/parityTargets/parityTargets.ts`
- Test: `scripts/videoTheme/themeParity/parityTargets/parityTargets.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedRegionsFromFilm,
  listParityTargets,
} from "./parityTargets";

test("every in-scope preset and composition is a parity target", () => {
  assert.deepEqual(
    listParityTargets().map((target) => target.filmId),
    [
      "stock-network-graph",
      "stock-node-traversal",
      "stock-radial-network",
      "stock-plexus-field",
      "stock-orbital-system",
      "stock-data-pipeline",
      "stock-predicate-pushdown-boundary",
      "stock-code-focus",
      "stock-schema-mapping",
      "stock-query-column-cache-growth",
      "stock-source-merge",
      "stock-decision-fork",
      "shared-object-handoff",
      "frame-to-interface",
      "aperture-detail",
      "spatial-continuation",
      "occlusion-wipe",
    ],
  );
});

test("stock targets render at the Atlas gallery default colours", () => {
  const [networkGraph] = listParityTargets(["network-graph"]);
  assert.deepEqual(networkGraph.options, {
    accent: "#51a7ff",
    background: "#0b1219",
  });
});

test("caption allowances scale from the stock viewBox to the rendered frame", () => {
  assert.deepEqual(
    getAllowedRegionsFromFilm("node-traversal", { kind: "stock", width: 1280 }),
    [{ x: 0, y: 693, width: 1280, height: 94 }],
  );
});

test("a target without a listed consolidation has no allowed regions", () => {
  assert.deepEqual(
    getAllowedRegionsFromFilm("network-graph", { kind: "stock", width: 1280 }),
    [],
  );
});

test("unknown parity ids are rejected", () => {
  assert.throws(() => listParityTargets(["not-a-preset"]));
});
```

The caption band is `{ x: 0, y: 520, width: 960, height: 70 }` in viewBox units. At 1280 / 960 = 4/3: x 0, y floor(693.33) = 693, width ceil(1280) = 1280, height ceil(93.33) = 94.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/themeParity/parityTargets/parityTargets.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../../../../src/gallery/palette";
import { previewFrames } from "../../../lib/planHelpers";
import { StockFingerprintModule } from "../../../stock/StockFingerprintModule/StockFingerprintModule";
import type { ParityRegion } from "../compareRgbaFrames/compareRgbaFrames";
import type { Film } from "../../../../src/showcase/showcase.types";

/** The stock presets the design tokens cover, in Atlas order. */
export const PARITY_STOCK_PRESET_IDS = [
  "network-graph",
  "node-traversal",
  "radial-network",
  "plexus-field",
  "orbital-system",
  "data-pipeline",
  "predicate-pushdown-boundary",
  "code-focus",
  "schema-mapping",
  "query-column-cache-growth",
  "source-merge",
  "decision-fork",
] as const;

/** The compositions the design tokens cover, in Atlas order. */
export const PARITY_COMPOSITION_IDS = [
  "shared-object-handoff",
  "frame-to-interface",
  "aperture-detail",
  "spatial-continuation",
  "occlusion-wipe",
] as const;

/** One item the parity gate renders, and the film options it loads with. */
export type ParityTarget = Readonly<{
  id: string;
  filmId: string;
  options: Readonly<Record<string, unknown>>;
}>;

/** A deliberate `classic` change: where it may alter pixels, in design units. */
type ParityAllowance = Readonly<{
  id: string;
  reason: string;
  region: ParityRegion;
}>;

const STOCK_VIEWBOX_WIDTH = 960;
const CAPTION_BAND: ParityRegion = { x: 0, y: 520, width: 960, height: 70 };
const CAPTION_REASON = "Shared caption style: 17 px at baseline 551";

/**
 * The only pixel differences `classic` may show, from spec §1.6. Regions are
 * in the stock viewBox (960 × 600).
 */
const PARITY_ALLOWANCES: readonly ParityAllowance[] = [
  { id: "radial-network", reason: CAPTION_REASON, region: CAPTION_BAND },
  { id: "node-traversal", reason: CAPTION_REASON, region: CAPTION_BAND },
  { id: "orbital-system", reason: CAPTION_REASON, region: CAPTION_BAND },
  {
    id: "radial-network",
    reason: "Hub glow opacity 0.035 becomes 0.03",
    region: { x: 420, y: 235, width: 120, height: 120 },
  },
  {
    id: "orbital-system",
    reason: "Centre pulse opacity 0.025 becomes 0.03",
    region: { x: 402, y: 220, width: 156, height: 156 },
  },
];

/**
 * Parity targets in Atlas order, or only the named ones. Stock presets load
 * at the Atlas gallery default colours; compositions load with their
 * authored values.
 */
export function listParityTargets(
  ids: readonly string[] = [],
): readonly ParityTarget[] {
  const targets: readonly ParityTarget[] = [
    ...PARITY_STOCK_PRESET_IDS.map((id) => ({
      id,
      filmId: `stock-${id}`,
      options: { accent: DEFAULT_ACCENT, background: DEFAULT_BACKGROUND },
    })),
    ...PARITY_COMPOSITION_IDS.map((id) => ({ id, filmId: id, options: {} })),
  ];
  const unknown = ids.filter((id) => !targets.some((target) => target.id === id));
  if (unknown.length > 0) {
    throw new Error(`Unknown parity target: ${unknown.join(", ")}`);
  }
  return ids.length
    ? targets.filter((target) => ids.includes(target.id))
    : targets;
}

/**
 * The frames the parity gate compares: the stock fingerprint samples for a
 * preset, and the storyboard preview frames for a composition.
 */
export function getParityFramesFromFilm(
  film: Pick<Film, "kind" | "plan">,
): readonly number[] {
  if (film.kind === "stock") {
    return StockFingerprintModule.SAMPLE_PARAMETERS.samples;
  }
  return film.plan ? previewFrames(film.plan) : [0];
}

/**
 * Allowed regions for one target, scaled from design units to the rendered
 * frame and rounded outward so a scaled edge never clips a changed pixel.
 */
export function getAllowedRegionsFromFilm(
  id: string,
  film: Pick<Film, "kind" | "width">,
): readonly ParityRegion[] {
  const scale = film.kind === "stock" ? film.width / STOCK_VIEWBOX_WIDTH : 1;
  return PARITY_ALLOWANCES.filter((allowance) => allowance.id === id).map(
    ({ region }) => ({
      x: Math.floor(region.x * scale),
      y: Math.floor(region.y * scale),
      width: Math.ceil(region.width * scale),
      height: Math.ceil(region.height * scale),
    }),
  );
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 5 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/videoTheme/themeParity/parityTargets
git commit -m "test(video-producer): list the theme parity targets and allowances" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: `theme:parity` command and the baseline capture

**Files:**
- Create: `scripts/videoTheme/themeParity/themeParity.ts`
- Modify: `package.json` (scripts)

- [ ] **Step 1: Write the command**

```ts
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import {
  openBrowser,
  renderStill,
  selectComposition,
} from "@remotion/renderer";
import { requireLicense } from "../../require-license.mjs";
import {
  bundleShowcaseFilms,
  SHOWCASE_STILL_BROWSER_OPTIONS,
} from "../../showcase/bundleShowcaseFilms/bundleShowcaseFilms";
import { appRoot, ShowcaseFilms } from "../../showcase/ShowcaseFilms/ShowcaseFilms";
import { compareRgbaFrames } from "./compareRgbaFrames/compareRgbaFrames";
import {
  getAllowedRegionsFromFilm,
  getParityFramesFromFilm,
  listParityTargets,
  type ParityTarget,
} from "./parityTargets/parityTargets";
import { readRgbaFromPng, writePngFromRgba } from "./rgbaPng/rgbaPng";
import type { Film } from "../../../src/showcase/showcase.types";

const PARITY_DIRECTORY = path.join(appRoot, "out/theme-parity");

type ParityStage = "reference" | "current" | "diff";
type LoadedTarget = Readonly<{
  target: ParityTarget;
  film: Film;
  frames: readonly number[];
}>;
type TargetResult = Readonly<{
  id: string;
  frames: number;
  differingFrames: number;
  unexplainedPixels: number;
  missingFrames: number;
}>;

function _frameFile(stage: ParityStage, id: string, frame: number) {
  return path.join(
    PARITY_DIRECTORY,
    stage,
    id,
    `${String(frame).padStart(4, "0")}.png`,
  );
}

async function _loadTargets(ids: readonly string[]): Promise<LoadedTarget[]> {
  return Promise.all(
    listParityTargets(ids).map(async (target) => {
      const film = await ShowcaseFilms.load(target.filmId, target.options);
      return { target, film, frames: getParityFramesFromFilm(film) };
    }),
  );
}

async function _renderTargets(
  targets: readonly LoadedTarget[],
  stage: "reference" | "current",
): Promise<void> {
  const { privateKey } = requireLicense();
  const options = SHOWCASE_STILL_BROWSER_OPTIONS;
  const serveUrl = await bundleShowcaseFilms(
    targets.map(({ film }) => film),
    path.join(PARITY_DIRECTORY, "bundle"),
  );
  const browser = await openBrowser("chrome", options);
  try {
    for (const { target, film, frames } of targets) {
      const inputProps = { film, withAudio: false };
      const composition = await selectComposition({
        serveUrl,
        id: "showcase-film",
        inputProps,
        puppeteerInstance: browser,
        ...options,
        envVariables: {},
      });
      for (const frame of frames) {
        const output = _frameFile(stage, target.id, frame);
        await fs.mkdir(path.dirname(output), { recursive: true });
        await renderStill({
          licenseKey: privateKey,
          serveUrl,
          composition,
          inputProps,
          frame,
          output,
          imageFormat: "png",
          scale: 1,
          puppeteerInstance: browser,
          ...options,
          envVariables: {},
        });
      }
      console.log(`${target.id}: ${frames.length} frames → ${stage}`);
    }
  } finally {
    await browser.close({ silent: true });
  }
}

async function _compareTarget({
  target,
  film,
  frames,
}: LoadedTarget): Promise<TargetResult> {
  const size = { width: film.width, height: film.height };
  const allowedRegions = getAllowedRegionsFromFilm(target.id, film);
  let differingFrames = 0;
  let unexplainedPixels = 0;
  let missingFrames = 0;
  for (const frame of frames) {
    const reference = await readRgbaFromPng(
      _frameFile("reference", target.id, frame),
      size,
    ).catch(() => undefined);
    if (!reference) {
      missingFrames += 1;
      continue;
    }
    const current = await readRgbaFromPng(
      _frameFile("current", target.id, frame),
      size,
    );
    const comparison = compareRgbaFrames({
      reference,
      current,
      ...size,
      allowedRegions,
    });
    if (comparison.differingPixels === 0) {
      continue;
    }
    differingFrames += 1;
    unexplainedPixels += comparison.unexplainedPixels;
    const diffFile = _frameFile("diff", target.id, frame);
    await fs.mkdir(path.dirname(diffFile), { recursive: true });
    await writePngFromRgba(diffFile, comparison.diff, size);
  }
  return {
    id: target.id,
    frames: frames.length,
    differingFrames,
    unexplainedPixels,
    missingFrames,
  };
}

async function _writeManifest(targets: readonly LoadedTarget[]) {
  const file = path.join(PARITY_DIRECTORY, "reference/manifest.json");
  const previous = JSON.parse(
    await fs.readFile(file, "utf8").catch(() => '{"targets":{}}'),
  ) as { targets: Record<string, readonly number[]> };
  const manifest = {
    capturedAt: new Date().toISOString(),
    commit: execFileSync("git", ["rev-parse", "HEAD"], {
      cwd: appRoot,
      encoding: "utf8",
    }).trim(),
    targets: {
      ...previous.targets,
      ...Object.fromEntries(
        targets.map(({ target, frames }) => [target.id, frames]),
      ),
    },
  };
  await fs.writeFile(file, `${JSON.stringify(manifest, null, 2)}\n`);
}

/**
 * Captures reference frames with `capture`, or renders current frames and
 * compares them with the reference with `compare`, for the named targets or
 * all of them. A comparison fails on any pixel difference outside the
 * allowances, or on a frame with no reference.
 */
async function runThemeParity(
  mode: "capture" | "compare",
  ids: readonly string[],
): Promise<void> {
  const targets = await _loadTargets(ids);
  const stages: readonly ParityStage[] =
    mode === "capture" ? ["reference"] : ["current", "diff"];
  await Promise.all(
    targets.flatMap(({ target }) =>
      stages.map((stage) =>
        fs.rm(path.join(PARITY_DIRECTORY, stage, target.id), {
          recursive: true,
          force: true,
        }),
      ),
    ),
  );
  await _renderTargets(targets, mode === "capture" ? "reference" : "current");
  if (mode === "capture") {
    await _writeManifest(targets);
    return;
  }
  const results: TargetResult[] = [];
  for (const target of targets) {
    results.push(await _compareTarget(target));
  }
  console.table(results);
  if (results.some((result) => result.unexplainedPixels > 0 || result.missingFrames > 0)) {
    console.error(
      `Parity failed. Diff images: ${path.relative(appRoot, path.join(PARITY_DIRECTORY, "diff"))}`,
    );
    process.exitCode = 1;
  }
}

const [mode, ...ids] = process.argv.slice(2);
if (mode === "capture" || mode === "compare") {
  await runThemeParity(mode, ids);
} else {
  console.error("Usage: pnpm theme:parity <capture|compare> [target ids...]");
  process.exitCode = 2;
}
```

- [ ] **Step 2: Register the script**

In `package.json` `scripts`, add after `"atlas:posters"`:

```json
"theme:parity": "node scripts/require-license.mjs && node --import tsx --import ./scripts/yaml/registerYaml.mjs scripts/videoTheme/themeParity/themeParity.ts",
```

- [ ] **Step 3: Typecheck**

Run: `pnpm exec tsc --noEmit -p tsconfig.tools.json`
Expected: no errors.

- [ ] **Step 4: Capture the baseline before any renderer change**

Run: `pnpm theme:parity capture`
Expected: 17 lines such as `network-graph: 6 frames → reference`. Each stock preset has 6 frames (`0, 18, 36, 90, 150, 179`). Each composition has its preview frame count.

Run: `find out/theme-parity/reference -name '*.png' | wc -l`
Expected: 72 plus the five compositions' preview frame counts.

- [ ] **Step 5: Prove the harness is deterministic**

Run: `pnpm theme:parity compare`
Expected: a table with `differingFrames` 0, `unexplainedPixels` 0, and `missingFrames` 0 for all 17 targets, and exit code 0.

If any frame differs, the render is not deterministic on this machine. Stop and fix that first (for example a font that loads late, or a time-based value) before relying on the gate.

- [ ] **Step 6: Commit**

The reference frames live in ignored `out/`. Commit only the code.

```bash
git add scripts/videoTheme/themeParity/themeParity.ts package.json
git commit -m "feat(video-producer): add the theme parity gate" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Font registry

**Files:**
- Create: `src/videoTheme/videoFontRegistry/videoFontRegistry.json`
- Create: `src/videoTheme/videoFontRegistry/videoFontRegistry.ts`
- Test: `src/videoTheme/videoFontRegistry/videoFontRegistry.test.ts`
- Modify: `src/fonts.ts`
- Modify: `scripts/buildAtlas/refreshPalette.mjs`
- Test: `scripts/buildAtlas/refreshPalette.test.ts`
- Modify: `tests/motion-watch.test.ts`

- [ ] **Step 1: Write the registry data**

`src/videoTheme/videoFontRegistry/videoFontRegistry.json`:

```json
{
  "figtree": {
    "label": "Figtree",
    "source": "bundled",
    "file": "fonts/figtree-latin.woff2",
    "face": "Figtree",
    "weight": "300 900",
    "stack": "Figtree, ui-sans-serif, system-ui, sans-serif",
    "measured": false
  },
  "arial": {
    "label": "Arial",
    "source": "system",
    "stack": "Arial, sans-serif",
    "measured": true
  },
  "courier": {
    "label": "Courier New",
    "source": "system",
    "stack": "'Courier New', monospace",
    "measured": true
  },
  "systemMono": {
    "label": "System monospace",
    "source": "system",
    "stack": "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
    "measured": false
  }
}
```

- [ ] **Step 2: Write the failing tests**

`src/videoTheme/videoFontRegistry/videoFontRegistry.test.ts`:

```ts
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getVideoFontIdFromStack,
  listBundledVideoFonts,
} from "./videoFontRegistry";

const PUBLIC_DIRECTORY = fileURLToPath(new URL("../../../public", import.meta.url));

test("every bundled font file exists in public/fonts", async () => {
  await Promise.all(
    listBundledVideoFonts().map((font) =>
      fs.access(path.join(PUBLIC_DIRECTORY, font.file)),
    ),
  );
});

test("every font file in public/fonts is registered", async () => {
  const files = (await fs.readdir(path.join(PUBLIC_DIRECTORY, "fonts")))
    .filter((name) => name.endsWith(".woff2"))
    .map((name) => `fonts/${name}`);
  assert.deepEqual(
    files.sort(),
    listBundledVideoFonts()
      .map((font) => font.file)
      .sort(),
  );
});

test("a registered stack maps back to its font id", () => {
  assert.equal(getVideoFontIdFromStack("'Courier New', monospace"), "courier");
});

test("an unregistered stack has no font id", () => {
  assert.equal(getVideoFontIdFromStack("Comic Sans MS, cursive"), undefined);
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoFontRegistry/videoFontRegistry.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Implement the accessors**

`src/videoTheme/videoFontRegistry/videoFontRegistry.ts`:

```ts
import registry from "./videoFontRegistry.json";

/** A registered font id, such as `figtree` or `courier`. */
export type VideoFontId = keyof typeof registry;

/** A face shipped as a woff2 in `public/fonts` and loaded before rendering. */
export type BundledVideoFont = Readonly<{
  label: string;
  source: "bundled";
  file: string;
  face: string;
  weight: string;
  stack: string;
  measured: boolean;
}>;

/** A face expected on the rendering machine, such as Arial. */
export type SystemVideoFont = Readonly<{
  label: string;
  source: "system";
  stack: string;
  measured: boolean;
}>;

/** One family a video theme may name. */
export type VideoFont = BundledVideoFont | SystemVideoFont;

/**
 * Every font family a video theme can name. Themes pick fonts from here,
 * never as free text, so a render can always load what a theme asks for.
 * Graphic text accepts only `measured` faces, whose glyph widths the stock
 * text-fit checks know. For example, the resolver rejects Figtree for a
 * graphic label, and the editor lists only these families.
 */
export const VIDEO_FONT_REGISTRY = registry as Readonly<
  Record<VideoFontId, VideoFont>
>;

/** Registered font ids in registry order, for schemas and pickers. */
export const VIDEO_FONT_IDS = Object.keys(registry) as readonly VideoFontId[];

/** CSS stacks of every registered font, for Mantine's font keys. */
export const VIDEO_FONT_STACKS: readonly string[] = VIDEO_FONT_IDS.map(
  (id) => VIDEO_FONT_REGISTRY[id].stack,
);

/**
 * The registered font whose CSS stack this is, or undefined. Use it to map a
 * Mantine `fontFamily` value back to a registry entry.
 */
export function getVideoFontIdFromStack(
  stack: string,
): VideoFontId | undefined {
  return VIDEO_FONT_IDS.find((id) => VIDEO_FONT_REGISTRY[id].stack === stack);
}

/**
 * Bundled faces with their ids, for loading them before a render and for
 * writing `@font-face` rules.
 */
export function listBundledVideoFonts(): readonly (BundledVideoFont & {
  id: VideoFontId;
})[] {
  return VIDEO_FONT_IDS.flatMap((id) => {
    const font = VIDEO_FONT_REGISTRY[id];
    return font.source === "bundled" ? [{ ...font, id }] : [];
  });
}
```

- [ ] **Step 5: Run the registry tests to verify they pass**

Run the Step 3 command. Expected: 4 passing.

- [ ] **Step 6: Load fonts from the registry**

Replace `src/fonts.ts` with:

```ts
import {
  cancelRender,
  continueRender,
  delayRender,
  staticFile,
} from "remotion";
import {
  listBundledVideoFonts,
  VIDEO_FONT_REGISTRY,
} from "./videoTheme/videoFontRegistry/videoFontRegistry";

// Register every bundled face once per document and hold rendering until each
// one is ready, so previews and exports never depend on a font CDN.
if (typeof document !== "undefined") {
  for (const font of listBundledVideoFonts()) {
    const handle = delayRender(`Load local ${font.label} font`);
    const face = new FontFace(font.face, `url(${staticFile(font.file)})`, {
      weight: font.weight,
      style: "normal",
    });
    void face
      .load()
      .then((loaded) => {
        document.fonts.add(loaded);
        continueRender(handle);
      })
      .catch(cancelRender);
  }
}

/** Avandar's brand typeface name, for code that names the face directly. */
export const FACE = "Figtree";

/** Shared composition typography. Product scenes retain their own source font. */
export const TYPE = VIDEO_FONT_REGISTRY.figtree.stack;

/** Monospace stack for commands, code and terminal text drawn by scenes. */
export const MONO = VIDEO_FONT_REGISTRY.systemMono.stack;
```

- [ ] **Step 7: Write the failing `@font-face` test**

`scripts/buildAtlas/refreshPalette.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { buildBundledFontFaceCss } from "./refreshPalette.mjs";

test("the showcase theme CSS declares Figtree from the font registry", async () => {
  assert.equal(
    await buildBundledFontFaceCss(),
    `@font-face {
  font-display: swap;
  font-family: Figtree;
  font-style: normal;
  font-weight: 300 900;
  src: url("/fonts/figtree-latin.woff2") format("woff2");
}
`,
  );
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/buildAtlas/refreshPalette.test.ts`
Expected: FAIL, `buildBundledFontFaceCss` is not exported.

- [ ] **Step 8: Build `@font-face` rules from the registry**

In `scripts/buildAtlas/refreshPalette.mjs`, delete the `BRAND_FONT_FACE` constant and its comment, and add:

```js
const FONT_REGISTRY_FILE = new URL(
  "../../src/videoTheme/videoFontRegistry/videoFontRegistry.json",
  import.meta.url,
);

/**
 * `@font-face` rules for every bundled video font, served by the showcase
 * from `public/fonts`, so every page that loads the theme CSS also gets the
 * fonts a video theme may name.
 */
export async function buildBundledFontFaceCss() {
  const registry = JSON.parse(await readFile(FONT_REGISTRY_FILE, "utf8"));
  return Object.values(registry)
    .filter((font) => font.source === "bundled")
    .map(
      (font) => `@font-face {
  font-display: swap;
  font-family: ${font.face};
  font-style: normal;
  font-weight: ${font.weight};
  src: url("/${font.file}") format("woff2");
}
`,
    )
    .join("\n");
}
```

Then, inside `refreshPalette`, replace `${BRAND_FONT_FACE}` in the `writeFile` template with `${await buildBundledFontFaceCss()}`.

- [ ] **Step 9: Run the `@font-face` test to verify it passes**

Run the Step 7 command. Expected: 1 passing.

- [ ] **Step 10: Keep the watch fixture complete**

In `tests/motion-watch.test.ts`, in `_createWatchFixture`'s `files` list, add `"src/videoTheme",` after `"src/fonts.ts",`. The copied `src/fonts.ts` and `scripts/buildAtlas/refreshPalette.mjs` now read the registry.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test tests/motion-watch.test.ts`
Expected: passes, as it did before this task.

- [ ] **Step 11: Typecheck and commit**

Run both typecheck commands. Expected: no errors.

```bash
git add src/videoTheme/videoFontRegistry src/fonts.ts scripts/buildAtlas/refreshPalette.mjs scripts/buildAtlas/refreshPalette.test.ts tests/motion-watch.test.ts
git commit -m "feat(video-producer): register video fonts in one place" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Token catalog

**Files:**
- Create: `src/videoTheme/videoTheme.types.ts`
- Create: `src/videoTheme/tokenCatalog/defineTokens.ts`
- Create: `src/videoTheme/tokenCatalog/mantineTokens.ts`
- Create: `src/videoTheme/tokenCatalog/atomicTokens.ts`
- Create: `src/videoTheme/tokenCatalog/semanticTokens.ts`
- Create: `src/videoTheme/tokenCatalog/componentTokens.ts`
- Create: `src/videoTheme/tokenCatalog/tokenCatalog.ts`
- Test: `src/videoTheme/tokenCatalog/tokenCatalog.test.ts`

- [ ] **Step 1: Write the shared types**

`src/videoTheme/videoTheme.types.ts`:

```ts
/*
 * Types shared by the video theme model: authored values, token metadata,
 * theme documents, and the resolved values renderers read.
 */
import type { MantineTheme } from "@mantine/core";
import type { ATOMIC_TOKENS } from "./tokenCatalog/atomicTokens";
import type { COMPONENT_TOKENS } from "./tokenCatalog/componentTokens";
import type { SEMANTIC_TOKENS } from "./tokenCatalog/semanticTokens";
import type { VideoFontId } from "./videoFontRegistry/videoFontRegistry";

/** A `$path` reference from one token to another, such as `$atomic.strokeWidth.sm`. */
export type TokenReference = `$${string}`;

/** Where a theme problem is, by token path, and what it is. */
export type VideoThemeIssue = Readonly<{ path: string; message: string }>;

/** Cubic Bezier control points `[x1, y1, x2, y2]`, or a symmetric power curve. */
export type EasingValue =
  | readonly [number, number, number, number]
  | Readonly<{ powerInOut: number }>;
export type SpringValue = Readonly<{
  damping: number;
  stiffness: number;
  mass: number;
}>;
export type ShadowLayer = Readonly<{
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  alpha: number;
}>;
export type ShadowValue = Readonly<{ layers: readonly ShadowLayer[] }>;
export type GlowValue = Readonly<{
  spread: number;
  blur: number;
  opacity: number;
}>;
export type TextShadowValue = Readonly<{
  offsetX: number;
  offsetY: number;
  blur: number;
  alpha: number;
}>;
export type GradientValue = Readonly<{ from: string; to: string; deg: number }>;
export type ShadeValue = number | Readonly<{ light: number; dark: number }>;

export type ResolvedFill =
  | Readonly<{ type: "solid"; color: string }>
  | Readonly<{ type: "gradient"; from: string; to: string; deg: number }>;
export type ResolvedTextShadow = TextShadowValue & Readonly<{ color: string }>;
export type ResolvedGlow = GlowValue & Readonly<{ color: string }>;

/** A text role ready to draw, with its font resolved to a registered stack. */
export type ResolvedTypeStyle = Readonly<{
  fontId: VideoFontId;
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  lineHeight?: number;
  /** In em. */
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase" | "capitalize";
  fontVariantNumeric?: "normal" | "tabular-nums";
  color: string;
  alpha: number;
  textShadow?: ResolvedTextShadow;
  glow?: ResolvedGlow;
  strokeWidth?: number;
}>;
export type ResolvedPaint = Readonly<{ color: string; alpha: number }>;
export type ResolvedElevation = Readonly<{
  layers: readonly ShadowLayer[];
  color: string;
}>;
export type ResolvedSketchProfile = Readonly<{
  roughness: number;
  bowing: number;
  seed: number;
  randomness: number;
}>;
export type ResolvedBox = Readonly<
  Partial<Record<"top" | "right" | "bottom" | "left" | "x" | "y" | "gap", number>>
>;
export type ResolvedMotionStep = Readonly<{
  duration?: number;
  easing?: EasingValue;
  distance?: number;
  spring?: SpringValue;
  period?: number;
  rate?: number;
}>;
export type ResolvedCameraPreset = Readonly<{
  speed: number;
  shutter: number;
  easing: EasingValue;
}>;
export type ResolvedRange = Readonly<{ min: number; max: number }>;

/** The resolved value of each token kind. */
export type TokenKindValues = {
  color: string;
  colorTuple: readonly string[];
  paletteName: string;
  shade: ShadeValue;
  gradient: GradientValue;
  fontStack: string;
  cssLength: string;
  cssNumber: string;
  length: number;
  number: number;
  opacity: number;
  duration: number;
  letterSpacing: number;
  fontWeight: number;
  easing: EasingValue;
  spring: SpringValue;
  shadow: ShadowValue;
  glow: GlowValue;
  textShadow: TextShadowValue;
  dash: readonly number[];
  fontFamily: VideoFontId;
  enum: string;
  boolean: boolean;
  fill: ResolvedFill;
  typeStyle: ResolvedTypeStyle;
  paint: ResolvedPaint;
  elevation: ResolvedElevation;
  sketchProfile: ResolvedSketchProfile;
  box: ResolvedBox;
  motionStep: ResolvedMotionStep;
  cameraPreset: ResolvedCameraPreset;
  range: ResolvedRange;
};
export type TokenKind = keyof TokenKindValues;
export type TokenUnit = "px" | "em" | "%" | "frames" | "deg" | "cps" | "×";
/** The pixel space a length or text role is measured in. */
export type TokenSurface = "graphic" | "stage";

/** Metadata for one token: what it is, how to edit it, and its bounds. */
export type TokenDefinition = Readonly<{
  kind: TokenKind;
  label: string;
  description: string;
  unit?: TokenUnit;
  min?: number;
  max?: number;
  step?: number;
  options?: readonly string[];
  surface?: TokenSurface;
}>;
export type TokenScale = Readonly<{ scale: TokenDefinition }>;
export type CatalogGroup = Readonly<{ [key: string]: CatalogNode }>;
export type CatalogNode = TokenDefinition | TokenScale | CatalogGroup;

/** The resolved shape of a catalog subtree. */
export type ResolvedTokenNode<Node> = Node extends {
  readonly kind: infer Kind extends TokenKind;
}
  ? Node extends { readonly options: readonly (infer Option)[] }
    ? Option
    : TokenKindValues[Kind]
  : Node extends { readonly scale: infer Definition }
    ? Readonly<Record<string, ResolvedTokenNode<Definition>>>
    : { readonly [Key in keyof Node]: ResolvedTokenNode<Node[Key]> };

export type ResolvedVideoAtomic = ResolvedTokenNode<typeof ATOMIC_TOKENS>;
export type ResolvedVideoSemantic = ResolvedTokenNode<typeof SEMANTIC_TOKENS>;
export type ResolvedVideoComponents = ResolvedTokenNode<typeof COMPONENT_TOKENS>;
export type VideoComponentName = keyof ResolvedVideoComponents;

/** A sparse theme fragment: Mantine keys, `other.video`, and `components`. */
export type VideoThemePatch = Readonly<Record<string, unknown>>;

/** One `themes/<id>.theme.json` file. */
export type VideoThemeDocument = VideoThemePatch &
  Readonly<{
    schemaVersion: 1;
    id: string;
    label: string;
    extends?: string;
    overrides?: Readonly<Record<string, VideoThemePatch>>;
  }>;
export type VideoThemeLibrary = ReadonlyMap<string, VideoThemeDocument>;

/** Which per-item overrides and extra patches apply, lowest precedence first. */
export type VideoThemeScope = Readonly<{
  overrideIds?: readonly string[];
  patches?: readonly VideoThemePatch[];
}>;

/** Everything needed to resolve a theme for one item. */
export type VideoThemeSource = Readonly<{
  library: VideoThemeLibrary;
  themeId: string;
  scope?: VideoThemeScope;
}>;

/** A theme with every reference resolved, ready for renderers and Mantine. */
export type ResolvedVideoTheme = Readonly<{
  id: string;
  label: string;
  /** Stable under authoring key order; changes when any resolved value does. */
  hash: string;
  isDarkGround: boolean;
  atomic: ResolvedVideoAtomic;
  semantic: ResolvedVideoSemantic;
  components: ResolvedVideoComponents;
  mantine: MantineTheme;
}>;
```

- [ ] **Step 2: Write the catalog helpers**

`src/videoTheme/tokenCatalog/defineTokens.ts`:

```ts
import type {
  CatalogNode,
  TokenDefinition,
  TokenKind,
  TokenScale,
} from "../videoTheme.types";

/**
 * Declares one token's metadata and keeps its literal kind and options in
 * the type, so resolved values are typed. Use it for every catalog leaf.
 */
export function token<const Definition extends TokenDefinition>(
  definition: Definition,
): Definition {
  return definition;
}

/**
 * Declares an open set of same-kind atomic values, such as swatches or a
 * duration scale. A theme may add keys to a scale.
 */
export function scale<const Definition extends TokenDefinition>(
  definition: Definition,
): Readonly<{ scale: Definition }> {
  return { scale: definition };
}

/** Whether a catalog node is one token. */
export function isTokenDefinition(node: CatalogNode): node is TokenDefinition {
  return "kind" in node && typeof node.kind === "string";
}

/** Whether a catalog node is a scale of same-kind tokens. */
export function isTokenScale(node: CatalogNode): node is TokenScale {
  return (
    "scale" in node &&
    typeof node.scale === "object" &&
    node.scale !== null &&
    "kind" in node.scale
  );
}

/** One field of a composite token. */
export type FieldSpec = Readonly<{
  kind: TokenKind;
  options?: readonly string[];
}>;

export const TEXT_TRANSFORMS = [
  "none",
  "uppercase",
  "lowercase",
  "capitalize",
] as const;
export const NUMERIC_VARIANTS = ["normal", "tabular-nums"] as const;

/**
 * Fields of composite token kinds. In the semantic tier each field is a
 * reference (enum fields stay literal); in the component tier a field may
 * also be a literal. The resolver, schema, and editor all read this.
 */
export const COMPOSITE_TOKEN_FIELDS = {
  typeStyle: {
    required: ["family", "size", "weight", "color"],
    fields: {
      family: { kind: "fontFamily" },
      size: { kind: "length" },
      weight: { kind: "fontWeight" },
      lineHeight: { kind: "number" },
      letterSpacing: { kind: "letterSpacing" },
      transform: { kind: "enum", options: TEXT_TRANSFORMS },
      numeric: { kind: "enum", options: NUMERIC_VARIANTS },
      color: { kind: "color" },
      alpha: { kind: "opacity" },
      textShadow: { kind: "textShadow" },
      glow: { kind: "glow" },
      stroke: { kind: "length" },
    },
  },
  paint: {
    required: ["color", "alpha"],
    fields: { color: { kind: "color" }, alpha: { kind: "opacity" } },
  },
  elevation: {
    required: ["shadow", "color"],
    fields: { shadow: { kind: "shadow" }, color: { kind: "color" } },
  },
  sketchProfile: {
    required: ["roughness", "bowing", "seed", "randomness"],
    fields: {
      roughness: { kind: "number" },
      bowing: { kind: "number" },
      seed: { kind: "number" },
      randomness: { kind: "length" },
    },
  },
  box: {
    required: [],
    fields: {
      top: { kind: "length" },
      right: { kind: "length" },
      bottom: { kind: "length" },
      left: { kind: "length" },
      x: { kind: "length" },
      y: { kind: "length" },
      gap: { kind: "length" },
    },
  },
  motionStep: {
    required: [],
    fields: {
      duration: { kind: "duration" },
      easing: { kind: "easing" },
      distance: { kind: "length" },
      spring: { kind: "spring" },
      period: { kind: "duration" },
      rate: { kind: "number" },
    },
  },
  cameraPreset: {
    required: ["speed", "shutter", "easing"],
    fields: {
      speed: { kind: "number" },
      shutter: { kind: "number" },
      easing: { kind: "easing" },
    },
  },
  range: {
    required: ["min", "max"],
    fields: { min: { kind: "number" }, max: { kind: "number" } },
  },
} as const satisfies Record<
  string,
  Readonly<{
    required: readonly string[];
    fields: Readonly<Record<string, FieldSpec>>;
  }>
>;

export type CompositeTokenKind = keyof typeof COMPOSITE_TOKEN_FIELDS;

/** Whether a token kind bundles several referenced fields. */
export function isCompositeTokenKind(
  kind: TokenKind,
): kind is CompositeTokenKind {
  return Object.hasOwn(COMPOSITE_TOKEN_FIELDS, kind);
}

/**
 * The editor control for each token kind (spec §3.3). Exported in the JSON
 * Schema as `control`, so a theme generator knows how a value is edited.
 */
export const TOKEN_CONTROLS = {
  color: "color",
  colorTuple: "palette",
  paletteName: "segmented",
  shade: "shade",
  gradient: "gradient",
  fontStack: "font",
  cssLength: "slider",
  cssNumber: "slider",
  length: "slider",
  number: "slider",
  opacity: "slider",
  duration: "duration",
  letterSpacing: "slider",
  fontWeight: "slider",
  easing: "easing",
  spring: "spring",
  shadow: "layers",
  glow: "layers",
  textShadow: "layers",
  dash: "dash",
  fontFamily: "font",
  enum: "segmented",
  boolean: "switch",
  fill: "fill",
  typeStyle: "typeStyle",
  paint: "paint",
  elevation: "elevation",
  sketchProfile: "sketch",
  box: "box",
  motionStep: "motionStep",
  cameraPreset: "cameraPreset",
  range: "range",
} as const satisfies Record<TokenKind, string>;
export type TokenControlKind = (typeof TOKEN_CONTROLS)[TokenKind];
```

- [ ] **Step 3: Write the Mantine-native keys**

`src/videoTheme/tokenCatalog/mantineTokens.ts`:

```ts
import { scale, token } from "./defineTokens";

const PALETTE_NAMES = [
  "primary",
  "neutral",
  "secondary",
  "success",
  "warning",
  "danger",
  "info",
] as const;

function _palette(label: string, description: string) {
  return token({ kind: "colorTuple", label, description });
}

function _headingLevel(role: string) {
  return {
    fontSize: token({
      kind: "cssLength",
      unit: "px",
      min: 8,
      max: 200,
      step: 1,
      label: `${role} size`,
      description: `Font size of the ${role.toLowerCase()} heading level on the stage.`,
    }),
    fontWeight: token({
      kind: "cssNumber",
      min: 100,
      max: 900,
      step: 100,
      label: `${role} weight`,
      description: `Weight of the ${role.toLowerCase()} heading level on the stage.`,
    }),
    lineHeight: token({
      kind: "cssNumber",
      min: 0.8,
      max: 2,
      step: 0.01,
      label: `${role} line height`,
      description: `Line height of the ${role.toLowerCase()} heading level on the stage.`,
    }),
  };
}

/**
 * Mantine-native theme keys a video theme sets, at the top level of a theme
 * file exactly where Mantine expects them. They are atomic: semantic tokens
 * reference them, for example `$colors.primary.4` or `$fontSizes.md`.
 */
export const MANTINE_TOKENS = {
  colors: {
    primary: _palette(
      "Primary palette",
      "Ten shades of the brand colour, lightest first. The accent reads one of them through the primary shade.",
    ),
    neutral: _palette(
      "Neutral palette",
      "Ten shades of the cool grey that carries muted text on light grounds.",
    ),
    secondary: _palette("Secondary palette", "Ten shades of the warm companion colour."),
    success: _palette("Success palette", "Ten shades of green for positive outcomes."),
    warning: _palette("Warning palette", "Ten shades of yellow for caution."),
    danger: _palette("Danger palette", "Ten shades of red for errors and losses."),
    info: _palette("Info palette", "Ten shades of cyan for neutral information."),
  },
  white: token({
    kind: "color",
    label: "White",
    description: "The white Mantine mixes into derived colours.",
  }),
  black: token({
    kind: "color",
    label: "Black",
    description: "The black Mantine mixes into derived colours.",
  }),
  primaryColor: token({
    kind: "paletteName",
    options: PALETTE_NAMES,
    label: "Primary palette name",
    description: "Which palette is primary. The accent comes from this palette.",
  }),
  primaryShade: token({
    kind: "shade",
    min: 0,
    max: 9,
    step: 1,
    label: "Primary shade",
    description:
      "The primary palette shade used as the accent: one shade on dark grounds and one on light grounds.",
  }),
  defaultGradient: token({
    kind: "gradient",
    label: "Ground gradient",
    description: "The gradient a ground fill uses when it is not a solid colour.",
  }),
  fontFamily: token({
    kind: "fontStack",
    label: "Body font stack",
    description: "Mantine's body font. It must be the stack of a registered font.",
  }),
  fontFamilyMonospace: token({
    kind: "fontStack",
    label: "Monospace font stack",
    description: "Mantine's monospace font. It must be the stack of a registered font.",
  }),
  headings: {
    fontFamily: token({
      kind: "fontStack",
      label: "Heading font stack",
      description: "Mantine's heading font. It must be the stack of a registered font.",
    }),
    fontWeight: token({
      kind: "cssNumber",
      min: 100,
      max: 900,
      step: 100,
      label: "Heading weight",
      description: "Default weight of Mantine heading levels.",
    }),
    sizes: { h1: _headingLevel("Thesis"), h2: _headingLevel("Heading") },
  },
  fontSizes: scale({
    kind: "cssLength",
    unit: "px",
    min: 8,
    max: 160,
    step: 1,
    label: "Font size",
    description: "A step of the type scale, in pixels of the surface that draws the text.",
  }),
  lineHeights: scale({
    kind: "cssNumber",
    min: 0.8,
    max: 2.4,
    step: 0.01,
    label: "Line height",
    description: "A line height step, as a multiple of the font size.",
  }),
  radius: scale({
    kind: "cssLength",
    unit: "px",
    min: 0,
    max: 9999,
    step: 1,
    label: "Radius",
    description: "A corner radius step, in pixels. The full step rounds a shape into a pill.",
  }),
  spacing: scale({
    kind: "cssLength",
    unit: "px",
    min: 0,
    max: 600,
    step: 1,
    label: "Spacing",
    description: "A spacing step used by layout insets and gaps, in pixels of the surface.",
  }),
  autoContrast: token({
    kind: "boolean",
    label: "Mantine auto contrast",
    description: "Whether Mantine picks readable text on its own filled components.",
  }),
  luminanceThreshold: token({
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Dark ground threshold",
    description:
      "Grounds whose luminance is below this count as dark, so colour pairs use their on-dark value.",
  }),
  fontSmoothing: token({
    kind: "boolean",
    label: "Font smoothing",
    description: "Whether Mantine applies antialiased font smoothing.",
  }),
} as const;
```

- [ ] **Step 4: Write the atomic scales**

`src/videoTheme/tokenCatalog/atomicTokens.ts`:

```ts
import { scale } from "./defineTokens";

/**
 * Atomic scales under `other.video.atomic`: the only literal values in a
 * theme besides Mantine's own keys. Semantic and component tokens reference
 * them, for example `$atomic.strokeWidth.sm`.
 */
export const ATOMIC_TOKENS = {
  swatch: scale({
    kind: "color",
    label: "Swatch",
    description:
      "A named colour. Semantic colours point at swatches, and a colour picked in the editor becomes a new swatch.",
  }),
  fontFamily: scale({
    kind: "fontFamily",
    label: "Font face",
    description: "A registered font face. Graphic text accepts only faces with measured glyph widths.",
  }),
  fontWeight: scale({
    kind: "fontWeight",
    min: 100,
    max: 900,
    step: 100,
    label: "Font weight",
    description: "A font weight step.",
  }),
  letterSpacing: scale({
    kind: "letterSpacing",
    unit: "em",
    min: -0.1,
    max: 0.4,
    step: 0.005,
    label: "Letter spacing",
    description: "Tracking as a fraction of the font size.",
  }),
  size: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 400,
    step: 0.5,
    label: "Shape size",
    description:
      "A dimension of a drawn shape such as a dot, node, or glyph, in pixels of the surface that draws it.",
  }),
  strokeWidth: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 12,
    step: 0.1,
    label: "Stroke width",
    description: "A line thickness step.",
  }),
  opacity: scale({
    kind: "opacity",
    unit: "%",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Opacity",
    description: "An opacity step, keyed by its percentage.",
  }),
  shadow: scale({
    kind: "shadow",
    label: "Shadow",
    description: "Shadow geometry as stacked layers. Its colour comes from the elevation that uses it.",
  }),
  glow: scale({
    kind: "glow",
    label: "Glow",
    description: "A soft halo: how far it spreads past its shape, how blurred it is, and how opaque.",
  }),
  textShadow: scale({
    kind: "textShadow",
    label: "Text shadow",
    description: "Text shadow geometry. Its colour comes from the text style that uses it.",
  }),
  blur: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 48,
    step: 0.5,
    label: "Blur",
    description: "A blur radius step.",
  }),
  roughness: scale({
    kind: "number",
    min: 0,
    max: 3,
    step: 0.1,
    label: "Roughness",
    description: "How far a hand-drawn line wanders from its true path. Zero draws a clean line.",
  }),
  bowing: scale({
    kind: "number",
    min: 0,
    max: 10,
    step: 0.1,
    label: "Bowing",
    description: "How much a hand-drawn line bends between its ends.",
  }),
  seed: scale({
    kind: "number",
    min: 0,
    max: 9999,
    step: 1,
    label: "Sketch seed",
    description: "Fixes the random wobble of hand-drawn lines so every frame draws the same shape.",
  }),
  randomness: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 10,
    step: 0.1,
    label: "Sketch offset",
    description: "The largest random offset the points of a hand-drawn line may take.",
  }),
  dash: scale({
    kind: "dash",
    label: "Dash pattern",
    description: "Alternating dash and gap lengths. An empty pattern draws a solid line.",
  }),
  curveTension: scale({
    kind: "number",
    min: 0,
    max: 1,
    step: 0.01,
    label: "Curve tension",
    description: "Where a curved connector places its control points along the line between its ends.",
  }),
  duration: scale({
    kind: "duration",
    unit: "frames",
    min: 0,
    max: 120,
    step: 1,
    label: "Duration",
    description: "An animation length in frames at 30 fps.",
  }),
  easing: scale({
    kind: "easing",
    label: "Easing curve",
    description: "How an animation accelerates: cubic Bezier control points, or a symmetric power curve.",
  }),
  spring: scale({
    kind: "spring",
    label: "Spring",
    description: "Physical spring settings for a landing that should feel weighty.",
  }),
  stagger: scale({
    kind: "number",
    unit: "frames",
    min: 0,
    max: 30,
    step: 0.5,
    label: "Stagger",
    description: "Frames between siblings that start one after another.",
  }),
  period: scale({
    kind: "duration",
    unit: "frames",
    min: 1,
    max: 600,
    step: 1,
    label: "Period",
    description: "Frames for one cycle of a repeating motion.",
  }),
  distance: scale({
    kind: "length",
    unit: "px",
    min: 0,
    max: 200,
    step: 1,
    label: "Distance",
    description: "How far an element travels during an entrance, an exit, or a drift.",
  }),
  typingRate: scale({
    kind: "number",
    unit: "cps",
    min: 1,
    max: 120,
    step: 1,
    label: "Typing rate",
    description: "Characters typed per second.",
  }),
  tempo: scale({
    kind: "number",
    unit: "×",
    min: 0.75,
    max: 1.5,
    step: 0.05,
    label: "Tempo",
    description: "A tempo step. Tempo divides animation durations inside a beat.",
  }),
  cameraSpeed: scale({
    kind: "number",
    unit: "×",
    min: 0.1,
    max: 4,
    step: 0.05,
    label: "Camera speed",
    description: "How fast a camera preset travels relative to its authored timing.",
  }),
  shutter: scale({
    kind: "number",
    unit: "deg",
    min: 0,
    max: 360,
    step: 5,
    label: "Shutter angle",
    description: "A motion blur shutter angle. 180 degrees matches film.",
  }),
  samples: scale({
    kind: "number",
    min: 2,
    max: 16,
    step: 1,
    label: "Blur samples",
    description: "A count of sub-frames blended for camera motion blur.",
  }),
  zoom: scale({
    kind: "number",
    unit: "×",
    min: 1,
    max: 3,
    step: 0.05,
    label: "Zoom",
    description: "A camera zoom limit.",
  }),
  velocityBlur: scale({
    kind: "number",
    min: 0,
    max: 5,
    step: 0.01,
    label: "Velocity blur",
    description: "Screen-space blur settings for fast single-object moves.",
  }),
} as const;
```

- [ ] **Step 5: Write the semantic roles**

`src/videoTheme/tokenCatalog/semanticTokens.ts`:

```ts
import { token } from "./defineTokens";

const CAMERA_PRESET_OPTIONS = [
  "authored",
  "deliberate",
  "gentle",
  "balanced",
  "brisk",
  "whip",
] as const;

function _color(label: string, description: string) {
  return token({ kind: "color", label, description });
}

function _graphicType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "graphic", label, description });
}

function _stageType(label: string, description: string) {
  return token({ kind: "typeStyle", surface: "stage", label, description });
}

function _stroke(label: string, description: string) {
  return token({ kind: "length", unit: "px", min: 0, max: 12, step: 0.1, label, description });
}

function _corner(label: string, description: string) {
  return token({ kind: "length", unit: "px", min: 0, max: 9999, step: 1, label, description });
}

function _sketch(label: string, description: string) {
  return token({ kind: "sketchProfile", label, description });
}

function _duration(label: string, description: string) {
  return token({ kind: "duration", unit: "frames", min: 0, max: 120, step: 1, label, description });
}

function _motionStep(label: string, description: string) {
  return token({ kind: "motionStep", label, description });
}

function _stagger(label: string, description: string) {
  return token({ kind: "number", unit: "frames", min: 0, max: 30, step: 0.5, label, description });
}

function _cameraPreset(name: string) {
  return token({
    kind: "cameraPreset",
    label: `${name} camera`,
    description: `Speed, shutter, and curve of the ${name.toLowerCase()} camera preset.`,
  });
}

function _easing(label: string, description: string) {
  return token({ kind: "easing", label, description });
}

/**
 * Semantic roles under `other.video.semantic`. A theme author sets these by
 * meaning ("the accent", "the caption style"); each one is a reference to
 * atomic or Mantine tokens, never a literal. Renderers read them through
 * `useVideoTokens` and CSS modules through `--video-*` variables.
 */
export const SEMANTIC_TOKENS = {
  color: {
    ground: _color(
      "Ground",
      "The stage colour behind everything. Its luminance decides whether colour pairs use their on-dark or on-light value.",
    ),
    groundFill: token({
      kind: "fill",
      label: "Ground fill",
      description: "How the ground is painted: the ground colour, or the theme's ground gradient.",
    }),
    surface: _color("Surface", "Fill of panels, nodes, and cards that sit on the ground."),
    elevated: _color(
      "Elevated surface",
      "Fill of a surface stacked on another surface, such as a card inside a panel.",
    ),
    line: _color("Line", "Edges, outlines, guides, and dividers."),
    text: _color("Text", "Primary text and labels."),
    textMuted: _color("Muted text", "Secondary text: eyebrows, captions, and details."),
    accent: _color("Accent", "The path, packet, or object a motion is about."),
    accentAlt: _color("Second accent", "A companion colour that alternates with the accent."),
    highlight: _color("Highlight", "A warm colour for one point of attention."),
    scrim: _color("Scrim", "The dimming layer around a spotlight."),
    productBackdrop: _color(
      "Product backdrop",
      "The backdrop around a reenactment. The product UI itself keeps the product theme.",
    ),
    shadowColor: _color("Shadow colour", "The colour of drop shadows."),
  },
  text: {
    graphic: {
      eyebrow: _graphicType("Eyebrow", "The small tracked label in the top-left corner of a graphic."),
      heading: _graphicType("Graphic heading", "A heading drawn inside a graphic."),
      body: _graphicType("Graphic body", "Default text drawn inside a graphic."),
      label: _graphicType("Label", "Names under nodes and other shapes."),
      detail: _graphicType("Detail", "Small monospace values and annotations under a label."),
      caption: _graphicType("Caption", "The one-line caption along the bottom of a graphic."),
      pill: _graphicType("Pill text", "Text inside a pill-shaped tag."),
    },
    stage: {
      heading: _stageType("Stage heading", "The heading of a composition beat."),
      subtitle: _stageType("Stage subtitle", "The line under a beat heading."),
      evidence: _stageType("Evidence", "Short evidence chips along the bottom of the stage."),
      sharedObject: _stageType(
        "Shared object text",
        "The text on an object that travels from one motion to the next.",
      ),
      thesis: _stageType("Thesis", "Large statement lines that carry the argument of a composition."),
      thesisEmphasis: _stageType("Thesis emphasis", "The supporting line under a thesis."),
      floatingLabel: _stageType("Floating label", "A label anchored to a point on the stage."),
    },
  },
  stroke: {
    guide: _stroke("Guide stroke", "Orbits, guides, and other construction lines."),
    outline: _stroke("Outline stroke", "Outlines of panels, nodes, and cards."),
    default: _stroke("Default stroke", "Edges, connectors, and drawn paths."),
    annotation: _stroke("Annotation stroke", "Hand-drawn underlines and annotations."),
    route: _stroke("Route stroke", "A highlighted route through a diagram."),
  },
  corner: {
    panel: _corner("Panel corner", "Corner radius of panels inside a graphic."),
    pill: _corner("Pill corner", "Corner radius of pill-shaped tags."),
    card: _corner("Card corner", "Corner radius of summary cards inside a graphic."),
    chip: _corner("Chip corner", "Corner radius of evidence chips on the stage."),
    sharedObject: _corner("Shared object corner", "Corner radius of an object that travels between motions."),
    spotlight: _corner("Spotlight corner", "Corner radius of a spotlight cut-out."),
    label: _corner("Label corner", "Corner radius of a floating label."),
  },
  elevation: {
    flat: token({
      kind: "elevation",
      label: "Flat",
      description: "Surfaces that sit on the ground with no shadow.",
    }),
    floating: token({
      kind: "elevation",
      label: "Floating",
      description: "Surfaces that hover over the stage, such as floating labels and lifted diagrams.",
    }),
  },
  effect: {
    halo: token({
      kind: "glow",
      label: "Halo",
      description: "The soft glow around packets and highlighted points.",
    }),
  },
  sketch: {
    profile: {
      smooth: _sketch("Smooth", "Clean geometric lines."),
      subtle: _sketch("Subtle", "Lines with a slight hand-drawn wobble."),
      sketch: _sketch("Sketch", "Lines that read as drawn by hand."),
      rough: _sketch("Rough", "Loose, expressive hand-drawn lines."),
    },
    box: _sketch("Box sketch", "The sketch profile boxes, panels, and pills use."),
    annotation: _sketch("Annotation sketch", "The sketch profile underlines, brackets, and annotations use."),
    shape: _sketch("Shape sketch", "The sketch profile nodes, edges, and guides use."),
  },
  layout: {
    graphic: {
      margin: token({
        kind: "length",
        surface: "graphic",
        unit: "px",
        min: 0,
        max: 300,
        step: 1,
        label: "Graphic margin",
        description: "Distance from the edges of a graphic to its content.",
      }),
      eyebrowOrigin: token({
        kind: "box",
        surface: "graphic",
        label: "Eyebrow position",
        description: "Where the eyebrow baseline starts: x from the left edge and y from the top.",
      }),
      captionBaseline: token({
        kind: "length",
        surface: "graphic",
        unit: "px",
        min: 0,
        max: 300,
        step: 1,
        label: "Caption baseline",
        description: "Distance from the bottom of a graphic to the baseline of its caption.",
      }),
    },
    stage: {
      headingInset: token({
        kind: "box",
        surface: "stage",
        label: "Heading inset",
        description: "Where the heading block of a beat sits: x from both sides and top from the top edge.",
      }),
      graphicInset: token({
        kind: "box",
        surface: "stage",
        label: "Graphic inset",
        description: "Where the graphic of a beat sits: x from both sides, plus top and bottom.",
      }),
      evidenceRow: token({
        kind: "box",
        surface: "stage",
        label: "Evidence row",
        description:
          "Where the evidence row sits: x from both sides, bottom from the bottom edge, and the gap between chips.",
      }),
    },
  },
  motion: {
    tempo: token({
      kind: "number",
      unit: "×",
      min: 0.75,
      max: 1.5,
      step: 0.05,
      label: "Tempo",
      description:
        "Divides every animation duration inside a beat. 1.5 is faster and 0.75 slower; timeline lengths never change.",
    }),
    press: _duration("Press", "A press answering back."),
    chip: _duration("Chip", "A chip changing state."),
    whip: _duration("Whip", "A whip-out or wipe, shorter than a panel so the boundary reads as a cut."),
    panel: _duration("Panel", "A row, card, or panel arriving."),
    sheet: _duration("Sheet", "A sheet or full column arriving."),
    word: _duration("Word", "One word rising out of its mask."),
    hero: _duration("Hero", "The hero beat of a phase. Spend it once."),
    entrance: _motionStep("Entrance", "How elements arrive: duration, curve, and rise distance."),
    exit: _motionStep("Exit", "How elements leave: duration, curve, and travel distance."),
    emphasis: _motionStep("Emphasis", "A spring landing for a value or card snapping into place."),
    drawOn: _motionStep("Draw on", "How edges and paths draw themselves in."),
    travel: _motionStep("Travel", "The curve of something already on screen moving between landmarks."),
    pulse: _motionStep("Pulse", "The cycle of a breathing node or halo."),
    drift: _motionStep("Drift", "How far particles wander in a looping field."),
    packetFlow: _motionStep("Packet flow", "The cycle of packets travelling along edges."),
    typing: _motionStep("Typing", "How fast typed text appears."),
    stagger: {
      list: _stagger("List stagger", "Frames between siblings in a list."),
      edge: _stagger("Edge stagger", "Frames between edges drawing in."),
      column: _stagger("Column stagger", "Frames between neighbouring columns of a stepped wipe."),
    },
  },
  camera: {
    preset: token({
      kind: "enum",
      options: CAMERA_PRESET_OPTIONS,
      label: "Camera preset",
      description: "Authored camera timing, or one of the motion presets.",
    }),
    presets: {
      deliberate: _cameraPreset("Deliberate"),
      gentle: _cameraPreset("Gentle"),
      balanced: _cameraPreset("Balanced"),
      brisk: _cameraPreset("Brisk"),
      whip: _cameraPreset("Whip"),
    },
    easing: {
      push: _easing("Push curve", "The curve of a camera pushing in."),
      whip: _easing("Whip curve", "The curve of a fast camera whip."),
      glide: _easing("Glide curve", "The curve of a camera gliding between framings."),
    },
    zoom: token({
      kind: "range",
      label: "Zoom limits",
      description: "The smallest and largest camera zoom.",
    }),
  },
  motionBlur: {
    shutter: token({
      kind: "number",
      unit: "deg",
      min: 0,
      max: 360,
      step: 5,
      label: "Shutter angle",
      description: "Shutter angle for camera motion blur when the camera follows its authored timing.",
    }),
    samples: token({
      kind: "number",
      min: 2,
      max: 16,
      step: 1,
      label: "Blur samples",
      description: "Sub-frames blended for camera motion blur.",
    }),
    velocityFactor: token({
      kind: "number",
      min: 0,
      max: 1,
      step: 0.01,
      label: "Velocity blur factor",
      description: "Blur pixels for each pixel of travel per frame in a single-object move.",
    }),
    velocityMax: token({
      kind: "length",
      unit: "px",
      min: 0,
      max: 20,
      step: 0.5,
      label: "Velocity blur limit",
      description: "The most blur a single-object move can get.",
    }),
    transitionBlur: token({
      kind: "length",
      unit: "px",
      min: 0,
      max: 48,
      step: 0.5,
      label: "Transition blur",
      description: "Peak blur of a spatial transition at full strength and a 180 degree shutter.",
    }),
  },
} as const;
```

- [ ] **Step 6: Write the component tier**

`src/videoTheme/tokenCatalog/componentTokens.ts`:

```ts
import { token } from "./defineTokens";

/**
 * Component tokens: `components.<Name>.defaultProps` in a theme, read by
 * themed shapes through Mantine `useProps` (via `useVideoProps`). A value is
 * a reference or a deliberate literal one-off. Plan 2 adds one entry per
 * themed shape as each renderer adopts tokens.
 */
export const COMPONENT_TOKENS = {
  ProgressBar: {
    height: token({
      kind: "length",
      surface: "stage",
      unit: "px",
      min: 1,
      max: 16,
      step: 1,
      label: "Progress bar height",
      description: "Thickness of the beat progress bar along the bottom of the stage.",
    }),
    paint: token({
      kind: "paint",
      surface: "stage",
      label: "Progress bar colour",
      description: "Colour and opacity of the beat progress bar.",
    }),
  },
} as const;
```

- [ ] **Step 7: Write the failing catalog tests**

`src/videoTheme/tokenCatalog/tokenCatalog.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { isTokenDefinition, isTokenScale, TOKEN_CONTROLS } from "./defineTokens";
import { MANTINE_TOKENS } from "./mantineTokens";
import { SEMANTIC_TOKENS } from "./semanticTokens";
import {
  getTokenDefinitionFromPath,
  listTokenDefinitions,
} from "./tokenCatalog";
import type { CatalogNode } from "../videoTheme.types";

const NUMERIC_KINDS = new Set([
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
  "cssLength",
  "cssNumber",
]);

test("every token carries a label, a description, and a control", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    assert.ok(definition.label.length > 0, path);
    assert.ok(definition.description.length >= 12, path);
    assert.ok(TOKEN_CONTROLS[definition.kind], path);
  }
});

test("numeric tokens declare a range", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    if (!NUMERIC_KINDS.has(definition.kind)) {
      continue;
    }
    assert.ok(
      definition.min !== undefined &&
        definition.max !== undefined &&
        definition.min < definition.max,
      path,
    );
  }
});

test("enum tokens list at least two options", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    if (definition.kind === "enum" || definition.kind === "paletteName") {
      assert.ok((definition.options?.length ?? 0) >= 2, path);
    }
  }
});

test("a token path finds its definition in every tier", () => {
  assert.equal(getTokenDefinitionFromPath("color.accent")?.kind, "color");
  assert.equal(getTokenDefinitionFromPath("atomic.swatch.mint")?.kind, "color");
  assert.equal(getTokenDefinitionFromPath("colors.primary")?.kind, "colorTuple");
  assert.equal(getTokenDefinitionFromPath("headings.sizes.h2.fontSize")?.kind, "cssLength");
  assert.equal(getTokenDefinitionFromPath("components.ProgressBar.height")?.kind, "length");
});

test("an unknown token path has no definition", () => {
  assert.equal(getTokenDefinitionFromPath("color.sparkle"), undefined);
});

test("type roles name the surface they are measured on", () => {
  for (const { path, definition } of listTokenDefinitions()) {
    if (path.startsWith("text.graphic.")) {
      assert.equal(definition.surface, "graphic", path);
    }
    if (path.startsWith("text.stage.")) {
      assert.equal(definition.surface, "stage", path);
    }
  }
});

test("semantic groups never share a name with a Mantine theme key", () => {
  const mantineKeys = new Set(Object.keys(MANTINE_TOKENS));
  for (const group of Object.keys(SEMANTIC_TOKENS)) {
    assert.ok(!mantineKeys.has(group), group);
  }
});

test("no catalog group uses a key reserved for token definitions", () => {
  function visit(node: CatalogNode, path: string) {
    if (isTokenDefinition(node) || isTokenScale(node)) {
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      assert.ok(key !== "kind" && key !== "scale", `${path}.${key}`);
      visit(child, `${path}.${key}`);
    }
  }
  visit(SEMANTIC_TOKENS, "semantic");
});
```

- [ ] **Step 8: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/tokenCatalog/tokenCatalog.test.ts`
Expected: FAIL, `Cannot find module './tokenCatalog'`.

- [ ] **Step 9: Assemble the catalog**

`src/videoTheme/tokenCatalog/tokenCatalog.ts`:

```ts
import { ATOMIC_TOKENS } from "./atomicTokens";
import { COMPONENT_TOKENS } from "./componentTokens";
import { isTokenDefinition, isTokenScale } from "./defineTokens";
import { MANTINE_TOKENS } from "./mantineTokens";
import { SEMANTIC_TOKENS } from "./semanticTokens";
import type { CatalogNode, TokenDefinition } from "../videoTheme.types";

/**
 * Every video design token with its metadata, by tier. The theme schema, JSON
 * Schema, resolver, CSS variables, usage tracking, and the token editor all
 * walk this one catalog, so adding a token here is what makes it themeable.
 */
export const VIDEO_TOKEN_CATALOG = {
  mantine: MANTINE_TOKENS,
  atomic: ATOMIC_TOKENS,
  semantic: SEMANTIC_TOKENS,
  components: COMPONENT_TOKENS,
} as const;

/** One catalog leaf and its token path. A scale is listed once, by its own path. */
export type CatalogEntry = Readonly<{
  path: string;
  definition: TokenDefinition;
  isScale: boolean;
}>;

/** Whether a path's first segment names a Mantine-native theme key. */
export function isMantineTokenRoot(segment: string): boolean {
  return Object.hasOwn(MANTINE_TOKENS, segment);
}

function _listNode(node: CatalogNode, path: readonly string[]): CatalogEntry[] {
  if (isTokenDefinition(node)) {
    return [{ path: path.join("."), definition: node, isScale: false }];
  }
  if (isTokenScale(node)) {
    return [{ path: path.join("."), definition: node.scale, isScale: true }];
  }
  return Object.entries(node).flatMap(([key, child]) =>
    _listNode(child, [...path, key]),
  );
}

/**
 * Every token in the catalog with its path, in the same syntax as a
 * reference without the `$`: `colors.primary`, `atomic.swatch`,
 * `color.accent`, `components.ProgressBar.height`. Use it to iterate tokens,
 * for example to build controls or check metadata.
 */
export function listTokenDefinitions(): readonly CatalogEntry[] {
  return [
    ..._listNode(MANTINE_TOKENS, []),
    ..._listNode(ATOMIC_TOKENS, ["atomic"]),
    ..._listNode(SEMANTIC_TOKENS, []),
    ..._listNode(COMPONENT_TOKENS, ["components"]),
  ];
}

function _getSectionFromPath(
  segments: readonly string[],
): readonly [CatalogNode, readonly string[]] {
  const [root, ...rest] = segments;
  if (root === "atomic") {
    return [ATOMIC_TOKENS, rest];
  }
  if (root === "components") {
    return [COMPONENT_TOKENS, rest];
  }
  return [isMantineTokenRoot(root) ? MANTINE_TOKENS : SEMANTIC_TOKENS, segments];
}

/**
 * The definition of the token at a path, or undefined for an unknown path.
 * A path into a scale, such as `atomic.swatch.mint`, returns the scale's
 * definition. Use it to label or validate a token found by path.
 */
export function getTokenDefinitionFromPath(
  path: string,
): TokenDefinition | undefined {
  const [section, remaining] = _getSectionFromPath(path.split("."));
  let node: CatalogNode = section;
  for (const [index, segment] of remaining.entries()) {
    if (isTokenScale(node)) {
      return index === remaining.length - 1 ? node.scale : undefined;
    }
    if (isTokenDefinition(node) || !Object.hasOwn(node, segment)) {
      return undefined;
    }
    node = node[segment];
  }
  return isTokenDefinition(node) ? node : undefined;
}
```

Note the scale check: when the loop reaches the scale's key segment, `node` is the scale and the key is the last segment, so the scale definition is returned.

- [ ] **Step 10: Run the tests to verify they pass**

Run the Step 8 command. Expected: 8 passing.

- [ ] **Step 11: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`
Expected: no errors.

```bash
git add src/videoTheme/videoTheme.types.ts src/videoTheme/tokenCatalog
git commit -m "feat(video-producer): catalog every video design token with metadata" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Token references and the content hash

**Files:**
- Create: `src/videoTheme/themeReferences/themeReferences.ts`
- Test: `src/videoTheme/themeReferences/themeReferences.test.ts`
- Create: `src/videoTheme/hashVideoTheme/hashVideoTheme.ts`
- Test: `src/videoTheme/hashVideoTheme/hashVideoTheme.test.ts`

- [ ] **Step 1: Write the failing reference tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "./themeReferences";

test("a reference starting with atomic targets the atomic tier", () => {
  assert.deepEqual(getTargetFromTokenReference("$atomic.strokeWidth.sm"), {
    tier: "atomic",
    path: ["strokeWidth", "sm"],
  });
});

test("a reference starting with a Mantine key targets Mantine's theme", () => {
  assert.deepEqual(getTargetFromTokenReference("$colors.primary.4"), {
    tier: "mantine",
    path: ["colors", "primary", "4"],
  });
});

test("any other reference targets the semantic tier", () => {
  assert.deepEqual(getTargetFromTokenReference("$color.accent"), {
    tier: "semantic",
    path: ["color", "accent"],
  });
});

test("$primary targets Mantine's primary colour", () => {
  assert.deepEqual(getTargetFromTokenReference("$primary"), { tier: "primary" });
});

test("colours and malformed paths are not references", () => {
  for (const value of ["#51a7ff", "$", "$.accent", "$color..accent", "color.accent", 4]) {
    assert.equal(isTokenReference(value), false, String(value));
  }
});
```

- [ ] **Step 2: Write the failing hash tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCanonicalJsonFromValue,
  buildVideoThemeHashFromContent,
} from "./hashVideoTheme";

test("canonical JSON sorts object keys at every depth and drops undefined", () => {
  assert.equal(
    buildCanonicalJsonFromValue({ b: 1, a: { d: [2, { f: 3, e: undefined }], c: true } }),
    '{"a":{"c":true,"d":[2,{"f":3}]},"b":1}',
  );
});

test("the hash ignores key order", () => {
  assert.equal(
    buildVideoThemeHashFromContent({ accent: "#51a7ff", ground: "#0b1219" }),
    buildVideoThemeHashFromContent({ ground: "#0b1219", accent: "#51a7ff" }),
  );
});

test("the hash changes when a value changes", () => {
  assert.notEqual(
    buildVideoThemeHashFromContent({ accent: "#51a7ff" }),
    buildVideoThemeHashFromContent({ accent: "#51a7fe" }),
  );
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/themeReferences/themeReferences.test.ts src/videoTheme/hashVideoTheme/hashVideoTheme.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement references**

`src/videoTheme/themeReferences/themeReferences.ts`:

```ts
import { isMantineTokenRoot } from "../tokenCatalog/tokenCatalog";
import type { TokenReference } from "../videoTheme.types";

/** `$` then dot-separated segments; the first segment starts with a letter. */
export const TOKEN_REFERENCE_PATTERN = /^\$[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z0-9]+)*$/;

/** The tier a reference reads from, and the path inside it. */
export type TokenReferenceTarget =
  | Readonly<{ tier: "primary" }>
  | Readonly<{ tier: "mantine" | "atomic" | "semantic"; path: readonly string[] }>;

/** Whether a value is a `$` reference to another token. */
export function isTokenReference(value: unknown): value is TokenReference {
  return typeof value === "string" && TOKEN_REFERENCE_PATTERN.test(value);
}

/**
 * Where a reference points. `$primary` is Mantine's primary colour at the
 * primary shade, `$atomic.…` is the atomic tier, a first segment that names
 * a Mantine key (`$colors.…`, `$fontSizes.…`) is Mantine's theme, and any
 * other reference is a semantic token (`$color.accent`).
 */
export function getTargetFromTokenReference(
  reference: TokenReference,
): TokenReferenceTarget {
  const [root, ...rest] = reference.slice(1).split(".");
  if (root === "primary" && rest.length === 0) {
    return { tier: "primary" };
  }
  if (root === "atomic") {
    return { tier: "atomic", path: rest };
  }
  return {
    tier: isMantineTokenRoot(root) ? "mantine" : "semantic",
    path: [root, ...rest],
  };
}
```

- [ ] **Step 5: Implement the hash**

`src/videoTheme/hashVideoTheme/hashVideoTheme.ts`:

```ts
function _sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(_sortValue);
  }
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .filter(([, child]) => child !== undefined)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, _sortValue(child)]),
    );
  }
  return value;
}

/**
 * JSON with object keys sorted at every depth and undefined values dropped,
 * so equal content always serializes the same way. Use it before hashing or
 * comparing theme content.
 */
export function buildCanonicalJsonFromValue(value: unknown): string {
  return JSON.stringify(_sortValue(value));
}

/** cyrb53: a fast, well-distributed 53-bit string hash. */
function _cyrb53(text: string, seed: number): number {
  let first = 0xdeadbeef ^ seed;
  let second = 0x41c6ce57 ^ seed;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    first = Math.imul(first ^ code, 2654435761);
    second = Math.imul(second ^ code, 1597334677);
  }
  first = Math.imul(first ^ (first >>> 16), 2246822507);
  first ^= Math.imul(second ^ (second >>> 13), 3266489909);
  second = Math.imul(second ^ (second >>> 16), 2246822507);
  second ^= Math.imul(first ^ (first >>> 13), 3266489909);
  return 4294967296 * (2097151 & second) + (first >>> 0);
}

/**
 * A synchronous content hash of resolved theme content, stable under key
 * order. The live player acknowledges a theme by this hash and exports
 * record it, so a preview and its MP4 can be matched. It is not a security
 * hash.
 */
export function buildVideoThemeHashFromContent(content: unknown): string {
  const text = buildCanonicalJsonFromValue(content);
  return [_cyrb53(text, 1), _cyrb53(text, 2)]
    .map((part) => part.toString(16).padStart(14, "0"))
    .join("");
}
```

- [ ] **Step 6: Run both test files to verify they pass**

Run the Step 3 command. Expected: 8 passing.

- [ ] **Step 7: Commit**

```bash
git add src/videoTheme/themeReferences src/videoTheme/hashVideoTheme
git commit -m "feat(video-producer): parse token references and hash theme content" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Theme schema and the `classic` theme

**Files:**
- Create: `src/videoTheme/tokenValueSchemas/tokenValueSchemas.ts`
- Create: `src/videoTheme/videoThemeSchema/videoThemeSchema.ts`
- Create: `themes/classic.theme.json`
- Test: `src/videoTheme/videoThemeSchema/videoThemeSchema.test.ts`

- [ ] **Step 1: Write the `classic` theme**

`themes/classic.theme.json`. Every value comes from today's renderers (`STOCK`, `DUR`, `EASE`, `STAGGER`, `MOTION_PRESETS`, `ContinuityScene.module.css`, the audit in spec Appendix A) or from the Avandar palette the gallery already uses. `classic.primaryShade.dark` 4 is `#51a7ff`, the gallery `DEFAULT_ACCENT`.

```json
{
  "schemaVersion": 1,
  "id": "classic",
  "label": "Classic",
  "colors": {
    "primary": ["#edf6ff", "#d8ebff", "#b9dcff", "#89c7ff", "#51a7ff", "#2983ff", "#1563fe", "#0b4aea", "#103dbd", "#143894"],
    "neutral": ["#f8fafc", "#d9e0e7", "#bac6d2", "#9cadbd", "#8094a9", "#637c95", "#486581", "#334e68", "#243b53", "#102a43"],
    "secondary": ["#fffbea", "#fff3c4", "#fce588", "#fadb5f", "#f7c948", "#f0b429", "#de911d", "#cb6e17", "#b44d12", "#8d2b0b"],
    "success": ["#eafcef", "#d9f6df", "#b1ebbe", "#86e09a", "#63d77c", "#4dd269", "#40cf5e", "#31b74e", "#27a343", "#168d36"],
    "warning": ["#fffae2", "#fdf4ce", "#fae8a0", "#f6db6d", "#f4d043", "#f2c928", "#f1c617", "#d7ae06", "#bf9b00", "#a58500"],
    "danger": ["#ffebe8", "#ffd6d2", "#f6ada5", "#ef8075", "#e95a4c", "#e64231", "#e53523", "#cb2717", "#b61f13", "#a0140c"],
    "info": ["#e6fcff", "#d5f5fa", "#abe9f3", "#7edcec", "#5dd2e6", "#49cce2", "#3bc9e1", "#2bb1c8", "#169eb3", "#00899d"]
  },
  "white": "#ffffff",
  "black": "#000000",
  "primaryColor": "primary",
  "primaryShade": { "light": 7, "dark": 4 },
  "defaultGradient": { "from": "#0b1219", "to": "#142632", "deg": 180 },
  "fontFamily": "Figtree, ui-sans-serif, system-ui, sans-serif",
  "fontFamilyMonospace": "ui-monospace, SFMono-Regular, Menlo, Consolas, 'Liberation Mono', monospace",
  "headings": {
    "fontFamily": "Figtree, ui-sans-serif, system-ui, sans-serif",
    "fontWeight": "600",
    "sizes": {
      "h1": { "fontSize": "63px", "fontWeight": "500", "lineHeight": "1.12" },
      "h2": { "fontSize": "48px", "fontWeight": "600", "lineHeight": "1.12" }
    }
  },
  "fontSizes": { "2xs": "12px", "xs": "13px", "sm": "14px", "md": "17px", "lg": "18px", "xl": "20px", "2xl": "22px", "3xl": "23px", "4xl": "25px", "5xl": "30px" },
  "lineHeights": { "xs": "1.12", "sm": "1.25", "md": "1.3", "lg": "1.35" },
  "radius": { "xs": "4px", "sm": "8px", "md": "10px", "lg": "12px", "xl": "18px", "full": "9999px" },
  "spacing": { "2xs": "16px", "xs": "20px", "sm": "32px", "md": "49px", "lg": "60px", "xl": "64px", "2xl": "70px", "3xl": "96px", "4xl": "192px" },
  "autoContrast": false,
  "luminanceThreshold": 0.3,
  "fontSmoothing": true,
  "other": {
    "video": {
      "atomic": {
        "swatch": {
          "mint": "#9fefca",
          "cyan": "#82c8f2",
          "orange": "#f0ba83",
          "ground": "#0b1219",
          "surface": "#101e28",
          "elevated": "#142632",
          "line": "#2a404e",
          "muted": "#728794",
          "text": "#edf7f4",
          "textDark": "#182d27",
          "productBackdrop": "#eaeef2",
          "scrim": "#061019a8",
          "shadow": "#06101455"
        },
        "fontFamily": { "figtree": "figtree", "arial": "arial", "courier": "courier", "systemMono": "systemMono" },
        "fontWeight": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
        "letterSpacing": { "tight": -0.025, "none": 0, "wide": 0.17142857142857143 },
        "size": {},
        "strokeWidth": { "2xs": 1.1, "xs": 1.5, "sm": 2, "md": 2.5, "lg": 3, "xl": 3.5 },
        "opacity": { "3": 0.03, "6": 0.06, "8": 0.08, "9": 0.09, "10": 0.1, "24": 0.24, "25": 0.25, "28": 0.28, "30": 0.3, "32": 0.32, "34": 0.34, "40": 0.4, "65": 0.65, "70": 0.7, "100": 1 },
        "shadow": {
          "none": { "layers": [] },
          "lg": { "layers": [{ "offsetX": 0, "offsetY": 16, "blur": 22, "spread": 0, "alpha": 1 }] }
        },
        "glow": { "halo": { "spread": 5, "blur": 0, "opacity": 0.09 } },
        "textShadow": {},
        "blur": { "md": 12 },
        "roughness": { "none": 0, "subtle": 0.5, "sketch": 1.5, "rough": 3 },
        "bowing": { "md": 1 },
        "seed": { "sm": 4, "md": 17 },
        "randomness": { "md": 3 },
        "dash": { "none": [], "fine": [0.015, 0.02], "orbit": [3, 9], "connector": [5, 9] },
        "curveTension": { "md": 0.45 },
        "duration": { "2xs": 4, "xs": 6, "sm": 8, "md": 9, "lg": 13, "xl": 15, "2xl": 18 },
        "easing": {
          "out": [0.16, 1, 0.3, 1],
          "outBack": [0.34, 1.56, 0.64, 1],
          "inOut": [0.45, 0, 0.55, 1],
          "inOutCubic": { "powerInOut": 3 },
          "word": [0.22, 1, 0.36, 1],
          "in": [0.55, 0, 1, 0.45],
          "surge": [0.7, 0, 0.2, 1]
        },
        "spring": { "pop": { "damping": 14, "stiffness": 120, "mass": 0.8 } },
        "stagger": { "xs": 0.5, "sm": 2 },
        "period": { "sm": 75, "md": 90, "lg": 120 },
        "distance": { "sm": 8, "md": 12 },
        "typingRate": { "md": 28 },
        "tempo": { "md": 1 },
        "cameraSpeed": { "deliberate": 0.25, "gentle": 0.5, "balanced": 0.75, "brisk": 1, "whip": 1.5 },
        "shutter": { "deliberate": 45, "gentle": 90, "balanced": 120, "brisk": 180, "whip": 240 },
        "samples": { "md": 10 },
        "zoom": { "min": 1, "max": 3 },
        "velocityBlur": { "factor": 0.09, "max": 3 }
      },
      "semantic": {
        "color": {
          "ground": "$atomic.swatch.ground",
          "groundFill": "$color.ground",
          "surface": "$atomic.swatch.surface",
          "elevated": "$atomic.swatch.elevated",
          "line": "$atomic.swatch.line",
          "text": { "onDark": "$atomic.swatch.text", "onLight": "$atomic.swatch.textDark" },
          "textMuted": { "onDark": "$atomic.swatch.muted", "onLight": "$colors.neutral.6" },
          "accent": "$primary",
          "accentAlt": "$atomic.swatch.cyan",
          "highlight": "$atomic.swatch.orange",
          "scrim": "$atomic.swatch.scrim",
          "productBackdrop": "$atomic.swatch.productBackdrop",
          "shadowColor": "$atomic.swatch.shadow"
        },
        "text": {
          "graphic": {
            "eyebrow": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.sm", "weight": "$atomic.fontWeight.regular", "letterSpacing": "$atomic.letterSpacing.wide", "color": "$color.textMuted" },
            "heading": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.2xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "body": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "label": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.lg", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "detail": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.2xs", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "caption": { "family": "$atomic.fontFamily.arial", "size": "$fontSizes.md", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" },
            "pill": { "family": "$atomic.fontFamily.courier", "size": "$fontSizes.xs", "weight": "$atomic.fontWeight.regular", "color": "$color.textMuted" }
          },
          "stage": {
            "heading": { "family": "$atomic.fontFamily.figtree", "size": "$headings.sizes.h2.fontSize", "weight": "$headings.sizes.h2.fontWeight", "lineHeight": "$headings.sizes.h2.lineHeight", "letterSpacing": "$atomic.letterSpacing.tight", "color": "$color.text" },
            "subtitle": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.4xl", "weight": "$atomic.fontWeight.regular", "lineHeight": "$lineHeights.lg", "color": "$color.text" },
            "evidence": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.md", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "sharedObject": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.4xl", "weight": "$atomic.fontWeight.semibold", "color": "$color.accent" },
            "thesis": { "family": "$atomic.fontFamily.figtree", "size": "$headings.sizes.h1.fontSize", "weight": "$headings.sizes.h1.fontWeight", "lineHeight": "$headings.sizes.h1.lineHeight", "letterSpacing": "$atomic.letterSpacing.tight", "color": "$color.text" },
            "thesisEmphasis": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.5xl", "weight": "$atomic.fontWeight.regular", "color": "$color.text" },
            "floatingLabel": { "family": "$atomic.fontFamily.figtree", "size": "$fontSizes.3xl", "weight": "$atomic.fontWeight.regular", "lineHeight": "$lineHeights.sm", "color": "$color.text" }
          }
        },
        "stroke": {
          "guide": "$atomic.strokeWidth.xs",
          "outline": "$atomic.strokeWidth.xs",
          "default": "$atomic.strokeWidth.sm",
          "annotation": "$atomic.strokeWidth.lg",
          "route": "$atomic.strokeWidth.xl"
        },
        "corner": {
          "panel": "$radius.xl",
          "pill": "$radius.full",
          "card": "$radius.lg",
          "chip": "$radius.xs",
          "sharedObject": "$radius.sm",
          "spotlight": "$radius.lg",
          "label": "$radius.md"
        },
        "elevation": {
          "flat": { "shadow": "$atomic.shadow.none", "color": "$color.shadowColor" },
          "floating": { "shadow": "$atomic.shadow.lg", "color": "$color.shadowColor" }
        },
        "effect": { "halo": "$atomic.glow.halo" },
        "sketch": {
          "profile": {
            "smooth": { "roughness": "$atomic.roughness.none", "bowing": "$atomic.bowing.md", "seed": "$atomic.seed.md", "randomness": "$atomic.randomness.md" },
            "subtle": { "roughness": "$atomic.roughness.subtle", "bowing": "$atomic.bowing.md", "seed": "$atomic.seed.md", "randomness": "$atomic.randomness.md" },
            "sketch": { "roughness": "$atomic.roughness.sketch", "bowing": "$atomic.bowing.md", "seed": "$atomic.seed.md", "randomness": "$atomic.randomness.md" },
            "rough": { "roughness": "$atomic.roughness.rough", "bowing": "$atomic.bowing.md", "seed": "$atomic.seed.md", "randomness": "$atomic.randomness.md" }
          },
          "box": "$sketch.profile.smooth",
          "annotation": "$sketch.profile.sketch",
          "shape": "$sketch.profile.smooth"
        },
        "layout": {
          "graphic": {
            "margin": "$spacing.xl",
            "eyebrowOrigin": { "x": "$spacing.xl", "y": "$spacing.xl" },
            "captionBaseline": "$spacing.md"
          },
          "stage": {
            "headingInset": { "x": "$spacing.3xl", "top": "$spacing.xl" },
            "graphicInset": { "x": "$spacing.4xl", "top": "$spacing.lg", "bottom": "$spacing.2xl" },
            "evidenceRow": { "x": "$spacing.sm", "bottom": "$spacing.2xs", "gap": "$spacing.xs" }
          }
        },
        "motion": {
          "tempo": "$atomic.tempo.md",
          "press": "$atomic.duration.2xs",
          "chip": "$atomic.duration.xs",
          "whip": "$atomic.duration.sm",
          "panel": "$atomic.duration.md",
          "sheet": "$atomic.duration.lg",
          "word": "$atomic.duration.xl",
          "hero": "$atomic.duration.2xl",
          "entrance": { "duration": "$motion.panel", "easing": "$atomic.easing.out", "distance": "$atomic.distance.md" },
          "exit": { "duration": "$motion.chip", "easing": "$atomic.easing.out", "distance": "$atomic.distance.md" },
          "emphasis": { "duration": "$motion.sheet", "spring": "$atomic.spring.pop" },
          "drawOn": { "duration": "$motion.hero", "easing": "$atomic.easing.inOut" },
          "travel": { "easing": "$atomic.easing.inOut" },
          "pulse": { "period": "$atomic.period.md" },
          "drift": { "distance": "$atomic.distance.md" },
          "packetFlow": { "period": "$atomic.period.sm" },
          "typing": { "rate": "$atomic.typingRate.md" },
          "stagger": { "list": "$atomic.stagger.sm", "edge": "$atomic.stagger.sm", "column": "$atomic.stagger.xs" }
        },
        "camera": {
          "preset": "authored",
          "presets": {
            "deliberate": { "speed": "$atomic.cameraSpeed.deliberate", "shutter": "$atomic.shutter.deliberate", "easing": "$atomic.easing.inOut" },
            "gentle": { "speed": "$atomic.cameraSpeed.gentle", "shutter": "$atomic.shutter.gentle", "easing": "$atomic.easing.inOut" },
            "balanced": { "speed": "$atomic.cameraSpeed.balanced", "shutter": "$atomic.shutter.balanced", "easing": "$atomic.easing.inOut" },
            "brisk": { "speed": "$atomic.cameraSpeed.brisk", "shutter": "$atomic.shutter.brisk", "easing": "$atomic.easing.inOutCubic" },
            "whip": { "speed": "$atomic.cameraSpeed.whip", "shutter": "$atomic.shutter.whip", "easing": "$atomic.easing.inOutCubic" }
          },
          "easing": { "push": "$atomic.easing.out", "whip": "$atomic.easing.inOutCubic", "glide": "$atomic.easing.inOut" },
          "zoom": { "min": "$atomic.zoom.min", "max": "$atomic.zoom.max" }
        },
        "motionBlur": {
          "shutter": "$atomic.shutter.brisk",
          "samples": "$atomic.samples.md",
          "velocityFactor": "$atomic.velocityBlur.factor",
          "velocityMax": "$atomic.velocityBlur.max",
          "transitionBlur": "$atomic.blur.md"
        }
      }
    }
  },
  "components": {
    "ProgressBar": {
      "defaultProps": {
        "height": 3,
        "paint": { "color": "$color.accent", "alpha": "$atomic.opacity.100" }
      }
    }
  },
  "overrides": {}
}
```

- [ ] **Step 2: Write the failing schema tests**

`src/videoTheme/videoThemeSchema/videoThemeSchema.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import classicTheme from "../../../themes/classic.theme.json";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalog";
import {
  createVideoThemeJsonSchema,
  parseVideoThemeDocument,
} from "./videoThemeSchema";

function _sparse(video: object) {
  return {
    schemaVersion: 1,
    id: "warm",
    label: "Warm",
    extends: "classic",
    other: { video },
  };
}

test("the classic theme defines every token and passes", () => {
  assert.equal(parseVideoThemeDocument(classicTheme).id, "classic");
});

test("a theme that extends another may be sparse", () => {
  assert.equal(
    parseVideoThemeDocument(_sparse({ atomic: { swatch: { ground: "#201510" } } })).id,
    "warm",
  );
});

test("a theme without extends must define every token", () => {
  const sparse = {
    schemaVersion: 1,
    id: "warm",
    label: "Warm",
    other: { video: { atomic: { swatch: { ground: "#201510" } } } },
  };
  assert.throws(() => parseVideoThemeDocument(sparse), /colors/);
});

test("a semantic token rejects a literal value", () => {
  assert.throws(
    () => parseVideoThemeDocument(_sparse({ semantic: { color: { accent: "#ff0000" } } })),
    /accent/,
  );
});

test("an atomic token rejects a reference", () => {
  assert.throws(
    () => parseVideoThemeDocument(_sparse({ atomic: { swatch: { ground: "$color.text" } } })),
    /ground/,
  );
});

test("a component token accepts a literal one-off", () => {
  const document = {
    schemaVersion: 1,
    id: "thick",
    label: "Thick",
    extends: "classic",
    components: { ProgressBar: { defaultProps: { height: 6 } } },
  };
  assert.equal(parseVideoThemeDocument(document).id, "thick");
});

test("an unknown token is rejected", () => {
  assert.throws(
    () => parseVideoThemeDocument(_sparse({ semantic: { color: { sparkle: "$color.accent" } } })),
    /sparkle/,
  );
});

test("a font stack must belong to a registered font", () => {
  assert.throws(() =>
    parseVideoThemeDocument({
      schemaVersion: 1,
      id: "comic",
      label: "Comic",
      extends: "classic",
      fontFamily: "Comic Sans MS, cursive",
    }),
  );
});

test("theme ids are slugs", () => {
  assert.throws(() =>
    parseVideoThemeDocument({ ..._sparse({}), id: "My Theme" }),
  );
});

test("the JSON Schema carries every token's description", () => {
  const schema = JSON.stringify(createVideoThemeJsonSchema());
  for (const { path, definition } of listTokenDefinitions()) {
    assert.ok(schema.includes(JSON.stringify(definition.description)), path);
  }
});
```

- [ ] **Step 3: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/videoThemeSchema/videoThemeSchema.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 4: Write the literal value schemas**

`src/videoTheme/tokenValueSchemas/tokenValueSchemas.ts`:

```ts
import { z } from "zod";
import {
  VIDEO_FONT_IDS,
  VIDEO_FONT_STACKS,
} from "../videoFontRegistry/videoFontRegistry";
import type { FieldSpec } from "../tokenCatalog/defineTokens";
import type { TokenDefinition } from "../videoTheme.types";

const unitInterval = z.number().min(0).max(1);
const shadeIndex = z.number().int().min(0).max(9);
const bezierY = z.number().min(-1).max(2);

/** A hex colour, with optional alpha: `#rgb`, `#rrggbb`, or `#rrggbbaa`. */
export const colorValueSchema = z
  .string()
  .regex(
    /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/,
    "Expected a hex colour such as #51a7ff",
  );
export const gradientValueSchema = z
  .object({ from: colorValueSchema, to: colorValueSchema, deg: z.number().min(0).max(360) })
  .strict();
export const easingValueSchema = z.union([
  z.tuple([unitInterval, bezierY, unitInterval, bezierY]),
  z.object({ powerInOut: z.number().min(1).max(8) }).strict(),
]);
export const springValueSchema = z
  .object({
    damping: z.number().min(1).max(100),
    stiffness: z.number().min(1).max(1000),
    mass: z.number().min(0.1).max(10),
  })
  .strict();
const shadowLayerSchema = z
  .object({
    offsetX: z.number().min(-200).max(200),
    offsetY: z.number().min(-200).max(200),
    blur: z.number().min(0).max(200),
    spread: z.number().min(-100).max(100),
    alpha: unitInterval,
  })
  .strict();
export const shadowValueSchema = z
  .object({ layers: z.array(shadowLayerSchema).max(4) })
  .strict();
export const glowValueSchema = z
  .object({
    spread: z.number().min(-200).max(200),
    blur: z.number().min(0).max(100),
    opacity: unitInterval,
  })
  .strict();
export const textShadowValueSchema = z
  .object({
    offsetX: z.number().min(-50).max(50),
    offsetY: z.number().min(-50).max(50),
    blur: z.number().min(0).max(50),
    alpha: unitInterval,
  })
  .strict();

function _boundedNumber(definition: Pick<TokenDefinition, "min" | "max">) {
  let schema = z.number();
  if (definition.min !== undefined) {
    schema = schema.min(definition.min);
  }
  if (definition.max !== undefined) {
    schema = schema.max(definition.max);
  }
  return schema;
}

/**
 * The zod schema for a token kind's literal value, or undefined for kinds
 * that have no literal form of their own (composites and fills). Used by
 * the theme schema for atomic and Mantine values and component one-offs, and
 * by the resolver to validate a value a reference reached.
 */
export function createValueSchemaFromDefinition(
  definition: FieldSpec & Pick<TokenDefinition, "min" | "max">,
): z.ZodType | undefined {
  switch (definition.kind) {
    case "color":
      return colorValueSchema;
    case "colorTuple":
      return z.array(colorValueSchema).length(10);
    case "paletteName":
    case "enum":
      return z.enum(definition.options ?? []);
    case "shade":
      return z.union([shadeIndex, z.object({ light: shadeIndex, dark: shadeIndex }).strict()]);
    case "gradient":
      return gradientValueSchema;
    case "fontStack":
      return z.enum(VIDEO_FONT_STACKS);
    case "cssLength":
      return z.string().regex(/^-?\d+(?:\.\d+)?px$/, "Expected pixels such as 18px");
    case "cssNumber":
      return z.string().regex(/^-?\d+(?:\.\d+)?$/, "Expected a number such as 1.3");
    case "length":
    case "number":
    case "opacity":
    case "letterSpacing":
      return _boundedNumber(definition);
    case "duration":
    case "fontWeight":
      return _boundedNumber(definition).int();
    case "easing":
      return easingValueSchema;
    case "spring":
      return springValueSchema;
    case "shadow":
      return shadowValueSchema;
    case "glow":
      return glowValueSchema;
    case "textShadow":
      return textShadowValueSchema;
    case "dash":
      return z.array(z.number().min(0).max(1000)).max(8);
    case "fontFamily":
      return z.enum(VIDEO_FONT_IDS);
    case "boolean":
      return z.boolean();
    default:
      return undefined;
  }
}
```

- [ ] **Step 5: Write the document schema**

`src/videoTheme/videoThemeSchema/videoThemeSchema.ts`:

```ts
import { z } from "zod";
import { TOKEN_REFERENCE_PATTERN } from "../themeReferences/themeReferences";
import {
  COMPOSITE_TOKEN_FIELDS,
  isCompositeTokenKind,
  isTokenDefinition,
  isTokenScale,
  TOKEN_CONTROLS,
  type CompositeTokenKind,
  type FieldSpec,
} from "../tokenCatalog/defineTokens";
import { VIDEO_TOKEN_CATALOG } from "../tokenCatalog/tokenCatalog";
import {
  colorValueSchema,
  createValueSchemaFromDefinition,
  gradientValueSchema,
} from "../tokenValueSchemas/tokenValueSchemas";
import type {
  CatalogGroup,
  CatalogNode,
  TokenDefinition,
  VideoThemeDocument,
} from "../videoTheme.types";

/** Theme ids: 1 to 48 lowercase letters, digits, or hyphens. */
export const VIDEO_THEME_SLUG_PATTERN = /^[a-z0-9-]{1,48}$/;

type SchemaTier = "mantine" | "atomic" | "semantic" | "component";

const tokenReferenceSchema = z
  .string()
  .regex(TOKEN_REFERENCE_PATTERN, "Expected a token reference such as $atomic.strokeWidth.sm");
const slugSchema = z
  .string()
  .regex(VIDEO_THEME_SLUG_PATTERN, "Theme ids are 1 to 48 lowercase letters, digits, or hyphens");
const scaleKeySchema = z
  .string()
  .regex(/^[A-Za-z0-9]{1,32}$/, "Scale keys are letters and digits");

function _union(options: readonly z.ZodType[]): z.ZodType {
  return options.length === 1
    ? options[0]
    : z.union(options as [z.ZodType, z.ZodType, ...z.ZodType[]]);
}

function _fieldSchema(field: FieldSpec, tier: SchemaTier): z.ZodType {
  const literal = createValueSchemaFromDefinition(field);
  if (field.kind === "enum" && literal) {
    return literal;
  }
  return tier === "component" && literal
    ? _union([literal, tokenReferenceSchema])
    : tokenReferenceSchema;
}

function _compositeSchema(kind: CompositeTokenKind, tier: SchemaTier): z.ZodType {
  const spec = COMPOSITE_TOKEN_FIELDS[kind];
  const required: readonly string[] = spec.required;
  const fields: Readonly<Record<string, FieldSpec>> = spec.fields;
  const shape = Object.fromEntries(
    Object.entries(fields).map(([name, field]) => {
      const schema = _fieldSchema(field, tier);
      return [name, required.includes(name) ? schema : schema.optional()];
    }),
  );
  return _union([z.object(shape).strict(), tokenReferenceSchema]);
}

function _leafSchema(definition: TokenDefinition, tier: SchemaTier): z.ZodType {
  const literal = createValueSchemaFromDefinition(definition);
  if (tier === "mantine" || tier === "atomic") {
    return literal ?? z.never();
  }
  if ((definition.kind === "enum" || definition.kind === "boolean") && literal) {
    return literal;
  }
  if (isCompositeTokenKind(definition.kind)) {
    return _compositeSchema(definition.kind, tier);
  }
  const componentLiteral =
    definition.kind === "fill" ? _union([colorValueSchema, gradientValueSchema]) : literal;
  const colorPair =
    definition.kind === "color"
      ? [z.object({ onDark: _fieldSchema(definition, tier), onLight: _fieldSchema(definition, tier) }).strict()]
      : [];
  return _union([
    tokenReferenceSchema,
    ...(tier === "component" && componentLiteral ? [componentLiteral] : []),
    ...colorPair,
  ]);
}

function _tokenMeta(definition: TokenDefinition) {
  return {
    title: definition.label,
    description: definition.description,
    control: TOKEN_CONTROLS[definition.kind],
    ...(definition.unit ? { unit: definition.unit } : {}),
    ...(definition.surface ? { surface: definition.surface } : {}),
  };
}

function _nodeSchema(node: CatalogNode, tier: SchemaTier, isComplete: boolean): z.ZodType {
  if (isTokenDefinition(node)) {
    return _leafSchema(node, tier).meta(_tokenMeta(node));
  }
  if (isTokenScale(node)) {
    return z.record(scaleKeySchema, _leafSchema(node.scale, tier).meta(_tokenMeta(node.scale)));
  }
  return z.object(_shape(node, tier, isComplete)).strict();
}

function _shape(group: CatalogGroup, tier: SchemaTier, isComplete: boolean) {
  return Object.fromEntries(
    Object.entries(group).map(([key, child]) => {
      const schema = _nodeSchema(child, tier, isComplete);
      return [key, isComplete ? schema : schema.optional()];
    }),
  );
}

function _componentsSchema(isComplete: boolean): z.ZodType {
  const shape = Object.fromEntries(
    Object.entries(VIDEO_TOKEN_CATALOG.components).map(([name, group]) => {
      const schema = z
        .object({ defaultProps: _nodeSchema(group, "component", isComplete) })
        .strict();
      return [name, isComplete ? schema : schema.optional()];
    }),
  );
  return z.object(shape).strict();
}

function _themeShape(isComplete: boolean) {
  const optional = (schema: z.ZodType) => (isComplete ? schema : schema.optional());
  const video = z
    .object({
      atomic: optional(_nodeSchema(VIDEO_TOKEN_CATALOG.atomic, "atomic", isComplete)),
      semantic: optional(_nodeSchema(VIDEO_TOKEN_CATALOG.semantic, "semantic", isComplete)),
    })
    .strict();
  return {
    ..._shape(VIDEO_TOKEN_CATALOG.mantine, "mantine", isComplete),
    other: optional(z.object({ video: optional(video) }).strict()),
    components: optional(_componentsSchema(isComplete)),
  };
}

/** A sparse fragment: what a per-item override or an unsaved draft holds. */
export const videoThemePatchSchema = z.object(_themeShape(false)).strict();

function _documentSchema(isComplete: boolean) {
  return z
    .object({
      $schema: z.string().optional(),
      schemaVersion: z.literal(1),
      id: slugSchema,
      label: z.string().trim().min(1).max(80),
      extends: slugSchema.optional(),
      ..._themeShape(isComplete),
      overrides: z.record(slugSchema, videoThemePatchSchema).optional(),
    })
    .strict();
}

const SPARSE_DOCUMENT_SCHEMA = _documentSchema(false);
const COMPLETE_DOCUMENT_SCHEMA = _documentSchema(true);

/**
 * Validates a theme file. A theme that names `extends` may be sparse; a
 * theme without it must define every token, so it can stand alone. Throws a
 * `ZodError` whose issue paths name the offending tokens. Use it before
 * resolving or saving any theme that did not come from this process.
 */
export function parseVideoThemeDocument(value: unknown): VideoThemeDocument {
  const document = SPARSE_DOCUMENT_SCHEMA.parse(value);
  if (document.extends === undefined) {
    COMPLETE_DOCUMENT_SCHEMA.parse(value);
  }
  return document as VideoThemeDocument;
}

/**
 * The JSON Schema for theme files, with every token's label, description,
 * unit, surface, and editor control. Served to theme generators such as
 * `/impeccable` so they can write valid themes without reading this code.
 */
export function createVideoThemeJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(SPARSE_DOCUMENT_SCHEMA);
}
```

- [ ] **Step 6: Run the schema tests to verify they pass**

Run the Step 3 command. Expected: 10 passing.

If "the classic theme defines every token" fails, the error names the path. Fix the JSON or the catalog so they match exactly; both are strict.

- [ ] **Step 7: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

```bash
git add src/videoTheme/tokenValueSchemas src/videoTheme/videoThemeSchema themes/classic.theme.json
git commit -m "feat(video-producer): validate video themes and add the classic theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: Built-in themes and drift against today's constants

**Files:**
- Create: `src/videoTheme/createEasingFromToken/createEasingFromToken.ts`
- Test: `src/videoTheme/createEasingFromToken/createEasingFromToken.test.ts`
- Create: `src/videoTheme/builtInVideoThemes/builtInVideoThemes.ts`
- Test: `src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts`

- [ ] **Step 1: Write the failing easing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { bezier, EASE } from "../../motion";
import { createEasingFromToken } from "./createEasingFromToken";

const SAMPLES = Array.from({ length: 21 }, (_, index) => index / 20);

test("a bezier token eases exactly like the same bezier", () => {
  const easing = createEasingFromToken([0.16, 1, 0.3, 1]);
  const expected = bezier(0.16, 1, 0.3, 1);
  for (const progress of SAMPLES) {
    assert.equal(easing(progress), expected(progress));
  }
});

test("a cubic power token matches EASE.inOutCubic", () => {
  const easing = createEasingFromToken({ powerInOut: 3 });
  for (const progress of SAMPLES) {
    assert.ok(Math.abs(easing(progress) - EASE.inOutCubic(progress)) < 1e-12);
  }
});
```

- [ ] **Step 2: Write the failing built-in drift tests**

The tests read the raw JSON import, which TypeScript already types, instead of the parsed document (whose values are `unknown`).

`src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import classicJson from "../../../themes/classic.theme.json";
import { DEFAULT_ACCENT, DEFAULT_BACKGROUND } from "../../gallery/palette";
import { DUR, EASE, pop, STAGGER, STAGGER_COLUMN } from "../../motion";
import {
  getVelocityBlur,
  MOTION_PRESETS,
  resolveMotionSettings,
} from "../../motion-components/motionSettings";
import { STOCK } from "../../stock/stockPalette";
import { createEasingFromToken } from "../createEasingFromToken/createEasingFromToken";
import { BUILT_IN_VIDEO_THEMES } from "./builtInVideoThemes";
import type { EasingValue } from "../videoTheme.types";

const atomic = classicJson.other.video.atomic;
const semantic = classicJson.other.video.semantic;
const SAMPLES = Array.from({ length: 21 }, (_, index) => index / 20);

test("classic's swatches equal the stock palette", () => {
  for (const [name, color] of Object.entries(STOCK)) {
    assert.equal(atomic.swatch[name as keyof typeof atomic.swatch], color, name);
  }
});

test("classic's durations equal DUR", () => {
  assert.deepEqual(
    {
      press: atomic.duration["2xs"],
      chip: atomic.duration.xs,
      whip: atomic.duration.sm,
      panel: atomic.duration.md,
      sheet: atomic.duration.lg,
      word: atomic.duration.xl,
      hero: atomic.duration["2xl"],
    },
    { ...DUR },
  );
});

test("classic's curves equal EASE", () => {
  for (const [name, curve] of Object.entries(EASE)) {
    const easing = createEasingFromToken(
      atomic.easing[name as keyof typeof atomic.easing] as EasingValue,
    );
    for (const progress of SAMPLES) {
      assert.ok(Math.abs(easing(progress) - curve(progress)) < 1e-12, name);
    }
  }
});

test("classic's staggers equal STAGGER and STAGGER_COLUMN", () => {
  assert.equal(atomic.stagger.sm, STAGGER);
  assert.equal(atomic.stagger.xs, STAGGER_COLUMN);
});

test("classic's spring lands exactly like pop's default spring", () => {
  for (let frame = 0; frame <= DUR.sheet; frame += 1) {
    assert.equal(pop(frame, 0, atomic.spring.pop, atomic.duration.lg), pop(frame, 0));
  }
});

test("classic's camera presets equal MOTION_PRESETS", () => {
  for (const [name, preset] of Object.entries(MOTION_PRESETS)) {
    const key = name as keyof typeof atomic.cameraSpeed;
    assert.equal(atomic.cameraSpeed[key], preset.speed, name);
    assert.equal(atomic.shutter[key], preset.shutterAngle, name);
    assert.equal(
      semantic.camera.presets[key].easing,
      preset.easing === "ease-in-out" ? "$atomic.easing.inOut" : "$atomic.easing.inOutCubic",
      name,
    );
  }
});

test("classic's blur samples equal the motion settings default", () => {
  assert.equal(atomic.samples.md, resolveMotionSettings().samples);
});

test("classic's velocity blur equals getVelocityBlur", () => {
  for (const distance of [0, 10, 40, 100]) {
    assert.equal(
      getVelocityBlur(distance),
      Math.min(atomic.velocityBlur.max, distance * atomic.velocityBlur.factor),
    );
  }
});

test("classic's accent and ground are the Atlas gallery defaults", () => {
  assert.equal(classicJson.colors.primary[classicJson.primaryShade.dark], DEFAULT_ACCENT);
  assert.equal(atomic.swatch.ground, DEFAULT_BACKGROUND);
});

test("the built-in library holds classic", () => {
  assert.equal(BUILT_IN_VIDEO_THEMES.get("classic")?.label, "Classic");
});
```

- [ ] **Step 3: Run both to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/createEasingFromToken/createEasingFromToken.test.ts src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts`
Expected: FAIL, modules not found.

- [ ] **Step 4: Implement the easing builder**

`src/videoTheme/createEasingFromToken/createEasingFromToken.ts`:

```ts
import { bezier } from "../../motion";
import type { EasingValue } from "../videoTheme.types";

/**
 * The easing function for an easing token: a CSS-style cubic Bezier, or a
 * symmetric power curve (`{ powerInOut: 3 }` is cubic in-out). Use it where
 * a renderer animates with a themed curve, for example a draw-on ramp.
 */
export function createEasingFromToken(
  easing: EasingValue,
): (progress: number) => number {
  if ("powerInOut" in easing) {
    const exponent = easing.powerInOut;
    return (progress) =>
      progress < 0.5
        ? 2 ** (exponent - 1) * progress ** exponent
        : 1 - (-2 * progress + 2) ** exponent / 2;
  }
  const [x1, y1, x2, y2] = easing;
  return bezier(x1, y1, x2, y2);
}
```

- [ ] **Step 5: Implement the built-in library**

`src/videoTheme/builtInVideoThemes/builtInVideoThemes.ts`:

```ts
import classicTheme from "../../../themes/classic.theme.json";
import { parseVideoThemeDocument } from "../videoThemeSchema/videoThemeSchema";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemeSource,
} from "../videoTheme.types";

/** Ids of the themes bundled with the producer. They are read-only. */
export const BUILT_IN_VIDEO_THEME_IDS = ["classic"] as const;

/**
 * Bundled built-in themes by id, validated at load. Every render can resolve
 * these without a server, for example a Remotion Studio preview or a stock
 * card rendered outside any theme provider.
 */
export const BUILT_IN_VIDEO_THEMES: VideoThemeLibrary = new Map(
  [classicTheme].map((value) => {
    const document = parseVideoThemeDocument(value);
    return [document.id, document] as const;
  }),
);

/** `classic` from the built-in library: the theme of anything left unthemed. */
export const DEFAULT_VIDEO_THEME_SOURCE: VideoThemeSource = {
  library: BUILT_IN_VIDEO_THEMES,
  themeId: "classic",
};

/**
 * A library of the built-in themes plus custom ones, such as themes read
 * from `themes/` or an unsaved copy in the editor. A custom theme cannot
 * replace a built-in id.
 */
export function createVideoThemeLibrary(
  documents: readonly VideoThemeDocument[],
): VideoThemeLibrary {
  return new Map([
    ...BUILT_IN_VIDEO_THEMES,
    ...documents
      .filter((document) => !BUILT_IN_VIDEO_THEMES.has(document.id))
      .map((document) => [document.id, document] as const),
  ]);
}
```

- [ ] **Step 6: Run both test files to verify they pass**

Run the Step 3 command. Expected: 12 passing.

- [ ] **Step 7: Commit**

```bash
git add src/videoTheme/createEasingFromToken src/videoTheme/builtInVideoThemes
git commit -m "test(video-producer): keep the classic theme equal to today's motion constants" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Normalizing resolved values

**Files:**
- Create: `src/videoTheme/normalizeTokenValue/normalizeTokenValue.ts`
- Test: `src/videoTheme/normalizeTokenValue/normalizeTokenValue.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { normalizeTokenValue, parseCssPixels } from "./normalizeTokenValue";

test("Mantine rem lengths resolve to pixels at the default scale", () => {
  assert.equal(parseCssPixels("calc(0.75rem * var(--mantine-scale))"), 12);
});

test("pixel strings resolve to numbers", () => {
  assert.deepEqual(normalizeTokenValue({ kind: "length" }, "48px"), { ok: true, value: 48 });
});

test("numeric strings from Mantine resolve to numbers", () => {
  assert.deepEqual(normalizeTokenValue({ kind: "fontWeight" }, "600"), { ok: true, value: 600 });
});

test("a Mantine font stack resolves to its registered font", () => {
  assert.deepEqual(
    normalizeTokenValue({ kind: "fontFamily" }, "Figtree, ui-sans-serif, system-ui, sans-serif"),
    { ok: true, value: "figtree" },
  );
});

test("a colour token rejects a length", () => {
  assert.equal(normalizeTokenValue({ kind: "color" }, "18px").ok, false);
});

test("a colour becomes a solid fill and a gradient stays a gradient", () => {
  assert.deepEqual(normalizeTokenValue({ kind: "fill" }, "#0b1219"), {
    ok: true,
    value: { type: "solid", color: "#0b1219" },
  });
  assert.deepEqual(
    normalizeTokenValue({ kind: "fill" }, { from: "#000000", to: "#ffffff", deg: 90 }),
    { ok: true, value: { type: "gradient", from: "#000000", to: "#ffffff", deg: 90 } },
  );
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/normalizeTokenValue/normalizeTokenValue.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import {
  colorValueSchema,
  createValueSchemaFromDefinition,
  gradientValueSchema,
} from "../tokenValueSchemas/tokenValueSchemas";
import {
  getVideoFontIdFromStack,
  VIDEO_FONT_REGISTRY,
} from "../videoFontRegistry/videoFontRegistry";
import type { FieldSpec } from "../tokenCatalog/defineTokens";

/** A value converted to its kind, or why it could not be. */
export type NormalizedTokenValue =
  | Readonly<{ ok: true; value: unknown }>
  | Readonly<{ ok: false; message: string }>;

const NUMERIC_KINDS = new Set([
  "length",
  "number",
  "opacity",
  "duration",
  "letterSpacing",
  "fontWeight",
]);
const PIXELS_PATTERN = /^(-?\d*\.?\d+)px$/;
const REM_PATTERN = /^(-?\d*\.?\d+)rem$/;
const MANTINE_REM_PATTERN = /^calc\((-?\d*\.?\d+)rem \* var\(--mantine-scale\)\)$/;
const NUMBER_PATTERN = /^-?\d*\.?\d+$/;

/**
 * Pixels from a number or a Mantine CSS length: `18px`, `1.5rem`,
 * `calc(0.75rem * var(--mantine-scale))`, or a bare numeric string. Rem
 * values use the 16 px root at scale 1. Undefined when the value is none of
 * these.
 */
export function parseCssPixels(value: unknown): number | undefined {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : undefined;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const text = value.trim();
  const pixels = PIXELS_PATTERN.exec(text);
  if (pixels) {
    return Number(pixels[1]);
  }
  const rem = REM_PATTERN.exec(text) ?? MANTINE_REM_PATTERN.exec(text);
  if (rem) {
    return Number(rem[1]) * 16;
  }
  return NUMBER_PATTERN.test(text) ? Number(text) : undefined;
}

function _fail(field: FieldSpec, value: unknown): NormalizedTokenValue {
  return {
    ok: false,
    message: `Expected a ${field.kind}, found ${JSON.stringify(value)}`,
  };
}

function _normalizeFont(field: FieldSpec, value: unknown): NormalizedTokenValue {
  if (typeof value === "string" && Object.hasOwn(VIDEO_FONT_REGISTRY, value)) {
    return { ok: true, value };
  }
  const id = typeof value === "string" ? getVideoFontIdFromStack(value) : undefined;
  return id ? { ok: true, value: id } : _fail(field, value);
}

function _normalizeFill(field: FieldSpec, value: unknown): NormalizedTokenValue {
  if (colorValueSchema.safeParse(value).success) {
    return { ok: true, value: { type: "solid", color: value } };
  }
  const gradient = gradientValueSchema.safeParse(value);
  return gradient.success
    ? { ok: true, value: { type: "gradient", ...gradient.data } }
    : _fail(field, value);
}

/**
 * Converts a literal that a reference reached into the value its consuming
 * token kind expects. Mantine stores sizes and weights as CSS strings and
 * fonts as stacks; renderers get numbers and registered font ids.
 */
export function normalizeTokenValue(
  field: FieldSpec,
  value: unknown,
): NormalizedTokenValue {
  if (NUMERIC_KINDS.has(field.kind)) {
    const number = parseCssPixels(value);
    return number === undefined ? _fail(field, value) : { ok: true, value: number };
  }
  if (field.kind === "fontFamily") {
    return _normalizeFont(field, value);
  }
  if (field.kind === "fill") {
    return _normalizeFill(field, value);
  }
  const parsed = createValueSchemaFromDefinition(field)?.safeParse(value);
  return parsed?.success ? { ok: true, value: parsed.data } : _fail(field, value);
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/videoTheme/normalizeTokenValue
git commit -m "feat(video-producer): normalize Mantine values reached by token references" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: CSS value strings

**Files:**
- Create: `src/videoTheme/cssValues/cssValues.ts`
- Test: `src/videoTheme/cssValues/cssValues.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildColorWithAlpha,
  elevationToBoxShadow,
  elevationToDropShadowFilter,
  fillToCss,
  textShadowToCss,
} from "./cssValues";

const FLOATING = {
  layers: [{ offsetX: 0, offsetY: 16, blur: 22, spread: 0, alpha: 1 }],
  color: "#06101455",
};

test("an opaque colour keeps its value", () => {
  assert.equal(buildColorWithAlpha("#51a7ff", 1), "#51a7ff");
});

test("a translucent colour mixes toward transparent", () => {
  assert.equal(buildColorWithAlpha("#51a7ff", 0.25), "color-mix(in srgb, #51a7ff 25%, transparent)");
});

test("an elevation becomes a box shadow with every layer", () => {
  assert.equal(elevationToBoxShadow(FLOATING), "0px 16px 22px 0px #06101455");
});

test("an elevation becomes a drop-shadow filter", () => {
  assert.equal(elevationToDropShadowFilter(FLOATING), "drop-shadow(0px 16px 22px #06101455)");
});

test("an elevation with no layers casts no shadow", () => {
  assert.equal(elevationToBoxShadow({ layers: [], color: "#000000" }), "none");
  assert.equal(elevationToDropShadowFilter({ layers: [], color: "#000000" }), "none");
});

test("a text shadow applies its alpha to its colour", () => {
  assert.equal(
    textShadowToCss({ offsetX: 0, offsetY: 2, blur: 4, alpha: 0.5, color: "#000000" }),
    "0px 2px 4px color-mix(in srgb, #000000 50%, transparent)",
  );
});

test("a gradient fill becomes a linear gradient", () => {
  assert.equal(
    fillToCss({ type: "gradient", from: "#0b1219", to: "#142632", deg: 180 }),
    "linear-gradient(180deg, #0b1219, #142632)",
  );
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/cssValues/cssValues.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
/*
 * CSS strings for resolved theme values, shared by the CSS variables, the
 * Mantine shadow derivation, and HTML layers that style themselves inline.
 */
import type {
  ResolvedElevation,
  ResolvedFill,
  ResolvedTextShadow,
} from "../videoTheme.types";

/** A colour at an opacity, mixed toward transparent so any colour format works. */
export function buildColorWithAlpha(color: string, alpha: number): string {
  if (alpha >= 1) {
    return color;
  }
  return `color-mix(in srgb, ${color} ${Number((alpha * 100).toFixed(4))}%, transparent)`;
}

/** A CSS `box-shadow` value with one shadow per elevation layer. */
export function elevationToBoxShadow(elevation: ResolvedElevation): string {
  if (elevation.layers.length === 0) {
    return "none";
  }
  return elevation.layers
    .map(
      (layer) =>
        `${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${layer.spread}px ${buildColorWithAlpha(elevation.color, layer.alpha)}`,
    )
    .join(", ");
}

/**
 * A CSS `filter` value with one `drop-shadow()` per elevation layer, for
 * shapes whose outline is not a box. `drop-shadow` has no spread, so spread
 * is ignored.
 */
export function elevationToDropShadowFilter(elevation: ResolvedElevation): string {
  if (elevation.layers.length === 0) {
    return "none";
  }
  return elevation.layers
    .map(
      (layer) =>
        `drop-shadow(${layer.offsetX}px ${layer.offsetY}px ${layer.blur}px ${buildColorWithAlpha(elevation.color, layer.alpha)})`,
    )
    .join(" ");
}

/** A CSS `text-shadow` value. */
export function textShadowToCss(shadow: ResolvedTextShadow): string {
  return `${shadow.offsetX}px ${shadow.offsetY}px ${shadow.blur}px ${buildColorWithAlpha(shadow.color, shadow.alpha)}`;
}

/** A CSS `background` value for a ground fill. */
export function fillToCss(fill: ResolvedFill): string {
  return fill.type === "solid"
    ? fill.color
    : `linear-gradient(${fill.deg}deg, ${fill.from}, ${fill.to})`;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 7 passing.

- [ ] **Step 5: Commit**

```bash
git add src/videoTheme/cssValues
git commit -m "feat(video-producer): format themed shadows, fills, and colours as CSS" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Layer merge, `extends`, and scoped overrides

**Files:**
- Create: `src/videoTheme/VideoThemeError/VideoThemeError.ts`
- Create: `src/videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers.ts`
- Test: `src/videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers.test.ts`

- [ ] **Step 1: Write the error type**

`src/videoTheme/VideoThemeError/VideoThemeError.ts`:

```ts
import type { VideoThemeIssue } from "../videoTheme.types";

/**
 * A theme that cannot resolve: a missing or cyclic reference, an unknown
 * theme, or a rule such as measured fonts for graphic text. Carries every
 * issue by token path, so a save route can report them and the editor can
 * mark the offending controls.
 */
export class VideoThemeError extends Error {
  readonly issues: readonly VideoThemeIssue[];

  constructor(issues: readonly VideoThemeIssue[]) {
    super(issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n"));
    this.name = "VideoThemeError";
    this.issues = issues;
  }
}
```

- [ ] **Step 2: Write the failing merge tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { createVideoThemeLibrary } from "../builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../getResolvedTokenValue/getResolvedTokenValue";
import { mergeVideoThemeLayers } from "./mergeVideoThemeLayers";
import type { VideoThemeDocument } from "../videoTheme.types";

function _theme(
  id: string,
  base: string,
  extra: Partial<VideoThemeDocument> = {},
): VideoThemeDocument {
  return { schemaVersion: 1, id, label: id, extends: base, ...extra };
}

function _swatch(name: string, color: string) {
  return { other: { video: { atomic: { swatch: { [name]: color } } } } };
}

function _ground(patch: object): unknown {
  return getValueAtPath(patch, ["other", "video", "atomic", "swatch", "ground"]);
}

const STUDIO = _theme("studio", "classic", {
  ..._swatch("ground", "#201510"),
  overrides: {
    "data-pipeline": _swatch("ground", "#111111"),
    "shared-object-handoff": _swatch("ground", "#222222"),
  },
});

test("a theme's values win over the theme it extends", () => {
  const merged = mergeVideoThemeLayers(createVideoThemeLibrary([STUDIO]), "studio");
  assert.equal(_ground(merged), "#201510");
  assert.equal(
    getValueAtPath(merged, ["other", "video", "atomic", "swatch", "mint"]),
    "#9fefca",
  );
});

test("overrides apply in scope order, the last id winning", () => {
  const library = createVideoThemeLibrary([STUDIO]);
  const merged = mergeVideoThemeLayers(library, "studio", {
    overrideIds: ["data-pipeline", "shared-object-handoff"],
  });
  assert.equal(_ground(merged), "#222222");
});

test("overrides are not inherited through extends", () => {
  const library = createVideoThemeLibrary([STUDIO, _theme("child", "studio")]);
  const merged = mergeVideoThemeLayers(library, "child", {
    overrideIds: ["data-pipeline"],
  });
  assert.equal(_ground(merged), "#201510");
});

test("patches apply after overrides", () => {
  const library = createVideoThemeLibrary([STUDIO]);
  const merged = mergeVideoThemeLayers(library, "studio", {
    overrideIds: ["data-pipeline"],
    patches: [_swatch("ground", "#333333")],
  });
  assert.equal(_ground(merged), "#333333");
});

test("an extends cycle is reported", () => {
  const library = createVideoThemeLibrary([_theme("a", "b"), _theme("b", "a")]);
  assert.throws(() => mergeVideoThemeLayers(library, "a"), /extends itself/);
});

test("an unknown extends target is reported", () => {
  const library = createVideoThemeLibrary([_theme("orphan", "missing")]);
  assert.throws(() => mergeVideoThemeLayers(library, "orphan"), /Unknown theme "missing"/);
});
```

- [ ] **Step 3: Write the path helpers the tests and the resolver share**

`src/videoTheme/getResolvedTokenValue/getResolvedTokenValue.ts`:

```ts
import { isMantineTokenRoot } from "../tokenCatalog/tokenCatalog";
import type { ResolvedVideoTheme } from "../videoTheme.types";

/**
 * The value at a path of keys inside nested objects and arrays, or
 * undefined. Array indexes are keys too, so `["colors", "primary", "4"]`
 * reads a palette shade.
 */
export function getValueAtPath(source: unknown, path: readonly string[]): unknown {
  let value: unknown = source;
  for (const key of path) {
    if (typeof value !== "object" || value === null) {
      return undefined;
    }
    value = (value as Readonly<Record<string, unknown>>)[key];
  }
  return value;
}

/**
 * The resolved value of the token at a path such as `color.accent`,
 * `atomic.swatch.mint`, `components.ProgressBar.height`, or a Mantine key
 * such as `fontSizes.md`. Use it where code holds a token path rather than
 * a typed property, for example the editor or the contrast report.
 */
export function getResolvedTokenValue(
  theme: Pick<ResolvedVideoTheme, "atomic" | "semantic" | "components"> &
    Partial<Pick<ResolvedVideoTheme, "mantine">>,
  path: string,
): unknown {
  const [root, ...rest] = path.split(".");
  if (root === "atomic") {
    return getValueAtPath(theme.atomic, rest);
  }
  if (root === "components") {
    return getValueAtPath(theme.components, rest);
  }
  if (isMantineTokenRoot(root)) {
    return getValueAtPath(theme.mantine, [root, ...rest]);
  }
  return getValueAtPath(theme.semantic, [root, ...rest]);
}
```

- [ ] **Step 4: Run the merge tests to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers.test.ts`
Expected: FAIL, `Cannot find module './mergeVideoThemeLayers'`.

- [ ] **Step 5: Implement the merge**

`src/videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers.ts`:

```ts
import { mergeThemeOverrides, type MantineThemeOverride } from "@mantine/core";
import { VideoThemeError } from "../VideoThemeError/VideoThemeError";
import type {
  VideoThemeDocument,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeScope,
} from "../videoTheme.types";

const DOCUMENT_ONLY_KEYS: readonly string[] = [
  "$schema",
  "schemaVersion",
  "id",
  "label",
  "extends",
  "overrides",
];

function _toPatch(document: VideoThemeDocument): VideoThemePatch {
  return Object.fromEntries(
    Object.entries(document).filter(([key]) => !DOCUMENT_ONLY_KEYS.includes(key)),
  );
}

/**
 * A theme and every theme it extends, root first. Throws a
 * `VideoThemeError` for an unknown theme or an `extends` cycle. Use it to
 * know which documents a theme depends on, for example to snapshot them.
 */
export function getExtendsChainFromThemeId(
  library: VideoThemeLibrary,
  themeId: string,
): readonly VideoThemeDocument[] {
  const chain: VideoThemeDocument[] = [];
  const seen = new Set<string>();
  let currentId: string | undefined = themeId;
  while (currentId !== undefined) {
    if (seen.has(currentId)) {
      throw new VideoThemeError([
        { path: "extends", message: `Theme "${themeId}" extends itself through "${currentId}"` },
      ]);
    }
    seen.add(currentId);
    const document = library.get(currentId);
    if (!document) {
      throw new VideoThemeError([{ path: "extends", message: `Unknown theme "${currentId}"` }]);
    }
    chain.unshift(document);
    currentId = document.extends;
  }
  return chain;
}

/**
 * Merges a theme into one sparse patch over Mantine's defaults, with
 * Mantine's `mergeThemeOverrides`: `classic`, then the `extends` chain from
 * its root, then the theme, then the theme's own override for each id in
 * `scope.overrideIds` in order, then `scope.patches`. Overrides declared by
 * a theme it extends are skipped: per-item art direction belongs to the
 * theme that declares it.
 */
export function mergeVideoThemeLayers(
  library: VideoThemeLibrary,
  themeId: string,
  scope: VideoThemeScope = {},
): VideoThemePatch {
  const classic = library.get("classic");
  if (!classic) {
    throw new VideoThemeError([{ path: "id", message: "The classic theme is missing" }]);
  }
  const chain = getExtendsChainFromThemeId(library, themeId);
  const theme = chain[chain.length - 1];
  const overrides = (scope.overrideIds ?? []).flatMap((id) => {
    const override = theme.overrides?.[id];
    return override ? [override] : [];
  });
  const layers: readonly VideoThemePatch[] = [
    ...[classic, ...chain.filter((document) => document !== classic)].map(_toPatch),
    ...overrides,
    ...(scope.patches ?? []),
  ];
  return mergeThemeOverrides(...(layers as MantineThemeOverride[])) as VideoThemePatch;
}
```

- [ ] **Step 6: Run the merge tests to verify they pass**

Run the Step 4 command. Expected: 6 passing.

- [ ] **Step 7: Commit**

```bash
git add src/videoTheme/VideoThemeError src/videoTheme/getResolvedTokenValue src/videoTheme/mergeVideoThemeLayers
git commit -m "feat(video-producer): merge video theme layers and per-item overrides" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: The resolver

**Files:**
- Create: `src/videoTheme/resolveVideoTheme/resolveTokenTiers.ts`
- Create: `src/videoTheme/resolveVideoTheme/resolveVideoTheme.ts`
- Test: `src/videoTheme/resolveVideoTheme/resolveVideoTheme.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../builtInVideoThemes/builtInVideoThemes";
import { VideoThemeError } from "../VideoThemeError/VideoThemeError";
import { resolveVideoTheme } from "./resolveVideoTheme";
import type { VideoThemeDocument, VideoThemePatch } from "../videoTheme.types";

const LIGHT_GROUND: VideoThemePatch = {
  other: { video: { atomic: { swatch: { ground: "#f8fafc" } } } },
};

function _extending(id: string, extra: Partial<VideoThemeDocument>): VideoThemeDocument {
  return { schemaVersion: 1, id, label: id, extends: "classic", ...extra };
}

function _semantic(semantic: object) {
  return { other: { video: { semantic } } };
}

function _issuesOf(run: () => unknown): string {
  try {
    run();
  } catch (error) {
    if (error instanceof VideoThemeError) {
      return error.issues.map((issue) => `${issue.path}: ${issue.message}`).join("\n");
    }
    throw error;
  }
  return "";
}

test("classic resolves the gallery default accent on its dark ground", () => {
  const theme = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic");
  assert.equal(theme.isDarkGround, true);
  assert.equal(theme.semantic.color.accent, "#51a7ff");
});

test("colour pairs switch to their on-light value on a light ground", () => {
  const theme = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [LIGHT_GROUND] });
  assert.equal(theme.isDarkGround, false);
  assert.equal(theme.semantic.color.text, "#182d27");
  assert.equal(theme.semantic.color.accent, "#0b4aea");
});

test("type styles resolve their size, weight, and font from Mantine headings", () => {
  const heading = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic").semantic.text.stage.heading;
  assert.deepEqual(
    [heading.fontFamily, heading.fontSize, heading.fontWeight, heading.lineHeight, heading.letterSpacing],
    ["Figtree, ui-sans-serif, system-ui, sans-serif", 48, 600, 1.12, -0.025],
  );
});

test("a reference to a missing token is reported with its path", () => {
  const library = createVideoThemeLibrary([
    _extending("broken", _semantic({ color: { accent: "$atomic.swatch.nope" } })),
  ]);
  assert.match(_issuesOf(() => resolveVideoTheme(library, "broken")), /^color\.accent: .*nope/m);
});

test("a reference cycle is reported", () => {
  const library = createVideoThemeLibrary([
    _extending("loop", _semantic({ color: { accent: "$color.accentAlt", accentAlt: "$color.accent" } })),
  ]);
  assert.match(_issuesOf(() => resolveVideoTheme(library, "loop")), /Reference cycle/);
});

test("graphic text rejects a font without measured widths", () => {
  const library = createVideoThemeLibrary([
    _extending("figtree-labels", _semantic({ text: { graphic: { label: { family: "$atomic.fontFamily.figtree" } } } })),
  ]);
  assert.match(_issuesOf(() => resolveVideoTheme(library, "figtree-labels")), /^text\.graphic\.label: /m);
});

test("Mantine shadows derive from atomic shadows and the shadow colour", () => {
  assert.equal(
    resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic").mantine.shadows.lg,
    "0px 16px 22px 0px #06101455",
  );
});

test("component defaults reach Mantine's theme for useProps", () => {
  const theme = resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic");
  assert.equal(theme.mantine.components.ProgressBar?.defaultProps?.height, 3);
});

test("a nested preset override ranks below the composition override", () => {
  const library = createVideoThemeLibrary([
    _extending("studio", {
      overrides: {
        "data-pipeline": { other: { video: { atomic: { swatch: { cyan: "#111111", orange: "#222222" } } } } },
        "shared-object-handoff": { other: { video: { atomic: { swatch: { cyan: "#333333" } } } } },
      },
    }),
  ]);
  const theme = resolveVideoTheme(library, "studio", {
    overrideIds: ["data-pipeline", "shared-object-handoff"],
  });
  assert.equal(theme.semantic.color.accentAlt, "#333333");
  assert.equal(theme.semantic.color.highlight, "#222222");
});

test("the hash ignores authoring key order", () => {
  const library = createVideoThemeLibrary([
    _extending("one", { other: { video: { atomic: { swatch: { mint: "#000001", cyan: "#000002" } } } } }),
    _extending("two", { other: { video: { atomic: { swatch: { cyan: "#000002", mint: "#000001" } } } } }),
  ]);
  assert.equal(resolveVideoTheme(library, "one").hash, resolveVideoTheme(library, "two").hash);
});

test("the hash changes when a resolved value changes", () => {
  assert.notEqual(
    resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic").hash,
    resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic", { patches: [LIGHT_GROUND] }).hash,
  );
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/resolveVideoTheme/resolveVideoTheme.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement tier resolution**

`src/videoTheme/resolveVideoTheme/resolveTokenTiers.ts`:

```ts
import { luminance, type MantineTheme } from "@mantine/core";
import { getValueAtPath } from "../getResolvedTokenValue/getResolvedTokenValue";
import { normalizeTokenValue } from "../normalizeTokenValue/normalizeTokenValue";
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "../themeReferences/themeReferences";
import {
  COMPOSITE_TOKEN_FIELDS,
  isCompositeTokenKind,
  isTokenDefinition,
  isTokenScale,
  type CompositeTokenKind,
  type FieldSpec,
} from "../tokenCatalog/defineTokens";
import { VIDEO_TOKEN_CATALOG } from "../tokenCatalog/tokenCatalog";
import { VIDEO_FONT_REGISTRY, type VideoFontId } from "../videoFontRegistry/videoFontRegistry";
import type {
  CatalogNode,
  GlowValue,
  TextShadowValue,
  TokenReference,
  VideoThemeIssue,
  VideoThemePatch,
} from "../videoTheme.types";

type ResolutionContext = Readonly<{
  atomic: unknown;
  semantic: unknown;
  components: unknown;
  mantine: MantineTheme;
  isDarkGround: boolean;
  /** True while resolving the ground itself, which cannot depend on the ground. */
  forbidColorPairs: boolean;
  issues: VideoThemeIssue[];
}>;

/** Resolved tiers of one merged theme, plus every problem found on the way. */
export type ResolvedTokenTiers = Readonly<{
  atomic: unknown;
  semantic: unknown;
  components: unknown;
  isDarkGround: boolean;
  issues: readonly VideoThemeIssue[];
}>;

type UnknownRecord = Readonly<Record<string, unknown>>;

function _isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function _isColorPair(value: unknown): value is Readonly<{ onDark: unknown; onLight: unknown }> {
  return _isRecord(value) && "onDark" in value && "onLight" in value;
}

function _primaryColor(context: ResolutionContext): unknown {
  const shade = context.mantine.primaryShade;
  const index =
    typeof shade === "number" ? shade : context.isDarkGround ? shade.dark : shade.light;
  return context.mantine.colors[context.mantine.primaryColor]?.[index];
}

function _lookup(context: ResolutionContext, reference: TokenReference): unknown {
  const target = getTargetFromTokenReference(reference);
  if (target.tier === "primary") {
    return _primaryColor(context);
  }
  const source =
    target.tier === "mantine"
      ? context.mantine
      : target.tier === "atomic"
        ? context.atomic
        : context.semantic;
  return getValueAtPath(source, target.path);
}

function _resolveReference(
  context: ResolutionContext,
  reference: TokenReference,
  field: FieldSpec,
  path: string,
  stack: readonly string[],
): unknown {
  if (stack.includes(reference)) {
    context.issues.push({ path, message: `Reference cycle: ${[...stack, reference].join(" → ")}` });
    return undefined;
  }
  const target = _lookup(context, reference);
  if (target === undefined) {
    context.issues.push({ path, message: `${reference} does not point at a token` });
    return undefined;
  }
  return _resolveValue(context, target, field, path, [...stack, reference]);
}

function _resolveValue(
  context: ResolutionContext,
  raw: unknown,
  field: FieldSpec,
  path: string,
  stack: readonly string[],
): unknown {
  if (isTokenReference(raw)) {
    return _resolveReference(context, raw, field, path, stack);
  }
  if (field.kind === "color" && _isColorPair(raw)) {
    if (context.forbidColorPairs) {
      context.issues.push({ path, message: "The ground colour cannot depend on the ground" });
      return undefined;
    }
    return _resolveValue(context, context.isDarkGround ? raw.onDark : raw.onLight, field, path, stack);
  }
  if (isCompositeTokenKind(field.kind)) {
    return _resolveComposite(context, field.kind, raw, path, stack);
  }
  const normalized = normalizeTokenValue(field, raw);
  if (!normalized.ok) {
    context.issues.push({ path, message: normalized.message });
    return undefined;
  }
  return normalized.value;
}

function _finishTypeStyle(fields: UnknownRecord): unknown {
  const fontId = fields.family as VideoFontId | undefined;
  if (fontId === undefined) {
    return undefined;
  }
  const color = fields.color as string;
  const textShadow = fields.textShadow as TextShadowValue | undefined;
  const glow = fields.glow as GlowValue | undefined;
  return {
    fontId,
    fontFamily: VIDEO_FONT_REGISTRY[fontId].stack,
    fontSize: fields.size,
    fontWeight: fields.weight,
    ...(fields.lineHeight === undefined ? {} : { lineHeight: fields.lineHeight }),
    ...(fields.letterSpacing === undefined ? {} : { letterSpacing: fields.letterSpacing }),
    ...(fields.transform === undefined ? {} : { textTransform: fields.transform }),
    ...(fields.numeric === undefined ? {} : { fontVariantNumeric: fields.numeric }),
    color,
    alpha: fields.alpha ?? 1,
    ...(textShadow ? { textShadow: { ...textShadow, color } } : {}),
    ...(glow ? { glow: { ...glow, color } } : {}),
    ...(fields.stroke === undefined ? {} : { strokeWidth: fields.stroke }),
  };
}

function _resolveComposite(
  context: ResolutionContext,
  kind: CompositeTokenKind,
  raw: unknown,
  path: string,
  stack: readonly string[],
): unknown {
  if (!_isRecord(raw)) {
    context.issues.push({ path, message: `Expected a ${kind}` });
    return undefined;
  }
  const spec = COMPOSITE_TOKEN_FIELDS[kind];
  const required: readonly string[] = spec.required;
  const fields: Readonly<Record<string, FieldSpec>> = spec.fields;
  const resolved: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(fields)) {
    if (raw[name] === undefined) {
      if (required.includes(name)) {
        context.issues.push({ path: `${path}.${name}`, message: "Missing" });
      }
      continue;
    }
    resolved[name] = _resolveValue(context, raw[name], field, `${path}.${name}`, stack);
  }
  return kind === "typeStyle" ? _finishTypeStyle(resolved) : resolved;
}

function _resolveNode(
  context: ResolutionContext,
  node: CatalogNode,
  raw: unknown,
  path: string,
): unknown {
  if (isTokenDefinition(node)) {
    if (raw === undefined) {
      context.issues.push({ path, message: "Missing token" });
      return undefined;
    }
    return _resolveValue(context, raw, node, path, []);
  }
  if (isTokenScale(node)) {
    const entries = _isRecord(raw) ? Object.entries(raw) : [];
    return Object.fromEntries(
      entries.map(([key, value]) => [key, _resolveValue(context, value, node.scale, `${path}.${key}`, [])]),
    );
  }
  return Object.fromEntries(
    Object.entries(node).map(([key, child]) => [
      key,
      _resolveNode(context, child, _isRecord(raw) ? raw[key] : undefined, path ? `${path}.${key}` : key),
    ]),
  );
}

function _resolveComponents(context: ResolutionContext): unknown {
  return Object.fromEntries(
    Object.entries(VIDEO_TOKEN_CATALOG.components).map(([name, group]) => [
      name,
      _resolveNode(
        context,
        group,
        getValueAtPath(context.components, [name, "defaultProps"]),
        `components.${name}`,
      ),
    ]),
  );
}

/**
 * Resolves every catalog token of a merged theme: follows `$` references,
 * picks `{ onDark, onLight }` colours by the ground's luminance, fills
 * composite tokens, and converts Mantine CSS strings to numbers. Collects
 * issues instead of throwing so one pass reports every problem.
 */
export function resolveTokenTiers(
  options: Readonly<{ merged: VideoThemePatch; mantine: MantineTheme }>,
): ResolvedTokenTiers {
  const video = getValueAtPath(options.merged, ["other", "video"]);
  const issues: VideoThemeIssue[] = [];
  const groundContext: ResolutionContext = {
    atomic: getValueAtPath(video, ["atomic"]),
    semantic: getValueAtPath(video, ["semantic"]),
    components: options.merged.components,
    mantine: options.mantine,
    isDarkGround: true,
    forbidColorPairs: true,
    issues,
  };
  const ground = _resolveValue(
    groundContext,
    getValueAtPath(groundContext.semantic, ["color", "ground"]),
    { kind: "color" },
    "color.ground",
    [],
  );
  const isDarkGround =
    typeof ground === "string" ? luminance(ground) < options.mantine.luminanceThreshold : true;
  const context: ResolutionContext = { ...groundContext, isDarkGround, forbidColorPairs: false };
  return {
    atomic: _resolveNode(context, VIDEO_TOKEN_CATALOG.atomic, context.atomic, "atomic"),
    semantic: _resolveNode(context, VIDEO_TOKEN_CATALOG.semantic, context.semantic, ""),
    components: _resolveComponents(context),
    isDarkGround,
    issues,
  };
}
```

- [ ] **Step 4: Implement the public resolver**

`src/videoTheme/resolveVideoTheme/resolveVideoTheme.ts`:

```ts
import {
  DEFAULT_THEME,
  mergeMantineTheme,
  type MantineThemeOverride,
} from "@mantine/core";
import { elevationToBoxShadow } from "../cssValues/cssValues";
import { getResolvedTokenValue } from "../getResolvedTokenValue/getResolvedTokenValue";
import { buildVideoThemeHashFromContent } from "../hashVideoTheme/hashVideoTheme";
import { mergeVideoThemeLayers } from "../mergeVideoThemeLayers/mergeVideoThemeLayers";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalog";
import { VIDEO_FONT_REGISTRY } from "../videoFontRegistry/videoFontRegistry";
import { VideoThemeError } from "../VideoThemeError/VideoThemeError";
import { resolveTokenTiers } from "./resolveTokenTiers";
import type {
  ResolvedTypeStyle,
  ResolvedVideoAtomic,
  ResolvedVideoComponents,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
  VideoThemeIssue,
  VideoThemeLibrary,
  VideoThemePatch,
  VideoThemeScope,
} from "../videoTheme.types";

const MANTINE_SHADOW_KEYS = ["xs", "sm", "md", "lg", "xl"] as const;

function _createMantineTheme(merged: VideoThemePatch) {
  const mantineKeys = Object.fromEntries(
    Object.entries(merged).filter(([key]) => key !== "other" && key !== "components"),
  );
  try {
    return mergeMantineTheme(DEFAULT_THEME, mantineKeys as MantineThemeOverride);
  } catch (error) {
    throw new VideoThemeError([
      { path: "primaryColor", message: error instanceof Error ? error.message : String(error) },
    ]);
  }
}

function _findUnmeasuredGraphicText(
  tiers: Readonly<{ atomic: ResolvedVideoAtomic; semantic: ResolvedVideoSemantic; components: ResolvedVideoComponents }>,
): VideoThemeIssue[] {
  return listTokenDefinitions()
    .filter(({ definition }) => definition.kind === "typeStyle" && definition.surface === "graphic")
    .flatMap(({ path }) => {
      const style = getResolvedTokenValue(tiers, path) as ResolvedTypeStyle | undefined;
      if (!style || VIDEO_FONT_REGISTRY[style.fontId].measured) {
        return [];
      }
      return [
        {
          path,
          message: `Graphic text needs a font with measured glyph widths, such as Arial or Courier New. ${VIDEO_FONT_REGISTRY[style.fontId].label} has none.`,
        },
      ];
    });
}

function _deriveMantineShadows(atomic: ResolvedVideoAtomic, color: string) {
  return Object.fromEntries(
    MANTINE_SHADOW_KEYS.flatMap((key) => {
      const shadow = atomic.shadow[key];
      return shadow ? [[key, elevationToBoxShadow({ layers: shadow.layers, color })]] : [];
    }),
  );
}

/**
 * Resolves a theme for one item: merges its layers (see
 * `mergeVideoThemeLayers`), resolves every token, enforces measured fonts
 * for graphic text, and returns concrete values plus a Mantine theme whose
 * `components` carry each themed shape's `defaultProps` and whose
 * `other.video` carries the resolved tiers. Throws a `VideoThemeError`
 * listing every problem. It is pure and DOM-free, so the gallery, the live
 * player, renders, and the save route all resolve the same way.
 */
export function resolveVideoTheme(
  library: VideoThemeLibrary,
  themeId: string,
  scope: VideoThemeScope = {},
): ResolvedVideoTheme {
  const document = library.get(themeId);
  if (!document) {
    throw new VideoThemeError([{ path: "id", message: `Unknown theme "${themeId}"` }]);
  }
  const merged = mergeVideoThemeLayers(library, themeId, scope);
  const mantine = _createMantineTheme(merged);
  const tiers = resolveTokenTiers({ merged, mantine });
  if (tiers.issues.length > 0) {
    throw new VideoThemeError(tiers.issues);
  }
  const content = {
    atomic: tiers.atomic as ResolvedVideoAtomic,
    semantic: tiers.semantic as ResolvedVideoSemantic,
    components: tiers.components as ResolvedVideoComponents,
    isDarkGround: tiers.isDarkGround,
  };
  const fontIssues = _findUnmeasuredGraphicText(content);
  if (fontIssues.length > 0) {
    throw new VideoThemeError(fontIssues);
  }
  return {
    id: themeId,
    label: document.label,
    hash: buildVideoThemeHashFromContent(content),
    ...content,
    mantine: mergeMantineTheme(mantine, {
      shadows: _deriveMantineShadows(content.atomic, content.semantic.color.shadowColor),
      components: Object.fromEntries(
        Object.entries(content.components).map(([name, defaultProps]) => [name, { defaultProps }]),
      ),
      other: { video: { atomic: content.atomic, semantic: content.semantic } },
    }),
  };
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run the Step 2 command. Expected: 11 passing.

- [ ] **Step 6: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

```bash
git add src/videoTheme/resolveVideoTheme
git commit -m "feat(video-producer): resolve video themes onto Mantine's theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 15: `--video-*` CSS variables

**Files:**
- Create: `src/videoTheme/buildVideoCssVariables/buildVideoCssVariables.ts`
- Test: `src/videoTheme/buildVideoCssVariables/buildVideoCssVariables.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { buildVideoCssVariables } from "./buildVideoCssVariables";

const variables = buildVideoCssVariables(resolveVideoTheme(BUILT_IN_VIDEO_THEMES, "classic"));

test("semantic colours become video variables", () => {
  assert.equal(variables["--video-color-ground"], "#0b1219");
  assert.equal(variables["--video-color-ground-fill"], "#0b1219");
});

test("type styles expand into font variables in pixels and ems", () => {
  assert.equal(variables["--video-text-stage-heading-font-size"], "48px");
  assert.equal(variables["--video-text-stage-heading-letter-spacing"], "-0.025em");
  assert.equal(
    variables["--video-text-stage-heading-font-family"],
    "Figtree, ui-sans-serif, system-ui, sans-serif",
  );
});

test("elevations become a box shadow and a drop-shadow filter", () => {
  assert.equal(variables["--video-elevation-floating-box-shadow"], "0px 16px 22px 0px #06101455");
  assert.equal(variables["--video-elevation-floating-drop-shadow"], "drop-shadow(0px 16px 22px #06101455)");
});

test("layout boxes become one variable per side", () => {
  assert.equal(variables["--video-layout-stage-graphic-inset-x"], "192px");
  assert.equal(variables["--video-layout-stage-graphic-inset-bottom"], "70px");
});

test("motion, camera, and sketch tokens produce no variables", () => {
  assert.ok(
    Object.keys(variables).every(
      (name) => !/^--video-(motion|camera|motion-blur|sketch)-/.test(name),
    ),
  );
});

test("component tokens are namespaced by component", () => {
  assert.equal(variables["--video-component-progress-bar-height"], "3px");
  assert.equal(variables["--video-component-progress-bar-paint"], "#51a7ff");
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/buildVideoCssVariables/buildVideoCssVariables.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import {
  buildColorWithAlpha,
  elevationToBoxShadow,
  elevationToDropShadowFilter,
  fillToCss,
  textShadowToCss,
} from "../cssValues/cssValues";
import { getResolvedTokenValue } from "../getResolvedTokenValue/getResolvedTokenValue";
import { isMantineTokenRoot, listTokenDefinitions } from "../tokenCatalog/tokenCatalog";
import type {
  GlowValue,
  ResolvedBox,
  ResolvedElevation,
  ResolvedFill,
  ResolvedPaint,
  ResolvedTypeStyle,
  ResolvedVideoTheme,
  TokenKind,
} from "../videoTheme.types";

const UNSTYLED_GROUPS = new Set(["motion", "camera", "motionBlur", "sketch"]);

function _kebab(segment: string): string {
  return segment.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}

function _typeStyleVariables(name: string, style: ResolvedTypeStyle): Record<string, string> {
  return {
    [`${name}-font-family`]: style.fontFamily,
    [`${name}-font-size`]: `${style.fontSize}px`,
    [`${name}-font-weight`]: String(style.fontWeight),
    [`${name}-color`]: buildColorWithAlpha(style.color, style.alpha),
    ...(style.lineHeight === undefined ? {} : { [`${name}-line-height`]: String(style.lineHeight) }),
    ...(style.letterSpacing === undefined ? {} : { [`${name}-letter-spacing`]: `${style.letterSpacing}em` }),
    ...(style.textTransform ? { [`${name}-text-transform`]: style.textTransform } : {}),
    ...(style.fontVariantNumeric ? { [`${name}-font-variant-numeric`]: style.fontVariantNumeric } : {}),
    ...(style.textShadow ? { [`${name}-text-shadow`]: textShadowToCss(style.textShadow) } : {}),
  };
}

function _variablesFromValue(kind: TokenKind, name: string, value: unknown): Record<string, string> {
  switch (kind) {
    case "color":
      return { [name]: String(value) };
    case "fill":
      return { [name]: fillToCss(value as ResolvedFill) };
    case "length":
      return { [name]: `${String(value)}px` };
    case "letterSpacing":
      return { [name]: `${String(value)}em` };
    case "number":
    case "opacity":
    case "fontWeight":
    case "duration":
      return { [name]: String(value) };
    case "typeStyle":
      return _typeStyleVariables(name, value as ResolvedTypeStyle);
    case "paint": {
      const paint = value as ResolvedPaint;
      return { [name]: buildColorWithAlpha(paint.color, paint.alpha) };
    }
    case "elevation":
      return {
        [`${name}-box-shadow`]: elevationToBoxShadow(value as ResolvedElevation),
        [`${name}-drop-shadow`]: elevationToDropShadowFilter(value as ResolvedElevation),
      };
    case "box":
      return Object.fromEntries(
        Object.entries(value as ResolvedBox).map(([side, pixels]) => [`${name}-${side}`, `${String(pixels)}px`]),
      );
    case "glow": {
      const glow = value as GlowValue;
      return {
        [`${name}-spread`]: `${glow.spread}px`,
        [`${name}-blur`]: `${glow.blur}px`,
        [`${name}-opacity`]: String(glow.opacity),
      };
    }
    default:
      return {};
  }
}

function _variableNameFromPath(segments: readonly string[]): string {
  return segments[0] === "components"
    ? `--video-component-${segments.slice(1).map(_kebab).join("-").replace(/^-/, "")}`
    : `--video-${segments.map(_kebab).join("-")}`;
}

/**
 * CSS custom properties for every styled semantic and component token, such
 * as `--video-color-ground` and `--video-text-stage-heading-font-size`.
 * `VideoThemeProvider` sets them on its container so CSS modules (the
 * continuity stage and overlays) read the theme without JavaScript. Motion,
 * camera, and sketch tokens have no CSS meaning and are skipped.
 */
export function buildVideoCssVariables(
  theme: ResolvedVideoTheme,
): Readonly<Record<string, string>> {
  const variables: Record<string, string> = {};
  for (const { path, definition, isScale } of listTokenDefinitions()) {
    const segments = path.split(".");
    const isSkipped =
      isScale ||
      segments[0] === "atomic" ||
      isMantineTokenRoot(segments[0]) ||
      UNSTYLED_GROUPS.has(segments[0]);
    const value = isSkipped ? undefined : getResolvedTokenValue(theme, path);
    if (value !== undefined) {
      Object.assign(variables, _variablesFromValue(definition.kind, _variableNameFromPath(segments), value));
    }
  }
  return variables;
}
```

`_kebab("ProgressBar")` yields `-progress-bar`; the `.replace(/^-/, "")` drops the leading hyphen from component names.

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 6 passing.

- [ ] **Step 5: Commit**

```bash
git add src/videoTheme/buildVideoCssVariables
git commit -m "feat(video-producer): expose video tokens as CSS variables" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: Providers, hooks, usage tracking, and the reenactment boundary

**Files:**
- Create: `src/videoTheme/tokenUsage/tokenUsage.ts`
- Test: `src/videoTheme/tokenUsage/tokenUsage.test.ts`
- Create: `src/videoTheme/useVideoTheme/useVideoTheme.ts`
- Create: `src/videoTheme/VideoThemeProvider/VideoThemeProvider.tsx`
- Test: `src/videoTheme/VideoThemeProvider/VideoThemeProvider.test.tsx`
- Create: `src/videoTheme/VideoThemeScope/VideoThemeScope.tsx`
- Test: `src/videoTheme/VideoThemeScope/VideoThemeScope.test.tsx`
- Create: `src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary.tsx`
- Test: `src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary.test.tsx`

- [ ] **Step 1: Write the failing usage tests**

`src/videoTheme/tokenUsage/tokenUsage.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { SEMANTIC_TOKENS } from "../tokenCatalog/semanticTokens";
import { createTokenUsageCollector, createTokenUsageProxy } from "./tokenUsage";

test("reading a token through the proxy reports its path once", () => {
  const collector = createTokenUsageCollector();
  const tokens = createTokenUsageProxy({
    value: { color: { accent: "#51a7ff", ground: "#0b1219" } },
    catalog: SEMANTIC_TOKENS,
    basePath: [],
    report: collector.report,
  });
  void tokens.color.accent;
  void tokens.color.accent;
  assert.deepEqual(collector.getPaths(), ["color.accent"]);
});

test("reading a field of a composite token reports the token, not the field", () => {
  const collector = createTokenUsageCollector();
  const tokens = createTokenUsageProxy({
    value: { text: { stage: { heading: { fontSize: 48 } } } },
    catalog: SEMANTIC_TOKENS,
    basePath: [],
    report: collector.report,
  });
  void tokens.text.stage.heading.fontSize;
  assert.deepEqual(collector.getPaths(), ["text.stage.heading"]);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/tokenUsage/tokenUsage.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement usage tracking**

`src/videoTheme/tokenUsage/tokenUsage.ts`:

```ts
import { createContext } from "react";
import { isTokenDefinition, isTokenScale } from "../tokenCatalog/defineTokens";
import type { CatalogNode } from "../videoTheme.types";

/** Receives the path of each token a render reads, such as `color.accent`. */
export type TokenUsageReporter = (tokenPath: string) => void;

/**
 * Where themed renders report the tokens they read. Unset by default, so
 * renders pay nothing. The token editor sets it to show the tokens an item
 * actually uses.
 */
export const VideoTokenUsageContext = createContext<TokenUsageReporter | undefined>(undefined);

/** A set of token paths reported by renders, read back sorted. */
export type TokenUsageCollector = Readonly<{
  report: TokenUsageReporter;
  getPaths: () => readonly string[];
  clear: () => void;
}>;

/**
 * Collects token paths reported through `VideoTokenUsageContext`, for
 * example while a preview plays, so an editor can filter to "used by this
 * item".
 */
export function createTokenUsageCollector(): TokenUsageCollector {
  const paths = new Set<string>();
  return {
    report: (path) => {
      paths.add(path);
    },
    getPaths: () => [...paths].sort(),
    clear: () => paths.clear(),
  };
}

/**
 * Wraps resolved tokens so reading one reports its catalog path. Reads stop
 * at a token: reading `heading.fontSize` reports `text.stage.heading`. The
 * wrapped objects must not be frozen, because a proxy cannot return a
 * different object for a frozen property.
 */
export function createTokenUsageProxy<Value extends object>(
  options: Readonly<{
    value: Value;
    catalog: CatalogNode;
    basePath: readonly string[];
    report: TokenUsageReporter;
  }>,
): Value {
  const { value, catalog, basePath, report } = options;
  return new Proxy(value, {
    get(target, key, receiver) {
      const child: unknown = Reflect.get(target, key, receiver);
      if (
        typeof key !== "string" ||
        isTokenDefinition(catalog) ||
        isTokenScale(catalog) ||
        !Object.hasOwn(catalog, key)
      ) {
        return child;
      }
      const node = catalog[key];
      const path = [...basePath, key];
      if (isTokenDefinition(node) || isTokenScale(node)) {
        report(path.join("."));
        return child;
      }
      return typeof child === "object" && child !== null
        ? createTokenUsageProxy({ value: child, catalog: node, basePath: path, report })
        : child;
    },
  });
}
```

- [ ] **Step 4: Run the usage tests to verify they pass**

Run the Step 2 command. Expected: 2 passing.

- [ ] **Step 5: Write the context and hooks**

`src/videoTheme/useVideoTheme/useVideoTheme.ts`:

```ts
import { useProps } from "@mantine/core";
import { createContext, useContext, useMemo } from "react";
import { SEMANTIC_TOKENS } from "../tokenCatalog/semanticTokens";
import { createTokenUsageProxy, VideoTokenUsageContext } from "../tokenUsage/tokenUsage";
import type {
  ResolvedVideoComponents,
  ResolvedVideoSemantic,
  ResolvedVideoTheme,
  VideoComponentName,
  VideoThemeSource,
} from "../videoTheme.types";

/** The resolved theme in effect and the source it was resolved from. */
export type VideoThemeContextValue = Readonly<{
  theme: ResolvedVideoTheme;
  source: VideoThemeSource;
}>;

/**
 * The video theme of the subtree. Set by `VideoThemeProvider`. The source is
 * kept so a nested `VideoThemeScope` can re-resolve with extra overrides.
 */
export const VideoThemeContext = createContext<VideoThemeContextValue | undefined>(undefined);

/** The theme context, or undefined outside any provider. */
export function useVideoThemeContext(): VideoThemeContextValue | undefined {
  return useContext(VideoThemeContext);
}

/**
 * The resolved video theme. Throws outside a provider, so a themed shape
 * can never silently read the gallery chrome's Mantine theme instead.
 */
export function useVideoTheme(): ResolvedVideoTheme {
  const value = useContext(VideoThemeContext);
  if (!value) {
    throw new Error("Video tokens need a VideoThemeProvider or VideoThemeScope above this component");
  }
  return value.theme;
}

/**
 * Typed semantic tokens, such as `color.accent` or `text.graphic.caption`.
 * Reads are reported to `VideoTokenUsageContext` when one is set. Use it in
 * preset-specific shapes that are not themed components.
 */
export function useVideoTokens(): ResolvedVideoSemantic {
  const theme = useVideoTheme();
  const report = useContext(VideoTokenUsageContext);
  return useMemo(
    () =>
      report
        ? createTokenUsageProxy({ value: theme.semantic, catalog: SEMANTIC_TOKENS, basePath: [], report })
        : theme.semantic,
    [theme, report],
  );
}

/**
 * A themed shape's props: its theme `defaultProps` (through Mantine
 * `useProps`) under the props it was given. Reports each default it relied
 * on, such as `components.ProgressBar.height`. Use it at the top of every
 * themed component.
 */
export function useVideoProps<
  Name extends VideoComponentName,
  Props extends Partial<ResolvedVideoComponents[Name]>,
>(name: Name, props: Props): ResolvedVideoComponents[Name] & Props {
  const theme = useVideoTheme();
  const report = useContext(VideoTokenUsageContext);
  const merged = useProps(name, {}, props);
  if (report) {
    const given: Readonly<Record<string, unknown>> = props;
    for (const key of Object.keys(theme.components[name])) {
      if (given[key] === undefined) {
        report(`components.${name}.${key}`);
      }
    }
  }
  return merged as ResolvedVideoComponents[Name] & Props;
}
```

- [ ] **Step 6: Write the provider**

`src/videoTheme/VideoThemeProvider/VideoThemeProvider.tsx`:

```tsx
import { MantineThemeProvider } from "@mantine/core";
import { useMemo, type CSSProperties, type ReactNode } from "react";
import { buildVideoCssVariables } from "../buildVideoCssVariables/buildVideoCssVariables";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import { VideoThemeContext } from "../useVideoTheme/useVideoTheme";
import type { VideoThemeSource } from "../videoTheme.types";

type Props = Readonly<{
  source: VideoThemeSource;
  children: ReactNode;
  /** `none` renders no wrapper, for use inside an SVG; CSS variables are then unset. */
  element?: "div" | "none";
}>;

/**
 * Resolves a video theme and makes it the theme of everything inside:
 * Mantine `useProps` defaults for themed shapes, `useVideoTokens` reads,
 * and `--video-*` CSS variables on a `display: contents` wrapper for CSS
 * modules. The Mantine theme does not inherit the page's, so gallery
 * chrome and video theme never style each other. Use it at the root of a
 * film or a gallery preview.
 */
export function VideoThemeProvider({ source, children, element = "div" }: Props) {
  const theme = useMemo(
    () => resolveVideoTheme(source.library, source.themeId, source.scope),
    [source],
  );
  const value = useMemo(() => ({ theme, source }), [theme, source]);
  const style = useMemo(
    () => ({ display: "contents", ...buildVideoCssVariables(theme) }) as CSSProperties,
    [theme],
  );
  const content = (
    <MantineThemeProvider theme={theme.mantine} inherit={false}>
      <VideoThemeContext.Provider value={value}>{children}</VideoThemeContext.Provider>
    </MantineThemeProvider>
  );
  return element === "none" ? content : <div style={style}>{content}</div>;
}
```

- [ ] **Step 7: Write the nested scope**

`src/videoTheme/VideoThemeScope/VideoThemeScope.tsx`:

```tsx
import { useMemo, type ReactNode } from "react";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { useVideoThemeContext } from "../useVideoTheme/useVideoTheme";
import { VideoThemeProvider } from "../VideoThemeProvider/VideoThemeProvider";
import type { VideoThemePatch, VideoThemeScope as Scope, VideoThemeSource } from "../videoTheme.types";

/**
 * The source for an item nested inside another. The inner item's overrides
 * rank below the outer ones, so a composition's art direction wins over the
 * preset it contains; inner patches apply after outer patches, so explicit
 * content such as a stock `accent` prop wins over the surrounding draft.
 */
export function createScopedVideoThemeSource(
  outer: VideoThemeSource,
  inner: Scope,
): VideoThemeSource {
  return {
    library: outer.library,
    themeId: outer.themeId,
    scope: {
      overrideIds: [...(inner.overrideIds ?? []), ...(outer.scope?.overrideIds ?? [])],
      patches: [...(outer.scope?.patches ?? []), ...(inner.patches ?? [])],
    },
  };
}

type Props = Readonly<{
  overrideIds?: readonly string[];
  patches?: readonly VideoThemePatch[];
  children: ReactNode;
  element?: "div" | "none";
}>;

/**
 * Re-themes a subtree for one item: the surrounding theme plus that item's
 * overrides and patches. Outside any provider it starts from `classic`, so
 * a stock graphic rendered on its own still draws with tokens. Use it
 * around a nested preset or a gallery card.
 */
export function VideoThemeScope({ overrideIds, patches, children, element = "none" }: Props) {
  const outer = useVideoThemeContext()?.source ?? DEFAULT_VIDEO_THEME_SOURCE;
  // Callers rebuild these arrays on every frame; the key keeps the source stable.
  const scopeKey = JSON.stringify({ overrideIds, patches });
  const source = useMemo(
    () => createScopedVideoThemeSource(outer, JSON.parse(scopeKey) as Scope),
    [outer, scopeKey],
  );
  return (
    <VideoThemeProvider source={source} element={element}>
      {children}
    </VideoThemeProvider>
  );
}
```

- [ ] **Step 8: Write the reenactment boundary**

`src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary.tsx`:

```tsx
import { MantineThemeProvider } from "@mantine/core";
import type { ReactNode } from "react";

type Props = Readonly<{ children: ReactNode }>;

/**
 * Gives product UI a clean Mantine theme context inside a themed film.
 * Mantine's `MantineProvider` merges its theme onto any parent theme, so
 * without this boundary a reenactment would inherit the video theme's type
 * sizes, spacing, and component defaults. Wrap every reenactment root in it.
 */
export function ReenactmentThemeBoundary({ children }: Props) {
  return <MantineThemeProvider inherit={false}>{children}</MantineThemeProvider>;
}
```

- [ ] **Step 9: Write the failing provider tests**

`src/videoTheme/VideoThemeProvider/VideoThemeProvider.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { createTokenUsageCollector, VideoTokenUsageContext } from "../tokenUsage/tokenUsage";
import { useVideoProps, useVideoTokens } from "../useVideoTheme/useVideoTheme";
import { VideoThemeProvider } from "./VideoThemeProvider";

function TokenProbe() {
  const tokens = useVideoTokens();
  return (
    <span>
      {tokens.color.accent}|{tokens.text.stage.heading.fontSize}
    </span>
  );
}

function BarProbe({ height }: { height?: number }) {
  const props = useVideoProps("ProgressBar", { height });
  return <span>{props.height}</span>;
}

test("reading tokens outside a provider fails loudly", () => {
  assert.throws(() => renderToStaticMarkup(<TokenProbe />), /VideoThemeProvider/);
});

test("the provider sets video CSS variables on its wrapper", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE}>
      <span />
    </VideoThemeProvider>,
  );
  assert.match(markup, /--video-color-ground:#0b1219/);
});

test("useVideoTokens reads resolved semantic tokens", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
      <TokenProbe />
    </VideoThemeProvider>,
  );
  assert.equal(markup, "<span>#51a7ff|48</span>");
});

test("useVideoProps returns theme defaults and reports the ones it used", () => {
  const collector = createTokenUsageCollector();
  const markup = renderToStaticMarkup(
    <VideoTokenUsageContext.Provider value={collector.report}>
      <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
        <BarProbe />
      </VideoThemeProvider>
    </VideoTokenUsageContext.Provider>,
  );
  assert.equal(markup, "<span>3</span>");
  assert.deepEqual(collector.getPaths(), [
    "components.ProgressBar.height",
    "components.ProgressBar.paint",
  ]);
});

test("a prop given to a themed component wins and is not reported", () => {
  const collector = createTokenUsageCollector();
  const markup = renderToStaticMarkup(
    <VideoTokenUsageContext.Provider value={collector.report}>
      <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
        <BarProbe height={6} />
      </VideoThemeProvider>
    </VideoTokenUsageContext.Provider>,
  );
  assert.equal(markup, "<span>6</span>");
  assert.ok(!collector.getPaths().includes("components.ProgressBar.height"));
});
```

`src/videoTheme/VideoThemeScope/VideoThemeScope.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { useVideoTokens } from "../useVideoTheme/useVideoTheme";
import { createScopedVideoThemeSource, VideoThemeScope } from "./VideoThemeScope";

function AccentProbe() {
  return <span>{useVideoTokens().color.accentAlt}</span>;
}

const CYAN_PATCH = { other: { video: { atomic: { swatch: { cyan: "#123456" } } } } };

test("a nested override ranks below the outer one", () => {
  const outer = { ...DEFAULT_VIDEO_THEME_SOURCE, scope: { overrideIds: ["aperture-detail"] } };
  const inner = createScopedVideoThemeSource(outer, { overrideIds: ["network-graph"] });
  assert.deepEqual(inner.scope?.overrideIds, ["network-graph", "aperture-detail"]);
});

test("inner patches apply after outer patches", () => {
  const outer = { ...DEFAULT_VIDEO_THEME_SOURCE, scope: { patches: [{ a: 1 }] } };
  const inner = createScopedVideoThemeSource(outer, { patches: [{ b: 2 }] });
  assert.deepEqual(inner.scope?.patches, [{ a: 1 }, { b: 2 }]);
});

test("a scope outside any provider starts from classic and applies its patches", () => {
  const markup = renderToStaticMarkup(
    <VideoThemeScope patches={[CYAN_PATCH]}>
      <AccentProbe />
    </VideoThemeScope>,
  );
  assert.equal(markup, "<span>#123456</span>");
});
```

`src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary.test.tsx`:

```tsx
import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_THEME, MantineProvider, useMantineTheme } from "@mantine/core";
import { renderToStaticMarkup } from "react-dom/server";
import { DEFAULT_VIDEO_THEME_SOURCE } from "../builtInVideoThemes/builtInVideoThemes";
import { VideoThemeProvider } from "../VideoThemeProvider/VideoThemeProvider";
import { ReenactmentThemeBoundary } from "./ReenactmentThemeBoundary";

function ProductProbe() {
  const theme = useMantineTheme();
  return <span>{`${String(theme.other.video === undefined)}|${theme.fontSizes.md}`}</span>;
}

function _render(withBoundary: boolean): string {
  const product = (
    <MantineProvider theme={{ primaryColor: "blue" }} withCssVariables={false} withGlobalClasses={false}>
      <ProductProbe />
    </MantineProvider>
  );
  return renderToStaticMarkup(
    <VideoThemeProvider source={DEFAULT_VIDEO_THEME_SOURCE} element="none">
      {withBoundary ? <ReenactmentThemeBoundary>{product}</ReenactmentThemeBoundary> : product}
    </VideoThemeProvider>,
  );
}

test("product UI inside the boundary sees only its own theme", () => {
  assert.equal(_render(true), `<span>true|${DEFAULT_THEME.fontSizes.md}</span>`);
});

test("without the boundary a product MantineProvider inherits the video theme", () => {
  assert.equal(_render(false), "<span>false|17px</span>");
});
```

- [ ] **Step 10: Run the component tests to verify they pass**

The hooks and components exist from Steps 5 to 8, so these tests pass on first run. Check that each one can fail: temporarily change `inherit={false}` to `inherit` in `ReenactmentThemeBoundary.tsx` and confirm the first boundary test fails, then restore it.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/VideoThemeProvider/VideoThemeProvider.test.tsx src/videoTheme/VideoThemeScope/VideoThemeScope.test.tsx src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary.test.tsx`
Expected: 10 passing.

- [ ] **Step 11: Typecheck and commit**

Run: `pnpm exec tsc --noEmit`. Expected: no errors.

```bash
git add src/videoTheme/tokenUsage src/videoTheme/useVideoTheme src/videoTheme/VideoThemeProvider src/videoTheme/VideoThemeScope src/videoTheme/ReenactmentThemeBoundary
git commit -m "feat(video-producer): provide video themes to renderers through Mantine" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 17: The generated `avandar` theme

**Files:**
- Modify: `scripts/read-theme.mjs`
- Create: `scripts/videoTheme/syncAvandarTheme/createAvandarTheme.ts`
- Create: `scripts/videoTheme/syncAvandarTheme/readAvandarThemeSource.ts`
- Create: `scripts/videoTheme/syncAvandarTheme/syncAvandarTheme.ts`
- Test: `scripts/videoTheme/syncAvandarTheme/createAvandarTheme.test.ts`
- Create (generated): `themes/avandar.theme.json`
- Modify: `src/videoTheme/builtInVideoThemes/builtInVideoThemes.ts`
- Modify: `package.json`

- [ ] **Step 1: Add the video output to `read-theme.mjs`**

Replace `scripts/read-theme.mjs` with:

```js
import { NEUTRAL_SHADES } from "../../../shared/config/Theme.ts";
import {
  AnimationTheme,
  BorderTheme,
  ElevationTheme,
  OverlayTheme,
  Theme,
} from "../../../src/config/Theme/Theme.ts";
import { requireLicense } from "./require-license.mjs";

requireLicense();

// Export only palette values, without bundling the product's runtime into the gallery.
const palette = {
  primary: Theme.colors.primary,
  neutral: NEUTRAL_SHADES,
  secondary: Theme.colors.secondary,
  success: Theme.colors.success,
  warning: Theme.colors.warning,
  danger: Theme.colors.danger,
  info: Theme.colors.info,
  brand: Theme.other.primaryColor,
  shell: Theme.other.navbar.backgroundColor,
  surfaces: ElevationTheme.surfaces,
};

// `--for-video` adds the values `theme:sync-avandar` maps into avandar.theme.json.
process.stdout.write(
  JSON.stringify(
    process.argv.includes("--for-video")
      ? {
          ...palette,
          radius: BorderTheme.radius,
          borders: BorderTheme.colors,
          shadows: ElevationTheme.shadows,
          easing: AnimationTheme.easing,
          overlay: OverlayTheme.backdrop,
          fontFamily: Theme.fontFamily,
        }
      : palette,
  ),
);
```

Run: `node --import tsx scripts/read-theme.mjs | head -c 80` and `node --import tsx scripts/read-theme.mjs --for-video | head -c 80`
Expected: both print JSON starting with `{"primary":["#edf6ff"`. The default output is unchanged, so `src/gallery/theme-colors.json` does not change.

- [ ] **Step 2: Write the source reader and the CLI**

`scripts/videoTheme/syncAvandarTheme/readAvandarThemeSource.ts`:

```ts
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { AvandarThemeSource } from "./createAvandarTheme";

const APP_ROOT = fileURLToPath(new URL("../../..", import.meta.url));

/**
 * The read-only Avandar theme's values, read through `read-theme.mjs` so the
 * product runtime is never bundled. Used by `theme:sync-avandar` and by the
 * drift test that keeps `avandar.theme.json` current.
 */
export function readAvandarThemeSource(): AvandarThemeSource {
  return JSON.parse(
    execFileSync(
      process.execPath,
      ["--import", "tsx", "scripts/read-theme.mjs", "--for-video"],
      { cwd: APP_ROOT, encoding: "utf8" },
    ),
  ) as AvandarThemeSource;
}
```

`scripts/videoTheme/syncAvandarTheme/syncAvandarTheme.ts`:

```ts
import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { requireLicense } from "../../require-license.mjs";
import { createAvandarTheme } from "./createAvandarTheme";
import { readAvandarThemeSource } from "./readAvandarThemeSource";

requireLicense();
const output = fileURLToPath(new URL("../../../themes/avandar.theme.json", import.meta.url));
await fs.writeFile(
  output,
  `${JSON.stringify(createAvandarTheme(readAvandarThemeSource()), null, 2)}\n`,
);
console.log("Synced themes/avandar.theme.json from the Avandar theme.");
```

- [ ] **Step 3: Write the failing tests**

`scripts/videoTheme/syncAvandarTheme/createAvandarTheme.test.ts`:

```ts
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createVideoThemeLibrary } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../../../src/videoTheme/resolveVideoTheme/resolveVideoTheme";
import { createAvandarTheme, getShadowFromCss, getHexFromCssColor } from "./createAvandarTheme";
import { readAvandarThemeSource } from "./readAvandarThemeSource";

const THEME_FILE = fileURLToPath(new URL("../../../themes/avandar.theme.json", import.meta.url));

test("the tracked avandar theme matches a fresh sync from the Avandar theme", async () => {
  assert.deepEqual(
    JSON.parse(await fs.readFile(THEME_FILE, "utf8")),
    JSON.parse(JSON.stringify(createAvandarTheme(readAvandarThemeSource()))),
  );
});

test("an rgba border becomes an 8-digit hex swatch", () => {
  assert.equal(getHexFromCssColor("rgba(217, 224, 231, 0.28)"), "#d9e0e747");
});

test("a space-separated rgb colour with a percent alpha becomes an 8-digit hex", () => {
  assert.equal(getHexFromCssColor("rgb(15 23 42 / 38%)"), "#0f172a61");
});

test("a stacked shadow becomes layers that share one colour", () => {
  assert.deepEqual(
    getShadowFromCss("0 1px 2px rgba(16, 42, 67, 0.1), 0 2px 5px rgba(16, 42, 67, 0.06)"),
    {
      color: "#102a43",
      shadow: {
        layers: [
          { offsetX: 0, offsetY: 1, blur: 2, spread: 0, alpha: 0.1 },
          { offsetX: 0, offsetY: 2, blur: 5, spread: 0, alpha: 0.06 },
        ],
      },
    },
  );
});

test("the avandar theme resolves on Avandar's dark body surface", () => {
  const library = createVideoThemeLibrary([createAvandarTheme(readAvandarThemeSource())]);
  const theme = resolveVideoTheme(library, "avandar");
  assert.equal(theme.semantic.color.ground, "#102a43");
  assert.equal(theme.semantic.corner.panel, 12);
});
```

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/videoTheme/syncAvandarTheme/createAvandarTheme.test.ts`
Expected: FAIL, `createAvandarTheme` not found.

- [ ] **Step 4: Implement the mapping**

`scripts/videoTheme/syncAvandarTheme/createAvandarTheme.ts`:

```ts
import { parseCssPixels } from "../../../src/videoTheme/normalizeTokenValue/normalizeTokenValue";
import { VIDEO_FONT_IDS, VIDEO_FONT_REGISTRY } from "../../../src/videoTheme/videoFontRegistry/videoFontRegistry";
import type { ShadowValue, VideoThemeDocument } from "../../../src/videoTheme/videoTheme.types";

type Shades = readonly string[];
type Surfaces = Readonly<Record<"body" | "raised" | "overlay" | "sunken" | "panelHeader", string>>;
type SizeScale = Readonly<Record<"xs" | "sm" | "md" | "lg" | "xl", string>>;

/** The Avandar theme values `read-theme.mjs --for-video` prints. */
export type AvandarThemeSource = Readonly<{
  primary: Shades;
  neutral: Shades;
  secondary: Shades;
  success: Shades;
  warning: Shades;
  danger: Shades;
  info: Shades;
  brand: string;
  surfaces: Readonly<{ light: Surfaces; dark: Surfaces }>;
  radius: SizeScale;
  borders: Readonly<Record<"light" | "dark", Readonly<Record<"default" | "strong" | "focus", string>>>>;
  shadows: SizeScale;
  easing: Readonly<Record<string, string>>;
  overlay: Readonly<{ backgroundColor: string }>;
  fontFamily: string;
}>;

/**
 * Avandar's dark-mode primary shade (8) is tuned for filled controls under
 * white text. As a stage accent on Avandar's navy ground it falls below 3:1,
 * so the dark accent keeps shade 4.
 */
const AVANDAR_DARK_ACCENT_SHADE = 4;
const SIZE_KEYS = ["xs", "sm", "md", "lg", "xl"] as const;
const CSS_COLOR_PATTERN = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)\s*(?:[,/]\s*([\d.]+%?))?\s*\)$/;
const SHADOW_LAYER_PATTERN = /^(-?[\d.]+)(?:px)? (-?[\d.]+)(?:px)? ([\d.]+)(?:px)?(?: (-?[\d.]+)(?:px)?)? (rgba?\(.+\))$/;

function _byte(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

/** The opaque hex and the alpha of a CSS rgb() or rgba() colour. */
function _parseCssColor(color: string): Readonly<{ hex: string; alpha: number }> {
  const match = CSS_COLOR_PATTERN.exec(color);
  if (!match) {
    throw new Error(`Unsupported colour ${color}`);
  }
  const alphaText = match[4];
  return {
    hex: `#${[match[1], match[2], match[3]].map((channel) => _byte(Number(channel))).join("")}`,
    alpha:
      alphaText === undefined
        ? 1
        : alphaText.endsWith("%")
          ? Number(alphaText.slice(0, -1)) / 100
          : Number(alphaText),
  };
}

/** A hex colour, with alpha when it is not opaque, from a CSS rgb() or rgba() colour. */
export function getHexFromCssColor(color: string): string {
  if (/^#[0-9a-f]{6}(?:[0-9a-f]{2})?$/i.test(color)) {
    return color.toLowerCase();
  }
  const { hex, alpha } = _parseCssColor(color);
  return alpha === 1 ? hex : `${hex}${_byte(alpha * 255)}`;
}

/** Layers and their shared colour from a CSS box-shadow such as Avandar's stacked shadows. */
export function getShadowFromCss(css: string): Readonly<{ shadow: ShadowValue; color: string }> {
  const layers = css.split(/,(?![^(]*\))/).map((layer) => {
    const match = SHADOW_LAYER_PATTERN.exec(layer.trim());
    if (!match) {
      throw new Error(`Unsupported shadow layer ${layer}`);
    }
    const { hex, alpha } = _parseCssColor(match[5]);
    return {
      color: hex,
      layer: {
        offsetX: Number(match[1]),
        offsetY: Number(match[2]),
        blur: Number(match[3]),
        spread: Number(match[4] ?? 0),
        alpha,
      },
    };
  });
  const colors = new Set(layers.map(({ color }) => color));
  if (colors.size !== 1) {
    throw new Error(`Shadow layers use more than one colour: ${css}`);
  }
  return { color: layers[0].color, shadow: { layers: layers.map(({ layer }) => layer) } };
}

function _cubicBezier(css: string): readonly number[] {
  const match = /^cubic-bezier\(([^)]+)\)$/.exec(css);
  if (!match) {
    throw new Error(`Unsupported easing ${css}`);
  }
  return match[1].split(",").map(Number);
}

function _fontStack(fontFamily: string): string {
  const face = fontFamily.split(",")[0].trim().replace(/['"]/g, "");
  const id = VIDEO_FONT_IDS.find((fontId) => VIDEO_FONT_REGISTRY[fontId].label === face);
  if (!id) {
    throw new Error(`The Avandar font ${face} is not in the video font registry`);
  }
  return VIDEO_FONT_REGISTRY[id].stack;
}

function _swatches(source: AvandarThemeSource, shadowColor: string) {
  return {
    ground: source.surfaces.dark.body,
    surface: source.surfaces.dark.raised,
    elevated: source.surfaces.dark.overlay,
    line: getHexFromCssColor(source.borders.dark.default),
    muted: source.neutral[3],
    text: source.neutral[0],
    textDark: source.neutral[9],
    mint: source.success[4],
    cyan: source.info[4],
    orange: source.secondary[5],
    productBackdrop: source.surfaces.light.body,
    scrim: getHexFromCssColor(source.overlay.backgroundColor),
    shadow: shadowColor,
  };
}

/**
 * `avandar.theme.json`: classic's semantics mapped onto the Avandar palette,
 * surfaces, radii, shadows, font, and easing. Swatches map by meaning: the
 * ground is Avandar's dark body, the line is its dark hairline border, and
 * mint, cyan, and orange become its success, info, and secondary colours.
 */
export function createAvandarTheme(source: AvandarThemeSource): VideoThemeDocument {
  const shadows = SIZE_KEYS.map((key) => [key, getShadowFromCss(source.shadows[key])] as const);
  const stack = _fontStack(source.fontFamily);
  return {
    schemaVersion: 1,
    id: "avandar",
    label: "Avandar",
    extends: "classic",
    colors: {
      primary: source.primary,
      neutral: source.neutral,
      secondary: source.secondary,
      success: source.success,
      warning: source.warning,
      danger: source.danger,
      info: source.info,
    },
    primaryShade: { light: source.primary.indexOf(source.brand), dark: AVANDAR_DARK_ACCENT_SHADE },
    fontFamily: stack,
    headings: { fontFamily: stack },
    radius: Object.fromEntries(SIZE_KEYS.map((key) => [key, `${parseCssPixels(source.radius[key])}px`])),
    other: {
      video: {
        atomic: {
          swatch: _swatches(source, shadows[0][1].color),
          shadow: Object.fromEntries(shadows.map(([key, { shadow }]) => [key, shadow])),
          easing: {
            out: _cubicBezier(source.easing.out),
            inOut: _cubicBezier(source.easing.inOut),
            outBack: _cubicBezier(source.easing.pop),
          },
        },
      },
    },
  };
}
```

- [ ] **Step 5: Generate the theme and register it**

Add to `package.json` `scripts`, after `"theme:parity"`:

```json
"theme:sync-avandar": "node scripts/require-license.mjs && node --import tsx scripts/videoTheme/syncAvandarTheme/syncAvandarTheme.ts",
```

Run: `pnpm theme:sync-avandar`
Expected: `Synced themes/avandar.theme.json from the Avandar theme.` and a new `themes/avandar.theme.json` whose `primaryShade` is `{ "light": 6, "dark": 4 }` and whose `swatch.ground` is `#102a43`.

In `src/videoTheme/builtInVideoThemes/builtInVideoThemes.ts`:
- add `import avandarTheme from "../../../themes/avandar.theme.json";` above the classic import,
- change `BUILT_IN_VIDEO_THEME_IDS` to `["classic", "avandar"] as const`,
- change `[classicTheme].map(` to `[classicTheme, avandarTheme].map(`.

- [ ] **Step 6: Run the tests to verify they pass**

Run the Step 3 command. Expected: 5 passing.

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/builtInVideoThemes/builtInVideoThemes.test.ts`
Expected: still passing.

- [ ] **Step 7: Confirm the Avandar source is untouched and commit**

Run: `git status --short ../../src/config ../../shared/config`
Expected: no output.

```bash
git add scripts/read-theme.mjs scripts/videoTheme/syncAvandarTheme themes/avandar.theme.json src/videoTheme/builtInVideoThemes/builtInVideoThemes.ts package.json
git commit -m "feat(video-producer): generate the avandar video theme from the Avandar theme" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 18: Text contrast

**Files:**
- Create: `src/videoTheme/textContrast/textContrast.ts`
- Test: `src/videoTheme/textContrast/textContrast.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import test from "node:test";
import { BUILT_IN_VIDEO_THEMES } from "../builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../resolveVideoTheme/resolveVideoTheme";
import {
  getContrastRatioFromColors,
  getWcagLevelFromContrast,
  listTextContrastFromTheme,
} from "./textContrast";

const LIGHT_GROUND = { other: { video: { atomic: { swatch: { ground: "#f8fafc" } } } } };

function _failures(themeId: string, isLightGround: boolean): string[] {
  const theme = resolveVideoTheme(
    BUILT_IN_VIDEO_THEMES,
    themeId,
    isLightGround ? { patches: [LIGHT_GROUND] } : {},
  );
  return listTextContrastFromTheme(theme)
    .filter((entry) => entry.level === "fail")
    .map((entry) => `${entry.path} ${entry.ratio.toFixed(2)}`);
}

test("black on white has the maximum contrast of 21", () => {
  assert.equal(Math.round(getContrastRatioFromColors("#000000", "#ffffff")), 21);
});

test("large text passes AA at 3:1 and small text needs 4.5:1", () => {
  assert.equal(getWcagLevelFromContrast(3.2, true), "AA");
  assert.equal(getWcagLevelFromContrast(3.2, false), "fail");
});

test("every classic text role meets AA on its dark ground", () => {
  assert.deepEqual(_failures("classic", false), []);
});

test("every classic text role meets AA on a light ground", () => {
  assert.deepEqual(_failures("classic", true), []);
});

test("every avandar text role meets AA on its dark ground", () => {
  assert.deepEqual(_failures("avandar", false), []);
});

test("every avandar text role meets AA on a light ground", () => {
  assert.deepEqual(_failures("avandar", true), []);
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test src/videoTheme/textContrast/textContrast.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import { luminance } from "@mantine/core";
import { getResolvedTokenValue } from "../getResolvedTokenValue/getResolvedTokenValue";
import { listTokenDefinitions } from "../tokenCatalog/tokenCatalog";
import type { ResolvedTypeStyle, ResolvedVideoTheme } from "../videoTheme.types";

/** A WCAG 2 contrast level for text. */
export type WcagLevel = "AAA" | "AA" | "fail";

/** One text role's contrast against the ground. */
export type TextContrast = Readonly<{ path: string; ratio: number; level: WcagLevel }>;

/** The WCAG 2 contrast ratio of two colours, from 1 to 21. */
export function getContrastRatioFromColors(foreground: string, background: string): number {
  const [lighter, darker] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (lighter + 0.05) / (darker + 0.05);
}

/** Whether WCAG treats a style as large text: 24 px, or 18.66 px at bold. */
export function isLargeTypeStyle(style: Pick<ResolvedTypeStyle, "fontSize" | "fontWeight">): boolean {
  return style.fontSize >= 24 || (style.fontSize >= 18.66 && style.fontWeight >= 700);
}

/** The WCAG level a ratio reaches for normal or large text. */
export function getWcagLevelFromContrast(ratio: number, isLargeText: boolean): WcagLevel {
  const [aa, aaa] = isLargeText ? [3, 4.5] : [4.5, 7];
  return ratio >= aaa ? "AAA" : ratio >= aa ? "AA" : "fail";
}

/**
 * The contrast of every text role (semantic and component) against the
 * theme's ground. Use it to badge text colours in the editor or to check a
 * generated theme before saving it.
 */
export function listTextContrastFromTheme(theme: ResolvedVideoTheme): readonly TextContrast[] {
  const ground = theme.semantic.color.ground;
  return listTokenDefinitions()
    .filter(({ definition }) => definition.kind === "typeStyle")
    .map(({ path }) => {
      const style = getResolvedTokenValue(theme, path) as ResolvedTypeStyle;
      const ratio = getContrastRatioFromColors(style.color, ground);
      return { path, ratio, level: getWcagLevelFromContrast(ratio, isLargeTypeStyle(style)) };
    });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 6 passing.

If a role fails, fix the theme, never the test: give the colour an `{ onDark, onLight }` pair in `classic`, or adjust the `avandar` mapping in `createAvandarTheme.ts` and re-run `pnpm theme:sync-avandar`.

- [ ] **Step 5: Commit**

```bash
git add src/videoTheme/textContrast
git commit -m "test(video-producer): hold every themed text role to WCAG AA" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 19: Theme store

**Files:**
- Create: `scripts/showcase/themeStore/themeStore.ts`
- Test: `scripts/showcase/themeStore/themeStore.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createThemeStore, ThemeStoreError } from "./themeStore";

const CLASSIC_FILE = fileURLToPath(new URL("../../../themes/classic.theme.json", import.meta.url));

const WARM = {
  schemaVersion: 1,
  id: "warm",
  label: "Warm",
  extends: "classic",
  other: { video: { atomic: { swatch: { ground: "#201510" } } } },
};

async function _withStore(run: (store: ReturnType<typeof createThemeStore>, directory: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "video-themes-"));
  try {
    await fs.copyFile(CLASSIC_FILE, path.join(directory, "classic.theme.json"));
    await run(createThemeStore({ directory }), directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
}

async function _statusOf(promise: Promise<unknown>): Promise<number> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ThemeStoreError) {
      return error.status;
    }
    throw error;
  }
  return 200;
}

test("listing marks built-in themes", () =>
  _withStore(async (store) => {
    assert.deepEqual(await store.list(), [{ id: "classic", label: "Classic", builtIn: true }]);
  }));

test("a created theme reads back with the same hash", () =>
  _withStore(async (store) => {
    const created = await store.create(WARM);
    assert.equal((await store.read("warm")).hash, created.hash);
  }));

test("creating a theme whose id exists is a conflict", () =>
  _withStore(async (store) => {
    await store.create(WARM);
    assert.equal(await _statusOf(store.create(WARM)), 409);
  }));

test("saving a built-in theme is refused", () =>
  _withStore(async (store) => {
    const classic = await store.read("classic");
    assert.equal(await _statusOf(store.save("classic", classic.document, classic.hash)), 403);
  }));

test("saving with a stale hash is a conflict", () =>
  _withStore(async (store) => {
    await store.create(WARM);
    assert.equal(await _statusOf(store.save("warm", WARM, "stale")), 409);
  }));

test("saving with the current hash replaces the file", () =>
  _withStore(async (store) => {
    const created = await store.create(WARM);
    const saved = await store.save("warm", { ...WARM, label: "Warmer" }, created.hash);
    assert.notEqual(saved.hash, created.hash);
    assert.equal((await store.read("warm")).document.label, "Warmer");
  }));

test("a theme with a broken reference is rejected with its token path", () =>
  _withStore(async (store) => {
    const broken = { ...WARM, other: { video: { semantic: { color: { accent: "$atomic.swatch.nope" } } } } };
    await assert.rejects(store.create(broken), (error: unknown) =>
      error instanceof ThemeStoreError &&
      error.status === 400 &&
      error.issues.some((issue) => issue.path === "color.accent"),
    );
  }));

test("a theme over the size cap is rejected", () =>
  _withStore(async (store) => {
    const huge = { ...WARM, label: "Huge", overrides: Object.fromEntries(
      Array.from({ length: 4000 }, (_, index) => [`item-${index}`, { other: { video: { atomic: { swatch: { ground: "#201510", surface: "#201510", line: "#201510" } } } } }]),
    ) };
    assert.equal(await _statusOf(store.create(huge)), 413);
  }));

test("writes leave no temporary files behind", () =>
  _withStore(async (store, directory) => {
    await store.create(WARM);
    assert.deepEqual((await fs.readdir(directory)).sort(), ["classic.theme.json", "warm.theme.json"]);
  }));

test("theme ids must be slugs", () =>
  _withStore(async (store) => {
    assert.equal(await _statusOf(store.create({ ...WARM, id: "Warm Theme" })), 400);
  }));
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/themeStore/themeStore.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement**

```ts
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ZodError } from "zod";
import {
  BUILT_IN_VIDEO_THEME_IDS,
  createVideoThemeLibrary,
} from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { resolveVideoTheme } from "../../../src/videoTheme/resolveVideoTheme/resolveVideoTheme";
import { VideoThemeError } from "../../../src/videoTheme/VideoThemeError/VideoThemeError";
import {
  parseVideoThemeDocument,
  VIDEO_THEME_SLUG_PATTERN,
} from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import type {
  VideoThemeDocument,
  VideoThemeIssue,
} from "../../../src/videoTheme/videoTheme.types";

/** Largest theme file the store writes, and the largest body the routes read. */
export const THEME_FILE_MAX_BYTES = 256 * 1024;
const THEME_FILE_SUFFIX = ".theme.json";

/** One theme in the theme picker. */
export type ThemeSummary = Readonly<{ id: string; label: string; builtIn: boolean; extends?: string }>;

/** A theme file's document and the hash of its bytes, used for `If-Match`. */
export type StoredTheme = Readonly<{ document: VideoThemeDocument; hash: string }>;

/** Theme file operations over one `themes/` directory. */
export type ThemeStore = Readonly<{
  list: () => Promise<readonly ThemeSummary[]>;
  read: (id: string) => Promise<StoredTheme>;
  create: (document: unknown) => Promise<StoredTheme>;
  save: (id: string, document: unknown, ifMatch: string) => Promise<StoredTheme>;
}>;

/** A refused theme operation, with the HTTP status the routes send. */
export class ThemeStoreError extends Error {
  readonly status: 400 | 403 | 404 | 409 | 413 | 428;
  readonly issues: readonly VideoThemeIssue[];

  constructor(
    status: ThemeStoreError["status"],
    message: string,
    issues: readonly VideoThemeIssue[] = [],
  ) {
    super(message);
    this.name = "ThemeStoreError";
    this.status = status;
    this.issues = issues;
  }
}

function _hashText(text: string): string {
  return createHash("sha256").update(text).digest("hex");
}

function _isBuiltIn(id: string): boolean {
  return (BUILT_IN_VIDEO_THEME_IDS as readonly string[]).includes(id);
}

function _parse(value: unknown): VideoThemeDocument {
  try {
    return parseVideoThemeDocument(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw new ThemeStoreError(
        400,
        "The theme does not match the theme schema",
        error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message })),
      );
    }
    throw error;
  }
}

function _assertResolves(document: VideoThemeDocument, others: readonly VideoThemeDocument[]) {
  const library = createVideoThemeLibrary([
    ...others.filter((other) => other.id !== document.id),
    document,
  ]);
  try {
    resolveVideoTheme(library, document.id);
    for (const overrideId of Object.keys(document.overrides ?? {})) {
      resolveVideoTheme(library, document.id, { overrideIds: [overrideId] });
    }
  } catch (error) {
    if (error instanceof VideoThemeError) {
      throw new ThemeStoreError(400, "The theme has token errors", error.issues);
    }
    throw error;
  }
}

// Checked before validation, which resolves every override and is slow on a
// huge file.
function _serializeWithinCap(document: VideoThemeDocument): string {
  const text = `${JSON.stringify(document, null, 2)}\n`;
  if (Buffer.byteLength(text) > THEME_FILE_MAX_BYTES) {
    throw new ThemeStoreError(413, "Themes are limited to 256 KB");
  }
  return text;
}

async function _writeAtomically(file: string, text: string): Promise<void> {
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.${randomUUID()}.tmp`);
  try {
    await fs.writeFile(temporary, text);
    await fs.rename(temporary, file);
  } finally {
    await fs.rm(temporary, { force: true });
  }
}

/**
 * Reads and writes `themes/<id>.theme.json` for the showcase routes. Every
 * write validates the schema, references, and cycles, refuses built-in
 * themes and stale `If-Match` hashes, caps the file at 256 KB, and replaces
 * the file atomically.
 */
export function createThemeStore(options: Readonly<{ directory: string }>): ThemeStore {
  const { directory } = options;
  function fileFromId(id: string): string {
    if (!VIDEO_THEME_SLUG_PATTERN.test(id)) {
      throw new ThemeStoreError(400, "Theme ids are 1 to 48 lowercase letters, digits, or hyphens");
    }
    return path.join(directory, `${id}${THEME_FILE_SUFFIX}`);
  }
  async function read(id: string): Promise<StoredTheme> {
    const text = await fs.readFile(fileFromId(id), "utf8").catch((error: NodeJS.ErrnoException) => {
      throw error.code === "ENOENT" ? new ThemeStoreError(404, `No theme named "${id}"`) : error;
    });
    let value: unknown;
    try {
      value = JSON.parse(text);
    } catch {
      throw new ThemeStoreError(400, `themes/${id}${THEME_FILE_SUFFIX} is not valid JSON`);
    }
    return { document: _parse(value), hash: _hashText(text) };
  }
  async function readAll(): Promise<VideoThemeDocument[]> {
    const names = (await fs.readdir(directory)).filter(
      (name) => name.endsWith(THEME_FILE_SUFFIX) && !name.startsWith("."),
    );
    const results = await Promise.all(
      names.map((name) =>
        read(name.slice(0, -THEME_FILE_SUFFIX.length)).catch((error: unknown) => {
          console.error(`Skipping invalid theme ${name}:`, error);
          return undefined;
        }),
      ),
    );
    return results.flatMap((result) => (result ? [result.document] : []));
  }
  async function write(document: VideoThemeDocument, text: string): Promise<StoredTheme> {
    await _writeAtomically(fileFromId(document.id), text);
    return { document, hash: _hashText(text) };
  }
  return {
    list: async () =>
      (await readAll())
        .map((document) => ({
          id: document.id,
          label: document.label,
          builtIn: _isBuiltIn(document.id),
          ...(document.extends ? { extends: document.extends } : {}),
        }))
        .sort((left, right) => Number(right.builtIn) - Number(left.builtIn) || left.label.localeCompare(right.label)),
    read,
    create: async (value) => {
      const document = _parse(value);
      const text = _serializeWithinCap(document);
      const isTaken = await fs.access(fileFromId(document.id)).then(() => true, () => false);
      if (isTaken) {
        throw new ThemeStoreError(409, `A theme named "${document.id}" already exists`);
      }
      _assertResolves(document, await readAll());
      return write(document, text);
    },
    save: async (id, value, ifMatch) => {
      if (_isBuiltIn(id)) {
        throw new ThemeStoreError(403, "Built-in themes are read-only. Save a copy as a new theme.");
      }
      const document = _parse(value);
      if (document.id !== id) {
        throw new ThemeStoreError(400, "A theme's id cannot change when it is saved");
      }
      const text = _serializeWithinCap(document);
      if ((await read(id)).hash !== ifMatch) {
        throw new ThemeStoreError(409, "The theme changed on disk. Reload it before saving.");
      }
      _assertResolves(document, await readAll());
      return write(document, text);
    },
  };
}
```

`createThemeStore` is longer than 45 lines because it closes over the directory. If the reviewer objects, lift `read`, `readAll`, and `write` to module-level `_readTheme(directory, id)`, `_readAllThemes(directory)`, and `_writeTheme(directory, document)`.

- [ ] **Step 4: Run the tests to verify they pass**

Run the Step 2 command. Expected: 10 passing.

- [ ] **Step 5: Commit**

```bash
git add scripts/showcase/themeStore
git commit -m "feat(video-producer): store video themes with validation and atomic writes" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 20: Theme routes and server wiring

**Files:**
- Create: `scripts/showcase/themeRoutes/themeRoutes.ts`
- Test: `scripts/showcase/themeRoutes/themeRoutes.test.ts`
- Modify: `scripts/showcase/server.ts`

- [ ] **Step 1: Write the failing route tests**

```ts
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createThemeStore } from "../themeStore/themeStore";
import { handleThemeRequest } from "./themeRoutes";

const CLASSIC_FILE = fileURLToPath(new URL("../../../themes/classic.theme.json", import.meta.url));
const WARM = { schemaVersion: 1, id: "warm", label: "Warm", extends: "classic" };

async function _withServer(run: (origin: string) => Promise<void>) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "theme-routes-"));
  await fs.copyFile(CLASSIC_FILE, path.join(directory, "classic.theme.json"));
  const store = createThemeStore({ directory });
  const server: Server = createServer((req, res) => {
    const pathname = new URL(req.url ?? "/", "http://localhost").pathname;
    void handleThemeRequest({ req, res, pathname, store }).then((handled) => {
      if (!handled) {
        res.writeHead(404).end();
      }
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  try {
    await run(origin);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(directory, { recursive: true, force: true });
  }
}

function _write(origin: string, method: string, pathname: string, body: unknown, headers = {}) {
  return fetch(`${origin}${pathname}`, {
    method,
    headers: { "Content-Type": "application/json", Origin: origin, ...headers },
    body: JSON.stringify(body),
  });
}

test("the theme list is served", () =>
  _withServer(async (origin) => {
    const response = await fetch(`${origin}/api/themes`);
    assert.equal(response.status, 200);
    assert.equal(((await response.json()) as { id: string }[])[0].id, "classic");
  }));

test("the JSON Schema is served at schema.json, not read as a theme id", () =>
  _withServer(async (origin) => {
    const schema = (await (await fetch(`${origin}/api/themes/schema.json`)).json()) as { type: string };
    assert.equal(schema.type, "object");
  }));

test("a theme is created with POST and saved with PUT using its hash", () =>
  _withServer(async (origin) => {
    const created = (await (await _write(origin, "POST", "/api/themes", WARM)).json()) as { hash: string };
    const saved = await _write(origin, "PUT", "/api/themes/warm", { ...WARM, label: "Warmer" }, { "If-Match": created.hash });
    assert.equal(saved.status, 200);
  }));

test("a save without If-Match is refused with 428", () =>
  _withServer(async (origin) => {
    await _write(origin, "POST", "/api/themes", WARM);
    assert.equal((await _write(origin, "PUT", "/api/themes/warm", WARM)).status, 428);
  }));

test("a stale If-Match is a conflict", () =>
  _withServer(async (origin) => {
    await _write(origin, "POST", "/api/themes", WARM);
    assert.equal((await _write(origin, "PUT", "/api/themes/warm", WARM, { "If-Match": "stale" })).status, 409);
  }));

test("a cross-origin write is refused", () =>
  _withServer(async (origin) => {
    const response = await _write(origin, "POST", "/api/themes", WARM, { Origin: "http://evil.test" });
    assert.equal(response.status, 403);
  }));

test("paths outside /api/themes are left to other routes", () =>
  _withServer(async (origin) => {
    assert.equal((await fetch(`${origin}/api/exports`)).status, 404);
  }));
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --import tsx --import ./scripts/yaml/registerYaml.mjs --test scripts/showcase/themeRoutes/themeRoutes.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement the routes**

```ts
import type { IncomingMessage, ServerResponse } from "node:http";
import { createVideoThemeJsonSchema } from "../../../src/videoTheme/videoThemeSchema/videoThemeSchema";
import { THEME_FILE_MAX_BYTES, ThemeStoreError, type ThemeStore } from "../themeStore/themeStore";

const THEME_ROUTE = /^\/api\/themes(?:\/([^/]+))?$/;

type ThemeRequest = Readonly<{
  req: IncomingMessage;
  res: ServerResponse;
  pathname: string;
  store: ThemeStore;
}>;

function _send(res: ServerResponse, status: number, body: unknown): void {
  res
    .writeHead(status, { "Content-Type": "application/json", "Cache-Control": "no-store" })
    .end(JSON.stringify(body));
}

async function _readJsonBody(req: IncomingMessage): Promise<unknown> {
  let body = "";
  for await (const chunk of req) {
    body += chunk;
    if (Buffer.byteLength(body) > THEME_FILE_MAX_BYTES) {
      throw new ThemeStoreError(413, "Themes are limited to 256 KB");
    }
  }
  try {
    return JSON.parse(body);
  } catch {
    throw new ThemeStoreError(400, "The request body is not valid JSON");
  }
}

function _assertSameOrigin(req: IncomingMessage): void {
  if (req.headers.origin !== `http://${req.headers.host}`) {
    throw new ThemeStoreError(403, "Use the local showcase to change themes.");
  }
}

async function _route({ req, res, store }: ThemeRequest, id: string | undefined): Promise<void> {
  const method = req.method ?? "GET";
  if (id === undefined && method === "GET") {
    return _send(res, 200, await store.list());
  }
  if (id === undefined && method === "POST") {
    _assertSameOrigin(req);
    const stored = await store.create(await _readJsonBody(req));
    return _send(res, 201, { id: stored.document.id, hash: stored.hash });
  }
  if (id === "schema.json" && method === "GET") {
    return _send(res, 200, createVideoThemeJsonSchema());
  }
  if (id !== undefined && method === "GET") {
    return _send(res, 200, await store.read(id));
  }
  if (id !== undefined && method === "PUT") {
    _assertSameOrigin(req);
    const ifMatch = req.headers["if-match"];
    if (typeof ifMatch !== "string") {
      throw new ThemeStoreError(428, "Send the theme's hash in If-Match");
    }
    const stored = await store.save(id, await _readJsonBody(req), ifMatch);
    return _send(res, 200, { hash: stored.hash });
  }
  res.writeHead(405).end();
}

/**
 * Serves `/api/themes`: list, read, the JSON Schema, create (POST), and save
 * (PUT with `If-Match`). Writes require a same-origin request. Returns false
 * for any other path so the showcase server can try its other routes.
 */
export async function handleThemeRequest(request: ThemeRequest): Promise<boolean> {
  const match = THEME_ROUTE.exec(request.pathname);
  if (!match) {
    return false;
  }
  try {
    await _route(request, match[1]);
  } catch (error) {
    if (error instanceof ThemeStoreError) {
      _send(request.res, error.status, { message: error.message, issues: error.issues });
    } else {
      console.error("Theme request failed:", error);
      _send(request.res, 500, { message: "The theme request failed. Check the showcase terminal." });
    }
  }
  return true;
}
```

- [ ] **Step 4: Run the route tests to verify they pass**

Run the Step 2 command. Expected: 7 passing.

- [ ] **Step 5: Wire the routes and a theme watcher into the server**

In `scripts/showcase/server.ts`:

1. Add the imports beside the other local imports:

```ts
import { handleThemeRequest } from "./themeRoutes/themeRoutes";
import { createThemeStore } from "./themeStore/themeStore";
```

2. After the `plansWatcher` declaration, add:

```ts
const themeStore = createThemeStore({ directory: path.join(appRoot, "themes") });
let themeTimer: ReturnType<typeof setTimeout> | undefined;
// A theme saved here or edited on disk republishes, so open galleries reload it.
const themesWatcher = watch(path.join(appRoot, "themes"), (_event, filename) => {
  if (!filename?.endsWith(".theme.json") || filename.startsWith(".")) {
    return;
  }
  clearTimeout(themeTimer);
  themeTimer = setTimeout(() => {
    publish().catch((error) => console.error("Theme reload failed:", error));
  }, 200);
});
```

3. Make the first statement of `api()`:

```ts
  if (await handleThemeRequest({ req, res, pathname, store: themeStore })) {
    return;
  }
```

4. In `close()`, after `clearTimeout(planTimer);`, add `clearTimeout(themeTimer);` and after `plansWatcher.close();` add `themesWatcher.close();`.

- [ ] **Step 6: Check the routes on a running showcase**

Run in the background: `PORT=4292 pnpm showcase`
When it prints `Live showcase: http://localhost:4292`, run:
`curl -s http://localhost:4292/api/themes`
Expected: `[{"id":"avandar","label":"Avandar","builtIn":true,"extends":"classic"},{"id":"classic","label":"Classic","builtIn":true}]`

Run: `curl -s -o /dev/null -w '%{http_code}' -X PUT http://localhost:4292/api/themes/classic`
Expected: `403` (no Origin header).

Stop the showcase.

- [ ] **Step 7: Typecheck and commit**

Run: `pnpm exec tsc --noEmit -p tsconfig.tools.json`. Expected: no errors.

```bash
git add scripts/showcase/themeRoutes scripts/showcase/server.ts
git commit -m "feat(video-producer): serve video themes from the local showcase" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 21: Verify the model and confirm nothing changed on screen

- [ ] **Step 1: Run the producer unit tests**

Run: `pnpm test`
Expected: every new test passes. The only failures are the four that failed before this plan (three in `ShowcaseFilms.test.ts` for the missing `helperCatalog` copy, one in `editor-controls.test`). If any other test fails, fix it before continuing.

- [ ] **Step 2: Typecheck**

Run: `pnpm typecheck`
Expected: no errors.

- [ ] **Step 3: Lint and format the changed files**

From `<repo>`: `pnpm format` then `pnpm exec eslint apps/ava-video-producer/src/videoTheme apps/ava-video-producer/scripts/videoTheme apps/ava-video-producer/scripts/showcase/themeStore apps/ava-video-producer/scripts/showcase/themeRoutes apps/ava-video-producer/scripts/showcase/bundleShowcaseFilms`
Expected: no lint errors. Commit any formatting changes.

- [ ] **Step 4: Prove pixel parity**

Run: `pnpm theme:parity compare`
Expected: every target has `differingFrames` 0. This plan changed no renderer; the font registry refactor must not move a pixel.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A src/videoTheme scripts themes package.json tests
git commit -m "chore(video-producer): tidy the video theme model" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Skip the commit when there is nothing to add.

---

## Contract for plans 2 and 3

Plans 2 and 3 build on these exact names. Plan 1 builds everything in the first table.

### Built by this plan

| Name | Where | Shape |
| --- | --- | --- |
| `VIDEO_TOKEN_CATALOG`, `listTokenDefinitions`, `getTokenDefinitionFromPath`, `isMantineTokenRoot` | `src/videoTheme/tokenCatalog/tokenCatalog.ts` | Token paths use reference syntax without `$`: `colors.primary`, `atomic.swatch`, `color.accent`, `components.Node.radius`. |
| `token`, `scale`, `COMPOSITE_TOKEN_FIELDS`, `TOKEN_CONTROLS` | `src/videoTheme/tokenCatalog/defineTokens.ts` | Plan 2 adds components with `token()` in `componentTokens.ts`. |
| `parseVideoThemeDocument`, `videoThemePatchSchema`, `createVideoThemeJsonSchema`, `VIDEO_THEME_SLUG_PATTERN` | `src/videoTheme/videoThemeSchema/videoThemeSchema.ts` | |
| `resolveVideoTheme(library, themeId, scope?)` | `src/videoTheme/resolveVideoTheme/resolveVideoTheme.ts` | Returns `ResolvedVideoTheme`; throws `VideoThemeError` with `issues`. |
| `mergeVideoThemeLayers`, `getExtendsChainFromThemeId` | `src/videoTheme/mergeVideoThemeLayers/mergeVideoThemeLayers.ts` | |
| `BUILT_IN_VIDEO_THEMES`, `BUILT_IN_VIDEO_THEME_IDS`, `DEFAULT_VIDEO_THEME_SOURCE`, `createVideoThemeLibrary` | `src/videoTheme/builtInVideoThemes/builtInVideoThemes.ts` | |
| `VideoThemeProvider({ source, element? })` | `src/videoTheme/VideoThemeProvider/VideoThemeProvider.tsx` | `element="none"` inside SVG. |
| `VideoThemeScope({ overrideIds?, patches?, element? })`, `createScopedVideoThemeSource` | `src/videoTheme/VideoThemeScope/VideoThemeScope.tsx` | Inner overrides rank below outer; inner patches after outer. |
| `useVideoTheme`, `useVideoTokens`, `useVideoProps(name, props)`, `useVideoThemeContext`, `VideoThemeContext` | `src/videoTheme/useVideoTheme/useVideoTheme.ts` | |
| `VideoTokenUsageContext`, `createTokenUsageCollector`, `createTokenUsageProxy` | `src/videoTheme/tokenUsage/tokenUsage.ts` | |
| `ReenactmentThemeBoundary` | `src/videoTheme/ReenactmentThemeBoundary/ReenactmentThemeBoundary.tsx` | |
| `buildVideoCssVariables` | `src/videoTheme/buildVideoCssVariables/buildVideoCssVariables.ts` | `--video-<semantic path>`, `--video-component-<name>-<prop>`. |
| `buildColorWithAlpha`, `elevationToBoxShadow`, `elevationToDropShadowFilter`, `textShadowToCss`, `fillToCss` | `src/videoTheme/cssValues/cssValues.ts` | |
| `createEasingFromToken` | `src/videoTheme/createEasingFromToken/createEasingFromToken.ts` | |
| `getResolvedTokenValue`, `getValueAtPath` | `src/videoTheme/getResolvedTokenValue/getResolvedTokenValue.ts` | |
| `listTextContrastFromTheme`, `getContrastRatioFromColors`, `getWcagLevelFromContrast` | `src/videoTheme/textContrast/textContrast.ts` | |
| `buildVideoThemeHashFromContent` | `src/videoTheme/hashVideoTheme/hashVideoTheme.ts` | |
| `VIDEO_FONT_REGISTRY`, `VIDEO_FONT_IDS`, `listBundledVideoFonts`, `getVideoFontIdFromStack` | `src/videoTheme/videoFontRegistry/videoFontRegistry.ts` | |
| `createThemeStore`, `ThemeStoreError`, `THEME_FILE_MAX_BYTES` | `scripts/showcase/themeStore/themeStore.ts` | |
| `/api/themes` routes | `scripts/showcase/themeRoutes/themeRoutes.ts` | `GET` list, `GET :id` → `{ document, hash }`, `GET schema.json`, `POST` → `{ id, hash }`, `PUT :id` with `If-Match` → `{ hash }`. Errors: `{ message, issues }`. |
| `pnpm theme:parity capture|compare [ids]` | `scripts/videoTheme/themeParity/themeParity.ts` | Baseline captured in Task 5. |

### To be built by plan 2 (renderer adoption)

| Name | Where | Shape |
| --- | --- | --- |
| `VideoThemeSnapshot` | `src/videoTheme/videoThemeSnapshot/videoThemeSnapshot.ts` | `Readonly<{ themeId: string; documents: readonly VideoThemeDocument[]; patches: readonly VideoThemePatch[] }>`. `documents` holds the theme and its `extends` chain minus built-ins. `patches` holds unsaved drafts, lowest first: the theme-scope draft, then the item override draft. |
| `createVideoThemeSourceFromSnapshot(snapshot \| undefined, overrideIds)` | same module | Returns a `VideoThemeSource`. An undefined snapshot means `classic`. |
| `loadVideoThemeSnapshot({ id, patch? })` | `scripts/videoTheme/loadVideoThemeSnapshot/loadVideoThemeSnapshot.ts` | Reads `themes/` through the theme store, validates, and resolves once to reject an invalid theme. |
| `Film.theme?: VideoThemeSnapshot` and `FilmOptions.theme?: { id: string; patch?: VideoThemePatch }` | `src/showcase/showcase.types.ts`, `ShowcaseFilms.load` | `ShowcaseFilms.load` freezes the snapshot into the film. |
| Film root provider | `src/showcase/FilmComposition.tsx` | Wraps every film in `VideoThemeProvider` with `createVideoThemeSourceFromSnapshot(film.theme, [itemId])`. |
| Stock scope | `src/stock/StockGraphic.tsx` | Renders inside `VideoThemeScope overrideIds={[preset]}` with `createThemePatchFromStockColors({ accent, background })` when those props are given. |
| `--theme <id>` | `video render`, `motion render`, `atlas:posters`, `theme:parity` | Default `classic`. |
| `delivery.json` `themeId`, `themeHash` | render output | `themeHash` is `ResolvedVideoTheme.hash`. |
| Reenactment isolation | `avandar-adapter/index.tsx` | Product root wrapped in `ReenactmentThemeBoundary`, with a test. |
| Per-theme posters | `showcase/assets/atlas/<themeId>/<id>.jpg` | `classic` and `avandar` tracked. |
| Legacy appearance bridge | `src/continuity/`, `src/showcase/LivePlayer.tsx`, `ShowcaseFilms.load` | Removes `accent`, `background`, `annotationRoughness`, `boxRoughness`, and `cameraPreset` from the continuity scene schema and renderer props (spec §1.7, §2.3), and moves authored colours into `classic.overrides`. `createThemePatchFromLegacyAppearance(appearance)` converts the gallery's existing palette, roughness, and camera preset values into a `VideoThemePatch`, so today's controls, the live player, and exports keep working until plan 3 replaces them. |

Every plan leaves the app shippable: after plan 2 the gallery looks and behaves as it does today, with every value now flowing through tokens.

### To be built by plan 3 (editor)

`useVideoThemeDraft`, `VideoThemeEditor`, `TokenControl`, the modal tabs, iframe `film-control` action `theme` carrying a `VideoThemeSnapshot` and the player's acknowledgement by resolved hash, `film-tokens-used` usage posts, export bodies with `theme: { id, patch }`, the gallery root provider, poster fallback badges, token copy extraction into gallery messages, and the docs from spec §4.5. Plan 3 also removes the legacy appearance bridge and the palette, roughness, and camera preset controls it fed, and moves the `composition-appearance` localStorage key to a new version.
