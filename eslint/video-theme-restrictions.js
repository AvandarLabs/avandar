import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import eslintPlugin from "oxlint-plugin-eslint";

/*
 * Video producer renderers draw every colour, type, stroke, corner, opacity,
 * dash, and timing value from the video theme
 * (apps/ava-video-producer/docs/video-theme.md). These restrictions ban the
 * literal sources a renderer could still reach for.
 *
 * They apply to every renderer directory in
 * apps/ava-video-producer/scripts/videoTheme/themeLiterals/rendererGlobs.json,
 * so a new renderer file is covered without editing this file. The stock
 * palette module is gone: importing it from anywhere in the app is an error,
 * so it cannot come back.
 */

const APP = "apps/ava-video-producer";
const APP_URL = new URL(`../${APP}/`, import.meta.url);
const APP_ROOT = fileURLToPath(APP_URL);
const RENDERER_GLOBS = JSON.parse(
  fs.readFileSync(
    new URL("scripts/videoTheme/themeLiterals/rendererGlobs.json", APP_URL),
    "utf8",
  ),
);

const IMPORT_RULE = eslintPlugin.rules["no-restricted-imports"];
const SYNTAX_RULE = eslintPlugin.rules["no-restricted-syntax"];

/** Attributes whose literal is a theme value unless it is 0 (none). */
const LITERAL_ATTRIBUTES = [
  "strokeWidth",
  "rx",
  "ry",
  "fontSize",
  "fontWeight",
  "letterSpacing",
];

/**
 * Opacities, whose 0 and 1 mean hidden and shown, and the dash array, whose
 * 1 is a whole draw-on path, rather than a style.
 */
const UNIT_RANGE_ATTRIBUTES = [
  "strokeDasharray",
  "opacity",
  "fillOpacity",
  "strokeOpacity",
  "stopOpacity",
  "floodOpacity",
];

/** Fitted text sizes are content checked against measured glyph widths. */
const FITTED_TEXT_COMPONENTS = ["FitText", "LiteralDataText"];

const STOCK_PALETTE_PATTERN = {
  group: ["**/stockPalette", "**/stockPalette.ts"],
  message:
    "The stock palette is retired. Read colours from the video theme (useGraphicTokens().color).",
};

/**
 * Themed motion helpers by the argument that holds their duration. A
 * duration must be a theme step or pass through `motion.scale`, so tempo
 * reaches it.
 */
const DURATION_ARGUMENTS = [
  { helper: "ramp", position: 3 },
  { helper: "pop", position: 3 },
  { helper: "count", position: 4 },
];

const LITERAL_MESSAGE =
  "Read this value from a theme token (stroke, corner, alpha, dash, or a text role), not a literal.";
const DURATION_MESSAGE =
  "Pass a theme duration or motion.scale(frames), so tempo reaches this animation.";

/**
 * Selectors for a duration that starts from a literal, per helper: `18`,
 * `48 - index * 3`, or `isFirst ? 4 : 3`. A window between two literal cue
 * frames, such as `92 - 88`, stays as authored, like the cues.
 */
function _durationSelectors() {
  return DURATION_ARGUMENTS.flatMap(({ helper, position }) => {
    const call = `CallExpression:matches([callee.name='${helper}'], [callee.property.name='${helper}'])`;
    return [
      `${call} > Literal:nth-child(${position})`,
      `${call} > BinaryExpression:nth-child(${position})[left.type='Literal']:not([operator='-'][right.type='Literal'])`,
      `${call} > ConditionalExpression:nth-child(${position}) > Literal`,
    ].map((selector) => {
      return { selector, message: DURATION_MESSAGE };
    });
  });
}

/** A literal other than the given values, as a number or a string. */
function _literalExcept(values) {
  return `Literal${values
    .map((value) => {
      return `:not([value=${value}]):not([value="${value}"])`;
    })
    .join("")}`;
}

/**
 * Selectors for a literal on a themed attribute: a number, a string, a
 * negative number, or either branch of a conditional. Fitted text
 * components take a measured size.
 */
