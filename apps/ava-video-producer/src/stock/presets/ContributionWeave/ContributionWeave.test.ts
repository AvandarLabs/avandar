import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ContributionWeave } from "./ContributionWeave";
import { contributionWeaveContract } from "./ContributionWeave.contract";
import { DEFAULT_INPUT, fixtures } from "./ContributionWeave.fixtures";
import { inputSchema, type Input } from "./ContributionWeave.schema";

function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(ContributionWeave, {
        frame,
        input,
        accent: "#9fefca",
        id: "test",
      }),
    ),
  );
}
function _getVisibleTextsFromInput({
  input,
}: Readonly<{ input: Input }>): string[] {
  return input.showLabels
    ? [...input.warp, ...input.weft]
        .map(prop("label"))
        .concat(Object.values(input.copy))
    : [];
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: contributionWeaveContract,
  render: _render,
  excludedTextFields: ["id", "pattern", "weaveStart"],
  getVisibleTexts: _getVisibleTextsFromInput,
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, warp: [] },
    {
      ...DEFAULT_INPUT,
      weft: [
        { ...DEFAULT_INPUT.weft[0], id: DEFAULT_INPUT.warp[0].id },
        DEFAULT_INPUT.weft[1],
      ],
    },
    {
      ...DEFAULT_INPUT,
      weft: [
        { ...DEFAULT_INPUT.weft[0], pattern: "unknown" },
        DEFAULT_INPUT.weft[1],
      ],
    },
    {
      ...DEFAULT_INPUT,
      copy: { ...DEFAULT_INPUT.copy, result: "W".repeat(35) },
    },
  ],
});
function _getMarkedElementsFromMarkup({
  markup,
  field,
}: {
  markup: string;
  field: string;
}): string[] {
  return (markup.match(/<[^>]+>/g) ?? []).filter((element) =>
    element.includes(`data-${field}=`),
  );
}
test("every contributor retains one identifiable end through the completed fabric", () => {
  const input = fixtures[2].input;
  const ends = _getMarkedElementsFromMarkup({
    markup: _render({ frame: 150, input: input }),
    field: "contributor-end",
  });
  assert.equal(ends.length, 6);
  [...input.warp, ...input.weft].forEach(({ id }) =>
    assert.equal(
      ends.filter((element) => element.includes(`data-contributor-end="${id}"`))
        .length,
      1,
    ),
  );
  assert.equal(
    _getMarkedElementsFromMarkup({
      markup: _render({
        frame: 150,
        input: { ...input, showContributorEnds: false },
      }),
      field: "contributor-end",
    }).length,
    0,
  );
});
test("alternating crossing patches change their visible owner when weaveStart reverses", () => {
  const over = _getMarkedElementsFromMarkup({
    markup: _render({ frame: 150 }),
    field: "crossing",
  });
  const under = _getMarkedElementsFromMarkup({
    markup: _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, weaveStart: "under-first" },
    }),
    field: "crossing",
  });
  assert.equal(over.length, 4);
  ["words", "facts", "structure", "layout"].forEach((owner, index) =>
    assert.ok(over[index].includes(`data-over="${owner}"`)),
  );
  ["structure", "words", "layout", "facts"].forEach((owner, index) =>
    assert.ok(under[index].includes(`data-over="${owner}"`)),
  );
  assert.notEqual(
    over[0].match(/fill="([^"]+)"/)?.[1],
    under[0].match(/fill="([^"]+)"/)?.[1],
  );
});
test("each dense shuttle sweeps once after the previous contribution with bounded travel", () => {
  const input = fixtures[2].input;
  [12, 14, 16, 36, 60, 84, 108, 150, 166].forEach((frame) => {
    const bands = _getMarkedElementsFromMarkup({
      markup: _render({ frame: frame, input: input }),
      field: "weft-band",
    });
    assert.equal(bands.length, 3);
    bands.forEach((element) => {
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: element, name: "x" }),
        330,
      );
      assert.ok(
        SvgAttributes.getNumberFromMarkup({
          attributes: element,
          name: "width",
        }) >= 0 &&
          SvgAttributes.getNumberFromMarkup({
            attributes: element,
            name: "width",
          }) <= 530,
      );
    });
  });
  const midway = _getMarkedElementsFromMarkup({
    markup: _render({ frame: 60, input: input }),
    field: "weft-band",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: midway[0], name: "width" }),
    530,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: midway[1], name: "width" }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: midway[2], name: "width" }),
    0,
  );
});

test("warp tension precedes every shuttle while hidden labels preserve the fabric", () => {
  const setup = _getMarkedElementsFromMarkup({
    markup: _render({ frame: 12 }),
    field: "warp-band",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: setup[0], name: "height" }),
    0,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: setup[1], name: "height" }),
    0,
  );
  _getMarkedElementsFromMarkup({
    markup: _render({ frame: 36 }),
    field: "warp-band",
  }).forEach((element) =>
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: element,
        name: "height",
      }),
      300,
    ),
  );
  const hidden = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showLabels: false },
  });
  assert.doesNotMatch(hidden, /aria-label=/);
  assert.equal(
    _getMarkedElementsFromMarkup({ markup: hidden, field: "crossing" }).length,
    4,
  );
});

test("unequal axis counts preserve exactly their supplied bands and crossings", () => {
  [
    { ...fixtures[2].input, warp: fixtures[2].input.warp.slice(0, 2) },
    { ...fixtures[2].input, weft: fixtures[2].input.weft.slice(0, 2) },
  ].forEach((input) => {
    assert.deepEqual(inputSchema.parse(input), input);
    const markup = _render({ frame: 150, input: input });
    assert.equal(
      _getMarkedElementsFromMarkup({ markup, field: "contributor-end" }).length,
      5,
    );
    assert.equal(
      _getMarkedElementsFromMarkup({ markup, field: "crossing" }).length,
      6,
    );
  });
});

test("two render namespaces retain valid unique fragments with empty and Unicode authored IDs", () => {
  const input = inputSchema.parse({
    ...DEFAULT_INPUT,
    warp: [
      { ...DEFAULT_INPUT.warp[0], id: "" },
      { ...DEFAULT_INPUT.warp[1], id: "space Ω" },
    ],
    weft: [
      { ...DEFAULT_INPUT.weft[0], id: "字 phrase" },
      { ...DEFAULT_INPUT.weft[1], id: "👩‍🔬" },
    ],
  });
  const markup = renderToStaticMarkup(
    createElement(
      "svg",
      {},
      ...["instance-a", "instance-b"].map((id) =>
        createElement(ContributionWeave, {
          key: id,
          id,
          input,
          frame: 150,
          accent: "#9fefca",
        }),
      ),
    ),
  );
  const fragmentIds = [...markup.matchAll(/\sid="([^"]+)"/g)].map(
    (match) => match[1],
  );
  assert.equal(fragmentIds.length, 12);
  assert.equal(new Set(fragmentIds).size, 12);
  fragmentIds.forEach((id) =>
    assert.match(id, /^instance-[ab]-(band|shuttle)-\d$/),
  );
  [...markup.matchAll(/url\(#([^)]+)\)/g)].forEach(([, reference]) =>
    assert.equal(fragmentIds.filter((id) => id === reference).length, 1),
  );
  ["", "space Ω", "字 phrase", "👩‍🔬"].forEach((id) =>
    assert.ok(markup.includes(`data-contributor-end="${id}"`)),
  );
});
