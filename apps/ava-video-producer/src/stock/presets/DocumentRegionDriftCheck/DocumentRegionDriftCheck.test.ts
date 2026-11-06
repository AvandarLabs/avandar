import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { DocumentRegionDriftCheck } from "./DocumentRegionDriftCheck";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./DocumentRegionDriftCheck.fixtures";
import { inputSchema, type Input } from "./DocumentRegionDriftCheck.schema";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";

const render = ({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string =>
  renderToStaticMarkup(
    createElement(DocumentRegionDriftCheck, {
      frame,
      input,
      accent: "#72d5bd",
      id: "packet27",
    }),
  );
function _marker({
  markup,
  key,
  value,
}: {
  markup: string;
  key: string;
  value: string;
}): string {
  const tags = [...markup.matchAll(/<[^>]+>/g)].map((match) => match[0]);
  const tag = tags.find((candidateTag) =>
    candidateTag.includes(`data-${key}="${value}"`),
  );
  assert.ok(tag, `${key} ${value}`);
  return tag;
}

test("exact header and fingerprint determine the review latch independently of ordinal", () => {
  assert.match(render({ frame: 150 }), /data-outcome="review"/);
  assert.match(
    render({ frame: 150, input: fixtures[3].input }),
    /data-outcome="matched"/,
  );
  const headerOnly = {
    ...DEFAULT_INPUT,
    current: {
      ...DEFAULT_INPUT.current,
      fingerprint: "FP-A",
      header: "Changed",
    },
  };
  assert.match(
    render({ frame: 150, input: headerOnly }),
    /data-header-match="false"/,
  );
  assert.match(
    render({ frame: 150, input: headerOnly }),
    /data-fingerprint-match="true"/,
  );
  assert.match(
    render({ frame: 150, input: headerOnly }),
    /data-outcome="review"/,
  );
  const base = _marker({
      markup: render({ frame: 150 }),
      key: "saved-region",
      value: "current",
    }),
    changed = _marker({
      markup: render({
        frame: 150,
        input: {
          ...DEFAULT_INPUT,
          current: { ...DEFAULT_INPUT.current, detectorOrdinal: 9 },
        },
      }),
      key: "saved-region",
      value: "current",
    });
  assert.equal(base, changed);
});
test("saved and current outlines register at exact supplied page coordinates even for tiny regions", () => {
  const input = fixtures[1].input,
    region = _marker({
      markup: render({ frame: 150, input: input }),
      key: "saved-region",
      value: "current",
    });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: region, name: "width" }),
    (input.saved.box[2] - input.saved.box[0]) * 3,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: region, name: "width" }) >
      0,
  );
  const start = _marker({
      markup: render({ frame: 13 }),
      key: "page-outline",
      value: "current",
    }),
    middle = _marker({
      markup: render({ frame: 32 }),
      key: "page-outline",
      value: "current",
    }),
    end = _marker({
      markup: render({ frame: 150 }),
      key: "page-outline",
      value: "current",
    });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: start, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x" }),
  );
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: middle, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: end, name: "x" }),
  );
});

import { registerStockLocalizationAssertions } from "../../../../tests/helpers/registerStockLocalizationAssertions";
import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { documentRegionDriftCheckContract as contract } from "./DocumentRegionDriftCheck.contract";

const EXCLUDED_TEXT_FIELDS: string[] = [];
const getVisibleTexts = ({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] => [
  ...Object.values(input.copy),
  input.labels.saved,
  input.labels.current,
  input.labels.geometry,
  input.saved.header,
  input.saved.fingerprint,
  input.current.header,
  input.current.fingerprint,
  ...(frame >= 139
    ? [
        input.saved.header === input.current.header &&
        input.saved.fingerprint === input.current.fingerprint
          ? input.labels.matched
          : input.labels.review,
      ]
    : []),
];
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract,
  render,
  excludedTextFields: EXCLUDED_TEXT_FIELDS,
  getVisibleTexts,
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);
registerStockLocalizationAssertions({
  contract,
  expectedTextPaths: [
    ["saved", "header"],
    ["saved", "fingerprint"],
    ["current", "header"],
    ["current", "fingerprint"],
    ["labels", "saved"],
    ["labels", "current"],
    ["labels", "matched"],
    ["labels", "review"],
    ["labels", "geometry"],
    ["copy", "context"],
    ["copy", "source"],
    ["copy", "result"],
  ],
  suppliedInputs: fixtures.map(prop("input")),
});
test("every required top-level field rejects omission", () => {
  Object.keys(DEFAULT_INPUT).forEach((key) => {
    const incomplete = { ...DEFAULT_INPUT };
    Reflect.deleteProperty(incomplete, key);
    assert.equal(inputSchema.safeParse(incomplete).success, false, key);
  });
});

test("exact empty headers match and whitespace-only changes hold replacement", () => {
  const input = fixtures[1].input;
  assert.match(render({ frame: 150, input: input }), /data-outcome="matched"/);
  assert.match(
    render({
      frame: 150,
      input: { ...input, current: { ...input.current, header: " " } },
    }),
    /data-outcome="review"/,
  );
  assert.match(
    render({
      frame: 150,
      input: {
        ...input,
        current: { ...input.current, detectorOrdinal: 9 },
      },
    }),
    /data-outcome="matched"/,
  );
});
test("saved geometry preserves full boundary extents while comparison captions remain outside", () => {
  const markup = render({ frame: 150, input: fixtures[2].input });
  ["saved", "current"].forEach((side) => {
    const page = _marker({ markup, key: "page-outline", value: side }),
      region = _marker({ markup, key: "saved-region", value: side });
    ["x", "y", "width", "height"].forEach((attribute) =>
      assert.equal(
        SvgAttributes.getNumberFromMarkup({
          attributes: region,
          name: attribute,
        }),
        SvgAttributes.getNumberFromMarkup({
          attributes: page,
          name: attribute,
        }),
      ),
    );
  });
  const closed = _marker({
      markup: render({ frame: 150 }),
      key: "review-latch",
      value: "left",
    }),
    open = _marker({
      markup: render({ frame: 101 }),
      key: "review-latch",
      value: "left",
    });
  assert.notEqual(closed, open);
});

test("serialized saved-region tuple retains exact four-coordinate cardinality", () => {
  const schema = JSON.parse(JSON.stringify(contract.jsonSchema));
  assert.equal(schema.properties.saved.properties.box.minItems, 4);
  assert.equal(schema.properties.saved.properties.box.maxItems, 4);
  assert.equal(schema.properties.saved.properties.box.items, false);
});