function _literalAttributeSelectors() {
  const element = `JSXOpeningElement:not(${FITTED_TEXT_COMPONENTS.map(
    (name) => {
      return `[name.name='${name}']`;
    },
  ).join(", ")})`;
  return [
    { names: LITERAL_ATTRIBUTES, literal: _literalExcept([0]) },
    { names: UNIT_RANGE_ATTRIBUTES, literal: _literalExcept([0, 1]) },
  ].flatMap(({ names, literal }) => {
    const attribute = `${element} > JSXAttribute[name.name=/^(${names.join("|")})$/]`;
    return [
      `${attribute} > JSXExpressionContainer > ${literal}`,
      `${attribute} > ${literal}`,
      `${attribute} > JSXExpressionContainer > UnaryExpression > Literal`,
      `${attribute} > JSXExpressionContainer > ConditionalExpression > ${literal}`,
    ].map((selector) => {
      return { selector, message: LITERAL_MESSAGE };
    });
  });
}

const APP_IMPORT_OPTIONS = [{ patterns: [STOCK_PALETTE_PATTERN] }];

const RENDERER_IMPORT_OPTIONS = [
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
];

const RENDERER_SYNTAX_OPTIONS = [
  {
    selector: "CallExpression[callee.name='ramp'][arguments.length<4]",
    message:
      "Pass the theme's curve to ramp(), or use the themed motion's ramp, so easing edits reach it.",
  },
  ..._literalAttributeSelectors(),
  ..._durationSelectors(),
];

function _toAppRelativeFile(filename) {
  return path.relative(APP_ROOT, filename).split(path.sep).join("/");
}

function _isAppFile(appRelativeFile) {
  return !appRelativeFile.startsWith("..") && !path.isAbsolute(appRelativeFile);
}

function _isRendererFile(appRelativeFile) {
  if (
    !_isAppFile(appRelativeFile) ||
    appRelativeFile.endsWith(".css") ||
    path.matchesGlob(appRelativeFile, "**/*.test.*") ||
    path.matchesGlob(appRelativeFile, "**/__tests__/**")
  ) {
    return false;
  }
  return RENDERER_GLOBS.reduce((isMatched, glob) => {
    if (glob.startsWith("!")) {
      return isMatched && !path.matchesGlob(appRelativeFile, glob.slice(1));
    }
    return (
      isMatched ||
      (!glob.endsWith(".css") && path.matchesGlob(appRelativeFile, glob))
    );
  }, false);
}

function _withOptions(context, options) {
  return new Proxy(
    {},
    {
      get(_, property) {
        if (property === "options") {
          return options;
        }
        const value = Reflect.get(context, property, context);
        return typeof value === "function" ? value.bind(context) : value;
      },
    },
  );
}

/** Oxlint JS plugin enforcing video theme import and syntax restrictions. */
const videoThemeRestrictionsPlugin = {
  meta: {
    name: "video-theme",
  },
  rules: {
    "no-restricted-imports": {
      meta: {
        schema: [],
        messages: IMPORT_RULE.meta.messages,
      },
      create(context) {
        const appRelativeFile = _toAppRelativeFile(context.filename);
        if (!_isAppFile(appRelativeFile)) {
          return {};
        }
        const options = _isRendererFile(appRelativeFile)
          ? RENDERER_IMPORT_OPTIONS
          : APP_IMPORT_OPTIONS;
        return IMPORT_RULE.create(_withOptions(context, options));
      },
    },
    "no-restricted-syntax": {
      meta: {
        schema: [],
        messages: SYNTAX_RULE.meta.messages,
      },
      create(context) {
        const appRelativeFile = _toAppRelativeFile(context.filename);
        if (!_isRendererFile(appRelativeFile)) {
          return {};
        }
        return SYNTAX_RULE.create(
          _withOptions(context, RENDERER_SYNTAX_OPTIONS),
        );
      },
    },
  },
};

export default videoThemeRestrictionsPlugin;
