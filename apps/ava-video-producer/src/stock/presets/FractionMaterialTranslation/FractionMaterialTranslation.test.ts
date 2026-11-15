/** Behavioral conservation and physical choreography assertions. */
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { FractionMaterialTranslation } from "./FractionMaterialTranslation";
import {
  changedInput,
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  denseInput,
  minimumInput,
} from "./FractionMaterialTranslation.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(FractionMaterialTranslation, {
      frame,
      input,
      accent: "#81d7bd",
      id: "packet15",
    }),
  );
}
test("all physical materials select the same numerator and denominator", () => {
  const markup = _render({ frame: 150, input: changedInput });
  changedInput.representations.forEach((representation) => {
    const pieces = [
      ...markup.matchAll(
        new RegExp(
          `data-piece-owner="${representation.id}"[^>]*data-selected="(true|false)"`,
          "g",
        ),
      ),
    ];
    assert.equal(pieces.length, 8);
    assert.equal(pieces.filter((piece) => piece[1] === "true").length, 8);
  });
  assert.equal([...markup.matchAll(/aria-label="8 \/ 8"/g)].length, 4);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { fractionMaterialTranslationContract as contract } from "./FractionMaterialTranslation.contract";
import { inputSchema, type Input } from "./FractionMaterialTranslation.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.lessonLabel,
    input.caption,
    ...input.representations.flatMap((representation) => [
      representation.learnerLabel,
      representation.materialLabel,
    ]),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "material", "resolvedArrangement"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
test("learner hands actually contact their selected material during the operation", () => {
  const markup = _render({
    frame: 60,
    input: {
      ...denseInput,
      resolvedArrangement: "separate-desks",
    },
  });
  const hand = markup.match(/data-material-hand="counters"[^>]*d="([^"]+)"/);
  const piece = markup.match(
    /<circle[^>]*data-piece-owner="counters"[^>]*cx="([^"]+)"[^>]*cy="([^"]+)"[^>]*r="([^"]+)"/,
  );
  assert.ok(hand);
  assert.ok(piece);
  const numbers = hand[1].match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  assert.ok(Math.abs(numbers.at(-2)! - (480 + Number(piece[1]))) < 0.001);
  assert.ok(
    Math.abs(numbers.at(-1)! - (330 + Number(piece[2]) - Number(piece[3]))) <
      0.001,
  );
});
test("all material choices and arrangements derive selection from one fraction", () => {
  (["shared-table", "separate-desks"] as const).forEach(
    (resolvedArrangement) => {
      [1, 8].forEach((numerator) => {
        [true, false].forEach((showFractionNotation) => {
          [
            denseInput.representations,
            ...denseInput.representations.map((_, index) =>
              denseInput.representations.filter(
                (_representation, otherIndex) => index !== otherIndex,
              ),
            ),
          ].forEach((representations) => {
            const input = {
              ...denseInput,
              fraction: { numerator, denominator: 8 },
              resolvedArrangement,
              showFractionNotation,
              representations,
            };
            const markup = _render({ frame: 150, input: input });
            representations.forEach((representation) => {
              const pieces = [
                ...markup.matchAll(
                  new RegExp(
                    `data-piece-owner="${representation.id}" data-selected="(true|false)"`,
                    "g",
                  ),
                ),
              ];
              assert.equal(pieces.length, 8);
              assert.equal(
                pieces.filter((piece) => piece[1] === "true").length,
                numerator,
              );
            });
            assert.equal(
              [
                ...markup.matchAll(
                  new RegExp(`aria-label="${numerator} / 8"`, "g"),
                ),
              ].length,
              showFractionNotation ? representations.length + 1 : 0,
            );
          });
        });
      });
    },
  );
});
test("surface motion preserves separate learners and full material clearance", () => {
  const initial = _render({ frame: 24, input: denseInput });
  const resolved = _render({ frame: 150, input: denseInput });
  const surfaces = (markup: string) =>
    [
      ...markup.matchAll(
        /data-work-surface="[^"]+" transform="translate\(([-.\d]+) ([-.\d]+)\)"/g,
      ),
    ].map((match) => [Number(match[1]), Number(match[2])]);
  assert.notDeepEqual(surfaces(initial), surfaces(resolved));
  assert.deepEqual(
    surfaces(
      _render({
        frame: 150,
        input: { ...denseInput, resolvedArrangement: "separate-desks" },
      }),
    ),
    surfaces(initial),
  );
  [
    0, 35.999, 36, 36.001, 60, 83.999, 84, 84.001, 87.999, 88, 88.001, 100,
    107.999, 108, 108.001, 150,
  ].forEach((frame) => {
    const markup = _render({ frame: frame, input: denseInput });
    const positions = surfaces(markup);
    assert.equal([...markup.matchAll(/data-fraction-learner=/g)].length, 3);
    positions.forEach(([x, y], index) => {
      assert.ok(x - 110 >= 0 && x + 110 <= 960 && y - 46 > 200 && y + 81 < 448);
      if (index > 0) {
        assert.ok(x - positions[index - 1][0] > 220);
      }
    });
  });
});
test("fraction schemas forbid contradictory equal-part counts and duplicate materials", () => {
  [
    undefined,
    {},
    {
      ...DEFAULT_INPUT,
      representations: [
        DEFAULT_INPUT.representations[0],
        { ...DEFAULT_INPUT.representations[0], id: "different" },
      ],
    },
    {
      ...DEFAULT_INPUT,
      fraction: { numerator: 1, denominator: 2, extra: true },
    },
    { ...minimumInput, lessonLabel: "x".repeat(37) },
  ].forEach((value) =>
    assert.equal(inputSchema.safeParse(value).success, false),
  );
  assert.ok(
    contract.semanticRules.some(
      (rule) =>
        rule.paths.includes("fraction.numerator") &&
        rule.description.includes("1..denominator"),
    ),
  );
});
