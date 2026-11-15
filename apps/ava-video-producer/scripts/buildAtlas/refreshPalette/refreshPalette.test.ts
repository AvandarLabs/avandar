import assert from "node:assert/strict";
import test from "node:test";
import { buildBundledFontFaceCss } from "./refreshPalette.mjs";

test("the showcase theme CSS declares Figtree from the font registry", async () => {
  assert.equal(
    await buildBundledFontFaceCss(),
    `@font-face {
  font-display: swap;
  font-family: Figtree;
  font-style: normal;
  font-weight: 300 900;
  src: url("/fonts/figtree-latin.woff2") format("woff2");
}
`,
  );
});
