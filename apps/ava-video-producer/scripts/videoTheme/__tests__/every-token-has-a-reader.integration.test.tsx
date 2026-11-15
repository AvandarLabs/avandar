/** @jsxRuntime automatic */
/*
 * No dead tokens: every semantic and component token is read by an in-scope
 * renderer, or referenced by a token that is. Readers are found
 * four ways: stock shapes report reads while the in-scope presets render,
 * the continuity plan builder reports reads through a usage proxy, stage CSS
 * modules name `--video-*` variables, and stage TSX names token paths or
 * calls `useVideoProps("Name"`. `sketch.profile` and `camera.presets` are
 * menus: one member in use keeps the whole menu, like an atomic scale.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { createContinuityPlanFromVideoTheme } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { StockGraphic } from "../../../src/stock/StockGraphic";
import { storyboardSchema } from "../../../src/storyboard/schema/schema";
import { BUILT_IN_VIDEO_THEMES } from "../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { getValueAtPath } from "../../../src/videoTheme/getValueAtPath";
import { makeResolvedVideoThemeFromLibrary } from "../../../src/videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import {
  getTargetFromTokenReference,
  isTokenReference,
} from "../../../src/videoTheme/themeReferenceHelpers/themeReferenceHelpers";
import { SEMANTIC_TOKENS } from "../../../src/videoTheme/tokenCatalog/semanticTokens/semanticTokens";
import {
  isMantineTokenRoot,
  listTokenDefinitions,
} from "../../../src/videoTheme/tokenCatalog/tokenCatalogHelpers";
import {
  createTokenUsageCollector,
  createTokenUsageProxy,
  VideoTokenUsageContext,
} from "../../../src/videoTheme/tokenUsageHelpers/tokenUsageHelpers";
import {
  PARITY_COMPOSITION_IDS,
  PARITY_STOCK_PRESET_IDS,
} from "../themeParity/parityTargets/parityTargets";
import type { VideoThemeDocument } from "../../../src/videoTheme/videoTheme.types";

const SAMPLE_FRAMES = [0, 45, 90, 135, 179];
const CAMERA_PRESETS = [
  "authored",
  "deliberate",
  "gentle",
  "balanced",
  "brisk",
  "whip",
] as const;
const STAGE_SOURCE_DIRECTORIES = ["src/continuity", "src/motion-components"];
const PALETTE_GROUPS = ["sketch.profile", "camera.presets"];

const TOKEN_PATHS = listTokenDefinitions()
  .map((entry) => entry.path)
  .filter((tokenPath) => !isMantineTokenRoot(tokenPath.split(".")[0]));
const TOKEN_PATH_SET: ReadonlySet<string> = new Set(TOKEN_PATHS);
/** Atomic scales are exempt: they are vocabularies a theme or the editor writes new entries into. */
const AUDITED_TOKEN_PATHS = TOKEN_PATHS.filter(
  (tokenPath) => !tokenPath.startsWith("atomic."),
);

function _stockReads(): readonly string[] {
  const collector = createTokenUsageCollector();
  for (const preset of PARITY_STOCK_PRESET_IDS) {
    for (const frame of SAMPLE_FRAMES) {
      renderToStaticMarkup(
        <VideoTokenUsageContext.Provider value={collector.report}>
          <StockGraphic preset={preset} frame={frame} />
        </VideoTokenUsageContext.Provider>,
      );
    }
  }
  return collector.getPaths();
}

function _planBuilderReads(): readonly string[] {
  const collector = createTokenUsageCollector();
  const plans = PARITY_COMPOSITION_IDS.map((id) => {
    const entry = CONTINUITY_CATALOG.find((candidate) => candidate.id === id);
    assert.ok(entry, id);
    return storyboardSchema.parse(
      JSON.parse(
        fs.readFileSync(
          new URL(`../../../storyboards/${entry.path}.json`, import.meta.url),
          "utf8",
        ),
      ),
    );
  });
  for (const cameraPreset of CAMERA_PRESETS) {
    const patch = {
      other: { video: { semantic: { camera: { preset: cameraPreset } } } },
    };
    const theme = makeResolvedVideoThemeFromLibrary(
      BUILT_IN_VIDEO_THEMES,
      "classic",
      {
        patches: [patch],
      },
    );
    const semantic = createTokenUsageProxy({
      value: theme.semantic,
      catalog: SEMANTIC_TOKENS,
      basePath: [],
      report: collector.report,
    });
    plans.forEach((plan) =>
      createContinuityPlanFromVideoTheme(plan, { semantic }),
    );
  }
  return collector.getPaths();
}

/** The text of every stage renderer file with one of the extensions, tests and gallery UI excluded. */
function _readStageSources(pattern: RegExp): string {
  return STAGE_SOURCE_DIRECTORIES.flatMap((directory) => {
    const root = new URL(`../../../${directory}/`, import.meta.url);
    return fs
      .readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter(
        (file) =>
          pattern.test(file) &&
          !file.includes(".test.") &&
          !file.includes("gallery"),
      )
      .map((file) => fs.readFileSync(new URL(file, root), "utf8"));
  }).join("\n");
}

