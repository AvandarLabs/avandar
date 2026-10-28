import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { OutreachHouseholdRevisits } from "./OutreachHouseholdRevisits";
import { outreachHouseholdRevisitsContract } from "./OutreachHouseholdRevisits.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  changedInput,
  invalidInputs,
} from "./OutreachHouseholdRevisits.fixtures";
import { inputSchema, type Input } from "./OutreachHouseholdRevisits.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(OutreachHouseholdRevisits, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
    ),
  );
}
function _attributes({
  markup,
  attribute,
  value,
}: {
  markup: string;
  attribute: string;
  value: string;
}): string {
  const element = markup
    .match(/<[^>]+>/g)
    ?.find((tag) => tag.includes(`${attribute}="${value}"`));
  assert.ok(element, `${attribute}=${value}`);
  return element;
}
test("invalid authored inputs reject before rendering", () => {
  invalidInputs.forEach((input) =>
    assert.equal(inputSchema.safeParse(input).success, false),
  );
});
test("repeated activity leaves one contacted household after a later failed contact", () => {
  const first = _render({ frame: 60, input: changedInput });
  const contacted = _render({ frame: 84, input: changedInput });
  const final = _render({ frame: 150, input: changedInput });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: first,
        attribute: "data-household-id",
        value: "h1",
      }),
      name: "data-events",
    }),
    1,
  );
  assert.ok(
    _attributes({
      markup: first,
      attribute: "data-household-id",
      value: "h1",
    }).includes('data-state="no-contact"'),
  );
  assert.ok(
    _attributes({
      markup: contacted,
      attribute: "data-household-id",
      value: "h1",
    }).includes('data-state="contacted"'),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: _attributes({
        markup: final,
        attribute: "data-household-id",
        value: "h1",
      }),
      name: "data-events",
    }),
    3,
  );
  assert.ok(
    _attributes({
      markup: final,
      attribute: "data-household-id",
      value: "h1",
    }).includes('data-state="contacted"'),
  );
  assert.equal((final.match(/data-visit-stamp=/g) ?? []).length, 3);
  assert.ok(final.includes('data-unique-contacted="1"'));
  assert.ok(final.includes('data-unique-visited="1"'));
  const house = _attributes({
    markup: final,
    attribute: "data-household-id",
    value: "h1",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: house, name: "data-x" }),
    80 + 0.12 * 480,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: house, name: "data-y" }),
    120 + 0.24 * 270,
  );
  assert.notEqual(
    _attributes({
      markup: _render({ frame: 44, input: DEFAULT_INPUT }),
      attribute: "data-worker",
      value: "worker",
    }),
    _attributes({
      markup: _render({ frame: 90, input: DEFAULT_INPUT }),
      attribute: "data-worker",
      value: "worker",
    }),
  );
});

function _getVisibleTexts({ input }: Readonly<{ input: Input }>): string[] {
  return [
    input.sceneLabel,
    ...input.households.map(prop("label")),
    input.copy.map,
    input.copy.contacted,
    input.copy.noContact,
    input.copy.unvisited,
    input.copy.denominator,
    ...(input.showUniqueLedger ? [input.copy.visits, input.copy.visited] : []),
  ];
}
const ASSERTIONS = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: outreachHouseholdRevisitsContract,
  render: _render,
  excludedTextFields: ["id", "householdId", "slotId", "emphasis", "view"],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(ASSERTIONS);
registerStockTextLayoutAssertions(ASSERTIONS);

test("concentrated visits keep event stamps inside their owning home footprint", () => {
  const markup = _render({ frame: 150, input: changedInput });
  const stamps = markup.match(/<circle[^>]*data-visit-stamp="h1"[^>]*>/g) ?? [];
  assert.equal(stamps.length, 3);
  stamps.forEach((stamp) => {
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: stamp, name: "cy" }) +
        SvgAttributes.getNumberFromMarkup({ attributes: stamp, name: "r" }) <=
        120 + 0.24 * 270 + 20,
    );
  });
});

test("close accepted homes keep their exact centers and separate fixed label rows", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    households: [
      { id: "a", label: "界".repeat(16), x: 0.1, y: 0.1 },
      { id: "b", label: "界".repeat(16), x: 0.1, y: 0.28 },
      { id: "c", label: "界".repeat(16), x: 0.1, y: 0.46 },
    ],
    visits: [{ householdId: "a", contacted: true }],
  });
  const markup = _render({ frame: 150, input: input });
  input.households.forEach((household, index) => {
    const outline = _attributes({
      markup,
      attribute: "data-home-outline",
      value: household.id,
    });
    const x = 80 + household.x * 480;
    const y = 120 + household.y * 270;
    assert.ok(outline.includes(`M${x - 18} ${y - 3} L${x} ${y - 20}`));
    assert.ok(markup.includes(`<tspan x="650" dy="0">`));
    assert.ok(markup.includes(`x="650" y="${112 + index * 38}"`));
  });
});

test("serialized contract exposes household identity validation", () => {
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["households.*.id"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /unique/i);
});

test("serialized contract exposes household separation validation", () => {
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["households.*.x", "households.*.y"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /Euclidean.*at least 0\.18/i);
});

test("serialized contract exposes visit reference validation", () => {
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["visits.*.householdId", "households.*.id"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /every.*must reference.*supplied household/i);
});

test("serialized contract exposes revisit limit validation", () => {
  const rules = JSON.parse(
    JSON.stringify(outreachHouseholdRevisitsContract.semanticRules),
  ) as typeof outreachHouseholdRevisitsContract.semanticRules;
  const paths = ["visits.*.householdId"];
  const rule = rules.find(
    (candidate) =>
      candidate.paths.length === paths.length &&
      paths.every((path) => candidate.paths.includes(path)),
  );
  assert.ok(rule, "Runtime-only rule retains its precise field paths.");
  assert.match(rule.description, /at most 3 visits per household/i);
});
