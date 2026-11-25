import { ScopeApertureTestState } from "./ScopeApertureTestState";

const { topicAttributes: _topicAttributes, render: _render } =
  ScopeApertureTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { invalidInputs } from "../../rejectedInputs.constants";
import { scopeApertureContract as contract } from "../../ScopeAperture.contract";
import { DEFAULT_INPUT, fixtures } from "../../ScopeAperture.fixtures";
import { inputSchema } from "../../ScopeAperture.schema";
import { assertOnlyAuthoredIncludedTopicsHeld as _assertOnlyAuthoredIncludedTopicsHeld } from "./assertOnlyAuthoredIncludedTopicsHeld";

registerStockPresetAssertions({
  contract,
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  render: _render,
  excludedTextFields: ["id"],
});

test("only authored included topics finish inside the contracted aperture", () => {
  const held = _render({ frame: 150, input: fixtures[2].input });
  const boundary = SvgAttributes.fromMarker({
    markup: held,
    marker: "aperture",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: boundary, name: "x" }),
    240,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: boundary, name: "width" }),
    480,
  );
  fixtures[2].input.topics.forEach((topic) => {
    const item = _topicAttributes({ markup: held, id: topic.id });
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: item,
      name: "data-x",
    });
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: item,
      name: "data-y",
    });
    assert.ok(item.includes(`transform="translate(${x} ${y})"`));
    assert.equal(x > 240 && x < 720 && y > 150 && y < 510, topic.included);
  });
  _assertOnlyAuthoredIncludedTopicsHeld(held);
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({ frame: 36 }),
      marker: "focused-question",
    }),
    /opacity="0"/,
  );
});

test("topic rule strokes stay above every line of a wrapped excluded label", () => {
  const markup = _render({ frame: 150, input: fixtures[2].input });
  const rules = [...markup.matchAll(/<path d="M-38 ([^"]+) H38"/g)];
  assert.equal(rules.length, 6);
  rules.forEach(([, y]) => {
    return assert.ok(Number(y) < -16);
  });
});

test("five excluded topics retain separate positions outside one included topic", () => {
  const input = {
    ...fixtures[2].input,
    topics: fixtures[2].input.topics.map((topic, index) => {
      return { ...topic, included: index === 0 };
    }),
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 150, input: input });
  const positions = new Set<string>();
  input.topics
    .filter((topic) => {
      return !topic.included;
    })
    .forEach((topic) => {
      const attributes = _topicAttributes({ markup, id: topic.id });
      const x = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "data-x",
      });
      const y = SvgAttributes.getNumberFromMarkup({
        attributes,
        name: "data-y",
      });
      assert.ok(x < 240 || x > 720);
      assert.ok(y >= 150 && y < 480);
      positions.add(`${x},${y}`);
    });
  assert.equal(positions.size, 5);
});
