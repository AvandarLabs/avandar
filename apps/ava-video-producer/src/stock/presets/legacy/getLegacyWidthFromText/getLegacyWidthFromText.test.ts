/** Width guards cover wide lowercase letters and the actual weighted metric. */
import assert from "node:assert/strict";
import test from "node:test";
import { getLegacyWidthFromText } from "./getLegacyWidthFromText";

test("Arial estimates bound regular and bold measurements at supported sizes", () => {
  const measurements = [
    { text: "mmmmmmmmmm", fontSize: 16, minimumWidth: 140 },
    { text: "mmWmmWmm", fontSize: 16, minimumWidth: 114 },
    { text: "0 mmmmmm", fontSize: 103, minimumWidth: 638 },
  ];
  measurements.forEach(({ text, fontSize, minimumWidth }) =>
    assert.ok(
      getLegacyWidthFromText({ text, fontSize }) >= minimumWidth,
      `${text} must reserve at least ${minimumWidth}px`,
    ),
  );
});
