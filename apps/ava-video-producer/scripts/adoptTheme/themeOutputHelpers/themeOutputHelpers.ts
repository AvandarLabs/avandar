import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { makeObject, objectValuesMap, prop, propEq } from "@avandar/utils";
import { ColorNotation } from "../ColorNotation";
import { makeTakenKitTokensFromPalette } from "./makeTakenKitTokensFromPalette";
import { PLACEHOLDER, KIT_TOKENS } from "./themeOutputPalette";
import type {
  Palette,
  SourceEasing,
  TokenReportRow,
} from "../adoptTheme.types";
/** Kit tokens matched to source values, with the report of how each matched. */
export type MatchedTokens = {
  resolved: Palette;
  report: TokenReportRow[];
  wrapper: string | undefined;
  numWrappedValues: number;
};
/** The report options `printReport` needs beyond the matched tokens. */
type ReportOptions = Omit<MatchedTokens, "resolved"> & {
  relativeStylesheetPath: string;
  mode: string;
  hasDark: boolean;
  primary: Palette;
  easings: SourceEasing[];
  numCurvesWritten: number | undefined;
  isDryRun: boolean;
};
/** The inputs `makeThemeCssFromTokens` writes into `theme.css`. */
type ThemeCssOptions = {
  relativeStylesheetPath: string;
  stamp: string;
  mode: string;
  resolved: Readonly<Palette>;
};
/** A kit token the source lacks, derived from the ones it has. */
type DerivedToken = {
  value: string;
  outcome: string;
};
/**
 * The soft, strong, and ground variants a product rarely defines itself,
 * derived from the tokens it did take. Derived rather than invented: a
 * placeholder purple next to a real brand colour is worse than a mix of the
 * real one.
 */
function _getDerivedVariants(
  takenValues: Readonly<Palette>,
): Record<string, DerivedToken> {
  const brand = takenValues["--brand"];
  const background = takenValues["--background"] ?? PLACEHOLDER["--background"];
  const fromBrand = "derived from --brand";
  return {
    ...(!takenValues["--brand-soft"] && brand
      ? {
          "--brand-soft": {
            value: `color-mix(in oklab, ${brand} 30%, ${background})`,
            outcome: fromBrand,
          },
        }
      : {}),
    ...(!takenValues["--brand-strong"] && brand
      ? {
          "--brand-strong": {
            value: `color-mix(in oklab, ${brand} 70%, white)`,
            outcome: fromBrand,
          },
        }
      : {}),
    ...(!takenValues["--ground"]
      ? {
          "--ground": {
            value: `color-mix(in oklab, ${background} 82%, black)`,
            outcome: "derived from --background",
          },
        }
      : {}),
  };
}

/**
 * Every kit token resolved from the product palette: bare channels wrapped in
 * the source's colour function, missing brand and ground variants derived,
 * and the rest placeholders. The report says where each one came from.
 * `_adoptTheme` writes the result into `src/theme.css`.
 */
export function makeKitTokensFromPalette({
  primary,
  stylesheetCss,
}: Readonly<{
  primary: Readonly<Palette>;
  stylesheetCss: string;
}>): MatchedTokens {
  const wrapper = ColorNotation.getColorWrapperFromCss(stylesheetCss);
  const takenTokens = makeTakenKitTokensFromPalette({ primary, wrapper });
  const takenValues: Palette = makeObject(takenTokens, {
    key: "kitToken",
    valueKey: "value",
  });
  const derived = _getDerivedVariants(takenValues);
  const placeholderValues: Palette = makeObject(
    KIT_TOKENS.filter((kitToken) => {
      return !(kitToken in takenValues) && !(kitToken in derived);
    }),
    {
      valueFn: (kitToken) => {
        return PLACEHOLDER[kitToken];
      },
    },
  );
  const derivedValues: Palette = objectValuesMap(derived, prop("value"));
  const report = KIT_TOKENS.map((kitToken): TokenReportRow => {
    const taken = takenTokens.find(propEq("kitToken", kitToken));
    return taken
      ? [kitToken, taken.from, "taken"]
      : [kitToken, "—", derived[kitToken]?.outcome ?? "PLACEHOLDER — no match"];
  });
  return {
    resolved: { ...takenValues, ...derivedValues, ...placeholderValues },
    report,
    wrapper,
    numWrappedValues: takenTokens.filter(prop("isWrapped")).length,
  };
}
/**
 * The product palette's cubic-bezier easings, from properties named for an
 * ease, curve, or transition. `_adoptTheme` lists them in its report and
 * writes them into `src/motion.ts` with `--curves`.
 */
