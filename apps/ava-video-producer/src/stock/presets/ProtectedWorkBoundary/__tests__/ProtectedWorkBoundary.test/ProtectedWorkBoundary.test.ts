import { ProtectedWorkBoundaryTestState } from "./ProtectedWorkBoundaryTestState";

const { render: _render, options } = ProtectedWorkBoundaryTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { protectedWorkBoundaryContract } from "../../ProtectedWorkBoundary.contract";
import {
  DEFAULT_INPUT,
  fixtures,
  invalidInputs,
} from "../../ProtectedWorkBoundary.fixtures";
import { type Input } from "../../ProtectedWorkBoundary.schema";
import { assertEightBlocksKeepEqualPattern as _assertEightBlocksKeepEqualPattern } from "./assertEightBlocksKeepEqualPattern";

registerStockPresetAssertions({
  ...options,
  defaultInput: DEFAULT_INPUT,
  invalidInputs,
  contract: protectedWorkBoundaryContract,
});

registerStockTextLayoutAssertions({
  ...options,
  getVisibleTexts: ({
    input,
    frame,
  }: Readonly<{ input: Input; frame: number }>) => {
    return frame >= 141 ? options.getVisibleTexts({ input: input }) : [];
  },
});

test("existing slots retain kind and commitment while the request remains outstanding", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    [38, 60, 76, 105, 130, 150].forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      input.slots.forEach((slot) => {
        return assert.ok(
          markup.includes(
            `data-slot="${slot.id}" data-kind="${slot.kind}" data-commitment="${slot.workLabel ?? ""}"`,
          ),
        );
      });
    });
    const markup = _render({ frame: 150, input: input });
    assert.match(
      markup,
      new RegExp(`data-request="${input.request.placement}"`),
    );
    assert.match(markup, /data-request-outstanding="true"/);
  });
});

test("worker lifts a request clear of protected time and moves it to the actual destination", () => {
  [DEFAULT_INPUT, fixtures[2].input, fixtures[3].input].forEach((input) => {
    [39, 50, 60, 76, 90].forEach((frame) => {
      const marker = SvgAttributes.fromMarker({
        markup: _render({ frame: frame, input: input }),
        marker: "request-body",
      });
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: marker,
            name: "height",
          }) <
          210,
      );
      const hand = SvgAttributes.fromMarker({
        markup: _render({ frame: frame, input: input }),
        marker: "worker-hand",
      });
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
        SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "x" }),
      );
      assert.equal(
        SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
        SvgAttributes.getNumberFromMarkup({ attributes: marker, name: "y" }) +
          12,
      );
    });
  });
  assert.doesNotMatch(
    _render({ frame: 150, input: fixtures[3].input }),
    /data-slot-label=/,
  );
  const settled = SvgAttributes.fromMarker({
    markup: _render({ frame: 150, input: fixtures[3].input }),
    marker: "request-body",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: settled, name: "y" }),
    400,
  );
});

test("the reschedule caption is physically linked to the chosen work slot", () => {
  const markup = _render({ frame: 150, input: fixtures[3].input });
  assert.match(markup, /data-disposition-link="empty"/);
  assert.match(markup, /data-disposition-caption="reschedule"/);
  const body = SvgAttributes.fromMarker({ markup, marker: "request-body" });
  const link = SvgAttributes.fromMarker({ markup, marker: "disposition-link" });
  const center =
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "x" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "width" }) / 2;
  const bottom =
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }) +
    SvgAttributes.getNumberFromMarkup({ attributes: body, name: "height" });
  assert.ok(link.includes(`d="M${center} ${bottom} V518 H50 V522"`));
  assert.ok(bottom <= 510);
});

test("all eight blocks keep equal size across both patterns and every disposition frame", () => {
  ["hatch", "dots"].forEach((pattern) => {
    return _assertEightBlocksKeepEqualPattern(pattern);
  });
});

test("dense slot names clear their protected-kind caption band", () => {
  const label = `界 ${"界".repeat(6)} ${"界".repeat(13)}`;
  const input = {
    ...fixtures[2].input,
    slots: fixtures[2].input.slots.map((slot) => {
      return { ...slot, label };
    }),
  };
  const text = _render({ frame: 150, input: input }).match(
    /<text aria-label="[^"]+" x="58" y="[^"]+"[^>]*>(.*?)<\/text>/s,
  );
  assert.ok(text);
  const lines = (text[1].match(/<tspan /g) ?? []).length;
  assert.ok(
    SvgAttributes.getNumberFromMarkup({ attributes: text[0], name: "y" }) +
      (lines - 1) * 15.6 +
      3 <
      310 - 12,
  );
});

test("request travel clears the protected-time caption above the strip", () => {
  [DEFAULT_INPUT, fixtures[2].input].forEach((input) => {
    [39, 60, 76, 90, 104].forEach((frame) => {
      const body = SvgAttributes.fromMarker({
        markup: _render({ frame: frame, input: input }),
        marker: "request-body",
      });
      assert.ok(
        SvgAttributes.getNumberFromMarkup({ attributes: body, name: "y" }) +
          SvgAttributes.getNumberFromMarkup({
            attributes: body,
            name: "height",
          }) <
          195 - 12,
      );
    });
  });
});

test("the carrying hand stays visible over opaque schedule blocks during landing", () => {
  const markup = _render({ frame: 118, input: fixtures[3].input });
  assert.ok(
    markup.indexOf("data-worker-hand=") > markup.lastIndexOf("data-slot-body="),
  );
});
