#!/usr/bin/env node
/**
 * Point the kit at your product's stylesheet and take its real tokens.
 *
 *   node scripts/adopt-theme.mjs                     # find the stylesheet
 *   node scripts/adopt-theme.mjs path/to/globals.css # or name it
 *   node scripts/adopt-theme.mjs --mode=light        # take the light palette
 *   node scripts/adopt-theme.mjs --curves            # also adopt the easings
 *   node scripts/adopt-theme.mjs --dry-run           # report, write nothing
 *
 * WHY THIS EXISTS. src/theme.css ships a placeholder palette and the README
 * asks you to swap it by hand. Almost nobody does, and the ones who do stop at
 * the accent: so the demo comes out in a stranger's greys with one of your
 * colours in it, which reads as less like your product than plain greyscale
 * would. The values are already written down in your stylesheet. This copies
 * them.
 *
 * WHAT IT CANNOT DO. It copies values; it does not link them. Change a token
 * in your app afterwards and this file does not follow: rerun it. That is a
 * real limitation and not a bug: Remotion cannot import a Next/Tailwind
 * stylesheet (it pulls plugins and font files that live on the app's own
 * serving path), so a copy is the only thing on offer. The header written into
 * theme.css records the source and the date so a stale palette is visible
 * rather than silent.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { resolve, relative } from "node:path";
import { fail, findStylesheet, parseArgs } from "./adopt-theme/args.mjs";
import { collect, resolveVars } from "./adopt-theme/cssParser.mjs";
import {
  findEasings,
  printReport,
  resolveTokens,
  buildThemeCss,
} from "./adopt-theme/write.mjs";
import { requireLicense } from "./require-license.mjs";

requireLicense();

const {
  dryRun,
  curves,
  mode: requestedMode,
  paths,
} = parseArgs(process.argv.slice(2));

const src = findStylesheet(paths);
const raw = readFileSync(src, "utf8");
const { light: rawLight, dark: rawDark } = collect(raw);

if (!Object.keys(rawLight).length && !Object.keys(rawDark).length) {
  fail(`no custom properties found in ${relative(process.cwd(), src)}`);
}

const light = resolveVars(rawLight);
const dark = resolveVars(rawDark, light);

/* Which palette the kit's :root gets. The stage a demo runs on is dark: the
   title card, the loop seam and the ground all sit there, so a product with a
   dark mode should hand over its dark values. Products without one fall back
   to what they have, and --ground is derived rather than guessed. */
const hasDark = Object.keys(dark).length > 0;
const mode =
  requestedMode === "auto" ? (hasDark ? "dark" : "light") : requestedMode;
if (!["dark", "light"].includes(mode)) fail(`--mode must be dark or light`);
const primary = mode === "dark" ? { ...light, ...dark } : light;

const { resolved, report, wrapper, wrapped } = resolveTokens(primary, raw);
const easings = findEasings(primary);

const stamp = new Date().toISOString().slice(0, 10);
const rel = relative(resolve("."), src);

const css = buildThemeCss({ rel, stamp, mode, resolved });
const target = resolve("src/theme.css");
if (!dryRun) writeFileSync(target, css);

printReport({
  rel,
  mode,
  hasDark,
  primary,
  wrapper,
  wrapped,
  report,
  easings,
  curves,
  dryRun,
});
