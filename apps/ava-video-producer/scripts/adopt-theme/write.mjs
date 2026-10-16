import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pick } from "./aliases.mjs";
import { detectWrapper, isBareChannels } from "./colorNotation.mjs";

/** Fallback palette used for any kit token the source stylesheet never defines. */
export const PLACEHOLDER = {
  "--background": "oklch(0.145 0.02 265)",
  "--foreground": "oklch(0.985 0.003 248)",
  "--card": "oklch(0.205 0.025 265)",
  "--muted": "oklch(0.28 0.028 260)",
  "--muted-foreground": "oklch(0.72 0.03 257)",
  "--border": "oklch(0.3 0.03 260)",
  "--brand": "oklch(0.68 0.19 265)",
  "--brand-soft": "oklch(0.32 0.08 265)",
  "--brand-strong": "oklch(0.82 0.14 265)",
  "--ground": "oklch(0.115 0.025 268)",
  "--radius": "14px",
};

/** The kit's custom properties, in the order they are written to theme.css. */
export const KIT_TOKENS = Object.keys(PLACEHOLDER);

/** Match each kit token to a source value, wrapping bare channels and deriving
 *  soft/strong/ground variants, falling back to the placeholder palette. */
export function resolveTokens(primary, raw) {
  const wrapper = detectWrapper(raw);
  let wrapped = 0;

  const resolved = {};
  const report = [];
  for (const kit of KIT_TOKENS) {
    const hit = pick(primary, kit);
    if (hit) {
      let value = hit.value;
      /* --radius is a length, never a colour: wrapping it would produce
         `hsl(1rem)`. Everything else in KIT_TOKENS is a colour. */
      if (kit !== "--radius" && isBareChannels(value)) {
        if (wrapper) {
          value = `${wrapper}(${value})`;
          wrapped += 1;
        } else {
          console.error(
            `adopt-theme: ${hit.from} looks like bare channels (${value}) but the` +
              ` stylesheet never wraps a var() in a colour function, so there is` +
              ` no way to tell hsl from rgb. Copied as-is — check it.`,
          );
        }
      }
      resolved[kit] = value;
      report.push([kit, hit.from, "taken"]);
    } else {
      resolved[kit] = null;
      report.push([kit, "—", "missing"]);
    }
  }

  /* Derived rather than invented. A product almost never ships soft/strong
     variants of its accent, and a placeholder purple next to a real brand colour
     is worse than a mix of the real one. */
  if (!resolved["--brand-soft"] && resolved["--brand"]) {
    resolved["--brand-soft"] =
      `color-mix(in oklab, ${resolved["--brand"]} 30%, ${resolved["--background"] ?? PLACEHOLDER["--background"]})`;
    report.find((r) => r[0] === "--brand-soft")[2] = "derived from --brand";
  }
  if (!resolved["--brand-strong"] && resolved["--brand"]) {
    resolved["--brand-strong"] =
      `color-mix(in oklab, ${resolved["--brand"]} 70%, white)`;
    report.find((r) => r[0] === "--brand-strong")[2] = "derived from --brand";
  }
  if (!resolved["--ground"]) {
    const base = resolved["--background"] ?? PLACEHOLDER["--background"];
    resolved["--ground"] = `color-mix(in oklab, ${base} 82%, black)`;
    report.find((r) => r[0] === "--ground")[2] = "derived from --background";
  }
  for (const kit of KIT_TOKENS) {
    if (!resolved[kit]) {
      resolved[kit] = PLACEHOLDER[kit];
      report.find((r) => r[0] === kit)[2] = "PLACEHOLDER — no match";
    }
  }
  return { resolved, report, wrapper, wrapped };
}

/** Pull cubic-bezier easings from named custom properties in the source palette. */
export function findEasings(primary) {
  return Object.entries(primary).flatMap(([k, v]) => {
    const m = /cubic-bezier\(([^)]+)\)/.exec(v);
    if (!m || !/ease|curve|transition/.test(k)) return [];
    const nums = m[1].split(",").map((n) => parseFloat(n.trim()));
    return nums.length === 4 && nums.every(Number.isFinite)
      ? [{ name: k, nums }]
      : [];
  });
}

