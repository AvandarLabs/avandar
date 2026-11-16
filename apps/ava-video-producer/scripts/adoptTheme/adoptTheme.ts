import { readFileSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { isEmpty, isNotEmpty } from "@avandar/utils";
import { requireLicense } from "../requireLicense";
import {
  exitWithAdoptThemeError,
  getStylesheetFromPaths,
  makeAdoptThemeArgsFromArgv,
} from "./adoptThemeArgsHelpers";
import {
  getCustomPropertiesFromCss,
  makeInlinedPaletteFromPalette,
} from "./cssCustomPropertyHelpers";
import {
  makeThemeCssFromTokens,
  getEasingsFromPalette,
  makeKitTokensFromPalette,
  printReport,
  writeCurves,
} from "./themeOutputHelpers";
import type { SourceEasing, ThemePalettes } from "./adoptTheme.types";

// Points the kit at your product's stylesheet and takes its real tokens.
//
//   pnpm adopt                      # find the stylesheet
//   pnpm adopt path/to/globals.css  # or name it
//   pnpm adopt --mode=light         # take the light palette
//   pnpm adopt --curves             # also adopt the easings
//   pnpm adopt --dry-run            # report, write nothing
//
// WHY THIS EXISTS. src/theme.css ships a placeholder palette and the README
// asks you to swap it by hand. Almost nobody does, and the ones who do stop at
// the accent: so the demo comes out in a stranger's greys with one of your
// colours in it, which reads as less like your product than plain greyscale
// would. The values are already written down in your stylesheet. This copies
// them.
//
// WHAT IT CANNOT DO. It copies values; it does not link them. Change a token
// in your app afterwards and this file does not follow: rerun it. That is a
// real limitation and not a bug: Remotion cannot import a Next/Tailwind
// stylesheet (it pulls plugins and font files that live on the app's own
// serving path), so a copy is the only thing on offer. The header written into
// theme.css records the source and the date so a stale palette is visible
// rather than silent.

/**
 * Which palette the kit's `:root` gets. The stage a demo runs on is dark: the
 * title card, the loop seam and the ground all sit there, so a product with a
 * dark mode hands over its dark values. Products without one fall back to
 * what they have, and `--ground` is derived rather than guessed.
 */
function _getPaletteMode(requestedMode: string, hasDark: boolean): string {
  const mode =
    requestedMode === "auto" ? (hasDark ? "dark" : "light") : requestedMode;
  if (!["dark", "light"].includes(mode)) {
    exitWithAdoptThemeError("--mode must be dark or light");
  }
  return mode;
}

/**
 * How many easings `--curves` wrote into `src/motion.ts`, counted without
 * writing on a dry run. Undefined when `--curves` is off or the palette has
 * no easings, so the report prints a hint instead of a count.
 */
function _getNumCurvesWritten(
  options: Readonly<{
    shouldWriteCurves: boolean;
    isDryRun: boolean;
    easings: readonly SourceEasing[];
  }>,
): number | undefined {
  const { shouldWriteCurves, isDryRun, easings } = options;
  return shouldWriteCurves && easings.length > 0
    ? writeCurves({ isDryRun, easings })
    : undefined;
}

/**
 * The stylesheet's light and dark palettes with `var()` pointers inlined.
 * Exits when the stylesheet declares no custom properties at all.
 */
function _makeThemePalettesFromStylesheet(
  stylesheet: string,
  stylesheetCss: string,
): ThemePalettes {
  const { light: rawLight, dark: rawDark } =
    getCustomPropertiesFromCss(stylesheetCss);
  if (isEmpty(rawLight) && isEmpty(rawDark)) {
    exitWithAdoptThemeError(
      `no custom properties found in ${relative(process.cwd(), stylesheet)}`,
    );
  }
  const light = makeInlinedPaletteFromPalette(rawLight);
  return { light, dark: makeInlinedPaletteFromPalette(rawDark, light) };
}

function _adoptTheme(argv: readonly string[]): void {
  const {
    isDryRun,
    shouldWriteCurves,
    mode: requestedMode,
    paths,
  } = makeAdoptThemeArgsFromArgv(argv);
  const stylesheet = getStylesheetFromPaths(paths);
  const stylesheetCss = readFileSync(stylesheet, "utf8");
  const { light, dark } = _makeThemePalettesFromStylesheet(
    stylesheet,
    stylesheetCss,
  );
  const hasDark = isNotEmpty(dark);
  const mode = _getPaletteMode(requestedMode, hasDark);
  const primary = mode === "dark" ? { ...light, ...dark } : light;
  const matchedTokens = makeKitTokensFromPalette(primary, stylesheetCss);
  const relativeStylesheetPath = relative(resolve("."), stylesheet);
  const css = makeThemeCssFromTokens({
    relativeStylesheetPath,
    stamp: new Date().toISOString().slice(0, 10),
    mode,
    resolved: matchedTokens.resolved,
  });
  if (!isDryRun) {
    writeFileSync(resolve("src/theme.css"), css);
  }
  const easings = getEasingsFromPalette(primary);
  printReport({
    ...matchedTokens,
    relativeStylesheetPath,
    mode,
    hasDark,
    primary,
    easings,
    numCurvesWritten: _getNumCurvesWritten({
      shouldWriteCurves,
      isDryRun,
      easings,
    }),
    isDryRun,
  });
}

requireLicense();
_adoptTheme(process.argv.slice(2));
