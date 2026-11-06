import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { SharedJigPreparation } from "./SharedJigPreparation";
import { sharedJigPreparationContract } from "./SharedJigPreparation.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "./SharedJigPreparation.fixtures";
import { inputSchema, type Input } from "./SharedJigPreparation.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(SharedJigPreparation, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
const render: ({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>) => string = _render;
test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) =>
    assert.deepEqual(inputSchema.parse(input), input),
  );
  invalidInputs.forEach((input) =>
    assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    ),
  );
});
test("one guide leaves matching marks on each existing workpiece exactly once", () => {
  const input = FIXTURES[3].input;
  const setup = render({ frame: 30, input: input }),
    hold = render({ frame: 150, input: input });
  assert.equal((hold.match(/data-guide="one"/g) || []).length, 1);
  assert.equal((setup.match(/data-workpiece=/g) || []).length, 3);
  assert.equal((hold.match(/data-workpiece=/g) || []).length, 3);
  assert.equal((setup.match(/data-application=/g) || []).length, 0);
  assert.equal((hold.match(/data-application=/g) || []).length, 3);
  assert.equal((hold.match(/data-corner-mark=/g) || []).length, 4);
});

import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.makerLabel,
    input.guide.label,
    ...input.collaborators.flatMap(({ label, workpieceLabel }) => [
      label,
      workpieceLabel,
    ]),
    input.labels.example,
    frame < 49
      ? input.labels.prepare
      : frame < 131
        ? input.labels.apply
        : input.labels.retained,
  ];
}
const EXCLUDED_TEXT_FIELDS: string[] = [
  "id",
  "pattern",
  "kind",
  "workpieceMaterial",
  "transferState",
  "enclosure",
  "targetModuleId",
  "source",
  "destination",
  "category",
  "measure",
  "question",
  "selectedCategory",
  "columnIds",
  "cachedColumnIds",
  "keyColumnId",
  "cells",
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs,
  contract: sharedJigPreparationContract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: options.contract,
  suppliedInputs: FIXTURES.map(prop("input")),
  expectedTextPaths: [
    ["makerLabel"],
    ["guide", "label"],
    ["collaborators", 0, "label"],
    ["collaborators", 0, "workpieceLabel"],
    ["collaborators", 1, "label"],
    ["collaborators", 1, "workpieceLabel"],
    ["labels", "prepare"],
    ["labels", "apply"],
    ["labels", "retained"],
    ["labels", "example"],
  ],
});

test("guide carries with a contacting hand and applications follow every input station in order", () => {
  ["two-holes", "corner-mark"].forEach((pattern) => {
    const input = inputSchema.parse({
      ...FIXTURES[3].input,
      guide: { ...DEFAULT_INPUT.guide, pattern },
    });
    const duration = 73 / input.collaborators.length;
    input.collaborators.forEach(({ id }, index) => {
      const before = render({
        frame: 49 + index * duration + duration * 0.6,
        input: input,
      });
      const after = render({
        frame: 49 + index * duration + duration * 0.8,
        input: input,
      });
      assert.equal((before.match(/data-application=/g) || []).length, index);
      assert.equal((after.match(/data-application=/g) || []).length, index + 1);
      assert.ok(after.includes(`data-marking-hand="${id}"`));
    });
    [49, 55, 70, 90, 110, 124, 127, 150].forEach((frame) => {
      const markup = render({ frame: frame, input: input }),
        hand = SvgAttributes.fromMarker({ markup, marker: "guide-hand" });
      const body = SvgAttributes.fromMarker({ markup, marker: "guide-body" });
      const coordinates = body.match(/d="M([^ ]+) ([^ ]+) /);
      assert.ok(coordinates);
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        Number(coordinates[1]),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        Number(coordinates[2]) + 32,
      );
      assert.ok(
        markup.indexOf("data-guide-body=") < markup.indexOf("data-guide-hand="),
      );
    });
  });
});
test("guide caption follows the single moving guide instead of staying at its source", () => {
  const first = render({ frame: 30, input: DEFAULT_INPUT }),
    travelling = render({ frame: 90, input: DEFAULT_INPUT });
  const label = (markup: string) =>
    markup.match(/<text[^>]*aria-label="Marking guide"[^>]*>/)?.[0] ?? "";
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: label(first), name: "x" }),
    SvgAttributes.getNumberFromMarkup({
      attributes: label(travelling),
      name: "x",
    }),
  );
});

