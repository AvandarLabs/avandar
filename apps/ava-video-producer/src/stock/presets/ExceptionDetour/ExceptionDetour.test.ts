import assert from "node:assert/strict";
import test from "node:test";
import { propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ExceptionDetour } from "./ExceptionDetour";
import { exceptionDetourContract as contract } from "./ExceptionDetour.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "./ExceptionDetour.fixtures";
import { inputSchema } from "./ExceptionDetour.schema";
import type { Input } from "./ExceptionDetour.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(ExceptionDetour, {
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
  excludedTextFields: ["id", "detourSide"],
});

test("the exceptional case leaves an intact standard route and mirrors without swapping outcomes", () => {
  const early = _render({ frame: 48 });
  const held = _render({ frame: 150 });
  const above = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, detourSide: "above" },
  });
  const standard = SvgAttributes.fromMarker({
    markup: held,
    marker: "standard-route",
  });
  assert.match(standard, /d="M100 300 H880"/);
  assert.equal(
    SvgAttributes.fromMarker({ markup: above, marker: "standard-route" }),
    standard,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: early,
        marker: "moving-case",
      }),
      name: "cx",
    }),
    420,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: early,
        marker: "moving-case",
      }),
      name: "cy",
    }),
    300,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: held,
        marker: "moving-case",
      }),
      name: "cx",
    }),
    670,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: held,
        marker: "moving-case",
      }),
      name: "cy",
    }),
    420,
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: above,
        marker: "moving-case",
      }),
      name: "cy",
    }),
    180,
  );
  [held, above].forEach((markup) => {
    assert.match(markup, /data-standard-outcome="true"/);
    assert.ok(markup.includes(DEFAULT_INPUT.rule.outcome));
    assert.ok(markup.includes(DEFAULT_INPUT.exception.outcome));
  });
  assert.match(held, /data-standard-reference=/);
  assert.doesNotMatch(
    _render({
      frame: 150,
      input: { ...DEFAULT_INPUT, showStandardReference: false },
    }),
    /data-standard-reference=/,
  );
  assert.match(held, /data-resolved-bracket="true"[^>]*opacity="1"/);
  assert.notEqual(early, held);
});

test("the standard outcome stays on the side opposite either detour", () => {
  ["above", "below"].forEach((detourSide) => {
    const markup = _render({
      frame: 150,
      input: {
        ...fixtures[2].input,
        detourSide: detourSide as Input["detourSide"],
      },
    });
    const label = markup.match(
      /data-standard-outcome="true"><text([^>]*)>(.*?)<\/text>/,
    );
    assert.ok(label);
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: label[1],
      name: "y",
    });
    const size = SvgAttributes.getNumberFromMarkup({
      attributes: label[1],
      name: "font-size",
    });
    const numLabelLines = (label[2].match(/<tspan/g) ?? []).length;
    assert.ok(
      detourSide === "above"
        ? y - size > 300
        : y + (numLabelLines - 1) * size * 1.3 + 4 < 300,
    );
  });
});

test("the complete exception-route label clears the uninterrupted detour curve on either side", async () => {
  const { ExceptionCondition } = await import("./ExceptionCondition");
  const { SvgPaintAssertions } =
    await import("../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  [
    contract.defaultInput,
    contract.fixtures.find(propEq("id", "dense"))!.input,
  ].forEach((source) => {
    (["above", "below"] as const).forEach((detourSide) => {
      const input = { ...source, detourSide };
      const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        renderToStaticMarkup(
          createElement(ExceptionCondition, {
            input,
            targetY: detourSide === "above" ? 180 : 420,
          }),
        ),
      );
      const labelLines = paint.filter(
        (item) => item.kind === "text" && item.left > 350,
      );
      assert.ok(labelLines.length > 0);
      labelLines.forEach((line) =>
        assert.ok(
          detourSide === "above" ? line.bottom < 178 : line.top > 422,
          "The complete route label clears the curve's full vertical extent",
        ),
      );
      assert.equal(
        paint.filter(propEq("kind", "rect")).length,
        0,
        "Labels do not erase the continuous route",
      );
    });
  });
});
