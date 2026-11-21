import { OrderedLockAcquisitionTestState } from "./OrderedLockAcquisitionTestState";

const { render: _render, options } = OrderedLockAcquisitionTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { registerStockDefaultTextAssertions } from "../../../../../../tests/helpers/registerStockDefaultTextAssertions";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { DEFAULT_INPUT, FIXTURES } from "../../OrderedLockAcquisition.fixtures";
import { assertKeysPhysicallyReturnTheirKey as _assertKeysPhysicallyReturnTheirKey } from "./assertKeysPhysicallyReturnTheirKey";

test("first turn swaps while resource-array order remains canonical", () => {
  const original = _render({ frame: 108, input: DEFAULT_INPUT });
  const reversed = _render({
    frame: 108,
    input: { ...DEFAULT_INPUT, firstOperationId: "two" },
  });
  assert.match(original, /data-key-owner="one"/);
  assert.match(reversed, /data-key-owner="two"/);
  assert.match(original, /data-canonical-order="a,b"/);
  assert.match(reversed, /data-canonical-order="a,b"/);
  assert.match(
    _render({ frame: 108, input: FIXTURES[3].input }),
    /data-canonical-order="b,a"/,
  );
});

test("keys physically return to their tray before the waiting operation reuses them", () => {
  const key = (frame: number, resource: string) => {
    return _render({ frame: frame, input: DEFAULT_INPUT }).match(
      new RegExp(`<g data-lock-key="${resource}"[^>]*><circle[^>]*>`),
    )![0];
  };
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(108, "a"),
      name: "cy",
    }),
    235,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(108, "b"),
      name: "cy",
    }),
    235,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: key(122, "a"),
      name: "cy",
    }),
    100,
  );
  _assertKeysPhysicallyReturnTheirKey(key);
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockDefaultTextAssertions({
  contract: options.contract,
  expectedTextPaths: [
    ["resources", 0, "label"],
    ["resources", 1, "label"],
    ["operations", 0, "label"],
    ["operations", 1, "label"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: FIXTURES.map(prop("input")),
});

test("request cards exchange positions without covering one another", () => {
  FIXTURES.forEach(({ input }) => {
    Array.from({ length: 149 }, (_, index) => {
      return 53 + index / 4;
    }).forEach((frame) => {
      const cards = [
        ..._render({ frame: frame, input: input }).matchAll(
          /<rect data-request-tile="([^"]*)"[^>]*>/g,
        ),
      ].map(([attributes, id]) => {
        return {
          id,
          x: SvgAttributes.getNumberFromMarkup({ attributes, name: "x" }),
          y: SvgAttributes.getNumberFromMarkup({ attributes, name: "y" }),
          width: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "width",
          }),
          height: SvgAttributes.getNumberFromMarkup({
            attributes,
            name: "height",
          }),
        };
      });
      assert.deepEqual(
        cards.map(prop("id")),
        input.operations.flatMap(prop("requestedIds")),
      );
      cards.forEach((first, index) => {
        return cards.slice(index + 1).forEach((second) => {
          return assert.ok(
            first.x + first.width + 1 <= second.x ||
              second.x + second.width + 1 <= first.x ||
              first.y + first.height + 1 <= second.y ||
              second.y + second.height + 1 <= first.y,
          );
        });
      });
    });
  });
});

test("canonical sorting moves actual authored resource labels before any grant", () => {
  const positions = (frame: number) => {
    return [
      ..._render({ frame: frame, input: DEFAULT_INPUT }).matchAll(
        /<rect data-request-tile="([^"]*)"([^>]*)>/g,
      ),
    ].map(([, id, attributes]) => {
      return [id, SvgAttributes.getNumberFromMarkup({ attributes, name: "x" })];
    });
  };
  assert.deepEqual(positions(40), [
    ["a", 340],
    ["b", 600],
    ["b", 340],
    ["a", 600],
  ]);
  assert.deepEqual(positions(90), [
    ["a", 340],
    ["b", 600],
    ["b", 600],
    ["a", 340],
  ]);
  [0, 40, 53, 70, 90].forEach((frame) => {
    return assert.equal(
      [
        ..._render({ frame: frame, input: DEFAULT_INPUT }).matchAll(
          /data-key-owner="([^"]*)"/g,
        ),
      ].filter(([, owner]) => {
        return owner !== "";
      }).length,
      0,
    );
  });
  assert.doesNotMatch(
    _render({
      frame: 90,
      input: { ...DEFAULT_INPUT, showOriginalOrder: false },
    }),
    /data-original-order=/,
  );
});
