import assert from "node:assert/strict";
import test from "node:test";
import {
  BUILT_IN_VIDEO_THEMES,
  createVideoThemeLibrary,
} from "../builtInVideoThemes/builtInVideoThemes";
import { VideoThemeError } from "../VideoThemeError";
import { makeResolvedVideoThemeFromLibrary } from "./makeResolvedVideoThemeFromLibrary";
import type { VideoThemeDocument, VideoThemePatch } from "../videoTheme.types";

const LIGHT_GROUND: VideoThemePatch = {
  other: { video: { atomic: { swatch: { ground: "#f8fafc" } } } },
};

function _extending(
  id: string,
  extra: Partial<VideoThemeDocument>,
): VideoThemeDocument {
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
      return error.issues
        .map((issue) => `${issue.path}: ${issue.message}`)
        .join("\n");
    }
    throw error;
  }
  return "";
}

test("classic resolves the gallery default accent on its dark ground", () => {
  const theme = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
  );
  assert.equal(theme.isDarkGround, true);
  assert.equal(theme.semantic.color.accent, "#51a7ff");
});

test("colour pairs switch to their on-light value on a light ground", () => {
  const theme = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
    {
      patches: [LIGHT_GROUND],
    },
  );
  assert.equal(theme.isDarkGround, false);
  assert.equal(theme.semantic.color.text, "#182d27");
  assert.equal(theme.semantic.color.accent, "#0b4aea");
});

test("type styles resolve their size, weight, and font from Mantine headings", () => {
  const heading = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
  ).semantic.text.stage.heading;
  assert.deepEqual(
    [
      heading.fontFamily,
      heading.fontSize,
      heading.fontWeight,
      heading.lineHeight,
      heading.letterSpacing,
    ],
    ["Figtree, ui-sans-serif, system-ui, sans-serif", 48, 600, 1.12, -0.025],
  );
});

test("a reference to a missing token is reported with its path", () => {
  const library = createVideoThemeLibrary([
    _extending(
      "broken",
      _semantic({ color: { accent: "$atomic.swatch.nope" } }),
    ),
  ]);
  assert.match(
    _issuesOf(() => makeResolvedVideoThemeFromLibrary(library, "broken")),
    /^color\.accent: .*nope/m,
  );
});

test("a reference cycle is reported", () => {
  const library = createVideoThemeLibrary([
    _extending(
      "loop",
      _semantic({
        color: { accent: "$color.accentAlt", accentAlt: "$color.accent" },
      }),
    ),
  ]);
  assert.match(
    _issuesOf(() => makeResolvedVideoThemeFromLibrary(library, "loop")),
    /Reference cycle/,
  );
});

test("graphic text rejects a font without measured widths", () => {
  const library = createVideoThemeLibrary([
    _extending(
      "figtree-labels",
      _semantic({
        text: { graphic: { label: { family: "$atomic.fontFamily.figtree" } } },
      }),
    ),
  ]);
  assert.match(
    _issuesOf(() =>
      makeResolvedVideoThemeFromLibrary(library, "figtree-labels"),
    ),
    /^text\.graphic\.label: /m,
  );
});

test("Mantine shadows derive from atomic shadows and the shadow colour", () => {
  assert.equal(
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic").mantine
      .shadows.lg,
    "0px 16px 22px 0px #06101455",
  );
});

test("component defaults reach Mantine's theme for useProps", () => {
  const theme = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
  );
  assert.equal(theme.mantine.components.ProgressBar?.defaultProps?.height, 3);
});

test("a nested preset override ranks below the composition override", () => {
  const library = createVideoThemeLibrary([
    _extending("studio", {
      overrides: {
        "data-pipeline": {
          other: {
            video: {
              atomic: { swatch: { cyan: "#111111", orange: "#222222" } },
            },
          },
        },
        "shared-object-handoff": {
          other: { video: { atomic: { swatch: { cyan: "#333333" } } } },
        },
      },
    }),
  ]);
  const theme = makeResolvedVideoThemeFromLibrary(library, "studio", {
    overrideIds: ["data-pipeline", "shared-object-handoff"],
  });
  assert.equal(theme.semantic.color.accentAlt, "#333333");
  assert.equal(theme.semantic.color.highlight, "#222222");
});

test("the hash ignores authoring key order", () => {
  const library = createVideoThemeLibrary([
    _extending("one", {
      other: {
        video: { atomic: { swatch: { mint: "#000001", cyan: "#000002" } } },
      },
    }),
    _extending("two", {
      other: {
        video: { atomic: { swatch: { cyan: "#000002", mint: "#000001" } } },
      },
    }),
  ]);
  assert.equal(
    makeResolvedVideoThemeFromLibrary(library, "one").hash,
    makeResolvedVideoThemeFromLibrary(library, "two").hash,
  );
});

test("the hash changes when a resolved value changes", () => {
  assert.notEqual(
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic").hash,
    makeResolvedVideoThemeFromLibrary(BUILT_IN_VIDEO_THEMES, "classic", {
      patches: [LIGHT_GROUND],
    }).hash,
  );
});

test("a camera curve that overshoots its framings is rejected", () => {
  const library = createVideoThemeLibrary([
    _extending(
      "bouncy-camera",
      _semantic({ camera: { easing: { push: "$atomic.easing.outBack" } } }),
    ),
  ]);
  assert.match(
    _issuesOf(() =>
      makeResolvedVideoThemeFromLibrary(library, "bouncy-camera"),
    ),
    /^camera\.easing\.push: /m,
  );
});

test("an elevation resolves to its shadow layers and colour", () => {
  const floating = makeResolvedVideoThemeFromLibrary(
    BUILT_IN_VIDEO_THEMES,
    "classic",
  ).semantic.elevation.floating;
  assert.deepEqual(floating, {
    layers: [{ offsetX: 0, offsetY: 16, blur: 22, spread: 0, alpha: 1 }],
    color: "#06101455",
  });
});
