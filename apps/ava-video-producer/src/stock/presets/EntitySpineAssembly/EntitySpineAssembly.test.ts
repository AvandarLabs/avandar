import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { EntitySpineAssembly } from "./EntitySpineAssembly";
import { DEFAULT_INPUT, FIXTURES } from "./EntitySpineAssembly.fixtures";
import { INVALID_INPUTS } from "./rejectedInputs.constants";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import type { Input } from "./EntitySpineAssembly.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(EntitySpineAssembly, {
      frame,
      input,
      accent: "#6ee7c4",
      id: "test",
    }),
  );
}
test("one spine row per entity receives sum or null without source fan-out", () => {
  const getRows = (input: Input) =>
    [
      ..._render({ frame: 150, input: input }).matchAll(
        /data-entity-row="([^"]*)" data-value="([^"]*)"/g,
      ),
    ].map(([, id, value]) => [id, value]);
  assert.deepEqual(getRows(DEFAULT_INPUT), [
    ["a", "5"],
    ["b", "4"],
    ["c", "null"],
  ]);
  assert.deepEqual(getRows(FIXTURES[3].input), [
    ["a", "12"],
    ["b", "4"],
    ["c", "null"],
  ]);
  assert.deepEqual(getRows(FIXTURES[1].input), [
    ["a", "0"],
    ["b", "null"],
  ]);
  assert.deepEqual(getRows(FIXTURES[2].input), [
    ["aaaaaaaaaa", "700"],
    ["bbbbbbbbbb", "null"],
    ["cccccccccc", "null"],
    ["dddddddddd", "null"],
  ]);
  assert.match(
    _render({ frame: 150, input: FIXTURES[1].input }),
    />0<\/tspan>/,
  );
  assert.doesNotMatch(
    _render({ frame: 150, input: FIXTURES[1].input }),
    /data-observation-row=/,
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { entitySpineAssemblyContract } from "./EntitySpineAssembly.contract";
import { inputSchema } from "./EntitySpineAssembly.schema";

function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.copy.context,
    frame >= 140 ? input.copy.after : input.copy.before,
    input.field.label,
    ...input.entities.map(prop("label")),
    ...(frame >= 139
      ? [
          input.field.unit,
          ...(input.entities.some(
            (entity) =>
              !input.observations.some(
                ({ entityId }) => entityId === entity.id,
              ),
          )
            ? [input.field.missingLabel]
            : []),
        ]
      : []),
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  invalidInputs: INVALID_INPUTS,
  contract: entitySpineAssemblyContract,
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
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract: options.contract,
  expectedTextPaths: [
    ["entities", 0, "label"],
    ["entities", 1, "label"],
    ["entities", 2, "label"],
    ["field", "label"],
    ["field", "unit"],
    ["field", "missingLabel"],
    ["copy", "context"],
    ["copy", "before"],
    ["copy", "after"],
  ],
  suppliedInputs: FIXTURES.map(prop("input")),
});

test("observation IDs preserve the accepted empty, Unicode, whitespace and 12-character boundary", () => {
  ["", " ", "雪", "界".repeat(12)].forEach((id) => {
    const input = inputSchema.parse({
      ...DEFAULT_INPUT,
      observations: [{ id, entityId: "a", value: 0 }],
    });
    const markup = _render({ frame: 150, input: input });
    assert.ok(markup.includes(`data-observation-row="${id}"`));
    assert.ok(markup.includes(`data-literal-value="${id}"`));
    assert.match(markup, /aria-label="0"/);
    assert.match(markup, /aria-label="No observation"/);
  });
  assert.equal(
    inputSchema.safeParse({
      ...DEFAULT_INPUT,
      observations: [{ id: "界".repeat(13), entityId: "a", value: 0 }],
    }).success,
    false,
  );
  assert.equal(
    inputSchema.safeParse({
      ...DEFAULT_INPUT,
      observations: [
        { id: "", entityId: "a", value: 0 },
        { id: "", entityId: "b", value: 1 },
      ],
    }).success,
    false,
  );
});
test("every literal entity key stays on the same four-row spine through a seven-row concentration", () => {
  const input = FIXTURES[2].input;
  [48, 72, 105, 120, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    assert.equal((markup.match(/data-entity-row=/g) || []).length, 4);
    assert.equal((markup.match(/data-observation-row=/g) || []).length, 7);
    const bodies = [
      ...markup.matchAll(/<rect data-spine-body="([^"]*)"([^>]*)>/g),
    ].map(([, id, attrs]) => [
      id,
      SvgAttributes.getNumberFromMarkup({ attributes: attrs, name: "x" }),
      SvgAttributes.getNumberFromMarkup({ attributes: attrs, name: "y" }),
    ]);
    assert.deepEqual(bodies, [
      ["aaaaaaaaaa", 460, 120],
      ["bbbbbbbbbb", 460, 220],
      ["cccccccccc", 460, 320],
      ["dddddddddd", 460, 420],
    ]);
  });
  const hold = _render({ frame: 150, input: input });
  assert.match(hold, /aria-label="700"/);
  assert.equal((hold.match(/aria-label="界{24}"/g) || []).length >= 3, true);
});

