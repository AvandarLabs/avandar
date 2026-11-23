import assert from "node:assert/strict";
import test from "node:test";
import { getTokenPathFromDocumentPath } from "./getTokenPathFromDocumentPath";

test("document paths map back to token paths in every tier", () => {
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
      getTokenPathFromDocumentPath(documentPath.split(".")),
      tokenPath,
    );
  }
});
