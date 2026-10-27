import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getPickerCopyFromFrame } from ".././getPickerCopyFromFrame";
import { getPickerGroupsFromInput } from ".././getPickerGroupsFromInput";
import { GroupedValuePicker } from ".././GroupedValuePicker";
import { groupedValuePickerContract } from ".././GroupedValuePicker.contract";
import {
  DEFAULT_INPUT,
  FIXTURES,
  INVALID_INPUTS,
} from ".././GroupedValuePicker.fixtures";
import { inputSchema } from ".././GroupedValuePicker.schema";
import type { PresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import type { Input } from ".././GroupedValuePicker.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(GroupedValuePicker, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [input.labels.entity, input.labels.field, input.labels.result];
}

const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs: INVALID_INPUTS,
  contract: groupedValuePickerContract,
  render: _render,
  excludedTextFields: [
    "id",
    "entityId",
    "requestedIds",
    "firstOperationId",
    "outcome",
    "rule",
    "nullPolicy",
    "replacement",
    "originalRows",
    "rows",
  ],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [30, 90, 150],
} satisfies PresetAssertions<Input>;

function _getMovingCopy({
  markup,
  id,
}: Readonly<{ markup: string; id: string }>) {
  const body = markup.match(
    new RegExp(`<g data-picker-copy="${id}"[^>]*>([\\s\\S]*?</text>)`),
  )?.[1];
  assert.ok(body, `Value-bearing copy ${id} is drawn.`);
  const rectangle = SvgAttributes.fromMarker({
    markup: body,
    marker: "picker-copy-body",
  });
  return {
    x: SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "x" }),
    y: SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "y" }),
    width: SvgAttributes.getNumberFromMarkup({
      attributes: rectangle,
      name: "width",
    }),
    height: SvgAttributes.getNumberFromMarkup({
      attributes: rectangle,
      name: "height",
    }),
    body,
  };
}
/** Inputs for assertCardClearance. */
type AssertCardClearanceCopies = {
  x: number;
  y: number;
  width: number;
  height: number;
};

function _assertCardClearance({
  copies,
  message,
}: {
  copies: readonly AssertCardClearanceCopies[];
  message: string;
}) {
  copies.forEach((first, index) =>
    copies
      .slice(index + 1)
      .forEach((second) =>
        assert.ok(
          first.x + first.width <= second.x ||
            second.x + second.width <= first.x ||
            first.y + first.height <= second.y ||
            second.y + second.height <= first.y,
          message,
        ),
      ),
  );
}

function _assertReusedColumnClearance(values: ReadonlyArray<number | null>) {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    nullPolicy: values.includes(null) ? "include-in-mode" : "exclude-from-mode",
    observations: values.map((value, index) => ({ id: String(index), value })),
  });
  Array.from({ length: 161 }, (_, index) => 56 + index / 4).forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const copies = input.observations.map(({ id, value }) => {
      const copy = _getMovingCopy({ markup, id });
      assert.equal(
        [...copy.body.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g)]
          .map(([, text]) => text)
          .join(""),
        value === null ? "∅" : String(value),
      );
      if (frame >= 59) {
        assert.ok(markup.includes(`<g data-picker-copy="${id}" opacity="1">`));
      }
      return copy;
    });
    _assertCardClearance({
      copies,
      message: `Values overlap at ${frame}: ${values}.`,
    });
    assert.equal(
      (markup.match(/data-observation-tile=/g) || []).length,
      values.length,
    );
  });
  _assertModeArrival(input);
}

function _assertModeArrival(input: Input) {
  const arrivedMarkup = _render({ frame: 96, input: input });
  input.observations.forEach(({ id, value }, index) => {
    const start = _getMovingCopy({
      markup: _render({ frame: 56, input: input }),
      id,
    });
    const middle = _getMovingCopy({
      markup: _render({ frame: 76, input: input }),
      id,
    });
    const arrived = _getMovingCopy({ markup: arrivedMarkup, id });
    assert.equal(start.x, (value === null ? 165 : 53) + index * 144);
    assert.equal(start.y, value === null ? 166 : 210);
    assert.notDeepEqual([middle.x, middle.y], [start.x, start.y]);
    assert.notDeepEqual([middle.x, middle.y], [arrived.x, arrived.y]);
    const bay = arrivedMarkup.match(
      new RegExp(`<rect data-mode-bay="${value}"([^>]*)>`),
    )?.[1];
    assert.ok(bay);
    assert.ok(
      arrived.x >=
        SvgAttributes.getNumberFromMarkup({ attributes: bay, name: "x" }),
    );
    assert.ok(
      arrived.y >=
        SvgAttributes.getNumberFromMarkup({ attributes: bay, name: "y" }),
    );
    assert.ok(
      arrived.x + arrived.width <=
        SvgAttributes.getNumberFromMarkup({ attributes: bay, name: "x" }) +
          SvgAttributes.getNumberFromMarkup({ attributes: bay, name: "width" }),
    );
    assert.ok(
      arrived.y + arrived.height <=
        SvgAttributes.getNumberFromMarkup({ attributes: bay, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: bay,
            name: "height",
          }),
    );
  });
}

function _getPermutedOrders(values: ReadonlyArray<number | null>) {
  return values.reduce<Array<Array<number | null>>>(
    (orders, value) =>
      orders.flatMap((order) =>
        Array.from({ length: order.length + 1 }, (_, index) => [
          ...order.slice(0, index),
          value,
          ...order.slice(index),
        ]),
      ),
    [[]],
  );
}

function _assertPermutedCopyClearance(order: ReadonlyArray<number | null>) {
  const input: Input = {
    ...DEFAULT_INPUT,
    nullPolicy: "include-in-mode",
    observations: order.map((value, index) => ({ id: String(index), value })),
  };
  const groups = getPickerGroupsFromInput(input);
  Array.from({ length: 161 }, (_, index) => 56 + index / 4).forEach((frame) => {
    const copies = order.map((value, index) => {
      const copy = getPickerCopyFromFrame({ input, index, frame, groups });
      assert.ok(copy);
      if (frame >= 59) {
        assert.equal(copy.opacity, 1);
      }
      return { ...copy, width: value === null ? 20 : 134 };
    });
    _assertCardClearance({
      copies,
      message: `Permuted values overlap at ${frame}: ${order}.`,
    });
  });
}
export {
  _render,
  _getVisibleTexts,
  options,
  _getMovingCopy,
  _assertCardClearance,
  _assertReusedColumnClearance,
  _assertModeArrival,
  _getPermutedOrders,
  _assertPermutedCopyClearance,
};
