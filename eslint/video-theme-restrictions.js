import fs from "node:fs";

/*
 * Video producer renderers draw every colour, type, stroke, corner, opacity,
 * dash, and timing value from the video theme
 * (apps/ava-video-producer/docs/video-theme.md). These restrictions ban the
 * literal sources a renderer could still reach for.
 *
 * They apply to every renderer directory in
 * apps/ava-video-producer/scripts/videoTheme/themeLiteralBudgets/rendererGlobs.json
 * and to the globs of every slice budget beside it, so a new renderer file
 * is covered without editing this file. The stock palette module is gone:
 * importing it from anywhere in the app is an error, so it cannot come back.
 */

const APP = "apps/ava-video-producer";
const BUDGET_DIRECTORY = new URL(
  `../${APP}/scripts/videoTheme/themeLiteralBudgets/`,
  import.meta.url,
);

const LITERAL_ATTRIBUTES = [
  "strokeWidth",
  "rx",
  "ry",
  "opacity",
  "fillOpacity",
  "strokeOpacity",
  "fontSize",
  "fontWeight",
  "strokeDasharray",
];
/** Fitted text sizes are content checked against measured glyph widths. */
const FITTED_TEXT_COMPONENTS = ["FitText", "LiteralDataText"];

const STOCK_PALETTE_PATTERN = {
  group: ["**/stockPalette", "**/stockPalette.ts"],
  message:
    "The stock palette is retired. Read colours from the video theme (useGraphicTokens().color).",
};

const RENDERER_RULES = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        STOCK_PALETTE_PATTERN,
        {
          group: ["**/motion"],
          importNames: ["EASE", "DUR", "STAGGER", "STAGGER_COLUMN"],
          message:
            "Read curves, durations, and staggers from the themed motion (useGraphicMotion or useVideoMotion).",
        },
        {
          group: ["**/fonts"],
          importNames: ["TYPE", "MONO"],
          message: "Read the face from a text role of the video theme.",
        },
        {
          group: ["**/gallery/palette"],
          importNames: ["DEFAULT_ACCENT", "DEFAULT_BACKGROUND"],
          message:
            "Gallery defaults are content overrides; renderers read the theme.",
        },
      ],
    },
  ],
  "no-restricted-syntax": [
    "error",
    {
      selector: "CallExpression[callee.name='ramp'][arguments.length<4]",
      message:
        "Pass the theme's curve to ramp(), or use the themed motion's ramp, so easing edits reach it.",
    },
    {
      selector: `JSXOpeningElement:not(${FITTED_TEXT_COMPONENTS.map((name) => {
        return `[name.name='${name}']`;
      }).join(
        ", ",
      )}) > JSXAttribute[name.name=/^(${LITERAL_ATTRIBUTES.join("|")})$/] > JSXExpressionContainer > Literal`,
      message:
        "Read this value from a theme token (stroke, corner, alpha, dash, or a text role), not a literal.",
    },
  ],
};

function _readJson(file) {
  return JSON.parse(fs.readFileSync(new URL(file, BUDGET_DIRECTORY), "utf8"));
}

function _readGlobSets() {
  const budgets = fs
    .readdirSync(BUDGET_DIRECTORY)
    .filter((file) => {
      return /^s\d+\.json$/.test(file);
    })
    .map((file) => {
      return _readJson(file).globs;
    });
  return [_readJson("rendererGlobs.json"), ...budgets];
}

function _restrictionFromGlobs(globs) {
  const toAppGlob = (glob) => {
    return `${APP}/${glob}`;
  };
  return {
    files: globs
      .filter((glob) => {
        return !glob.startsWith("!") && !glob.endsWith(".css");
      })
      .map(toAppGlob),
    ignores: [
      ...globs
        .filter((glob) => {
          return glob.startsWith("!");
        })
        .map((glob) => {
          return toAppGlob(glob.slice(1));
        }),
      `${APP}/**/*.test.*`,
      `${APP}/**/__tests__/**`,
      `${APP}/**/*.css`,
    ],
    rules: RENDERER_RULES,
  };
}

/**
 * The app-wide stock palette ban, then the renderer restrictions for every
 * renderer directory and slice budget.
 */
export const videoThemeRestrictions = [
  {
    files: [`${APP}/**/*.{js,jsx,mjs,ts,tsx}`],
    rules: {
      "no-restricted-imports": ["error", { patterns: [STOCK_PALETTE_PATTERN] }],
    },
  },
  ..._readGlobSets()
    .map(_restrictionFromGlobs)
    .filter((restriction) => {
      return restriction.files.length > 0;
    }),
];