export function getEasingsFromPalette(
  primary: Readonly<Palette>,
): SourceEasing[] {
  return Object.entries(primary).flatMap(([name, value]) => {
    const match = /cubic-bezier\(([^)]+)\)/.exec(value);
    if (!match || !/ease|curve|transition/.test(name)) {
      return [];
    }
    const controlPoints = match[1].split(",").map((part) => {
      return parseFloat(part.trim());
    });
    return controlPoints.length === 4 && controlPoints.every(Number.isFinite)
      ? [{ name, controlPoints }]
      : [];
  });
}
/**
 * Which kit curve a product easing should replace. Names are the only signal
 * available and they are conventional enough to use, but a wrong guess is
 * visible in every frame, so nothing is rewritten without --curves.
 */
export function getEaseSlotFromName(name: string): string | undefined {
  if (/back|overshoot|spring/.test(name)) {
    return "outBack";
  }
  if (/in-?out|inout/.test(name)) {
    return "inOut";
  }
  return /word|title|type/.test(name)
    ? "word"
    : /out/.test(name)
      ? "out"
      : undefined;
}
/**
 * The full `src/theme.css` text: the kit tokens under `:root`, with a header
 * naming the source stylesheet, palette mode, and date so a stale copy is
 * visible. `_adoptTheme` writes it unless the run is a dry run.
 */
export function makeThemeCssFromTokens(
  options: Readonly<ThemeCssOptions>,
): string {
  return `/* Adopted from ${options.relativeStylesheetPath} on ${options.stamp} by scripts/adoptTheme/adoptTheme.ts.
 * Palette: ${options.mode}.
 *
 * COPIED, NOT LINKED. Remotion cannot import an app stylesheet: it pulls
 * Tailwind plugins and font files that live on the app's own serving path, so
 * these are snapshots. Change a token in the app and this file does not
 * follow. Rerun the script.
 *
 * Hand-edits survive nothing: the next run overwrites this file. Put a
 * deliberate override in a composition, or add an alias to ALIASES in the
 * script so the mapping is right for everyone. */

:root {
${KIT_TOKENS.map((token) => {
  return `  ${token}: ${options.resolved[token]};`;
}).join("\n")}
}

html,
body {
  margin: 0;
  padding: 0;
  -webkit-font-smoothing: antialiased;
}

* {
  box-sizing: border-box;
}
`;
}
/**
 * Writes each easing into its matching `EASE` slot in `src/motion.ts` and
 * returns how many slots matched. `_adoptTheme` calls it under `--curves`,
 * and a dry run only counts.
 */
