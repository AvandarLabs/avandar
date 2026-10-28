import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { InvalidTableQuarantine } from "./InvalidTableQuarantine";
import {
  DEFAULT_INPUT,
  FIXTURES,
  INVALID_INPUTS,
} from "./InvalidTableQuarantine.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import type { Input } from "./InvalidTableQuarantine.schema";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(InvalidTableQuarantine, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
test("completed or failed attempts keep the full shutter closed without a reload", () => {
  (["failed", "completed"] as const).forEach((outcome) => {
    const input = {
      ...DEFAULT_INPUT,
      attempt: { ...DEFAULT_INPUT.attempt, outcome },
      reload: { performed: false, rows: [] },
    };
    const shutter = SvgAttributes.fromMarker({
      markup: _render({ frame: 150, input: input }),
      marker: "read-shutter",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: shutter,
        name: "height",
      }),
      300,
    );
    assert.match(
      _render({ frame: 150, input: { ...input, showAttempt: false } }),
      /data-readable="false"/,
    );
  });
});
test("every literal displayed row is replaced before the shutter first opens", () => {
  const input = FIXTURES[3].input;
  [112, 113, 120, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const rows = [
      ...markup.matchAll(/data-table-row="(\d+)" data-raw-value="([^"]*)"/g),
    ].map(([, index, value]) => [Number(index), value]);
    assert.deepEqual(rows, [
      [0, ""],
      [1, "X: 0"],
      [2, " "],
      [3, "Z: 8"],
    ]);
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 112, input: input }),
        marker: "read-shutter",
      }),
      name: "height",
    }),
    300,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 139, input: input }),
        marker: "read-shutter",
      }),
      name: "height",
    }),
    0,
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { invalidTableQuarantineContract } from "./InvalidTableQuarantine.contract";
import { inputSchema } from "./InvalidTableQuarantine.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    frame < 13 || (frame >= 139 && input.reload.performed)
      ? input.labels.readable
      : input.labels.blocked,
    frame < 13 || (frame >= 139 && input.reload.performed)
      ? input.labels.readable
      : input.labels.invalid,
    ...(frame >= 96 && input.reload.performed ? [input.labels.reload] : []),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs: INVALID_INPUTS,
  contract: invalidTableQuarantineContract,
  render: _render,
  excludedTextFields: [
    "id",
    "entityId",
    "requestedIds",
    "firstOperationId",
    "outcome",
    "rule",
    "nullPolicy",
    "replacement",
    "originalRows",
    "rows",
  ],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: options.contract,
  expectedTextPaths: [
    ["labels", "readable"],
    ["labels", "invalid"],
    ["labels", "blocked"],
    ["labels", "reload"],
  ],
  suppliedInputs: FIXTURES.map(prop("input")),
});

test("closed shutter geometry precedes the first literal row mutation", () => {
  const closed = _render({ frame: 45, input: DEFAULT_INPUT }),
    mutated = _render({ frame: 46, input: DEFAULT_INPUT });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: closed,
        marker: "read-shutter",
      }),
      name: "height",
    }),
    300,
  );
  assert.match(closed, /data-literal-value="B: 4"/);
  assert.doesNotMatch(closed, /data-literal-value="B: 9"/);
  assert.match(mutated, /data-literal-value="B: 9"/);
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: mutated,
        marker: "read-shutter",
      }),
      name: "height",
    }),
    300,
  );
  const replacement = _render({ frame: 112, input: FIXTURES[3].input });
  ["", "X: 0", " ", "Z: 8"].forEach((value) =>
    assert.ok(replacement.includes(`data-literal-value="${value}"`)),
  );
  assert.doesNotMatch(replacement, /data-literal-value="B: 9"/);
});

test("both validity captions agree at closure and reopening boundaries", () => {
  [12, 13, 29, 45, 46, 112, 113, 126, 138, 139].forEach((frame) => {
    const markup = _render({ frame: frame, input: DEFAULT_INPUT });
    const readable = frame === 12 || frame === 139;
    assert.equal(
      (markup.match(/aria-label="Readable"/g) || []).length,
      readable ? 2 : 0,
    );
    assert.equal(
      (markup.match(/aria-label="Read blocked"/g) || []).length,
      readable ? 0 : 1,
    );
    assert.equal(
      (markup.match(/aria-label="Invalid until complete reload"/g) || [])
        .length,
      readable ? 0 : 1,
    );
    assert.match(markup, new RegExp(`data-readable="${readable}"`));
  });
});

test("hidden completed attempts remain visibly invalid across all non-reload boundaries", () => {
  const input = {
    ...DEFAULT_INPUT,
    attempt: { ...DEFAULT_INPUT.attempt, outcome: "completed" as const },
    reload: { performed: false, rows: [] },
    showAttempt: false,
  };
  [13, 29, 45, 46, 112, 113, 138, 139, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    assert.doesNotMatch(markup, /aria-label="Readable"/);
    assert.match(markup, /aria-label="Read blocked"/);
    assert.match(markup, /aria-label="Invalid until complete reload"/);
  });
});

test("completed reload status replaces the historical attempt icon", async () => {
  const { invalidTableQuarantineContract: correctionContract } =
    await import("./InvalidTableQuarantine.contract");
  const { InvalidTableQuarantine: Component } =
    await import("./InvalidTableQuarantine");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = {
      ...source,
      reload: { ...source.reload, performed: true },
      showAttempt: true,
    };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );
    const attempt = markup.match(/<path[^>]*data-attempt-outcome[^>]*>/)![0];
    assert.match(
      attempt,
      /opacity="0"/,
      "A historical attempt outcome must not read as the completed reload status",
    );
    assert.match(markup, /data-reload-outcome="complete"/);
    assert.match(markup, /data-readable="true"/);
  });
});
