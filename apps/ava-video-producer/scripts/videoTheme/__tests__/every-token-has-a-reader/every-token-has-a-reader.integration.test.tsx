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
import { fileURLToPath } from "node:url";
import { prop } from "@avandar/utils";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { CONTINUITY_CATALOG } from "../../../../src/continuity/continuityCatalog";
import { createContinuityPlanFromVideoTheme } from "../../../../src/continuity/createContinuityPlanFromVideoTheme/createContinuityPlanFromVideoTheme";
import { STOCK_IDS } from "../../../../src/stock/catalog";
import { DocumentFragment } from "../../../../src/stock/primitives/DocumentFragment/DocumentFragment";
import { MembershipMarker } from "../../../../src/stock/primitives/MembershipMarker/MembershipMarker";
import { ObjectGlyph } from "../../../../src/stock/primitives/ObjectGlyph/ObjectGlyph";
import { PersonGlyph } from "../../../../src/stock/primitives/PersonGlyph/PersonGlyph";
import { QuantityBand } from "../../../../src/stock/primitives/QuantityBand/QuantityBand";
import { RoutePath } from "../../../../src/stock/primitives/RoutePath/RoutePath";
import { TableCell } from "../../../../src/stock/primitives/TableCell/TableCell";
import { StockGraphic } from "../../../../src/stock/StockGraphic/StockGraphic";
import { storyboardSchema } from "../../../../src/storyboard/schema/schema";
import { BUILT_IN_VIDEO_THEMES } from "../../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../../../../src/videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { SEMANTIC_TOKENS } from "../../../../src/videoTheme/tokenCatalog/semanticTokens/semanticTokens";
import {
  createTokenUsageCollector,
  createTokenUsageProxy,
  VideoTokenUsageContext,
} from "../../../../src/videoTheme/tokenUsageHelpers/tokenUsageHelpers";
import { getComponentTokenReadsFromProgram } from "../../themeLiterals/getComponentTokenReadsFromProgram/getComponentTokenReadsFromProgram";
import { TokenLivenessGraph } from "./TokenLivenessGraph";
import type { StockRequest } from "../../../../src/stock/contracts/StockContract.types";

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
  "src/TitleCard",
  "src/CursorMotionHelpers.ts",
  "src/Root.tsx",
  "src/gallery/HelperGallery/demos",
  "src/gallery/HelperGallery/HelperPlayer",
];
/**
 * Tokens the resolver applies to other tokens instead of a renderer reading
 * them: `elevation.strength` scales every resolved shadow.
 */
const RESOLVER_TOKEN_PATHS = ["elevation.strength"];
/**
 * Atomic scales are exempt: they are vocabularies a theme or the editor writes
 * new entries into.
 */
const AUDITED_TOKEN_PATHS = TokenLivenessGraph.TOKEN_PATHS.filter(
  (tokenPath) => {
    return !tokenPath.startsWith("atomic.");
  },
);
/** Every Atlas composition and sample film runs through the plan builder. */
const READER_COMPOSITION_IDS = CONTINUITY_CATALOG.map(prop("id"));
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
          new URL(
            `../../../../storyboards/${entry.path}.json`,
            import.meta.url,
          ),
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
      { patches: [patch] },
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
/** The comment-free printer used by renderer-source audits. */
const COMMENT_FREE_PRINTER = ts.createPrinter({ removeComments: true });
/**
 * A TS or TSX source as code alone, so a token path or prop name that only
 * a comment mentions is not a read.
 */
function _removeComments({
  fileName,
  source,
}: Readonly<{ fileName: string; source: string }>): string {
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
/** Lists stage renderer files selected by extension, excluding tests and UI. */
function _listStageSourceFiles(pattern: RegExp): string[] {
  return STAGE_SOURCE_PATHS.flatMap((sourcePath) => {
    const url = new URL(`../../../../${sourcePath}`, import.meta.url);
    if (fs.statSync(url).isFile()) {
      return pattern.test(sourcePath) ? [fileURLToPath(url)] : [];
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
        return fileURLToPath(new URL(file, root));
      });
  });
}

/** Reads comment-free stage source with the selected file extensions. */
function _readStageSources(pattern: RegExp): string {
  return _listStageSourceFiles(pattern)
    .map((fileName) => {
      return _removeComments({
        fileName,
        source: fs.readFileSync(fileName, "utf8"),
      });
    })
    .join("\n");
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
  const owners = TokenLivenessGraph.TOKEN_PATHS.filter((tokenPath) => {
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
  return TokenLivenessGraph.TOKEN_PATHS.filter((tokenPath) => {
    const [root] = tokenPath.split(".");
    return (
      root !== "atomic" &&
      root !== "components" &&
      new RegExp(`(?<![\\w$])${tokenPath.replaceAll(".", "\\.")}(?!\\w)`).test(
        source,
      )
    );
  });
}

/** Component properties read by stage renderer objects and typed helpers. */
function _componentReads(): string[] {
  const config = ts.getParsedCommandLineOfConfigFile(
    fileURLToPath(new URL("../../../../tsconfig.json", import.meta.url)),
    {},
    {
      ...ts.sys,
      onUnRecoverableConfigFileDiagnostic: (diagnostic) => {
        throw new Error(
          ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n"),
        );
      },
    },
  );
  if (!config) {
    throw new Error(
      "The component token audit needs the producer TypeScript config",
    );
  }
  const files = _listStageSourceFiles(/\.tsx?$/);
  const program = ts.createProgram(files, config.options);
  return getComponentTokenReadsFromProgram({
    program,
    sourceFiles: files.map((file) => {
      return program.getSourceFile(file)!;
    }),
  });
}

const READS = {
  stock: _stockReads(),
  primitives: _primitiveReads(),
  planBuilder: _planBuilderReads(),
  css: _cssReads(),
  script: _scriptReads(),
  component: _componentReads(),
};
const LIVE_TOKEN_PATHS = TokenLivenessGraph.liveTokenPaths([
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
