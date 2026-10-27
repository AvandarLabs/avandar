import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { ParcelSetbackInset } from "./ParcelSetbackInset";
import {
  defaultInput,
  fixtures,
  invalidInputs,
} from "./ParcelSetbackInset.fixtures";

test("Inset every rectangular side by the supplied clearance. Default envelopes are 27 by 52 units. Reject a structure footprint extending beyond its chosen envelope; exhausted unchosen envelopes remain empty, never negative.", () => {
  const markup = _render({ frame: 150 });
  assert.match(markup, /data-envelope-width="27" data-envelope-height="52"/);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { parcelSetbackInsetContract } from "./ParcelSetbackInset.contract";
import { inputSchema, type Input } from "./ParcelSetbackInset.schema";

function _render({
  frame,
  input = defaultInput,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ParcelSetbackInset, {
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
    ...input.parcels.map(prop("label")),
    input.structure.label,
    input.copy.context,
    input.copy.parcel,
    input.copy.envelope,
    input.copy.clearance,
    input.copy.unit,
    ...(input.parcels.some(
      (parcel) =>
        parcel.width <= 2 * input.setback || parcel.height <= 2 * input.setback,
    )
      ? [input.copy.empty]
      : []),
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
  contract: parcelSetbackInsetContract,
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
test("every envelope side moves inward equally while the complete footprint lowers", () => {
  const early = SvgAttributes.fromMarker({
    markup: _render({ frame: 0 }),
    marker: "envelope",
  });
  const late = SvgAttributes.fromMarker({
    markup: _render({ frame: 150 }),
    marker: "envelope",
  });
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: late, name: "x" }) -
        SvgAttributes.getNumberFromMarkup({ attributes: early, name: "x" }) -
        19.2,
    ) < 1e-12,
  );
  assert.ok(
    Math.abs(
      SvgAttributes.getNumberFromMarkup({ attributes: late, name: "y" }) -
        SvgAttributes.getNumberFromMarkup({ attributes: early, name: "y" }) -
        11.2,
    ) < 1e-12,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: late, name: "width" }),
    27 * 4.8,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: late, name: "height" }),
    52 * 2.8,
  );
  const lifted = SvgAttributes.fromMarker({
    markup: _render({ frame: 84 }),
    marker: "structure-footprint",
  });
  const seated = SvgAttributes.fromMarker({
    markup: _render({ frame: 108 }),
    marker: "structure-footprint",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: seated, name: "y" }) -
      SvgAttributes.getNumberFromMarkup({ attributes: lifted, name: "y" }),
    32,
  );
});
test("zero setback and exact fits are accepted while full-footprint overflow is rejected", () => {
  const exact = inputSchema.parse({
    ...defaultInput,
    structure: { ...defaultInput.structure, width: 27, height: 50 },
    placement: { ...defaultInput.placement, centerY: 45 },
  });
  assert.match(
    _render({ frame: 150, input: exact }),
    /data-envelope-width="27"/,
  );
  assert.equal(
    inputSchema.safeParse({
      ...exact,
      structure: { ...exact.structure, width: 28 },
    }).success,
    false,
  );
  const zero = inputSchema.parse({ ...defaultInput, setback: 0 });
  assert.match(
    _render({ frame: 150, input: zero }),
    /data-envelope-width="35" data-envelope-height="60"/,
  );
  const exhausted = inputSchema.parse({
    ...defaultInput,
    parcels: [
      { ...defaultInput.parcels[0], width: 5, height: 5 },
      defaultInput.parcels[1],
    ],
  });
  assert.match(
    _render({ frame: 150, input: exhausted }),
    /data-envelope-width="0" data-envelope-height="0"/,
  );
  assert.match(
    _render({ frame: 150, input: exhausted }),
    /aria-label="No remaining envelope"/,
  );
});
test("dimension toggles cover original, inset and footprint rectangles without hiding clearance", () => {
  assert.equal(
    (_render({ frame: 150 }).match(/data-dimension-ticks=/g) ?? []).length,
    5,
  );
  const hidden = _render({
    frame: 150,
    input: { ...defaultInput, showDimensions: false },
  });
  assert.doesNotMatch(hidden, /data-dimension-ticks=/);
  assert.equal((hidden.match(/data-original-parcel=/g) ?? []).length, 2);
  [0, 36, 72, 84, 96, 108, 150].forEach((frame) => {
    const footprint = SvgAttributes.fromMarker({
      markup: _render({ frame: frame }),
      marker: "structure-footprint",
    });
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: footprint,
      name: "x",
    });
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: footprint,
      name: "y",
    });
    assert.ok(
      x >= 69 &&
        x +
          SvgAttributes.getNumberFromMarkup({
            attributes: footprint,
            name: "width",
          }) <=
          551,
    );
    assert.ok(
      y >= 127 &&
        y +
          SvgAttributes.getNumberFromMarkup({
            attributes: footprint,
            name: "height",
          }) <=
          441,
    );
  });
});

