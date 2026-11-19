/** @jsxRuntime automatic */
/*
 * No dead tokens: every semantic and component token is read by a renderer,
 * or referenced by a token that is. Readers are found four ways: stock
 * shapes report reads while all 170 stock presets render, the continuity
 * plan builder reports reads through a usage proxy for all 36 compositions
 * and sample films, stage CSS modules name `--video-*` variables, and stage
 * TSX, with its comments removed, names token paths, or calls
 * `useVideoProps("Name"` and names the prop. `sketch.profile`,
 * `camera.presets`, and `motion.easingProfiles` are menus: one member in
 * use keeps the whole menu, like an atomic scale.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { CONTINUITY_CATALOG } from "../../../src/continuity/continuityCatalog";
import { createContinuityPlanFromVideoTheme } from "../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { STOCK_IDS } from "../../../src/stock/catalog";
import { DocumentFragment } from "../../../src/stock/primitives/DocumentFragment/DocumentFragment";
import { MembershipMarker } from "../../../src/stock/primitives/MembershipMarker/MembershipMarker";
import { ObjectGlyph } from "../../../src/stock/primitives/ObjectGlyph/ObjectGlyph";
import { PersonGlyph } from "../../../src/stock/primitives/PersonGlyph/PersonGlyph";
import { QuantityBand } from "../../../src/stock/primitives/QuantityBand/QuantityBand";
import { RoutePath } from "../../../src/stock/primitives/RoutePath/RoutePath";
import { TableCell } from "../../../src/stock/primitives/TableCell/TableCell";
import { StockGraphic } from "../../../src/stock/StockGraphic/StockGraphic";
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
import type { StockRequest } from "../../../src/stock/contracts/StockContract.types";
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
const STAGE_SOURCE_PATHS = [
  "src/continuity",
  "src/motion-components",
  "src/scenes",
  "src/chrome",
  "src/storyboard",
  "src/compositions",
  "src/title-card.tsx",
  "src/cursor-motion.ts",
  "src/Root.tsx",
  "src/gallery/HelperGallery/demos",
  "src/gallery/HelperGallery/HelperPlayer",
];
const PALETTE_GROUPS = [
  "sketch.profile",
  "camera.presets",
  "motion.easingProfiles",
];
/**
 * Tokens the resolver applies to other tokens instead of a renderer reading
 * them: `elevation.strength` scales every resolved shadow.
 */
const RESOLVER_TOKEN_PATHS = ["elevation.strength"];

const TOKEN_PATHS = listTokenDefinitions()
  .map((entry) => {
    return entry.path;
  })
  .filter((tokenPath) => {
    return !isMantineTokenRoot(tokenPath.split(".")[0]);
  });
const TOKEN_PATH_SET: ReadonlySet<string> = new Set(TOKEN_PATHS);
/**
 * Atomic scales are exempt: they are vocabularies a theme or the editor writes
 * new entries into.
 */
const AUDITED_TOKEN_PATHS = TOKEN_PATHS.filter((tokenPath) => {
  return !tokenPath.startsWith("atomic.");
});

/** Every Atlas composition and sample film runs through the plan builder. */
const READER_COMPOSITION_IDS = CONTINUITY_CATALOG.map((entry) => {
  return entry.id;
});

function _stockReads(): string[] {
  const collector = createTokenUsageCollector();
  STOCK_IDS.forEach((preset) => {
    // TypeScript cannot narrow a request over 170 preset ids to the
    // preset-discriminated union, though every preset has a default input.
    const request = { preset } as StockRequest;
    SAMPLE_FRAMES.forEach((frame) => {
      renderToStaticMarkup(
        <VideoTokenUsageContext.Provider value={collector.report}>
          <StockGraphic {...request} frame={frame} />
        </VideoTokenUsageContext.Provider>,
      );
    });
  });
  return [...collector.getPaths()];
}

/**
 * Reads of the stock primitives drawn with their own defaults, since a
 * preset may pass every value a primitive would otherwise read.
 */
function _primitiveReads(): string[] {
  const collector = createTokenUsageCollector();
  renderToStaticMarkup(
    <VideoTokenUsageContext.Provider value={collector.report}>
      <svg>
        <DocumentFragment x={0} y={0} width={200} text="a" emphasized />
        <DocumentFragment x={0} y={0} width={200} text="a" />
        <MembershipMarker x={0} y={0} membership="included" />
        <MembershipMarker x={0} y={0} membership="excluded" />
        <ObjectGlyph kind="box" x={0} y={0} />
        <PersonGlyph x={0} y={0} />
        <QuantityBand
          values={[{ value: 1, color: "#000000" }]}
          denominator={2}
          x={0}
          y={0}
          width={10}
          height={10}
        />
        <RoutePath
          points={[
            { x: 0, y: 0 },
            { x: 1, y: 1 },
          ]}
          progress={0}
        />
        <TableCell x={0} y={0} width={200} text="a" highlighted />
        <TableCell x={0} y={0} width={200} text="a" />
      </svg>
    </VideoTokenUsageContext.Provider>,
  );
  return [...collector.getPaths()];
}

