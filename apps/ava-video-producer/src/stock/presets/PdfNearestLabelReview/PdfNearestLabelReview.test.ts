import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { PdfNearestLabelReview } from "./PdfNearestLabelReview";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./PdfNearestLabelReview.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>): string {
  return renderToStaticMarkup(
    createElement(PdfNearestLabelReview, {
      frame,
      input,
      accent: "#9fefca",
      id: "packet26",
    }),
  );
}

test("a close runner up flags ambiguity and human choice preserves the original token and distances", () => {
  const hold = _render({ frame: 150 });
  const state = SvgAttributes.fromMarker({
    markup: hold,
    marker: "association-state",
  });
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
  const hiddenState = SvgAttributes.fromMarker({
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
  const figure = (frame: number) =>
    SvgAttributes.fromMarker({
      markup: _render({ frame: frame }),
      marker: "source-figure",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: figure(50), name: "cx" }),
    250,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: figure(50), name: "cy" }),
    320,
  );
  const guide = (frame: number) =>
    SvgAttributes.fromMarker({
      markup: _render({ frame: frame }),
      marker: "distance-guide",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guide(51), name: "x2" }),
    250,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: guide(75), name: "x2" }) <
      250 &&
      SvgAttributes.getNumberFromMarkup({ attributes: guide(75), name: "x2" }) >
        205,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: guide(95), name: "x2" }),
    205,
  );
  const row = (frame: number) =>
    SvgAttributes.fromMarker({
      markup: _render({ frame: frame }),
      marker: "extracted-row",
    });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: row(115), name: "x" }) <
      588 &&
      SvgAttributes.getNumberFromMarkup({ attributes: row(115), name: "x" }) >
        540,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: row(139), name: "x" }),
    540,
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgPaintAssertions } from "../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { pdfNearestLabelReviewContract } from "./PdfNearestLabelReview.contract";
import { inputSchema, type Input } from "./PdfNearestLabelReview.schema";
function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    ...Object.values(input.copy),
    input.figure.text,
    ...input.labels.map(prop("text")),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: pdfNearestLabelReviewContract,
  render: _render,
  excludedTextFields: ["id", "reviewedLabelId", "text"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [52, 105, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
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
    ([, value]) => Number(value),
  );
  assert.equal(values.length, 3);
  assert.ok(values.every((value) => value > 0));
  assert.ok(values[0] < 1e-12 && values[1] < 1e-12);
  const guides = [...hold.matchAll(/<line[^>]+data-distance-guide[^>]+>/g)].map(
    ([tag]) => tag,
  );
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
  ].forEach(([x, y]) =>
    [true, false].forEach((showDistanceValues) => {
      const input = {
        ...DEFAULT_INPUT,
        figure: { text: "界".repeat(12), x, y },
        labels: [
          {
            id: "far",
            text: "界".repeat(20),
            x: x === 5 ? 95 : 5,
            y: y === 5 ? 95 : 5,
          },
          { id: "near", text: "界".repeat(20), x: x === 5 ? 95 : 5, y },
        ],
        reviewedLabelId: "far",
        showDistanceValues,
        copy: {
          ...DEFAULT_INPUT.copy,
          result: `界 ${"界".repeat(23)} ${"界".repeat(8)}`,
        },
      };
      [96.5, 103, 108, 118, 130, 139, 150].forEach((frame) => {
        const markup = _render({ frame: frame, input: input });
        const row = SvgAttributes.fromMarker({
          markup,
          marker: "extracted-row",
        });
        const left = SvgAttributes.getNumberFromMarkup({
            attributes: row,
            name: "x",
          }),
          right =
            left +
            SvgAttributes.getNumberFromMarkup({
              attributes: row,
              name: "width",
            }),
          top = SvgAttributes.getNumberFromMarkup({
            attributes: row,
            name: "y",
          }),
          bottom =
            top +
            SvgAttributes.getNumberFromMarkup({
              attributes: row,
              name: "height",
            });
        assert.ok(
          left > 460 + 8,
          `row covers retained source at ${x},${y}, frame ${frame}`,
        );
        const rowMarkup = markup
          .slice(markup.indexOf(row))
          .split("data-review-choice=")[0];
        const texts = [
          ...rowMarkup.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g),
        ].map(([text]) => text);
        assert.equal(texts.length, 3);
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: `<g transform="translate(${-left} ${-top})">${texts.join("")}</g>`,
          width: right - left,
          height: bottom - top,
        });
        [...markup.matchAll(/<line[^>]*data-distance-guide[^>]*>/g)].forEach(
          ([guide]) => {
            const guideRight =
              Math.max(
                SvgAttributes.getNumberFromMarkup({
                  attributes: guide,
                  name: "x1",
                }),
                SvgAttributes.getNumberFromMarkup({
                  attributes: guide,
                  name: "x2",
                }),
              ) + 1;
            assert.ok(guideRight < left);
          },
        );
        if (showDistanceValues) {
          const ratio = markup.slice(markup.indexOf("data-ratio-value="));
          const ratioTexts = [...ratio.matchAll(/<text[^>]*>[\s\S]*?<\/text>/g)]
            .slice(0, 2)
            .map(([text]) => text);
          assert.equal(ratioTexts.length, 2);
          SvgPaintAssertions.assertTextCanvasBounds({
            markup: `<g transform="translate(-60 -490)">${ratioTexts.join("")}</g>`,
            width: 400,
            height: 80,
          });
          assert.ok(left > 460);
        }
        const title = [
          ...markup.matchAll(/(<text[^>]*>)[\s\S]*?<\/text>/g),
        ].find(([block]) =>
          block.includes(`aria-label="${input.copy.result}"`),
        );
        assert.ok(title);
        SvgPaintAssertions.assertTextCanvasBounds({
          markup: `<g transform="translate(-540 -377)">${title[0]}</g>`,
          width: 360,
          height: 61,
        });
        assert.ok(top - 0.5 > 438);
        const choice = SvgAttributes.fromMarker({
          markup,
          marker: "review-choice",
        });
        assert.ok(choice.includes(`H${right + 8} V${top} H${right}`));
        assert.ok(right + 9 < 960);
        const link = SvgAttributes.fromMarker({
          markup,
          marker: "extracted-source-link",
        });
        const route = link.match(
          /d="M([\d.]+) ([\d.]+) H([\d.]+) V([\d.]+) H([\d.]+)"/,
        );
        assert.ok(route, "source link follows the clear exterior lane");
        assert.equal(Number(route[1]), 100);
        assert.equal(Number(route[2]), 153);
        assert.ok(Number(route[3]) > 492 + 8 && Number(route[3]) < left);
        assert.equal(Number(route[4]), bottom);
        assert.equal(Number(route[5]), left);
      });
    }),
  );
});
