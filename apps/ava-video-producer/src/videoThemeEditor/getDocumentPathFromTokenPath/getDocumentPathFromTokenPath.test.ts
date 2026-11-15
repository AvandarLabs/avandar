import assert from "node:assert/strict";
import test from "node:test";
import { getDocumentPathFromTokenPath } from "./getDocumentPathFromTokenPath";

test("token paths map to document paths in every tier", () => {
  for (const [tokenPath, documentPath] of [
    ["atomic.swatch.mint", "other.video.atomic.swatch.mint"],
    ["color.accent", "other.video.semantic.color.accent"],
    [
      "components.ProgressBar.height",
      "components.ProgressBar.defaultProps.height",
    ],
    ["fontSizes.md", "fontSizes.md"],
  ] as const) {
    assert.equal(
      getDocumentPathFromTokenPath(tokenPath).join("."),
      documentPath,
    );
  }
});
