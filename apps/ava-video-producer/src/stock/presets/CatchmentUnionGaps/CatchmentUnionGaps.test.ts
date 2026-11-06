import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { CatchmentUnionGaps } from "./CatchmentUnionGaps";
import {
  defaultInput,
  fixtures,
  invalidInputs,
  changedInput,
} from "./CatchmentUnionGaps.fixtures";

test("The default union covers three of four homes and six of eight members, counting the overlapping home once. Removing a catchment recomputes the union and gaps without duplicating or deleting household records.", () => {
  const markup = _render({ frame: 150 });
  assert.match(markup, /data-covered="3"/);
  assert.match(markup, /data-denominator="4"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { catchmentUnionGapsContract } from "./CatchmentUnionGaps.contract";
import { inputSchema, type Input } from "./CatchmentUnionGaps.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(CatchmentUnionGaps, {
        frame,
        input,
        accent: "#46dbc9",
        id: "packet17",
      }),
    ),
  );
}
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...input.catchments.map(prop("label")),
    ...input.households.map(prop("label")),
    input.copy.context,
    input.copy.covered,
    input.copy.uncovered,
    input.copy.total,
    input.copy.overlap,
    input.copy[input.measure],
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "stratumId",
  "parcelId",
  "onsetBinId",
  "focusedBinId",
  "investigationCaseIds",
  "selectedSiteIds",
  "measure",
  "gapEmphasis",
];
registerStockPresetAssertions({
  inputSchema,
  defaultInput,
  fixtures,
  invalidInputs,
  contract: catchmentUnionGapsContract,
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
test("union membership counts a coincident record once and recomputes after removing a catchment", () => {
  assert.match(
    _render({ frame: 150, input: { ...defaultInput, measure: "members" } }),
    /data-covered="6" data-denominator="8"/,
  );
  assert.match(
    _render({ frame: 150, input: changedInput }),
    /data-covered="5" data-denominator="8"/,
  );
  [defaultInput, changedInput].forEach((input) =>
    assert.equal(
      (_render({ frame: 150, input: input }).match(/data-household=/g) ?? [])
        .length,
      4,
    ),
  );
  const duplicate = inputSchema.parse({
    ...defaultInput,
    catchments: [
      defaultInput.catchments[0],
      { ...defaultInput.catchments[0], id: "duplicate" },
    ],
    households: defaultInput.households.map((home, index) => ({
      ...home,
      x: 20,
      y: 30,
      id: String(index),
    })),
  });
  assert.match(
    _render({ frame: 150, input: duplicate }),
    /data-covered="4" data-denominator="4"/,
  );
  const outside = {
    ...duplicate,
    households: duplicate.households.map((home) => ({ ...home, x: 99, y: 99 })),
  };
  assert.match(
    _render({ frame: 150, input: outside }),
    /data-covered="0" data-denominator="4"/,
  );
  assert.equal(
    (
      _render({ frame: 150, input: outside }).match(
        /data-uncovered-emphasis=/g,
      ) ?? []
    ).length,
    4,
  );
});
test("duplicate tint disappears while union boundary and stationary homes remain", () => {
  const setup = _render({ frame: 0, input: changedInput });
  const hold = _render({ frame: 150, input: changedInput });
  assert.match(
    SvgAttributes.fromMarker({ markup: setup, marker: "separate-tint" }),
    /opacity="1"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: hold, marker: "separate-tint" }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: hold, marker: "union-boundary" }),
    /opacity="1"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: hold, marker: "original-outlines" }),
    /opacity="0"/,
  );
  assert.equal(
    SvgAttributes.fromMarker({ markup: setup, marker: "home-anchor" }),
    SvgAttributes.fromMarker({ markup: hold, marker: "home-anchor" }),
  );
});
test("catchment schemas reject boundary homes, invalid rings and duplicate IDs", () => {
  const rejected = [
    {
      ...defaultInput,
      households: defaultInput.households.map((home, index) =>
        index ? home : { ...home, x: 5, y: 30 },
      ),
    },
    {
      ...defaultInput,
      catchments: [
        {
          ...defaultInput.catchments[0],
          polygon: [
            [0, 0],
            [10, 10],
            [0, 10],
            [10, 0],
          ],
        },
      ],
    },
    {
      ...defaultInput,
      households: [defaultInput.households[0], defaultInput.households[0]],
    },
    {
      ...defaultInput,
      households: defaultInput.households.map((home) => ({
        ...home,
        members: 0,
      })),
    },
  ];
  rejected.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});
test("dense household keys, label slots and paths have separate full envelopes", () => {
  [0, 36, 72, 108, 150].forEach((frame) => {
    const markup = _render({
      frame: frame,
      input: {
        ...fixtures[2].input,
        households: fixtures[2].input.households.map((home) => ({
          ...home,
          x: 99,
          y: 99,
        })),
      },
    });
    assert.equal((markup.match(/data-household=/g) ?? []).length, 12);
    [
      ...markup.matchAll(
        /<path d="M(\d+(?:\.\d+)?) (\d+(?:\.\d+)?) L610 (\d+(?:\.\d+)?) L628 (\d+(?:\.\d+)?)"/g,
      ),
    ].forEach((match) => {
      assert.ok(Number(match[1]) >= 70 && Number(match[1]) <= 550);
      assert.ok(Number(match[2]) >= 160 && Number(match[2]) <= 440);
      assert.equal(match[3], match[4]);
      assert.ok(Number(match[3]) - 11 >= 140 && Number(match[3]) + 13 <= 454);
    });
    const ring = SvgAttributes.fromMarker({
      markup,
      marker: "uncovered-emphasis",
    });
    const label = markup.match(/<text aria-label="M{20}"[^>]+>/)?.[0];
    assert.ok(label);
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: ring, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: ring, name: "width" }) +
        0.5 <
        SvgAttributes.getNumberFromMarkup({ attributes: label, name: "x" }),
    );
  });
});