function _planBuilderReads(): string[] {
  const collector = createTokenUsageCollector();
  const plans = READER_COMPOSITION_IDS.map((id) => {
    const entry = CONTINUITY_CATALOG.find((candidate) => {
      return candidate.id === id;
    });
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
  CAMERA_PRESETS.forEach((cameraPreset) => {
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
    plans.forEach((plan) => {
      return createContinuityPlanFromVideoTheme(plan, { semantic });
    });
  });
  return [...collector.getPaths()];
}

/**
 * The text of every stage renderer file with one of the extensions, tests and
 * gallery UI excluded.
 */
const COMMENT_FREE_PRINTER = ts.createPrinter({ removeComments: true });

/**
 * A TS or TSX source as code alone, so a token path or prop name that only
 * a comment mentions is not a read.
 */
function _removeComments(fileName: string, source: string): string {
  if (!/\.tsx?$/.test(fileName)) {
    return source;
  }
  return COMMENT_FREE_PRINTER.printFile(
    ts.createSourceFile(
      fileName,
      source,
      ts.ScriptTarget.Latest,
      false,
      fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    ),
  );
}

function _readStageSources(pattern: RegExp): string {
  return STAGE_SOURCE_PATHS.flatMap((sourcePath) => {
    const url = new URL(`../../../${sourcePath}`, import.meta.url);
    if (fs.statSync(url).isFile()) {
      return pattern.test(sourcePath)
        ? [_removeComments(sourcePath, fs.readFileSync(url, "utf8"))]
        : [];
    }
    const root = new URL(`${url.href}/`);
    return fs
      .readdirSync(root, { recursive: true, encoding: "utf8" })
      .filter((file) => {
        return (
          pattern.test(file) &&
          !file.includes(".test.") &&
          !file.includes("gallery")
        );
      })
      .map((file) => {
        return _removeComments(
          file,
          fs.readFileSync(new URL(file, root), "utf8"),
        );
      });
  }).join("\n");
}

function _kebab(segment: string): string {
  return segment
    .replace(/[A-Z]/g, (letter) => {
      return `-${letter.toLowerCase()}`;
    })
    .replace(/^-/, "");
}

/**
 * The `--video-*` name a token's variables start with, as
 * `buildVideoCssVariables` writes them.
 */
function _variablePrefix(tokenPath: string): string {
  const [root, ...rest] = tokenPath.split(".");
  return root === "components"
    ? `--video-component-${rest.map(_kebab).join("-")}`
    : `--video-${[root, ...rest].map(_kebab).join("-")}`;
}

function _cssReads(): string[] {
  const names = new Set(
    [..._readStageSources(/\.css$/).matchAll(/var\((--video-[a-z0-9-]+)/g)].map(
      (match) => {
        return match[1];
      },
    ),
  );
  const owners = TOKEN_PATHS.filter((tokenPath) => {
    return !tokenPath.startsWith("atomic.");
  })
    .map((tokenPath) => {
      return { tokenPath, prefix: _variablePrefix(tokenPath) };
    })
    .sort((left, right) => {
      return right.prefix.length - left.prefix.length;
    });
  return [...names].flatMap((name) => {
    const owner = owners.find(({ prefix }) => {
      return name === prefix || name.startsWith(`${prefix}-`);
    });
    return owner ? [owner.tokenPath] : [];
  });
}

function _scriptReads(): string[] {
  const source = _readStageSources(/\.tsx?$/);
  const components = new Set(
    [...source.matchAll(/useVideoProps\("(\w+)"/g)].map((match) => {
      return match[1];
    }),
  );
  return TOKEN_PATHS.filter((tokenPath) => {
    const [root, name, prop] = tokenPath.split(".");
    if (root === "components") {
      return (
        components.has(name) &&
        (prop === undefined || new RegExp(`\\b${prop}\\b`).test(source))
      );
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

function _referencedTokenPaths(value: unknown): string[] {
  if (isTokenReference(value)) {
    const target = getTargetFromTokenReference(value);
    if (target.tier === "primary" || target.tier === "mantine") {
      return [];
    }
    const segments =
      target.tier === "atomic" ? ["atomic", ...target.path] : [...target.path];
    const prefixes = segments.map((_, index) => {
      return segments.slice(0, segments.length - index).join(".");
    });
    return prefixes
      .filter((prefix) => {
        return TOKEN_PATH_SET.has(prefix);
      })
      .slice(0, 1);
  }
  return typeof value === "object" && value !== null
    ? Object.values(value).flatMap(_referencedTokenPaths)
    : [];
}

/**
 * A token plus, when it belongs to a menu group, every other choice in that
 * menu.
 */
function _withPaletteSiblings(tokenPath: string): string[] {
  const group = PALETTE_GROUPS.find((prefix) => {
    return tokenPath.startsWith(`${prefix}.`);
  });
  return group
    ? TOKEN_PATHS.filter((candidate) => {
        return candidate.startsWith(`${group}.`);
      })
    : [tokenPath];
}

/**
 * Every token read directly, plus every token a live token references in a
 * built-in theme.
 */
function _liveTokenPaths(directReads: readonly string[]): Set<string> {
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
    .filter((tokenPath) => {
      return TOKEN_PATH_SET.has(tokenPath);
    })
    .forEach(markLive);
  for (
    let tokenPath = pending.pop();
    tokenPath !== undefined;
    tokenPath = pending.pop()
  ) {
    const current = tokenPath;
    documents
      .flatMap((document) => {
        return _referencedTokenPaths(_rawValue(document, current));
      })
      .forEach(markLive);
  }
  return live;
}

const READS = {
  stock: _stockReads(),
  primitives: _primitiveReads(),
  planBuilder: _planBuilderReads(),
  css: _cssReads(),
  script: _scriptReads(),
};
const LIVE_TOKEN_PATHS = _liveTokenPaths([
  ...Object.values(READS).flat(),
  ...RESOLVER_TOKEN_PATHS,
]);

test("every reader source finds tokens, so a broken collector cannot pass the audit", () => {
  Object.entries(READS).forEach(([name, reads]) => {
    return assert.ok(reads.length > 0, name);
  });
});

test("every token is read by a renderer or referenced by one that is", () => {
  assert.deepEqual(
    AUDITED_TOKEN_PATHS.filter((tokenPath) => {
      return !LIVE_TOKEN_PATHS.has(tokenPath);
    }),
    [],
  );
});
