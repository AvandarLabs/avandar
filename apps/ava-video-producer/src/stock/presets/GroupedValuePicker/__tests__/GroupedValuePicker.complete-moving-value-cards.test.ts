import assert from "node:assert/strict";
import test from "node:test";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { SvgPaintAssertions } from "../../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions";
import { DEFAULT_INPUT } from ".././GroupedValuePicker.fixtures";
import {
  _render,
  _getMovingCopy,
  _assertReusedColumnClearance,
  _getPermutedOrders,
  _assertPermutedCopyClearance,
} from "./GroupedValuePickerTestHelpers";
import type { Input } from ".././GroupedValuePicker.schema";

test("complete moving value cards stay disjoint through crossed mode assignments", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    nullPolicy: "include-in-mode",
    observations: [
      { id: "a", value: 0.0000010000000000000002 },
      { id: "b", value: -2 },
      { id: "c", value: 0.0000010000000000000002 },
      { id: "d", value: -2 },
      { id: "e", value: null },
      { id: "f", value: null },
    ],
  };
  Array.from({ length: 145 }, (_, index) => 56 + index / 4).forEach((frame) => {
    const cards = [
      ..._render({ frame: frame, input: input }).matchAll(
        /<rect data-picker-copy-body="[^"]*"([^>]*)>/g,
      ),
    ].map(([, attributes]) => ({
      x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
      y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
      width: SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
      height: SvgAttributes.getNumberFromMarkup({
        attributes: attributes,
        name: "height",
      }),
    }));
    assert.equal(cards.length, 6);
    cards.forEach((first, index) =>
      cards
        .slice(index + 1)
        .forEach((second) =>
          assert.ok(
            first.x + first.width <= second.x ||
              second.x + second.width <= first.x ||
              first.y + first.height <= second.y ||
              second.y + second.height <= first.y,
            `Value cards overlap at ${frame}.`,
          ),
        ),
    );
  });
});

test("six distinct mode groups never cross within reused columns", () => {
  [
    [6, 5, 4, 3, 2, 1],
    [1, 2, 3, 4, 5, 6],
    [3, 6, 1, 5, 2, 4],
    [null, 5, 4, 3, 2, 1],
    [2, 4, null, 1, 5, 3],
  ].forEach(_assertReusedColumnClearance);
});

test("four and five distinct groups retain clearance in differing authored orders", () => {
  [
    [4, 3, 2, 1],
    [1, 4, 2, 3],
    [5, 4, 3, 2, 1],
    [3, 1, 5, 2, 4],
    [null, 3, 2, 1],
    [4, 2, null, 1, 3],
  ].forEach(_assertReusedColumnClearance);
});

test("reused columns keep unequal numeric counts and included null copies unobscured", () => {
  [
    [4, 1, 3, 4, 2, 1],
    [3, 1, 4, 2, 3],
    [null, 3, 2, null, 1, 4],
    [4, null, 3, 2, 1, null],
    [4, 3, 4, 2, 4, 1],
  ].forEach(_assertReusedColumnClearance);
});

test("all six-distinct numeric and included-null permutations preserve full-card clearance", () => {
  [
    [1, 2, 3, 4, 5, 6],
    [null, 1, 2, 3, 4, 5],
  ].forEach((values) => {
    const permutations = _getPermutedOrders(values);
    assert.equal(permutations.length, 720);
    permutations.forEach(_assertPermutedCopyClearance);
  });
});

test("concentrated long numeric values and five included nulls fit their complete stack bays", () => {
  const longValue = 0.0000010000000000000002;
  [
    Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      value: longValue,
    })),
    Array.from({ length: 6 }, (_, index) => ({
      id: String(index),
      value: index === 0 ? 0 : null,
    })),
  ].forEach((observations) => {
    const input: Input = {
      ...DEFAULT_INPUT,
      observations,
      nullPolicy: "include-in-mode",
    };
    const markup = _render({ frame: 96, input: input });
    SvgPaintAssertions.assertTextCanvasBounds({ markup });
    const bays = [...markup.matchAll(/<rect data-mode-bay="[^"]*"([^>]*)>/g)];
    bays.forEach(([, attributes]) =>
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({ attributes, name: "height" }) <=
          600,
      ),
    );
    observations.forEach(({ id, value }) => {
      const copy = _getMovingCopy({ markup, id });
      const drawnValue = [
        ...copy.body.matchAll(/<tspan[^>]*>([^<]*)<\/tspan>/g),
      ]
        .map(([, text]) => text)
        .join("");
      assert.equal(drawnValue, value === null ? "∅" : String(value));
    });
  });
});
