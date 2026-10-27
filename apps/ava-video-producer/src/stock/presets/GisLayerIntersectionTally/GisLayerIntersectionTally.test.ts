import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { GisLayerIntersectionTally } from "./GisLayerIntersectionTally";
import { gisLayerIntersectionTallyContract as contract } from "./GisLayerIntersectionTally.contract";
import {
  DEFAULT_INPUT,
  minimumInput,
  denseInput,
  changedInput,
  fixtures,
  invalidInputs,
} from "./GisLayerIntersectionTally.fixtures";
import { inputSchema, type Input } from "./GisLayerIntersectionTally.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(GisLayerIntersectionTally, {
        frame,
        input,
        accent: "#79d5bd",
        background: "#101720",
        id: "packet16",
      }),
    ),
  );
}
test("Intersection selects Home B with three of eight members and difference selects Home A", () => {
  const hold = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.match(hold, /data-selected-household="h2"/);
  assert.equal([...hold.matchAll(/data-selected-household=/g)].length, 1);
  assert.match(hold, /data-selected-quantity="3" data-total-quantity="8"/);
  const difference = _render({ frame: 150, input: changedInput });
  assert.match(difference, /data-selected-household="h1"/);
  assert.match(
    difference,
    /data-selected-quantity="1" data-total-quantity="4"/,
  );
});

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.context,
    input.copy[
      input.operation === "intersection" ? "intersection" : "difference"
    ],
    ...input.layers.map(prop("label")),
    ...input.households.map(prop("label")),
    ...(frame >= 108
      ? [input.copy.selected, input.copy.total, input.copy[input.measure]]
      : []),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render: _render,
  excludedTextFields: ["id", "operation", "measure", "context"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);