export function writeCurves(
  options: Readonly<{
    isDryRun: boolean;
    easings: readonly SourceEasing[];
  }>,
): number {
  const motionPath = resolve("src/motion.ts");
  const { source, numCurvesWritten } = options.easings.reduce(
    (state, easing) => {
      const slot = getEaseSlotFromName(easing.name);
      const pattern = slot
        ? new RegExp(`(\\b${slot}:\\s*(?:Motion\\.)?_?bezier\\()[^)]*(\\))`)
        : undefined;
      return pattern?.test(state.source)
        ? {
            source: state.source.replace(
              pattern,
              `$1{ x1: ${easing.controlPoints[0]}, y1: ${easing.controlPoints[1]}, x2: ${easing.controlPoints[2]}, y2: ${easing.controlPoints[3]} }$2`,
            ),
            numCurvesWritten: state.numCurvesWritten + 1,
          }
        : state;
    },
    { source: readFileSync(motionPath, "utf8"), numCurvesWritten: 0 },
  );
  if (!options.isDryRun && numCurvesWritten) {
    writeFileSync(motionPath, source);
  }
  return numCurvesWritten;
}
function _pad({
  value,
  width,
}: Readonly<{
  value: string;
  width: number;
}>): string {
  return String(value).padEnd(width);
}
function _printTokenReport(options: Readonly<ReportOptions>): void {
  console.log(`\nsource   ${options.relativeStylesheetPath}`);
  console.log(
    `palette  ${options.mode}${options.hasDark ? "" : "  (no dark block found)"}`,
  );
  console.log(`tokens   ${Object.keys(options.primary).length} read`);
  if (options.numWrappedValues) {
    console.log(
      `notation ${options.numWrappedValues} bare channel value(s) wrapped in ${options.wrapper}() — the source stores colours the shadcn way`,
    );
  }
  console.log("");
  options.report.forEach(([kitToken, from, outcome]) => {
    const mark =
      outcome === "taken" ? "✓" : outcome.startsWith("PLACEHOLDER") ? "!" : "~";
    console.log(
      `  ${mark} ${_pad({
        value: kitToken,
        width: 20,
      })} ${_pad({
        value: from,
        width: 24,
      })} ${outcome}`,
    );
  });
  const missing = options.report.filter((row) => {
    return row[2].startsWith("PLACEHOLDER");
  });
  if (missing.length) {
    console.log(
      `\n${missing.length} token(s) fell back to the placeholder palette.`,
    );
    console.log(
      "Add your product's name for them to ALIASES in scripts/adoptTheme/getAliasValueFromPalette.ts,",
    );
    console.log(
      "or set them by hand knowing the next run overwrites the file.",
    );
  }
}
function _printEasings(options: Readonly<ReportOptions>): void {
  if (!options.easings.length) {
    return;
  }
  console.log(`\neasings found in ${options.relativeStylesheetPath}:`);
  options.easings.forEach((easing) => {
    const slot = getEaseSlotFromName(easing.name);
    console.log(
      `  ${_pad({
        value: easing.name,
        width: 24,
      })} bezier(${easing.controlPoints.join(", ")})${slot ? `   → EASE.${slot}` : "   → no obvious slot, skipped"}`,
    );
  });
  if (options.numCurvesWritten === undefined) {
    console.log(
      "\nRerun with --curves to write these into src/motion.ts, or copy them by hand.",
    );
    return;
  }
  console.log(
    `\n${options.numCurvesWritten} curve(s) written into src/motion.ts.`,
  );
}
function _printTypeface(primary: Readonly<Palette>): void {
  const fontFamilyList =
    primary["--font-sans"] ??
    primary["--font-family-sans"] ??
    primary["--default-font-family"];
  if (!fontFamilyList || fontFamilyList.trim().startsWith("var(")) {
    return;
  }
  const firstFontFamily = fontFamilyList
    .split(",")[0]
    .replace(/["']/g, "")
    .trim();
  console.log(`\ntypeface  ${firstFontFamily}`);
  console.log(
    `  src/fonts.ts loads Figtree. If ${firstFontFamily} is in @remotion/google-fonts,`,
  );
  console.log(
    `  swap the import — a fontFamily string alone loads nothing and every`,
  );
  console.log(`  frame silently renders in a system fallback.`);
}
/**
 * Prints adopt-theme's report of what it took from the source stylesheet:
 * tokens, easings, and typeface. It only prints and writes no file.
 * `_adoptTheme` calls it after writing `src/theme.css` unless the run is a
 * dry run, and after writing any easings into `src/motion.ts`.
 */
export function printReport(options: Readonly<ReportOptions>): void {
  _printTokenReport(options);
  _printEasings(options);
  _printTypeface(options.primary);
  console.log(
    options.isDryRun
      ? "\n--dry-run: nothing written.\n"
      : `\nwrote src/theme.css — run 'npm run preview' and look at it.\n`,
  );
}