test("marking hands contact the selected cutout and paint above the opaque guide", () => {
  ["two-holes", "corner-mark"].forEach((pattern) => {
    FIXTURES.forEach(({ input: fixture }) => {
      const input = inputSchema.parse({
        ...fixture,
        guide: { ...fixture.guide, pattern },
      });
      const duration = 73 / input.collaborators.length;
      input.collaborators.forEach(({ id }, index) => {
        const markup = render({
          frame: 49 + (index + 0.8) * duration,
          input: input,
        });
        const guide = SvgAttributes.fromMarker({
          markup,
          marker: "guide-body",
        });
        const origin = guide.match(/d="M([^ ]+) ([^ ]+) /);
        assert.ok(origin);
        const hand = SvgAttributes.fromMarker({
          markup,
          marker: "marking-hand",
        });
        const x =
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }) -
          Number(origin[1]);
        const y =
          SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }) -
          Number(origin[2]);
        const radius = SvgAttributes.getNumberFromMarkup({
          attributes: hand,
          name: "r",
        });
        assert.ok(
          markup.indexOf(hand) > markup.indexOf(guide),
          `${pattern}: marking hand is painted under guide`,
        );
        assert.ok(hand.includes(`data-marking-hand="${id}"`));
        const tool = SvgAttributes.fromMarker({
          markup,
          marker: "marking-tool",
        });
        const arm = SvgAttributes.fromMarker({ markup, marker: "marking-arm" });
        const handX = SvgAttributes.getNumberFromMarkup({
            attributes: hand,
            name: "cx",
          }),
          handY = SvgAttributes.getNumberFromMarkup({
            attributes: hand,
            name: "cy",
          });
        const patternMarkup = markup.slice(markup.indexOf(guide));
        const contact = tool.match(/ L([^ ]+) ([^" ]+)"/);
        assert.ok(contact);
        if (pattern === "corner-mark") {
          const mark = SvgAttributes.fromMarker({
            markup: patternMarkup,
            marker: "corner-mark",
          });
          const corner = mark.match(/d="M([^ ]+) ([^ ]+) h([^ ]+) v([^" ]+)"/);
          assert.ok(corner);
          assert.equal(
            Number(contact[1]),
            Number(corner[1]) + Number(corner[3]),
          );
          assert.equal(Number(contact[2]), Number(corner[2]));
        } else {
          const holes = [
            ...patternMarkup.matchAll(
              /<circle[^>]*data-hole-mark="true"[^>]*>/g,
            ),
          ];
          assert.ok(
            holes.some(
              ([hole]) =>
                Math.hypot(
                  handX -
                    SvgAttributes.getNumberFromMarkup({
                      attributes: hole,
                      name: "cx",
                    }),
                  handY -
                    SvgAttributes.getNumberFromMarkup({
                      attributes: hole,
                      name: "cy",
                    }),
                ) +
                  radius <=
                SvgAttributes.getNumberFromMarkup({
                  attributes: hole,
                  name: "r",
                }),
            ),
          );
          assert.equal(Number(contact[1]), handX);
          assert.equal(Number(contact[2]), handY);
        }
        assert.ok(arm.includes(`L${handX} ${handY}`));
        assert.ok(markup.indexOf(arm) > markup.indexOf(guide));
        assert.ok(markup.indexOf(tool) > markup.indexOf(guide));
        if (pattern === "corner-mark") {
          assert.ok(
            x - radius >= 0 &&
              x + radius <= 22 &&
              y - radius >= 0 &&
              y + radius <= 22,
            `corner hand [${x}, ${y}] misses notch`,
          );
        } else {
          assert.ok(
            Math.min(Math.hypot(x - 30, y - 32), Math.hypot(x - 70, y - 32)) +
              radius <=
              7,
          );
        }
      });
    });
  });
});
