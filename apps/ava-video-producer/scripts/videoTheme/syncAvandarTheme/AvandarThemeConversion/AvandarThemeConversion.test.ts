import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { makeResolvedVideoThemeFromLibrary } from "../../../../src/videoTheme/makeResolvedVideoThemeFromLibrary/makeResolvedVideoThemeFromLibrary";
import { makeVideoThemeLibraryFromDocuments } from "../../../../src/videoTheme/makeVideoThemeLibraryFromDocuments/makeVideoThemeLibraryFromDocuments";
import { readAvandarThemeSource } from "../readAvandarThemeSource";
import { AvandarThemeConversion } from "./AvandarThemeConversion";

const THEME_FILE = fileURLToPath(
  new URL("../../../../themes/avandar.theme.json", import.meta.url),
);
test("the tracked avandar theme matches a fresh sync from the Avandar theme", async () => {
  assert.deepEqual(
    JSON.parse(await fs.readFile(THEME_FILE, "utf8")),
    structuredClone(
      AvandarThemeConversion.makeThemeFromProduct(readAvandarThemeSource()),
    ),
  );
});
test("an rgba border becomes an 8-digit hex swatch", () => {
  assert.equal(
    AvandarThemeConversion.getHexFromCssColor("rgba(217, 224, 231, 0.28)"),
    "#d9e0e747",
  );
});
test("a space-separated rgb colour with a percent alpha becomes an 8-digit hex", () => {
  assert.equal(
    AvandarThemeConversion.getHexFromCssColor("rgb(15 23 42 / 38%)"),
    "#0f172a61",
  );
});
test("a stacked shadow becomes layers that share one colour", () => {
  assert.deepEqual(
    AvandarThemeConversion.getShadowFromCss(
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
  const library = makeVideoThemeLibraryFromDocuments([
    AvandarThemeConversion.makeThemeFromProduct(readAvandarThemeSource()),
  ]);
  const theme = makeResolvedVideoThemeFromLibrary({
    library,
    themeId: "avandar",
  });
  assert.equal(theme.semantic.color.ground, "#102a43");
  assert.equal(theme.semantic.corner.panel, 12);
});
