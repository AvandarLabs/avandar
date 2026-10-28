import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { INVALID_INPUTS } from "./rejectedInputs.constants";
import { StatePreservingSourceRefresh } from "./StatePreservingSourceRefresh";
import {
  DEFAULT_INPUT,
  FIXTURES,
} from "./StatePreservingSourceRefresh.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import type { Input } from "./StatePreservingSourceRefresh.schema";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(StatePreservingSourceRefresh, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
test("refresh changes A label, flags C, and preserves every identity and human field", () => {
  const markup = _render({ frame: 150, input: DEFAULT_INPUT });
  const rows = [
    ...markup.matchAll(
      /data-record-row="([^"]*)" data-label="([^"]*)" data-status="([^"]*)" data-assignee="([^"]*)" data-missing="([^"]*)"/g,
    ),
  ].map((match) => match.slice(1));
  assert.deepEqual(rows, [
    ["a", "Site A North", "In review", "Worker K", "false"],
    ["b", "Site B", "Open", "Worker M", "false"],
    ["c", "Site C", "Open", "Worker K", "true"],
  ]);
  assert.match(markup, /data-write-count="2"/);
});
test("identical complete source rows in reverse order produce zero writes", () => {
  assert.match(
    _render({ frame: 150, input: FIXTURES[3].input }),
    /data-write-count="0"/,
  );
  const before = _render({ frame: 35, input: DEFAULT_INPUT });
  const hold = _render({ frame: 150, input: DEFAULT_INPUT });
  const pin = (markup: string) =>
    SvgAttributes.fromMarker({ markup, marker: "human-pin" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: pin(before), name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: pin(hold), name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: pin(before),
      name: "width",
    }),
    SvgAttributes.getNumberFromMarkup({ attributes: pin(hold), name: "width" }),
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { statePreservingSourceRefreshContract } from "./StatePreservingSourceRefresh.contract";
import { inputSchema } from "./StatePreservingSourceRefresh.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.context,
    frame >= 140 ? input.copy.after : input.copy.before,
    input.labels.derived,
    input.labels.human,
    ...input.records.flatMap((record) => [
      record.status,
      record.assignee,
      frame >= 139
        ? (input.sourceRows.find(({ id }) => id === record.id)?.label ??
          record.label)
        : record.label,
    ]),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs: INVALID_INPUTS,
  contract: statePreservingSourceRefreshContract,
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
    ["records", 0, "label"],
    ["records", 0, "status"],
    ["records", 0, "assignee"],
    ["records", 1, "label"],
    ["records", 1, "status"],
    ["records", 1, "assignee"],
    ["records", 2, "label"],
    ["records", 2, "status"],
    ["records", 2, "assignee"],
    ["sourceRows", 0, "label"],
    ["sourceRows", 1, "label"],
    ["labels", "derived"],
    ["labels", "human"],
    ["labels", "unchanged"],
    ["labels", "missing"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: FIXTURES.map(prop("input")),
});

test("pinned human regions retain actual text, full geometry and original record order", () => {
  FIXTURES.forEach(({ input }) =>
    [13, 50, 80, 104, 120, 139, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const humanRegions = [
        ...markup.matchAll(/<rect data-human-pin="([^"]*)"([^>]*)>/g),
      ].map(([, id, attributes]) => [
        id,
        SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
        SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
        SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
        SvgAttributes.getNumberFromMarkup({ attributes, name: "height" }),
      ]);
      assert.deepEqual(
        humanRegions,
        input.records.map(({ id }, index) => [
          id,
          610,
          117 + index * 106,
          290,
          88,
        ]),
      );
      input.records.forEach(({ status, assignee }) =>
        [status, assignee].forEach((value) =>
          assert.ok(markup.includes(`aria-label="${value}"`)),
        ),
      );
    }),
  );
  const markup = _render({ frame: 150, input: DEFAULT_INPUT });
  [
    "Site A North",
    "Site B",
    "Site C",
    "Missing from this source",
    "No write needed",
    "2",
  ].forEach((value) => assert.ok(markup.includes(`aria-label="${value}"`)));
  assert.doesNotMatch(
    _render({ frame: 150, input: { ...DEFAULT_INPUT, showWriteCount: false } }),
    /data-write-count=/,
  );
});