function _selected(markup: string): string[] {
  return [...markup.matchAll(/data-selected-household="([^"]*)"/g)].map(
    (match) => match[1],
  );
}
test("changing measure preserves selected identities including twelve coincident homes", () => {
  [DEFAULT_INPUT, denseInput, minimumInput, changedInput].forEach((fixture) => {
    const members = _render({
        frame: 150,
        input: { ...fixture, measure: "members" },
      }),
      households = _render({
        frame: 150,
        input: { ...fixture, measure: "households" },
      });
    assert.deepEqual(_selected(members), _selected(households));
    assert.equal(
      [...members.matchAll(/data-household-marker=/g)].length,
      fixture.households.length,
    );
    assert.equal(
      [...members.matchAll(/data-map-household=/g)].length,
      fixture.households.length,
    );
  });
  assert.match(
    _render({ frame: 150, input: denseInput }),
    /data-selected-quantity="96" data-total-quantity="96"/,
  );
  assert.match(
    _render({ frame: 150, input: { ...denseInput, measure: "households" } }),
    /data-selected-quantity="12" data-total-quantity="12"/,
  );
});
test("concavity winding and disjoint containing identical layers retain ordered set semantics", () => {
  const square: Array<[number, number]> = [
    [10, 10],
    [90, 10],
    [90, 90],
    [10, 90],
  ];
  const concave: Array<[number, number]> = [
    [10, 10],
    [90, 10],
    [90, 90],
    [60, 90],
    [60, 40],
    [40, 40],
    [40, 90],
    [10, 90],
  ];
  const small: Array<[number, number]> = [
    [15, 15],
    [30, 15],
    [30, 35],
    [15, 35],
  ];
  const disjoint: Array<[number, number]> = [
    [91, 91],
    [99, 91],
    [99, 99],
    [91, 99],
  ];
  const homes = [
    { id: "", label: "Coincident A", x: 20, y: 30, members: 2 },
    { id: "b", label: "Coincident B", x: 20, y: 30, members: 3 },
    { id: "c", label: "Notch", x: 50, y: 70, members: 1 },
  ];
  const cases: Array<
    [Array<[number, number]>, Array<[number, number]>, string[], string[]]
  > = [
    [concave, square, ["", "b"], []],
    [square, small, ["", "b"], ["c"]],
    [small, square, ["", "b"], []],
    [square, square, ["", "b", "c"], []],
    [square, disjoint, [], ["", "b", "c"]],
  ];
  cases.forEach(([first, second, intersection, difference]) =>
    [false, true].forEach((reverse) => {
      const layers = [
        {
          id: "",
          label: "First",
          polygon: reverse ? [...first].reverse() : first,
        },
        {
          id: "b",
          label: "Second",
          polygon: reverse ? [...second].reverse() : second,
        },
      ];
      (["intersection", "first-minus-second"] as const).forEach((operation) => {
        const input = {
          ...DEFAULT_INPUT,
          layers,
          households: homes,
          operation,
          showLayerOutlines: false,
        };
        assert.deepEqual(inputSchema.parse(input), input);
        const markup = _render({ frame: 150, input: input });
        assert.deepEqual(
          _selected(markup),
          operation === "intersection" ? intersection : difference,
        );
        assert.ok(markup.includes(`data-result-boundary="${operation}"`));
        assert.match(markup, /data-total-quantity="6"/);
        assert.match(markup, /stroke-opacity="0"/);
        if (operation === "intersection") {
          assert.match(markup, /clip-path="url\(#[^)]+-b\)"/);
        } else {
          assert.match(markup, /mask="url\(#[^)]+-outside\)"/);
        }
      });
    }),
  );
});
test("map anchors never move and every lifted record owns its visible caption key", () => {
  const mapPoints = (markup: string) =>
    [
      ...markup.matchAll(
        /data-map-household="([^"]*)" cx="([-.\d]+)" cy="([-.\d]+)"/g,
      ),
    ].map((match) => match.slice(1));
  [
    minimumInput,
    denseInput,
    { ...denseInput, households: [...denseInput.households].reverse() },
  ].forEach((input) => {
    const setup = _render({ frame: 24, input: input });
    [72, 83.999, 84, 84.001, 96, 107.999, 108, 108.001, 150].forEach(
      (frame) => {
        const markup = _render({ frame: frame, input: input });
        assert.deepEqual(mapPoints(markup), mapPoints(setup));
        input.households.forEach((household, index) => {
          assert.ok(
            markup.includes(`data-household-caption="${household.id}"`),
          );
          assert.ok(markup.includes(`data-household-marker="${household.id}"`));
          assert.ok(markup.includes(`aria-label="${index + 1}"`));
        });
        [
          ...markup.matchAll(
            /data-household-marker="[^"]*"[^>]*transform="translate\(([-.\d]+) ([-.\d]+)\)"/g,
          ),
        ].forEach(([, x, y]) =>
          assert.ok(
            Number(x) - 12 >= 40 &&
              Number(x) + 12 <= 592 &&
              Number(y) - 12 >= 155 &&
              Number(y) + 12 < 500,
          ),
        );
      },
    );
  });
});
test("edge and vertex households are rejected without excluding near-boundary locations", () => {
  [
    [10, 30],
    [10, 10],
    [65, 80],
    [40, 40],
  ]
    .slice(0, 3)
    .forEach(([x, y]) =>
      assert.equal(
        inputSchema.safeParse({
          ...DEFAULT_INPUT,
          households: [
            { ...DEFAULT_INPUT.households[0], x, y },
            ...DEFAULT_INPUT.households.slice(1),
          ],
        }).success,
        false,
      ),
    );
  assert.equal(
    inputSchema.safeParse({
      ...DEFAULT_INPUT,
      households: [
        { ...DEFAULT_INPUT.households[0], x: 10.000000000000002, y: 30 },
        ...DEFAULT_INPUT.households.slice(1),
      ],
    }).success,
    true,
  );
  [[], [DEFAULT_INPUT.layers[0]]].forEach((layers) =>
    assert.equal(
      inputSchema.safeParse({ ...DEFAULT_INPUT, layers }).success,
      false,
    ),
  );
  assert.equal(
    inputSchema.safeParse({
      ...DEFAULT_INPUT,
      layers: [
        { ...DEFAULT_INPUT.layers[0], polygon: [] },
        DEFAULT_INPUT.layers[1],
      ],
    }).success,
    false,
  );
});
