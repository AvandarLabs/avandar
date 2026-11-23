import { ServiceablePanelSwapTestState } from "./ServiceablePanelSwapTestState";

const { render, options } = ServiceablePanelSwapTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { ServiceablePanelSwap } from "../../ServiceablePanelSwap";
import { serviceablePanelSwapContract } from "../../ServiceablePanelSwap.contract";
import { FIXTURES, invalidInputs } from "../../ServiceablePanelSwap.fixtures";
import { inputSchema } from "../../ServiceablePanelSwap.schema";
import { assertWorkerContactsMovingOriginalFrame as _assertWorkerContactsMovingOriginalFrame } from "./assertWorkerContactsMovingOriginalFrame";

test("all authored fixtures are accepted and every rejection fixture fails", () => {
  FIXTURES.forEach(({ input }) => {
    return assert.deepEqual(inputSchema.parse(input), input);
  });
  invalidInputs.forEach((input) => {
    return assert.equal(
      inputSchema.safeParse(input).success,
      false,
      JSON.stringify(input),
    );
  });
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
      .filter(({ id }) => {
        return id !== target.id;
      })
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

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
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
    return _assertWorkerContactsMovingOriginalFrame({ frame, input });
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
    await import("../../ServiceablePanelSwap.contract");
  const { ServiceablePanelSwap: Component } =
    await import("../../ServiceablePanelSwap");
  const { SvgPaintAssertions } =
    await import("../../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
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
    const caption = paint.filter((item) => {
      return item.kind === "text" && item.ariaLabel === input.labels.removed;
    });
    assert.ok(caption.length > 0);
    SvgPaintAssertions.assertPaintClearance({
      texts: caption,
      rectangles: paint.filter((item) => {
        return (
          item.kind === "rect" &&
          item.fill !== "none" &&
          item.opacity * item.fillOpacity === 1
        );
      }),
    });
  });
});
