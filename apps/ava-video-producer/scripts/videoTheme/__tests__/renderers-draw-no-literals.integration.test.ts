/*
 * Renderers draw no theme literals. Every renderer file and Atlas chrome
 * stylesheet (`scripts/videoTheme/themeLiterals/rendererGlobs.json` and
 * `chromeStylesheetGlobs.json`) is scanned with the theme coverage patterns
 * (colour, starter palette, type, line and shape, motion, implicit easing,
 * sketch bypass, stylesheet values), and any count above zero fails. The
 * retired stock palette module must not come back.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  countThemeLiteralsFromSource,
  sumThemeLiteralCounts,
  type ThemeLiteralCounts,
} from "../themeLiterals/countThemeLiterals/countThemeLiterals";
import {
  APP_ROOT,
  listScannedFiles,
} from "../themeLiterals/rendererFiles/rendererFiles";

function _counts(file: string): ThemeLiteralCounts {
  return countThemeLiteralsFromSource(
    file,
    fs.readFileSync(path.join(APP_ROOT, file), "utf8"),
  );
}

function _describe(counts: ThemeLiteralCounts): string {
  return Object.entries(counts)
    .filter(([, count]) => {
      return count > 0;
    })
    .map(([area, count]) => {
      return `${area} ${count}`;
    })
    .join(", ");
}

test("no renderer file or chrome stylesheet holds a theme literal", () => {
  const withLiterals = listScannedFiles().flatMap((file) => {
    const counts = _counts(file);
    return sumThemeLiteralCounts(counts) > 0
      ? [`${file}: ${_describe(counts)}`]
      : [];
  });
  assert.deepEqual(withLiterals, []);
});

test("the stock palette module stays retired", () => {
  assert.deepEqual(
    fs
      .readdirSync(path.join(APP_ROOT, "src"), {
        recursive: true,
        encoding: "utf8",
      })
      .filter((file) => {
        return /(?:^|\/)stockPalette\.[jt]sx?$/.test(file);
      }),
    [],
  );
});