/** Which kit curve a product easing should replace. Names are the only signal
 *  available and they are conventional enough to use, but a wrong guess is
 *  visible in every frame, so nothing is rewritten without --curves. */
export function slotFor(name) {
  if (/back|overshoot|spring/.test(name)) return "outBack";
  if (/in-?out|inout/.test(name)) return "inOut";
  if (/word|title|type/.test(name)) return "word";
  if (/out/.test(name)) return "out";
  return null;
}

/** Render the kit's theme.css from resolved tokens, with source provenance. */
export function buildThemeCss({ rel, stamp, mode, resolved }) {
  return `/* Adopted from ${rel} on ${stamp} by scripts/adopt-theme.mjs.
 * Palette: ${mode}.
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
${KIT_TOKENS.map((t) => `  ${t}: ${resolved[t]};`).join("\n")}
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

/** Rewrite matching EASE slots in src/motion.ts from adopted curves. */
export function writeCurves({ dryRun, easings }) {
  const mpath = resolve("src/motion.ts");
  let source = readFileSync(mpath, "utf8");
  let written = 0;
  for (const e of easings) {
    const slot = slotFor(e.name);
    if (!slot) continue;
    const re = new RegExp(`(\\b${slot}:\\s*bezier\\()[^)]*(\\))`);
    if (re.test(source)) {
      source = source.replace(re, `$1${e.nums.join(", ")}$2`);
      written += 1;
    }
  }
  if (!dryRun && written) writeFileSync(mpath, source);
  return written;
}

/** Print the source, palette, token, easing and typeface report to the console. */
export function printReport({
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
}) {
  const pad = (s, n) => String(s).padEnd(n);
  console.log(`\nsource   ${rel}`);
  console.log(`palette  ${mode}${hasDark ? "" : "  (no dark block found)"}`);
  console.log(`tokens   ${Object.keys(primary).length} read`);
  if (wrapped) {
    console.log(
      `notation ${wrapped} bare channel value(s) wrapped in ${wrapper}() —` +
        ` the source stores colours the shadcn way`,
    );
  }
  console.log("");
  for (const [kit, from, how] of report) {
    const mark =
      how === "taken" ? "✓" : how.startsWith("PLACEHOLDER") ? "!" : "~";
    console.log(`  ${mark} ${pad(kit, 20)} ${pad(from, 24)} ${how}`);
  }

  const missing = report.filter((r) => r[2].startsWith("PLACEHOLDER"));
  if (missing.length) {
    console.log(
      `\n${missing.length} token(s) fell back to the placeholder palette.`,
    );
    console.log(
      "Add your product's name for them to ALIASES in scripts/adopt-theme.mjs,",
    );
    console.log("or set them by hand knowing the next run overwrites the file.");
  }

  if (easings.length) {
    console.log(`\neasings found in ${rel}:`);
    for (const e of easings) {
      const slot = slotFor(e.name);
      console.log(
        `  ${pad(e.name, 24)} bezier(${e.nums.join(", ")})` +
          (slot ? `   → EASE.${slot}` : "   → no obvious slot, skipped"),
      );
    }
    if (!curves) {
      console.log(
        "\nRerun with --curves to write these into src/motion.ts, or copy them by hand.",
      );
    } else {
      const written = writeCurves({ dryRun, easings });
      console.log(`\n${written} curve(s) written into src/motion.ts.`);
    }
  }

  const face =
    primary["--font-sans"] ??
    primary["--font-family-sans"] ??
    primary["--default-font-family"];
  if (face && !face.trim().startsWith("var(")) {
    const first = face.split(",")[0].replace(/["']/g, "").trim();
    console.log(`\ntypeface  ${first}`);
    console.log(
      `  src/fonts.ts loads Geist. If ${first} is in @remotion/google-fonts,`,
    );
    console.log(
      `  swap the import — a fontFamily string alone loads nothing and every`,
    );
    console.log(`  frame silently renders in a system fallback.`);
  }

  console.log(
    dryRun
      ? "\n--dry-run: nothing written.\n"
      : `\nwrote src/theme.css — run 'npm run preview' and look at it.\n`,
  );
}
