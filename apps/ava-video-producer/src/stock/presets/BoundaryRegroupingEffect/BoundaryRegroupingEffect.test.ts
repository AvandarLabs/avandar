import assert from "node:assert/strict";
import test from "node:test";
import { prop, propNotEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { BoundaryRegroupingEffect } from "./BoundaryRegroupingEffect";
import { boundaryRegroupingEffectContract } from "./BoundaryRegroupingEffect.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  changedInput,
} from "./BoundaryRegroupingEffect.fixtures";
import { inputSchema, type Input } from "./BoundaryRegroupingEffect.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(BoundaryRegroupingEffect, {
        frame,
        input,
        accent: "#46dbc9",
        id: "packet18",
      }),
    ),
  );
}
test("default partitions retain six records and forty residents", () => {
  assert.ok(
    _render({ frame: 150 }).includes(
      'data-overall-records="6" data-overall-population="40"',
    ),
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...input.cells.map(prop("label")),
    input.groupings[frame < 72 ? 0 : 1].label,
    ...input.groupings[frame < 72 ? 0 : 1].zones.map(prop("label")),
    input.copy.context,
    input.copy.total,
    input.copy.records,
    input.copy.population,
    ...(input.measure === "normalized" ? [input.copy.per] : []),
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
  contract: boundaryRegroupingEffectContract,
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
test("fixed atomic cells survive a change from west/east rates 15/15 to north/south rates 20/10", () => {
  const start = _render({ frame: 0 }),
    hold = _render({ frame: 150 });
  assert.deepEqual(
    [...start.matchAll(/data-value="([^"]+)"/g)].map((match) =>
      Number(match[1]),
    ),
    [15, 15],
  );
  assert.deepEqual(
    [...hold.matchAll(/data-value="([^"]+)"/g)].map((match) =>
      Number(match[1]),
    ),
    [20, 10],
  );
  assert.deepEqual(
    start.match(/<rect data-atomic-cell[^>]+>/g),
    hold.match(/<rect data-atomic-cell[^>]+>/g),
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 60 }),
      marker: "seam-partition",
    }),
    /translate\(0 -/,
  );
  assert.equal((hold.match(/data-atomic-cell=/g) ?? []).length, 4);
});
test("unequal populations aggregate before dividing and hidden values retain zero-count groups", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    cells: DEFAULT_INPUT.cells.map((cell, index) => ({
      ...cell,
      records: index === 0 ? 7 : 0,
      population: index === 0 ? 24 : 1,
    })),
    showCellValues: false,
  });
  assert.deepEqual(
    [
      ..._render({ frame: 150, input: input }).matchAll(
        /data-value="([^"]+)"/g,
      ),
    ].map((match) => Number(match[1])),
    [28, 0],
  );
  assert.match(
    _render({ frame: 150, input: input }),
    /data-overall-records="7" data-overall-population="27"/,
  );
  assert.deepEqual(
    [
      ..._render({ frame: 150, input: changedInput }).matchAll(
        /data-value="([^"]+)"/g,
      ),
    ].map((match) => Number(match[1])),
    [7, 0],
  );
});
test("holes remain empty and diagonal-only zones reject as noncontiguous", () => {
  const cells = fixtures[2].input.cells.filter(propNotEq("id", "4"));
  const groups = [
    [
      ["0", "1", "2"],
      ["3", "5", "6", "7", "8"],
    ],
    [
      ["0", "3", "6"],
      ["1", "2", "5", "7", "8"],
    ],
  ];
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    cells,
    groupings: groups.map((zones) => ({
      label: "",
      zones: zones.map((cellIds, index) => ({
        id: String(index),
        label: "",
        cellIds,
      })),
    })),
  });
  assert.equal(
    (_render({ frame: 150, input: input }).match(/data-atomic-cell=/g) ?? [])
      .length,
    8,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: input }),
    /data-atomic-cell="4"/,
  );
  assert.equal(
    inputSchema.safeParse({
      ...DEFAULT_INPUT,
      groupings: DEFAULT_INPUT.groupings.map((grouping) => ({
        ...grouping,
        zones: [
          { id: "a", label: "", cellIds: ["nw", "se"] },
          { id: "b", label: "", cellIds: ["ne", "sw"] },
        ],
      })),
    }).success,
    false,
  );
});
test("full cell labels leave vertical clearance above their fixed fraction", () => {
  const input = {
    ...DEFAULT_INPUT,
    cells: DEFAULT_INPUT.cells.map((cell) => ({
      ...cell,
      label: "界界界 界界界 界界界 界界界 ",
    })),
  };
  const markup = _render({ frame: 150, input: input });
  const texts = [
    ...markup.matchAll(
      /<text aria-label="界界界 界界界 界界界 界界界 "[^>]*>[\s\S]*?<\/text>/g,
    ),
  ];
  assert.equal(texts.length, 4);
  texts.forEach((match, index) => {
    const baseline = SvgAttributes.getNumberFromMarkup({
      attributes: match[0],
      name: "y",
    });
    const offsets = [...match[0].matchAll(/ dy="([^"]+)"/g)].reduce(
      (total, item) => total + Number(item[1]),
      0,
    );
    assert.ok(baseline + offsets + 3 < 240 + input.cells[index].row * 110 - 12);
  });
});
test("the full rate-unit heading stays clear of the unchanged total figures", () => {
  const input = {
    ...fixtures[2].input,
    copy: {
      ...fixtures[2].input.copy,
      per: "界界界界界界界界界界界 界界界界界界界界界界界 界界界界界界界界界界界 界界界界",
    },
  };
  const markup = _render({ frame: 150, input: input });
  const text = markup.match(
    /<text aria-label="界界界界界界界界界界界 界界界界界界界界界界界 界界界界界界界界界界界 界界界界"[^>]*>[\s\S]*?<\/text>/,
  )![0];
  const bottom =
    SvgAttributes.getNumberFromMarkup({ attributes: text, name: "y" }) +
    [...text.matchAll(/ dy="([^"]+)"/g)].reduce(
      (sum, item) => sum + Number(item[1]),
      0,
    ) +
    3;
  assert.ok(bottom < 510 - 18);
});
