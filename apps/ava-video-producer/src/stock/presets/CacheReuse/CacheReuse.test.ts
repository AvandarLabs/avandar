import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { CacheReuse } from "./CacheReuse";
import { cacheReuseContract } from "./CacheReuse.contract";
import { DEFAULT_INPUT, FIXTURES } from "./CacheReuse.fixtures";
import { inputSchema, type Input } from "./CacheReuse.schema";

function _render({
  frame,
  input,
}: Readonly<{ frame: number; input: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(CacheReuse, {
        frame,
        input,
        id: "test",
        accent: "#65e2bf",
      }),
    ),
  );
}
function _texts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  return [
    input.request.label,
    input.request.key,
    ...Object.values(input.systemLabels),
    input.result.label,
    input.result.value,
    ...(input.showPathLabels
      ? [
          frame < 68
            ? input.pathLabels.miss
            : frame < 102
              ? input.pathLabels.store
              : input.pathLabels.hit,
        ]
      : []),
  ];
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures: FIXTURES,
  contract: cacheReuseContract,
  render: _render,
  excludedTextFields: [],
  getVisibleTexts: _texts,
  textFrames: [60, 90, 150],
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, request: { ...DEFAULT_INPUT.request, key: "" } },
    {
      ...DEFAULT_INPUT,
      result: { ...DEFAULT_INPUT.result, value: "W".repeat(29) },
    },
  ],
});
test("the miss visits origin before the exact keyed result becomes resident", () => {
  assert.doesNotMatch(
    _render({ frame: 40, input: DEFAULT_INPUT }),
    /data-stored-entry=/,
  );
  const origin = SvgAttributes.fromMarker({
    markup: _render({ frame: 60, input: DEFAULT_INPUT }),
    marker: "origin-panel",
  });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: origin,
      name: "stroke-opacity",
    }) > 0.9,
  );
  assert.match(
    _render({ frame: 92, input: DEFAULT_INPUT }),
    /data-stored-entry="tile:7"/,
  );
});
test("the repeat request stays on the local cache route and returns the stored value", () => {
  [108, 120, 132, 138].forEach((frame) => {
    const markup = _render({ frame: frame, input: DEFAULT_INPUT });
    const token = SvgAttributes.fromMarker({ markup, marker: "lookup-token" });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: token, name: "cy" }),
      290,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup,
          marker: "origin-panel",
        }),
        name: "stroke-opacity",
      }),
      0.2,
    );
  });
  const markup = _render({ frame: 150, input: DEFAULT_INPUT });
  assert.equal([...markup.matchAll(/data-response-key="tile:7"/g)].length, 1);
  assert.match(markup, /data-response-value="Sample tile"/);
  assert.match(markup, /data-stored-value="Sample tile"/);
});
test("literal whitespace keys remain exact and raw value slots fit maximum data", () => {
  const input = {
    ...DEFAULT_INPUT,
    request: { key: "A B\tC\nD", label: "Lookup" },
    result: { label: "Value", value: "界".repeat(28) },
  };
  const markup = _render({ frame: 150, input: input });
  assert.match(markup, /data-literal-value="A B\tC\nD"/);
  const cache = SvgAttributes.fromMarker({ markup, marker: "cache-panel" });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: cache, name: "width" }) >=
      28 * 13.2 + 40,
  );
  assert.match(markup, /text-decoration="underline"/);
});
test("the first delivered response remains present while the same key is looked up again", () => {
  [92, 101, 102, 118, 138, 150].forEach((frame) => {
    const markup = _render({ frame: frame, input: DEFAULT_INPUT });
    const response = SvgAttributes.fromMarker({
      markup,
      marker: "response-key",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: response,
        name: "opacity",
      }),
      1,
    );
  });
});
test("hidden stored values preserve the key and result identity without explanatory captions", () => {
  const markup = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      showStoredValue: false,
      showPathLabels: false,
    },
  });
  assert.equal(
    [...markup.matchAll(/data-literal-value="Sample tile"/g)].length,
    2,
  );
  assert.match(markup, /data-stored-entry="tile:7"/);
  assert.doesNotMatch(markup, /aria-label="Use stored copy"/);
});
test("both returning journeys carry the authored result while outgoing requests carry only the key", () => {
  [62, 82, 128].forEach((frame) =>
    assert.match(
      _render({ frame: frame, input: DEFAULT_INPUT }),
      /data-carried-result="Sample tile"/,
    ),
  );
  [36, 110].forEach((frame) =>
    assert.doesNotMatch(
      _render({ frame: frame, input: DEFAULT_INPUT }),
      /data-carried-result=/,
    ),
  );
});
