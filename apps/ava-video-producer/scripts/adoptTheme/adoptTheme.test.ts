import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  getCustomPropertiesFromCss,
  makeInlinedPaletteFromPalette,
} from "./cssCustomPropertyHelpers";
import {
  PLACEHOLDER,
  makeThemeCssFromTokens,
  getEasingsFromPalette,
  makeKitTokensFromPalette,
} from "./themeOutputHelpers";
import type { Palette } from "./adoptTheme.types";

const APP_ROOT = fileURLToPath(new URL("../../", import.meta.url));

/** A shadcn-style stylesheet: bare channels, a dark block, and Tailwind 4. */
const STYLESHEET = `
/* comment { --ignored: 1 } */
:root {
  --background: 0 0% 100%;
  --foreground: 222 47% 11%;
  --primary: 221 83% 53%;
  --radius: 0.5rem;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --font-sans: "Inter", sans-serif;
  --card: var(--background);
}
.dark {
  --background: 222 47% 11%;
  --foreground: 210 40% 98%;
}
@theme inline {
  --ease-out-expo: var(--ease-out-expo);
  --color-border: 214 32% 91%;
}
@media (prefers-color-scheme: dark) {
  :root { --muted: 217 33% 17%; }
}
.button { color: hsl(var(--primary)); }
`;

test("getCustomPropertiesFromCss reads root, dark, @theme, and media blocks without self-references", () => {
  const { light, dark } = getCustomPropertiesFromCss(STYLESHEET);
  assert.equal(light["--background"], "0 0% 100%");
  assert.equal(light["--ease-out-expo"], "cubic-bezier(0.16, 1, 0.3, 1)");
  assert.equal(light["--color-border"], "214 32% 91%");
  assert.equal(light["--ignored"], undefined);
  assert.equal(dark["--background"], "222 47% 11%");
  assert.equal(dark["--muted"], "217 33% 17%");
});

test("makeInlinedPaletteFromPalette follows var() pointers within the map and its fallback", () => {
  const light = makeInlinedPaletteFromPalette(
    getCustomPropertiesFromCss(STYLESHEET).light,
  );
  assert.equal(light["--card"], "0 0% 100%");
  const dark = makeInlinedPaletteFromPalette(
    { "--x": "var(--y, red)", "--z": "var(--background)" },
    light,
  );
  assert.equal(dark["--x"], "red");
  assert.equal(dark["--z"], "0 0% 100%");
});

/** The primary palette `adoptTheme` reads from `STYLESHEET` in dark mode. */
function _makePrimaryPaletteFromStylesheet(): Palette {
  const { light, dark } = getCustomPropertiesFromCss(STYLESHEET);
  return {
    ...makeInlinedPaletteFromPalette(light),
    ...makeInlinedPaletteFromPalette(
      dark,
      makeInlinedPaletteFromPalette(light),
    ),
  };
}

test("makeKitTokensFromPalette wraps bare channels in hsl(), derives brand and ground variants, and reports placeholders", () => {
  const { resolved, report, wrapper, numWrappedValues } =
    makeKitTokensFromPalette(_makePrimaryPaletteFromStylesheet(), STYLESHEET);
  assert.equal(wrapper, "hsl");
  assert.equal(resolved["--background"], "hsl(222 47% 11%)");
  assert.equal(resolved["--brand"], "hsl(221 83% 53%)");
  assert.equal(resolved["--radius"], "0.5rem");
  assert.equal(
    resolved["--brand-soft"],
    "color-mix(in oklab, hsl(221 83% 53%) 30%, hsl(222 47% 11%))",
  );
  assert.equal(
    resolved["--ground"],
    "color-mix(in oklab, hsl(222 47% 11%) 82%, black)",
  );
  assert.ok(numWrappedValues >= 5);
  assert.deepEqual(
    report.find((row) => {
      return row[0] === "--brand-strong";
    }),
    ["--brand-strong", "—", "derived from --brand"],
  );
  assert.deepEqual(
    report.find((row) => {
      return row[0] === "--muted-foreground";
    }),
    ["--muted-foreground", "—", "PLACEHOLDER — no match"],
  );
  assert.equal(
    resolved["--muted-foreground"],
    PLACEHOLDER["--muted-foreground"],
  );
});

test("makeThemeCssFromTokens writes each resolved token as a declaration", () => {
  const { resolved } = makeKitTokensFromPalette(
    _makePrimaryPaletteFromStylesheet(),
    STYLESHEET,
  );
  assert.equal(
    makeThemeCssFromTokens({
      relativeStylesheetPath: "app.css",
      stamp: "2026-01-01",
      mode: "dark",
      resolved,
    })
      .split("\n")
      .find((line) => {
        return line.includes("--brand:");
      }),
    "  --brand: hsl(221 83% 53%);",
  );
});

test("getEasingsFromPalette reads each cubic-bezier easing as its four control points", () => {
  assert.deepEqual(getEasingsFromPalette(_makePrimaryPaletteFromStylesheet()), [
    { name: "--ease-out-expo", controlPoints: [0.16, 1, 0.3, 1] },
  ]);
});

test("a dry run reports the adopted palette and rewrites neither src/theme.css nor src/motion.ts", async () => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "adopt-theme-"));
  try {
    const stylesheet = path.join(directory, "globals.css");
    await fs.writeFile(stylesheet, STYLESHEET);
    const themeCssPath = path.join(APP_ROOT, "src/theme.css");
    const motionPath = path.join(APP_ROOT, "src/motion.ts");
    const themeCssBeforeRun = await fs.readFile(themeCssPath, "utf8");
    const motionBeforeRun = await fs.readFile(motionPath, "utf8");
    const output = execFileSync(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(APP_ROOT, "scripts/adoptTheme/adoptTheme.ts"),
        stylesheet,
        "--dry-run",
        "--curves",
      ],
      { cwd: APP_ROOT, encoding: "utf8" },
    );
    assert.match(output, /palette {2}dark/);
    assert.match(
      output,
      /notation \d+ bare channel value\(s\) wrapped in hsl\(\)/,
    );
    assert.match(output, /✓ --brand\s+--primary\s+taken/);
    assert.match(output, /! --muted-foreground\s+—\s+PLACEHOLDER — no match/);
    assert.match(
      output,
      /--ease-out-expo\s+bezier\(0\.16, 1, 0\.3, 1\)\s+→ EASE\.out/,
    );
    assert.match(output, /curve\(s\) written into src\/motion\.ts\./);
    assert.match(output, /typeface {2}Inter/);
    assert.match(output, /--dry-run: nothing written\./);
    assert.equal(await fs.readFile(themeCssPath, "utf8"), themeCssBeforeRun);
    assert.equal(await fs.readFile(motionPath, "utf8"), motionBeforeRun);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
});
