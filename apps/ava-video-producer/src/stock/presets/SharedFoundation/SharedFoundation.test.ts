import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { SharedFoundation } from "./SharedFoundation";
import { sharedFoundationContract as contract } from "./SharedFoundation.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./SharedFoundation.fixtures";
import { inputSchema } from "./SharedFoundation.schema";
import type { Input } from "./SharedFoundation.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(SharedFoundation, {
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
  excludedTextFields: ["id", "foundationReveal"],
});

test("two distinct approaches reconnect to one changing common foundation", () => {
  const held = _render({ frame: 150 });
  const changed = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      sharedPrinciple: "A different authored purpose",
    },
  });
  assert.equal((held.match(/data-approach=/g) ?? []).length, 2);
  assert.equal((held.match(/data-foundation-support=/g) ?? []).length, 2);
  assert.equal((held.match(/data-shared-principle=/g) ?? []).length, 1);
  DEFAULT_INPUT.approaches.forEach(({ id, label, distinction }) => {
    assert.ok(changed.includes(`data-approach="${id}"`));
    assert.ok(changed.includes(`aria-label="${label}"`));
    assert.ok(changed.includes(`aria-label="${distinction}"`));
  });
  assert.ok(changed.includes("A different authored purpose"));
  assert.ok(!changed.includes(DEFAULT_INPUT.sharedPrinciple));
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: held,
        marker: "foundation-left",
      }),
      name: "width",
    }),
    400,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: held,
        marker: "foundation-right",
      }),
      name: "x",
    }),
    480,
  );
  const joining = _render({ frame: 72 });
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: joining,
        marker: "foundation-left",
      }),
      name: "width",
    }) < 400,
  );
  const uncover = _render({
    frame: 150,
    input: {
      ...DEFAULT_INPUT,
      foundationReveal: "uncover",
    },
  });
  assert.match(uncover, /data-continuous-foundation=/);
  assert.doesNotMatch(uncover, /data-foundation-left=/);
  assert.match(
    SvgAttributes.fromMarker({
      markup: _render({
        frame: 150,
        input: { ...DEFAULT_INPUT, showDistinctTraits: false },
      }),
      marker: "trait-0",
    }),
    /opacity="0"/,
  );
  assert.match(
    SvgAttributes.fromMarker({ markup: held, marker: "trait-0" }),
    /opacity="1"/,
  );
});

test("supports reconnect only after the foundation fragments have joined", () => {
  const before = _render({ frame: 96 });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: before,
        marker: "foundation-support",
      }),
      name: "y2",
    }),
    330,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 108 }),
        marker: "foundation-support",
      }),
      name: "y2",
    }),
    330,
  );
  assert.ok(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: _render({ frame: 114 }),
        marker: "foundation-support",
      }),
      name: "y2",
    }) > 330,
  );
});
