import assert from "node:assert/strict";
import test from "node:test";
import { registerStockLocalizationAssertions } from "../../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { getPickedValueFromInput } from ".././getPickedValueFromInput";
import { DEFAULT_INPUT, FIXTURES } from ".././GroupedValuePicker.fixtures";
import {
  _render,
  options,
  _getMovingCopy,
} from "./GroupedValuePickerTestHelpers";
import type { Input } from ".././GroupedValuePicker.schema";

test("every rule derives its exact result and count uses its own unit", () => {
  const cases = [
    ["most-frequent", 4],
    ["first", 2],
    ["sum", 10],
    ["mean", 10 / 3],
    ["min", 2],
    ["max", 4],
    ["count", 3],
  ] as const;
  cases.forEach(([rule, value]) => {
    const markup = _render({ frame: 150, input: { ...DEFAULT_INPUT, rule } });
    assert.match(markup, new RegExp(`data-exact-result="${value}"`));
    assert.match(
      markup,
      new RegExp(
        `data-result-unit="${rule === "count" ? "observations" : "items"}"`,
      ),
    );
  });
  assert.match(
    _render({ frame: 150, input: { ...DEFAULT_INPUT, rule: "mean" } }),
    /aria-label="≈ 3.33"/,
  );
});

test("mode orders numeric ties before null while first preserves a leading null", () => {
  const observations = [
    { id: "x", value: null },
    { id: "y", value: null },
    { id: "z", value: 0 },
  ];
  assert.match(
    _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        observations,
        nullPolicy: "include-in-mode",
      },
    }),
    /data-exact-result="null"/,
  );
  assert.match(
    _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        observations,
        nullPolicy: "exclude-from-mode",
      },
    }),
    /data-exact-result="0"/,
  );
  assert.match(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, observations, rule: "first" },
    }),
    /data-exact-result="null"/,
  );
  const ties = [
    { id: "x", value: null },
    { id: "y", value: 4 },
    { id: "z", value: -2 },
  ];
  assert.match(
    _render({
      frame: 150,
      input: {
        ...DEFAULT_INPUT,
        observations: ties,
        nullPolicy: "include-in-mode",
      },
    }),
    /data-exact-result="-2"/,
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

registerStockLocalizationAssertions({
  contract: options.contract,
  expectedTextPaths: [
    ["labels", "entity"],
    ["labels", "field"],
    ["labels", "unit"],
    ["labels", "countUnit"],
    ["labels", "missing"],
    ["labels", "result"],
  ],
  suppliedInputs: FIXTURES.map(({ input }) => input),
});

test("literal source identities and first-selection geometry remain visible after attachment", () => {
  const markup = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, rule: "first" },
  });
  const tiles = [
    ...markup.matchAll(/<rect data-observation-tile="([^"]*)"([^>]*)>/g),
  ].map(([, id, attributes]) => [
    id,
    SvgAttributes.getNumberFromMarkup({ attributes: attributes, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes, name: "stroke-width" }),
  ]);
  assert.deepEqual(tiles, [
    ["a", 48, 144, 3],
    ["b", 192, 144, 1],
    ["c", 336, 144, 1],
    ["d", 480, 144, 1],
  ]);
  ["a", "b", "c", "d"].forEach((id) =>
    assert.ok(markup.includes(`data-literal-value="${id}"`)),
  );
  assert.match(markup, /aria-label="2"/);
  const mode = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal((mode.match(/data-frequency-token="4"/g) || []).length, 2);
  assert.equal((mode.match(/data-frequency-token="2"/g) || []).length, 1);
  assert.doesNotMatch(mode, /data-mode-group="null"/);
});

