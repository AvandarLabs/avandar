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
import { RendererFiles } from "../themeLiterals/RendererFiles";
import { ThemeLiteralCounter } from "../themeLiterals/ThemeLiteralCounter/ThemeLiteralCounter";
import { type ThemeLiteralCounts } from "../themeLiterals/ThemeLiteralCounter/ThemeLiteralCounter.types";

function _describe(counts: ThemeLiteralCounts): string {
  return Object.entries(counts)
    .filter(([, numLiterals]) => {
      return numLiterals > 0;
    })
    .map(([area, numLiterals]) => {
      return `${area} ${numLiterals}`;
    })
    .join(", ");
}
test("no renderer file or chrome stylesheet holds a theme literal", () => {
  const withLiterals = RendererFiles.listScannedFiles().flatMap((file) => {
    const counts = ThemeLiteralCounter.countThemeLiteralsFromSource({
      fileName: file,
      source: fs.readFileSync(path.join(RendererFiles.APP_ROOT, file), "utf8"),
    });
    return ThemeLiteralCounter.sumThemeLiteralCounts(counts) > 0
      ? [`${file}: ${_describe(counts)}`]
      : [];
  });
  assert.deepEqual(withLiterals, []);
});
test("the stock palette module stays retired", () => {
  assert.deepEqual(
    fs
      .readdirSync(path.join(RendererFiles.APP_ROOT, "src"), {
        recursive: true,
        encoding: "utf8",
      })
      .filter((file) => {
        return /(?:^|\/)stockPalette\.[jt]sx?$/.test(file);
      }),
    [],
  );
});
