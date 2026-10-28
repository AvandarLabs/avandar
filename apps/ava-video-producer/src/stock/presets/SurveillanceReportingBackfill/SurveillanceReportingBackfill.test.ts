import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SurveillanceReportingBackfill } from "./SurveillanceReportingBackfill";
import { surveillanceReportingBackfillContract } from "./SurveillanceReportingBackfill.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  changedInput,
} from "./SurveillanceReportingBackfill.fixtures";
import {
  inputSchema,
  type Input,
} from "./SurveillanceReportingBackfill.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(SurveillanceReportingBackfill, {
        frame,
        input,
        accent: "#46dbc9",
        id: "packet18",
      }),
    ),
  );
}
test("default reporting cutoffs retain totals of two and five", () => {
  assert.ok(
    _render({ frame: 150 }).includes(
      'data-earlier-total="2" data-revised-total="5"',
    ),
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...input.records.map(prop("label")),
    ...input.eventBins.map(prop("label")),
    ...input.snapshots.map(prop("label")),
    ...Object.values(input.copy),
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "cellIds",
  "eventBinId",
  "firstSnapshot",
  "focusedLocationId",
  "measure",
  "role",
  "kind",
  "initialDayId",
  "initialBandId",
  "agreedDayId",
  "agreedBandId",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: surveillanceReportingBackfillContract,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
});
registerStockTextLayoutAssertions({
  inputSchema,
  fixtures,
  render: _render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
});
test("each receipt reaches its earlier event bin and bars retain first-snapshot outlines", () => {
  const start = _render({ frame: 0 }),
    hold = _render({ frame: 150 });
  assert.deepEqual(
    [...start.matchAll(/<rect data-bin-bar[^>]+>/g)].map((match) =>
      SvgAttributes.getNumberFromMarkup({
        attributes: match[0],
        name: "height",
      }),
    ),
    [18, 18, 0],
  );
  assert.deepEqual(
    [...hold.matchAll(/<rect data-bin-bar[^>]+>/g)].map((match) =>
      SvgAttributes.getNumberFromMarkup({
        attributes: match[0],
        name: "height",
      }),
    ),
    [36, 36, 18],
  );
  assert.equal((hold.match(/data-record-token=/g) ?? []).length, 5);
  const token = [...hold.matchAll(/<rect data-record-token="c"[^>]+>/g)][0][0];
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: token, name: "x" }),
    68 + 480 / 6 - 13,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: token, name: "y" }),
    440,
  );
  assert.notEqual(
    SvgAttributes.fromMarker({ markup: start, marker: "reporting-tab" }),
    SvgAttributes.fromMarker({ markup: hold, marker: "reporting-tab" }),
  );
});
test("array order and hidden prior outlines preserve totals and empty-bin backfill", () => {
  const hold = _render({ frame: 150, input: changedInput });
  assert.deepEqual(
    [...hold.matchAll(/data-prior="([^"]+)" data-revised="([^"]+)"/g)].map(
      (match) => match.slice(1),
    ),
    [
      ["1", "2"],
      ["1", "2"],
      ["0", "1"],
    ],
  );
  assert.doesNotMatch(hold, /data-prior-outline=/);
  assert.match(hold, /data-earlier-total="2" data-revised-total="5"/);
  const input = inputSchema.parse({
    ...fixtures[2].input,
    records: fixtures[2].input.records.map((record) => ({
      ...record,
      eventBinId: "0",
    })),
  });
  assert.equal(
    (_render({ frame: 150, input: input }).match(/data-record-token=/g) ?? [])
      .length,
    12,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 150, input: input }),
        marker: "bin-bar",
      }),
      name: "height",
    }),
    216,
  );
});