test("every rule displays its hand-calculated result while retaining an unrounded mean", () => {
  const cases = [
    ["most-frequent", 4, "4"],
    ["first", 2, "2"],
    ["sum", 10, "10"],
    ["mean", 10 / 3, "≈ 3.33"],
    ["min", 2, "2"],
    ["max", 4, "4"],
    ["count", 3, "3"],
  ] as const;
  cases.forEach(([rule, value, text]) => {
    const input = { ...DEFAULT_INPUT, rule };
    assert.equal(getPickedValueFromInput(input), value);
    assert.ok(
      _render({ frame: 150, input: input }).includes(`aria-label="${text}"`),
    );
  });
  const negative = {
    ...DEFAULT_INPUT,
    observations: [
      { id: "a", value: -7 },
      { id: "b", value: 0 },
      { id: "c", value: -7 },
      { id: "d", value: null },
    ],
  };
  assert.equal(
    getPickedValueFromInput({ ...negative, rule: "most-frequent" }),
    -7,
  );
  assert.equal(getPickedValueFromInput({ ...negative, rule: "mean" }), -14 / 3);
  const ties = {
    ...DEFAULT_INPUT,
    observations: [
      { id: "a", value: 0 },
      { id: "b", value: null },
    ],
    nullPolicy: "include-in-mode" as const,
  };
  assert.equal(getPickedValueFromInput(ties), 0);
  assert.match(
    _render({
      frame: 150,
      input: {
        ...ties,
        observations: [...ties.observations, { id: "c", value: null }],
      },
    }),
    /aria-label="Missing"/,
  );
});

test("mean and count move the non-null values from the retained rail onto a calculation line", () => {
  (["mean", "count"] as const).forEach((rule) => {
    const input = { ...DEFAULT_INPUT, rule };
    const start = _getMovingCopy({
      markup: _render({ frame: 56, input: input }),
      id: "c",
    });
    const middle = _getMovingCopy({
      markup: _render({ frame: 76, input: input }),
      id: "c",
    });
    const arrived = _getMovingCopy({
      markup: _render({ frame: 92, input: input }),
      id: "c",
    });
    assert.equal(start.x, 341);
    assert.equal(start.y, 210);
    assert.ok(middle.y > start.y && middle.y !== arrived.y);
    assert.equal(arrived.x, 341);
    assert.equal(arrived.y, 351);
    assert.match(arrived.body, />4<\/tspan>/);
    const markup = _render({ frame: 92, input: input });
    assert.equal((markup.match(/data-observation-tile=/g) || []).length, 4);
    assert.doesNotMatch(markup, /data-picker-copy="d"/);
    assert.ok(
      markup.indexOf("data-picker-copy=") >
        markup.indexOf("data-derived-result="),
    );
    if (rule === "count") {
      assert.match(_render({ frame: 100, input: input }), /aria-label="↦ 1"/);
    }
  });
});

test("tied numeric modes and included null move into separate equal-value stacks", () => {
  const input: Input = {
    ...DEFAULT_INPUT,
    nullPolicy: "include-in-mode",
    observations: [
      { id: "a", value: 4 },
      { id: "b", value: -2 },
      { id: "c", value: 4 },
      { id: "d", value: -2 },
      { id: "e", value: null },
      { id: "f", value: null },
    ],
  };
  const markup = _render({ frame: 92, input: input });
  const values = ["a", "b", "c", "d", "e", "f"].map((id) =>
    _getMovingCopy({ markup, id }),
  );
  assert.deepEqual(
    values.map(({ x, y }) => [x, y]),
    [
      [240, 376],
      [55, 376],
      [240, 412],
      [55, 412],
      [425, 416],
      [425, 436],
    ],
  );
  assert.match(values[0].body, />4<\/tspan>/);
  assert.match(values[1].body, /&gt;-2|>-2<\/tspan>/);
  assert.match(values[4].body, />∅<\/tspan>/);
  assert.notDeepEqual(
    _getMovingCopy({ markup: _render({ frame: 76, input: input }), id: "a" }),
    values[0],
  );
  assert.equal(getPickedValueFromInput(input), -2);
  assert.ok(
    markup.lastIndexOf("data-observation-tile=") <
      markup.indexOf("data-picker-copy="),
  );
});