import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";

type TextBox = {
  text: string;
  left: number;
  right: number;
  top: number;
  bottom: number;
};
function _getTextBoxes(markup: string): TextBox[] {
  return [...markup.matchAll(/<text\b([^>]*)>([\s\S]*?)<\/text>/g)].map(
    ([, attributes, content]) => {
      const fontSize = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "font-size",
      });
      const left = SvgAttributes.getNumberFromMarkup({ attributes, name: "x" });
      const baseline = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "y",
      });
      const spans = [...content.matchAll(/<tspan\b([^>]*)>([^<]*)<\/tspan>/g)];
      assert.ok(spans.length > 0, "Expected explicit emitted FitText lines");
      const width = Math.max(
        ...spans.map(([, , text]) =>
          getConservativeWidthFromText({ text, fontSize }),
        ),
      );
      const lineOffset = spans.reduce(
        (sum, [, span]) =>
          sum +
          SvgAttributes.getNumberFromMarkup({ attributes: span, name: "dy" }),
        0,
      );
      return {
        text: content,
        left,
        right: left + width,
        top: baseline - fontSize,
        bottom: baseline + lineOffset + fontSize * 0.3,
      };
    },
  );
}
function _assertTextSeparation(markup: string): void {
  const boxes = _getTextBoxes(markup);
  boxes.forEach((first, index) =>
    boxes.slice(index + 1).forEach((second) => {
      assert.ok(
        first.right <= second.left ||
          second.right <= first.left ||
          first.bottom <= second.top ||
          second.bottom <= first.top,
        `Overlapping emitted text bounds: ${JSON.stringify(first)} and ${JSON.stringify(second)}`,
      );
    }),
  );
}
const longNumericInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    ...defaultInput,
    setback: 4.123456789012345,
    parcels: defaultInput.parcels.map((parcel) => ({
      ...parcel,
      width: 35.12345678901234,
      height: 60.12345678901234,
    })),
  });
const emptyEnvelopeInput: ReturnType<typeof inputSchema.parse> =
  inputSchema.parse({
    ...fixtures[2].input,
    parcels: fixtures[2].input.parcels.map((parcel, index) =>
      index === 1
        ? parcel
        : { ...parcel, width: 5.123456789012345, height: 5.123456789012345 },
    ),
    copy: {
      ...fixtures[2].input.copy,
      empty: `${"W".repeat(13)} ${"W".repeat(13)} ${"W".repeat(12)}`,
    },
  });
[
  { id: "default", input: defaultInput },
  { id: "dense", input: fixtures[2].input },
  { id: "long numeric", input: longNumericInput },
  { id: "empty envelope", input: emptyEnvelopeInput },
].forEach(({ id, input }) =>
  test(`parcel ${id} labels have separate emitted text bounds`, () => {
    [0, 36, 72, 108, 150, 179].forEach((frame) =>
      _assertTextSeparation(_render({ frame: frame, input: input })),
    );
  }),
);
