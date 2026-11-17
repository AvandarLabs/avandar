import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createVideoThemeLibrary } from "../../../../src/videoTheme/builtInVideoThemes/builtInVideoThemes";
import { makeResolvedVideoThemeFromLibrary } from "../../../../src/videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { readAvandarThemeSource } from "../readAvandarThemeSource";
import {
  createAvandarTheme,
  getShadowFromCss,
  getHexFromCssColor,
} from "./createAvandarTheme";

const THEME_FILE = fileURLToPath(
  new URL("../../../../themes/avandar.theme.json", import.meta.url),
);

test("the tracked avandar theme matches a fresh sync from the Avandar theme", async () => {
  assert.deepEqual(
    JSON.parse(await fs.readFile(THEME_FILE, "utf8")),
    structuredClone(createAvandarTheme(readAvandarThemeSource())),
  );
});

test("an rgba border becomes an 8-digit hex swatch", () => {
  assert.equal(getHexFromCssColor("rgba(217, 224, 231, 0.28)"), "#d9e0e747");
});

test("a space-separated rgb colour with a percent alpha becomes an 8-digit hex", () => {
  assert.equal(getHexFromCssColor("rgb(15 23 42 / 38%)"), "#0f172a61");
});

test("a stacked shadow becomes layers that share one colour", () => {
  assert.deepEqual(
    getShadowFromCss(
      "0 1px 2px rgba(16, 42, 67, 0.1), 0 2px 5px rgba(16, 42, 67, 0.06)",
    ),
    {
      color: "#102a43",
      shadow: {
        layers: [
          { offsetX: 0, offsetY: 1, blur: 2, spread: 0, alpha: 0.1 },
          { offsetX: 0, offsetY: 2, blur: 5, spread: 0, alpha: 0.06 },
        ],
      },
    },
  );
});

test("the avandar theme resolves on Avandar's dark body surface", () => {
  const library = createVideoThemeLibrary([
    createAvandarTheme(readAvandarThemeSource()),
  ]);
  const theme = makeResolvedVideoThemeFromLibrary(library, "avandar");
  assert.equal(theme.semantic.color.ground, "#102a43");
  assert.equal(theme.semantic.corner.panel, 12);
});