function _kebab(segment: string): string {
  return segment
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)
    .replace(/^-/, "");
}

/** The `--video-*` name a token's variables start with, as `buildVideoCssVariables` writes them. */
function _variablePrefix(tokenPath: string): string {
  const [root, ...rest] = tokenPath.split(".");
  return root === "components"
    ? `--video-component-${rest.map(_kebab).join("-")}`
    : `--video-${[root, ...rest].map(_kebab).join("-")}`;
}

function _cssReads(): readonly string[] {
  const names = new Set(
    [..._readStageSources(/\.css$/).matchAll(/var\((--video-[a-z0-9-]+)/g)].map(
      (match) => match[1],
    ),
  );
  const owners = TOKEN_PATHS.filter(
    (tokenPath) => !tokenPath.startsWith("atomic."),
  )
    .map((tokenPath) => ({ tokenPath, prefix: _variablePrefix(tokenPath) }))
    .sort((left, right) => right.prefix.length - left.prefix.length);
  return [...names].flatMap((name) => {
    const owner = owners.find(
      ({ prefix }) => name === prefix || name.startsWith(`${prefix}-`),
    );
    return owner ? [owner.tokenPath] : [];
  });
}

function _scriptReads(): readonly string[] {
  const source = _readStageSources(/\.tsx?$/);
  const components = new Set(
    [...source.matchAll(/useVideoProps\("(\w+)"/g)].map((match) => match[1]),
  );
  return TOKEN_PATHS.filter((tokenPath) => {
    const [root, name] = tokenPath.split(".");
    if (root === "components") {
      return components.has(name);
    }
    return (
      root !== "atomic" &&
      new RegExp(`(?<![\\w$])${tokenPath.replaceAll(".", "\\.")}(?!\\w)`).test(
        source,
      )
    );
  });
}

/** The raw value of a token in a theme file, before references resolve. */
function _rawValue(document: VideoThemeDocument, tokenPath: string): unknown {
  const [root, ...rest] = tokenPath.split(".");
  if (root === "components") {
    return getValueAtPath(document, [
      "components",
      rest[0],
      "defaultProps",
      ...rest.slice(1),
    ]);
  }
  return root === "atomic"
    ? getValueAtPath(document, ["other", "video", "atomic", ...rest])
    : getValueAtPath(document, ["other", "video", "semantic", root, ...rest]);
}

function _referencedTokenPaths(value: unknown): readonly string[] {
  if (isTokenReference(value)) {
    const target = getTargetFromTokenReference(value);
    if (target.tier === "primary" || target.tier === "mantine") {
      return [];
    }
    const segments =
      target.tier === "atomic" ? ["atomic", ...target.path] : [...target.path];
    const prefixes = segments.map((_, index) =>
      segments.slice(0, segments.length - index).join("."),
    );
    return prefixes.filter((prefix) => TOKEN_PATH_SET.has(prefix)).slice(0, 1);
  }
  return typeof value === "object" && value !== null
    ? Object.values(value).flatMap(_referencedTokenPaths)
    : [];
}

/** A token plus, when it belongs to a menu group, every other choice in that menu. */
function _withPaletteSiblings(tokenPath: string): readonly string[] {
  const group = PALETTE_GROUPS.find((prefix) =>
    tokenPath.startsWith(`${prefix}.`),
  );
  return group
    ? TOKEN_PATHS.filter((candidate) => candidate.startsWith(`${group}.`))
    : [tokenPath];
}

/** Every token read directly, plus every token a live token references in a built-in theme. */
function _liveTokenPaths(directReads: readonly string[]): ReadonlySet<string> {
  const documents = [...BUILT_IN_VIDEO_THEMES.values()];
  const live = new Set<string>();
  const pending: string[] = [];
  const markLive = (tokenPath: string) => {
    for (const member of _withPaletteSiblings(tokenPath)) {
      if (!live.has(member)) {
        live.add(member);
        pending.push(member);
      }
    }
  };
  directReads
    .filter((tokenPath) => TOKEN_PATH_SET.has(tokenPath))
    .forEach(markLive);
  for (
    let tokenPath = pending.pop();
    tokenPath !== undefined;
    tokenPath = pending.pop()
  ) {
    const current = tokenPath;
    documents
      .flatMap((document) =>
        _referencedTokenPaths(_rawValue(document, current)),
      )
      .forEach(markLive);
  }
  return live;
}

test("every reader source finds tokens, so a broken collector cannot pass the audit", () => {
  for (const [name, reads] of Object.entries({
    stock: _stockReads(),
    planBuilder: _planBuilderReads(),
    css: _cssReads(),
    script: _scriptReads(),
  })) {
    assert.ok(reads.length > 0, name);
  }
});

test("every token is read by an in-scope renderer or referenced by one that is", () => {
  const live = _liveTokenPaths([
    ..._stockReads(),
    ..._planBuilderReads(),
    ..._cssReads(),
    ..._scriptReads(),
  ]);
  assert.deepEqual(
    AUDITED_TOKEN_PATHS.filter((tokenPath) => !live.has(tokenPath)),
    [],
  );
});