function _getContribution({
  markup,
  id,
}: Readonly<{ markup: string; id: string }>) {
  const body = markup.match(
    new RegExp(`<g data-spine-contribution="${id}"[^>]*>([\\s\\S]*?</text>)`),
  )?.[1];
  assert.ok(body, `Numeric contribution ${id} is drawn.`);
  const rectangle = SvgAttributes.fromMarker({
    markup: body,
    marker: "contribution-body",
  });
  return {
    x: SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "x" }),
    y: SvgAttributes.getNumberFromMarkup({ attributes: rectangle, name: "y" }),
    height: SvgAttributes.getNumberFromMarkup({
      attributes: rectangle,
      name: "height",
    }),
    body,
  };
}
test("numeric values move into a foreground entity stack and converge into its sum", () => {
  const start = _getContribution({
    markup: _render({ frame: 49, input: DEFAULT_INPUT }),
    id: "o2",
  });
  const stackedMarkup = _render({ frame: 82, input: DEFAULT_INPUT });
  const stacked = _getContribution({ markup: stackedMarkup, id: "o2" });
  const collapsing = _getContribution({
    markup: _render({ frame: 93, input: DEFAULT_INPUT }),
    id: "o2",
  });
  assert.equal(start.x, 57);
  assert.equal(start.y, 200);
  assert.equal(stacked.x, 232);
  assert.equal(stacked.y, 154);
  assert.ok(collapsing.y < stacked.y);
  assert.match(stacked.body, />3<\/tspan>/);
  assert.ok(
    stackedMarkup.lastIndexOf("data-spine-body=") <
      stackedMarkup.indexOf("data-spine-contribution="),
  );
  const collapsed = _render({ frame: 105, input: DEFAULT_INPUT });
  assert.match(collapsed, /<g data-spine-sum="a"[^>]*>[\s\S]*?aria-label="5"/);
});
test("all seven concentrated numeric contributions remain separate and readable before collapse", () => {
  const input = FIXTURES[2].input,
    markup = _render({ frame: 82, input: input });
  const contributions = input.observations.map(({ id }) =>
    _getContribution({ markup, id }),
  );
  assert.deepEqual(
    contributions.map(({ x, y }) => [x, y]),
    [
      [232, 134],
      [232, 154],
      [232, 174],
      [232, 194],
      [232, 214],
      [232, 234],
      [232, 254],
    ],
  );
  contributions.forEach(({ body, height }, index) => {
    assert.match(body, />100<\/tspan>/);
    assert.equal(height, 18);
    if (index > 0) {
      assert.ok(contributions[index - 1].y + height < contributions[index].y);
    }
  });
  assert.equal((markup.match(/data-entity-row=/g) || []).length, 4);
  assert.equal((markup.match(/data-observation-row=/g) || []).length, 7);
  assert.ok(
    markup.lastIndexOf("data-spine-body=") <
      markup.indexOf("data-spine-contribution="),
  );
  assert.match(
    _render({ frame: 105, input: input }),
    /<g data-spine-sum="aaaaaaaaaa"[^>]*>[\s\S]*?aria-label="700"/,
  );
});

test("foreground contributions remain disjoint until the intentional numeric collapse", () => {
  const input = FIXTURES[2].input;
  Array.from({ length: 149 }, (_, index) => 49 + index / 4).forEach((frame) => {
    const markup = _render({ frame: frame, input: input });
    const cards = input.observations.map(({ id }) =>
      _getContribution({ markup, id }),
    );
    cards.forEach((first, index) =>
      cards
        .slice(index + 1)
        .forEach((second) =>
          assert.ok(
            first.y + first.height <= second.y ||
              second.y + second.height <= first.y,
          ),
        ),
    );
  });
  const collapsed = _render({ frame: 103, input: input });
  assert.ok(
    collapsed.lastIndexOf("data-contribution-body=") <
      collapsed.indexOf("data-spine-sum="),
  );
});
