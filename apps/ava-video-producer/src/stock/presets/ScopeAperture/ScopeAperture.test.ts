import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { invalidInputs } from "./rejectedInputs.constants";
import { ScopeAperture } from "./ScopeAperture";
import { scopeApertureContract as contract } from "./ScopeAperture.contract";
import { DEFAULT_INPUT, fixtures } from "./ScopeAperture.fixtures";
import { inputSchema } from "./ScopeAperture.schema";
import type { Input } from "./ScopeAperture.schema";

function _topicAttributes({
  markup,
  id,
}: {
  markup: string;
  id: string;
}): string {
  const element = [...markup.matchAll(/<g\b[^>]*>/g)]
    .map(([tag]) => tag)
    .find((tag) => tag.includes(`data-topic-position="${id}"`));
  assert.ok(element, id);
  return element;
}
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(ScopeAperture, {
        frame,
        input,
        accent: "#aabbcc",
        id: "test",
      }),
    ),
  );
}
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
  const early = SvgAttributes.fromMarker({
    markup: _render({ frame: 24 }),
    marker: "aperture",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: early, name: "width" }) >
      480,
  );
  const hidden = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showExcludedTopics: false },
  });
  DEFAULT_INPUT.topics
    .filter((topic) => !topic.included)
    .forEach((topic) =>
      assert.match(
        _topicAttributes({ markup: hidden, id: topic.id }),
        /opacity="0"/,
      ),
    );
  assert.match(
    SvgAttributes.fromMarker({ markup: held, marker: "outside-caption" }),
    /opacity="1"/,
  );
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
  rules.forEach(([, y]) => assert.ok(Number(y) < -16));
});

test("five excluded topics retain separate positions outside one included topic", () => {
  const input = {
    ...fixtures[2].input,
    topics: fixtures[2].input.topics.map((topic, index) => ({
      ...topic,
      included: index === 0,
    })),
  };
  assert.deepEqual(inputSchema.parse(input), input);
  const markup = _render({ frame: 150, input: input });
  const positions = new Set<string>();
  input.topics
    .filter((topic) => !topic.included)
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
