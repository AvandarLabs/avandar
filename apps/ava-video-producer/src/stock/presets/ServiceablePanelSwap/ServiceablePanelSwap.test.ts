import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ServiceablePanelSwap } from "./ServiceablePanelSwap";
import { serviceablePanelSwapContract } from "./ServiceablePanelSwap.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  invalidInputs,
} from "./ServiceablePanelSwap.fixtures";
import { inputSchema, type Input } from "./ServiceablePanelSwap.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(ServiceablePanelSwap, {
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
test("every target slot swaps one module while original neighbors retain geometry", () => {
  FIXTURES[2].input.modules.forEach((target) => {
    const input = {
      ...FIXTURES[2].input,
      replacement: {
        ...FIXTURES[2].input.replacement,
        targetModuleId: target.id,
      },
    };
    const setup = render({ frame: 30, input: input }),
      hold = render({ frame: 150, input: input });
    input.modules
      .filter(({ id }) => id !== target.id)
      .forEach(({ id }) => {
        const before = setup.match(
          new RegExp(`<rect[^>]*data-module="${id}"[^>]*>`),
        )?.[0];
        const after = hold.match(
          new RegExp(`<rect[^>]*data-module="${id}"[^>]*>`),
        )?.[0];
        assert.ok(before);
        assert.equal(after, before);
      });
    assert.ok(hold.includes(`data-removed-original="${target.id}"`));
    const connector = SvgAttributes.fromMarker({
      markup: hold,
      marker: "connector",
    });
    const replacement = SvgAttributes.fromMarker({
      markup: hold,
      marker: "replacement",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: connector, name: "x" }),
      SvgAttributes.getNumberFromMarkup({
        attributes: replacement,
        name: "x",
      }) + 68,
    );
  });
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.workerLabel,
    ...input.modules.map(prop("label")),
    input.replacement.label,
    input.labels.whole,
    input.labels.retained,
    input.labels.example,
    ...(frame >= 117 ? [input.labels.changed, input.labels.removed] : []),
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
  contract: serviceablePanelSwapContract,
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
    ["modules", 0, "label"],
    ["modules", 1, "label"],
    ["modules", 2, "label"],
    ["replacement", "label"],
    ["workerLabel"],
    ["labels", "whole"],
    ["labels", "changed"],
    ["labels", "retained"],
    ["labels", "removed"],
    ["labels", "example"],
  ],
});

test("the worker contacts the moving original, replacement and target latch", () => {
  const input = FIXTURES[2].input;
  [80, 84, 90, 96, 100, 106, 109].forEach((frame) => {
    const markup = render({ frame: frame, input: input }),
      hand = SvgAttributes.fromMarker({ markup, marker: "service-hand" });
    const object =
      frame < 95
        ? markup.match(
            new RegExp(
              `<rect[^>]*data-module="${input.replacement.targetModuleId}"[^>]*>`,
            ),
          )?.[0]
        : SvgAttributes.fromMarker({ markup, marker: "replacement" });
    assert.ok(object);
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "x" }) +
        136,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: object, name: "y" }),
    );
  });
  [30, 55, 79, 90, 110, 150].forEach((frame) => {
    const markup = render({ frame: frame, input: input });
    assert.equal(
      SvgAttributes.fromMarker({ markup, marker: "enclosure" }),
      SvgAttributes.fromMarker({
        markup: render({ frame: 30, input: input }),
        marker: "enclosure",
      }),
    );
    input.modules
      .filter(({ id }) => id !== input.replacement.targetModuleId)
      .forEach(({ id }) => {
        const extract = (svg: string) =>
          svg.match(new RegExp(`<rect[^>]*data-module="${id}"[^>]*>`))?.[0];
        assert.equal(
          extract(markup),
          extract(render({ frame: 30, input: input })),
        );
      });
  });
  const open = SvgAttributes.fromMarker({
      markup: render({ frame: 78, input: input }),
      marker: "service-latch",
    }),
    closed = SvgAttributes.fromMarker({
      markup: render({ frame: 150, input: input }),
      marker: "service-latch",
    });
  assert.notEqual(open, closed);
});

test("the complete removed-original caption clears the enclosure", async () => {
  const { serviceablePanelSwapContract: correctionContract } =
    await import("./ServiceablePanelSwap.contract");
  const { ServiceablePanelSwap: Component } =
    await import("./ServiceablePanelSwap");
  const { SvgPaintAssertions } =
    await import("../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  Array.from([
    correctionContract.defaultInput,
    correctionContract.fixtures.find(propEq("id", "dense"))!.input,
  ]).forEach((source) => {
    const input = { ...source };
    const markup = renderToStaticMarkup(
      createElement(Component, {
        input,
        frame: 150,
        accent: "#9fefca",
        id: "correction",
      }),
    );

    const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(markup);
    const caption = paint.filter(
      (item) => item.kind === "text" && item.ariaLabel === input.labels.removed,
    );
    assert.ok(caption.length > 0);
    SvgPaintAssertions.assertPaintClearance({
      texts: caption,
      rectangles: paint.filter(
        (item) =>
          item.kind === "rect" &&
          item.fill !== "none" &&
          item.opacity * item.fillOpacity === 1,
      ),
    });
  });
});
