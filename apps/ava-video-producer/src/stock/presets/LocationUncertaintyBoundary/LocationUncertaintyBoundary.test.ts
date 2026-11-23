import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { LocationUncertaintyBoundary } from "./LocationUncertaintyBoundary";
import { locationUncertaintyBoundaryContract } from "./LocationUncertaintyBoundary.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./LocationUncertaintyBoundary.fixtures";
import { inputSchema, type Input } from "./LocationUncertaintyBoundary.schema";

function _makeEqualRadiusInput({
  focusedLocationId,
  showOtherFootprints,
}: Readonly<{ focusedLocationId: string; showOtherFootprints: boolean }>): {
  input: Input;
} {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    focusedLocationId,
    showOtherFootprints,
    locations: DEFAULT_INPUT.locations.map((location) => {
      return {
        ...location,
        radius: 3,
      };
    }),
  });
  return { input };
}

function _makeConcaveNotchInput(): { input: Input } {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    districts: [
      {
        id: "w",
        label: "",
        polygon: [
          [0, 0],
          [40, 0],
          [40, 100],
          [25, 100],
          [25, 40],
          [15, 40],
          [15, 100],
          [0, 100],
        ],
      },
      {
        id: "e",
        label: "",
        polygon: [
          [60, 0],
          [100, 0],
          [100, 100],
          [60, 100],
        ],
      },
    ],
    locations: [
      { id: "a", label: "", x: 20, y: 30, radius: 10 },
      { id: "b", label: "", x: 50, y: 50, radius: 0 },
      { id: "c", label: "", x: 75, y: 65, radius: 4 },
    ],
  });
  return { input };
}

function _assertEqualRadiusRecordsVisiblyOwnTheY({
  highlight,
  focusedLocationId,
}: Readonly<{
  highlight: ReturnType<typeof SvgAttributes.fromMarker>;
  focusedLocationId: string[][number];
}>): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: highlight, name: "y" }),
    focusedLocationId === "a" ? 315 : 377,
  );
}

function _assertEqualRadiusRecordsVisiblyOwnTheDataPossibility({
  markup,
  focusedLocationId,
}: Readonly<{
  markup: ReturnType<typeof _render>;
  focusedLocationId: string[][number];
}>): void {
  assert.ok(
    markup.includes(
      `data-possibility="${focusedLocationId === "a" ? "w" : "e"}" data-is-possible="true"`,
    ),
  );
}

function _assertEqualRadiusRecordsVisiblyOwnTheRTheFocusedPinHasAVisible(
  focusedPin: NonNullable<RegExpMatchArray[][number] | undefined>[number],
): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: focusedPin,
      name: "r",
    }),
    5,
    "The focused pin has a visible persistent ring",
  );
}

function _assertEqualRadiusRecordsVisiblyOwnTheR({
  pins,
  focusedLocationId,
}: Readonly<{
  pins: RegExpMatchArray[];
  focusedLocationId: string[][number];
}>): void {
  pins
    .filter((pin) => {
      return pin[1] !== focusedLocationId;
    })
    .forEach((pin) => {
      return assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: pin[0],
          name: "r",
        }),
        3,
      );
    });
}

function _assertConcaveNotchesOutsideRecordsAndDataDefinite(
  input: Input,
): void {
  assert.match(
    _render({ frame: 150, input: input }),
    /data-definite="1" data-unresolved="2"/,
  );
}

