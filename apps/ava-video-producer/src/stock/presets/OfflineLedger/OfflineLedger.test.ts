import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { OfflineLedger } from "./OfflineLedger";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./OfflineLedger.fixtures";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(OfflineLedger, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
test("every entry continues at the same offline cadence and leaves exactly one retained impression", () => {
  const hold = _render({ frame: 150 });
  assert.match(hold, /data-connection="unavailable"/);
  DEFAULT_INPUT.entries.forEach(({ id }) => {
    assert.ok(hold.includes(`data-ledger-entry="${id}"`));
    assert.ok(hold.includes(`data-local-impression="${id}"`));
  });
  [45, 61, 77].forEach((frame, index) => {
    assert.equal(
      (_render({ frame: frame }).match(/data-local-impression=/g) ?? []).length,
      index + 1,
    );
  });
  assert.equal(
    (_render({ frame: 120 }).match(/data-local-impression=/g) ?? []).length,
    DEFAULT_INPUT.entries.length,
  );
  assert.match(_render({ frame: 18 }), /data-connection="available"/);
});
test("storage visibility preserves notebook strokes and all three casings retain the same entries", () => {
  Array.from(["tablet", "laptop", "notebook"] as const).forEach(
    (deviceShape) => {
      const markup = _render({
        frame: 150,
        input: {
          ...DEFAULT_INPUT,
          deviceShape,
          showLabels: false,
          showStorageImpressions: false,
        },
      });
      assert.equal(
        (markup.match(/data-ledger-entry=/g) ?? []).length,
        DEFAULT_INPUT.entries.length,
      );
      assert.doesNotMatch(markup, /data-local-impression=|<text/);
      assert.ok(markup.includes(`data-casing="${deviceShape}"`));
    },
  );
  const changed = _render({ frame: 150, input: fixtures[3].input });
  assert.match(changed, /Original document/);
  assert.match(changed, /Extracted table/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { offlineLedgerContract } from "./OfflineLedger.contract";
import { inputSchema } from "./OfflineLedger.schema";
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: offlineLedgerContract,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id", "deviceShape"],
  textFrames: [18, 150],
  getVisibleTexts: ({ input, frame }) => [
    input.surfaceLabel,
    ...(frame >= 44
      ? input.entries.flatMap(({ label, value }) => [label, value])
      : []),
    input.copy[frame < 36 ? "connected" : "offline"],
    ...(frame >= 44 ? [input.copy.storage] : []),
    ...(frame >= 108 ? [input.copy.retained] : []),
    input.copy.example,
  ],
});
test("retention captions wait for the first impression and completed notebook", () => {
  assert.doesNotMatch(
    _render({ frame: 18 }),
    /aria-label="Saved on this device"|aria-label="Entries retained"/,
  );
  assert.match(_render({ frame: 50 }), /aria-label="Saved on this device"/);
  assert.doesNotMatch(_render({ frame: 50 }), /aria-label="Entries retained"/);
  assert.match(_render({ frame: 150 }), /aria-label="Entries retained"/);
});
