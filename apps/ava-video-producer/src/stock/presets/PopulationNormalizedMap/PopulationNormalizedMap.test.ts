import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PopulationNormalizedMap } from "./PopulationNormalizedMap";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "./PopulationNormalizedMap.fixtures";

test("Default raw counts are four and three; per-100 values are ten and thirty. Preserve both denominators while changing the legend and fill domain. Reject a domain that would clip a derived value.", () => {
  const markup = _render({ frame: 150 });
  assert.match(markup, /data-records="4" data-population="40" data-rate="10"/);
  assert.match(markup, /data-records="3" data-population="10" data-rate="30"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { populationNormalizedMapContract } from "./PopulationNormalizedMap.contract";
import { inputSchema, type Input } from "./PopulationNormalizedMap.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(PopulationNormalizedMap, {
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
    ...input.zones.map(prop("label")),
    input.periodLabel,
    input.copy.context,
    input.copy.records,
    input.copy.population,
    input.copy.per,
    frame < 72 ? input.copy.countLegend : input.copy.normalizedLegend,
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
  contract: populationNormalizedMapContract,
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
test("lids lift and settle while legends change units and preserve denominators", () => {
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 0 }),
      marker: "lifted-zone",
    }),
    /translate\(0 0\)/,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 72 }),
      marker: "lifted-zone",
    }),
    /translate\(0 -32\)/,
  );
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 108 }),
      marker: "lifted-zone",
    }),
    /translate\(0 0\)/,
  );
  assert.match(
    _render({ frame: 0 }),
    /data-legend-measure="count" data-legend-maximum="5"/,
  );
  assert.match(
    _render({ frame: 150 }),
    /data-legend-measure="normalized" data-legend-maximum="40"/,
  );
  const hidden = _render({
    frame: 150,
    input: { ...defaultInput, keepFractionsVisible: false },
  });
  assert.match(hidden, /aria-label="40"/);
  assert.match(hidden, /aria-label="10"/);
});
test("count and rate equality remain distinct and domains reject clipping", () => {
  const equalCounts = inputSchema.parse({
    ...defaultInput,
    zones: defaultInput.zones.map((zone) => ({ ...zone, records: 4 })),
  });
  assert.match(
    _render({ frame: 150, input: equalCounts }),
    /data-records="4" data-population="10" data-rate="40"/,
  );
  const equalRates = inputSchema.parse({
    ...defaultInput,
    zones: [defaultInput.zones[0], { ...defaultInput.zones[1], records: 1 }],
  });
  assert.match(
    _render({ frame: 150, input: equalRates }),
    /data-records="1" data-population="10" data-rate="10"/,
  );
  assert.equal(
    inputSchema.safeParse({
      ...defaultInput,
      colorDomains: { countMaximum: 4, normalizedMaximum: 30 },
    }).success,
    true,
  );
  [
    {
      ...defaultInput,
      colorDomains: { countMaximum: 3, normalizedMaximum: 30 },
    },
    {
      ...defaultInput,
      colorDomains: { countMaximum: 4, normalizedMaximum: 29 },
    },
    {
      ...defaultInput,
      zones: defaultInput.zones.map((zone) => ({ ...zone, records: 100 })),
    },
    {
      ...defaultInput,
      zones: [defaultInput.zones[0], { ...defaultInput.zones[0], id: "other" }],
    },
  ].forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
  assert.match(
    _render({ frame: 150, input: fixtures[1].input }),
    /data-records="0" data-population="1" data-rate="0"/,
  );
});
test("adjacent zones keep all fraction shelves and use each explicit color domain", () => {
  const input = fixtures[2].input;
  const setup = _render({ frame: 0, input: input });
  const hold = _render({ frame: 150, input: input });
  assert.equal((hold.match(/data-fraction-zone=/g) ?? []).length, 4);
  assert.equal((hold.match(/aria-label="1000"/g) ?? []).length, 4);
  assert.match(setup, /fill-opacity="0.88"/);
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: hold,
          marker: "zone-shade",
        }),
        name: "fill-opacity",
      }) - 0.196,
    ) < 1e-12,
  );
  [
    ...hold.matchAll(
      /data-denominator-connector="[^"]+" d="M[^"]+ L590 ([\d.]+) L627 ([\d.]+)"/g,
    ),
  ].forEach((match) => assert.equal(match[1], match[2]));
});

test("exact normalized maximum accepts seven records per twenty-five people at rate twenty-eight", () => {
  const input = {
    ...defaultInput,
    zones: defaultInput.zones.map((zone) => ({
      ...zone,
      records: 7,
      population: 25,
    })),
    rateBase: 100 as const,
    colorDomains: { countMaximum: 7, normalizedMaximum: 28 },
  };
  const result = inputSchema.safeParse(input);
  assert.equal(result.success, true, "The exact rate 7 * 100 / 25 is 28");
  const markup = _render({ frame: 150, input: input });
  assert.equal(
    (
      markup.match(/data-records="7" data-population="25" data-rate="28"/g) ??
      []
    ).length,
    2,
  );
  assert.equal((markup.match(/aria-label="28"/g) ?? []).length, 2);
  const shades = [
    ...markup.matchAll(/<polygon\b([^>]*data-zone-shade=[^>]*)>/g),
  ];
  assert.equal(shades.length, 2);
  shades.forEach(([, attributes]) =>
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes, name: "fill-opacity" }),
      0.88,
    ),
  );
});
test("a normalized maximum immediately below twenty-eight rejects clipping without epsilon", () => {
  assert.equal(
    inputSchema.safeParse({
      ...defaultInput,
      zones: defaultInput.zones.map((zone) => ({
        ...zone,
        records: 7,
        population: 25,
      })),
      rateBase: 100,
      colorDomains: { countMaximum: 7, normalizedMaximum: 27.999999999999996 },
    }).success,
    false,
  );
});
