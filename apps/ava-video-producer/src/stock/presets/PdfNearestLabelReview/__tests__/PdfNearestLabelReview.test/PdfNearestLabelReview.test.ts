import { PdfNearestLabelReviewTestState } from "./PdfNearestLabelReviewTestState";

const {
  markedShape: _markedShape,
  render: _render,
  options,
} = PdfNearestLabelReviewTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { pdfNearestLabelReviewContract } from "../../PdfNearestLabelReview.contract";
import { DEFAULT_INPUT, fixtures } from "../../PdfNearestLabelReview.fixtures";
import { inputSchema } from "../../PdfNearestLabelReview.schema";
import { assertCornerExtractionRowsKeepX as _assertCornerExtractionRowsKeepX } from "./assertCornerExtractionRowsKeepX";
import { assertDistanceGuidesExtendActualGuide as _assertDistanceGuidesExtendActualGuide } from "./assertDistanceGuidesExtendActualGuide";

test("a close runner up flags ambiguity and human choice preserves the original token and distances", () => {
  const hold = _render({ frame: 150 });
  const state = _markedShape({ markup: hold, marker: "association-state" });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: state,
      name: "data-distance-ratio",
    }) > 0.8,
  );
  assert.match(hold, /data-ambiguous="true"/);
  assert.match(hold, /data-chosen-label="west"/);
  const farther = _render({ frame: 150, input: fixtures[3].input });
  assert.match(farther, /data-chosen-label="east"/);
  assert.ok(farther.includes('data-source-token=" 24\t"'));
  const hiddenState = _markedShape({
    markup: farther,
    marker: "association-state",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: hiddenState,
      name: "data-distance-ratio",
    }),
    SvgAttributes.getNumberFromMarkup({
      attributes: state,
      name: "data-distance-ratio",
    }),
  );
  assert.doesNotMatch(farther, /data-distance-value=/);
  assert.match(farther, /data-ambiguous="true"/);
});

test("null remains unresolved while an empty reviewed ID accepts its actual label", () => {
  assert.match(
    _render({ frame: 150, input: fixtures[4].input }),
    /data-unresolved="true"/,
  );
  const input = { ...fixtures[1].input, reviewedLabelId: "" };
  const hold = _render({ frame: 150, input: input });
  assert.match(hold, /data-chosen-label=""/);
  assert.match(hold, /data-unresolved="false"/);
  assert.match(hold, /data-distance-ratio="1"/);
});

test("distance guides extend from actual anchors before the selected row travels", () => {
  const figure = (frame: number) => {
    return _markedShape({
      markup: _render({ frame: frame }),
      marker: "source-figure",
    });
  };
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: figure(50), name: "cx" }),
    250,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: figure(50), name: "cy" }),
    320,
  );
  const guide = (frame: number) => {
    return _markedShape({
      markup: _render({ frame: frame }),
      marker: "distance-guide",
    });
  };
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guide(51), name: "x2" }),
    250,
  );
  _assertDistanceGuidesExtendActualGuide(guide);
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
  contract: pdfNearestLabelReviewContract,
  expectedTextPaths: [
    ["labels", 0, "text"],
    ["labels", 1, "text"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});

test("threshold equality and distance ties remain ambiguous independently of human choice", () => {
  const input = {
    ...DEFAULT_INPUT,
    figure: { text: "24", x: 50, y: 50 },
    labels: [
      { id: "near", text: "Near", x: 54, y: 50 },
      { id: "far", text: "Far", x: 55, y: 50 },
    ],
    reviewedLabelId: "far",
    ambiguityThreshold: 0.8,
  };
  const hold = _render({ frame: 150, input: input });
  assert.match(hold, /data-distance-ratio="0.8"/);
  assert.match(hold, /data-ambiguous="true"/);
  assert.match(hold, /data-chosen-label="far"/);
  assert.match(hold, /data-literal-value="≈ 4.00"/);
  assert.match(hold, /data-literal-value="≈ 5.00"/);
  const tie = _render({
    frame: 150,
    input: { ...fixtures[1].input, ambiguityThreshold: 1 },
  });
  assert.match(tie, /data-distance-ratio="1"/);
  assert.match(tie, /data-ambiguous="true"/);
  assert.match(tie, /data-unresolved-bracket=/);
});

test("coincident candidate anchors retain separate keyed rails and positive near-zero distance values", () => {
  const input = {
    ...DEFAULT_INPUT,
    figure: { text: "24", x: 95, y: 95 },
    labels: [
      { id: "a", text: "First", x: 95, y: 95 - 1e-13 },
      { id: "b", text: "Second", x: 95, y: 95 - 1e-13 },
    ],
    reviewedLabelId: "b",
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const hold = _render({ frame: 150, input: input });
  assert.equal((hold.match(/data-label-anchor=/g) ?? []).length, 2);
  assert.match(hold, /data-candidate-label="a"/);
  assert.match(hold, /data-candidate-label="b"/);
  const values = [...hold.matchAll(/data-literal-value="≈ ([\d.e+-]+)"/g)].map(
    ([, value]) => {
      return Number(value);
    },
  );
  assert.equal(values.length, 3);
  assert.ok(
    values.every((value) => {
      return value > 0;
    }),
  );
  assert.ok(values[0] < 1e-12 && values[1] < 1e-12);
  const guides = [
    ...hold.matchAll(/<g data-distance-guide[^>]*><line[^>]+>/g),
  ].map(([tag]) => {
    return tag;
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guides[0], name: "x2" }),
    385,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guides[0], name: "y2" }),
    170 + input.labels[0].y * 3,
  );
});

test("corner extraction rows keep complete text clear of source anchors guides and ratio copy", () => {
  [
    [5, 5],
    [95, 95],
    [5, 95],
    [95, 5],
  ].forEach(([x, y]) => {
    return _assertCornerExtractionRowsKeepX({ x, y });
  });
});