function _assertTouchingAndZeroRadiusBoundaryPinsFootprintR(): void {
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 0 }),
        marker: "footprint",
      }),
      name: "r",
    }),
    0,
  );
}

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(LocationUncertaintyBoundary, {
        frame,
        input,
        accent: "#46dbc9",
        id: "packet18",
      }),
    ),
  );
}
test("default footprints produce two definite and one unresolved assignment", () => {
  assert.ok(
    _render({ frame: 150 }).includes('data-definite="2" data-unresolved="1"'),
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    ...input.districts.map(prop("label")),
    ...input.locations.map(prop("label")),
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
  contract: locationUncertaintyBoundaryContract,
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
test("touching and zero-radius boundary pins stay unresolved regardless of footprint visibility", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    showOtherFootprints: false,
    locations: [
      { id: "a", label: "", x: 25, y: 35, radius: 0 },
      { id: "b", label: "", x: 50, y: 55, radius: 0 },
      { id: "c", label: "", x: 54, y: 65, radius: 4 },
    ],
  });
  assert.match(
    _render({ frame: 150, input: input }),
    /data-definite="1" data-unresolved="2"/,
  );
  assert.equal(
    (_render({ frame: 150, input: input }).match(/data-footprint=/g) ?? [])
      .length,
    1,
  );
  assert.equal(
    (
      _render({ frame: 150, input: input }).match(
        /data-accounting-bracket=/g,
      ) ?? []
    ).length,
    3,
  );
  _assertTouchingAndZeroRadiusBoundaryPinsFootprintR();
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 150 }),
        marker: "footprint",
      }),
      name: "r",
    }),
    10.8,
  );
});
test("concave notches, outside records and overlapping disks use whole-footprint containment", () => {
  const { input } = _makeConcaveNotchInput();
  _assertConcaveNotchesOutsideRecordsAndDataDefinite(input);
  const overlap = inputSchema.parse({
    ...DEFAULT_INPUT,
    locations: DEFAULT_INPUT.locations.map((item) => {
      return {
        ...item,
        x: 48,
        y: 55,
        radius: 8,
      };
    }),
  });
  assert.match(
    _render({ frame: 150, input: overlap }),
    /data-definite="0" data-unresolved="3"/,
  );
});
test("coincident locations retain separate visible keys with actual map connectors", () => {
  const input = {
    ...fixtures[2].input,
    locations: fixtures[2].input.locations.map((location) => {
      return {
        ...location,
        x: 48,
        y: 55,
        radius: 8,
      };
    }),
  };
  const markup = _render({ frame: 150, input: input });
  const connectors = [
    ...markup.matchAll(/<path\b[^>]*\bdata-location-connector[^>]+>/g),
  ];
  assert.equal(connectors.length, 6);
  connectors.forEach((match, index) => {
    return assert.match(
      match[0],
      new RegExp(`M222.8 338 L420 ${332 + index * 31 - 4}`),
    );
  });
  assert.equal((markup.match(/data-district-connector=/g) ?? []).length, 4);
});
test("possible-district marks distinguish touched districts from excluded districts", () => {
  const markup = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, focusedLocationId: "a" },
  });
  assert.match(markup, /data-possibility="w" data-is-possible="true"/);
  assert.match(markup, /data-possibility="e" data-is-possible="false"/);
});

test("equal-radius records visibly own the focused explanation with either footprint toggle", () => {
  [true, false].forEach((showOtherFootprints) => {
    ["a", "c"].forEach((focusedLocationId) => {
      const { input } = _makeEqualRadiusInput({
        focusedLocationId,
        showOtherFootprints,
      });
      const markup = _render({ frame: 150, input: input });
      const pins = [
        ...markup.matchAll(/<circle\b[^>]*\bdata-nominal-pin="([^"]*)"[^>]*>/g),
      ];
      const focusedPin = pins.find((pin) => {
        return pin[1] === focusedLocationId;
      })![0];
      _assertEqualRadiusRecordsVisiblyOwnTheRTheFocusedPinHasAVisible(
        focusedPin,
      );
      assert.match(focusedPin, /stroke-width="2"/);
      _assertEqualRadiusRecordsVisiblyOwnTheR({ pins, focusedLocationId });
      const highlight = SvgAttributes.fromMarker({
        markup,
        marker: "focused-record",
      });
      assert.ok(
        highlight.includes(`data-focused-record="${focusedLocationId}"`),
      );
      _assertEqualRadiusRecordsVisiblyOwnTheY({ highlight, focusedLocationId });
      assert.match(highlight, /stroke="#46dbc9"/);
      assert.equal((markup.match(/data-focused-record=/g) ?? []).length, 1);
      assert.equal(
        (markup.match(/data-footprint=/g) ?? []).length,
        showOtherFootprints ? 3 : 1,
      );
      _assertEqualRadiusRecordsVisiblyOwnTheDataPossibility({
        markup,
        focusedLocationId,
      });
      assert.match(markup, /data-definite="2" data-unresolved="1"/);
    });
  });
});
