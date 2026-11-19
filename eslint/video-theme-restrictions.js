import fs from "node:fs";

/*
 * Video producer renderers draw every colour, type, stroke, corner, opacity,
 * dash, and timing value from the video theme
 * (apps/ava-video-producer/docs/video-theme.md). These restrictions ban the
 * literal sources a renderer could still reach for.
 *
 * They apply only to the files of slices that have finished their theme
 * migration. Each slice owns a budget file in
 * apps/ava-video-producer/scripts/videoTheme/themeLiteralBudgets/<slice>.json
 * and turns the restrictions on for its own globs by setting
 * `"enforceLint": true` there, so this file never needs editing.
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

const VIDEO_THEME_RULES = {
  "no-restricted-imports": [
    "error",
    {
      patterns: [
        {
          group: ["**/stockPalette"],
          importNames: ["STOCK"],
          message:
            "Read colours from the video theme (useGraphicTokens().color), not the stock palette.",
        },
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

function _readBudgets() {
  return fs
    .readdirSync(BUDGET_DIRECTORY)
    .filter((file) => {
      return /^s\d+\.json$/.test(file);
    })
    .map((file) => {
      return JSON.parse(
        fs.readFileSync(new URL(file, BUDGET_DIRECTORY), "utf8"),
      );
    });
}

function _restrictionFromBudget(budget) {
  const toRepoGlob = (glob) => {
    return `${APP}/${glob}`;
  };
  return {
    files: budget.globs
      .filter((glob) => {
        return !glob.startsWith("!") && !glob.endsWith(".css");
      })
      .map(toRepoGlob),
    ignores: [
      ...budget.globs
        .filter((glob) => {
          return glob.startsWith("!");
        })
        .map((glob) => {
          return toRepoGlob(glob.slice(1));
        }),
      `${APP}/**/*.test.*`,
      `${APP}/**/__tests__/**`,
    ],
    rules: VIDEO_THEME_RULES,
  };
}

/** Renderer restrictions for every slice budget with `enforceLint` on. */
export const videoThemeRestrictions = _readBudgets()
  .filter((budget) => {
    return budget.enforceLint;
  })
  .map(_restrictionFromBudget);
