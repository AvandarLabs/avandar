import assert from "node:assert/strict";
import test from "node:test";
import { prop, propEq } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ExpiringLease } from "./ExpiringLease";
import { expiringLeaseContract } from "./ExpiringLease.contract";
import { DEFAULT_INPUT, fixtures } from "./ExpiringLease.fixtures";
import { inputSchema, type Input } from "./ExpiringLease.schema";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: Input }>): string {
  return renderToStaticMarkup(
    createElement(
      "svg",
      { viewBox: "0 0 960 600" },
      createElement(ExpiringLease, {
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
  frame,
}: Readonly<{ input: Input; frame: number }>): string[] {
  if (!input.showLabels) {
    return [];
  }
  return [
    input.permissionLabel,
    input.copy.dock,
    input.copy.example,
    ...input.participants.map(prop("label")),
    ...(frame < 108
      ? [input.copy.held]
      : [input.copy.expired, input.copy.unassigned]),
    ...(input.showLifetime ? [input.lifetime.unit] : []),
  ];
}
registerStockPresetAssertions({
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  contract: expiringLeaseContract,
  render: _render,
  excludedTextFields: ["id", "holderId"],
  getVisibleTexts: _getVisibleTextsFromInput,
  textFrames: [36, 150],
  invalidInputs: [
    {},
    { ...DEFAULT_INPUT, extra: true },
    { ...DEFAULT_INPUT, holderId: "missing" },
    {
      ...DEFAULT_INPUT,
      participants: [
        DEFAULT_INPUT.participants[0],
        DEFAULT_INPUT.participants[0],
      ],
    },
    { ...DEFAULT_INPUT, lifetime: { value: 0, unit: "turns" } },
    { ...DEFAULT_INPUT, lifetime: { value: 9, unit: "turns" } },
    { ...DEFAULT_INPUT, lifetime: { value: 1.5, unit: "turns" } },
    { ...DEFAULT_INPUT, lifetime: { value: 2, unit: "" } },
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
test("exactly one holder loses its single token at expiry without a successor", () => {
  [
    DEFAULT_INPUT,
    fixtures[1].input,
    fixtures[2].input,
    fixtures[3].input,
  ].forEach((input) => {
    [0, 36, 107].forEach((frame) => {
      assert.equal(
        _getMarkedElementsFromMarkup({
          markup: _render({ frame: frame, input: input }),
          field: "socket-owner",
        }).length,
        1,
      );
      assert.ok(
        _getMarkedElementsFromMarkup({
          markup: _render({ frame: frame, input: input }),
          field: "socket-owner",
        })[0].includes(`data-socket-owner="${input.holderId}"`),
      );
    });
    [108, 120, 136, 150, 166].forEach((frame) => {
      assert.equal(
        _getMarkedElementsFromMarkup({
          markup: _render({ frame: frame, input: input }),
          field: "socket-owner",
        }).length,
        0,
      );
      assert.equal(
        _getMarkedElementsFromMarkup({
          markup: _render({ frame: frame, input: input }),
          field: "permission-token",
        }).length,
        1,
      );
    });
    const token = SvgAttributes.fromMarker({
      markup: _render({ frame: 150, input: input }),
      marker: "permission-token",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: token, name: "cx" }),
      480,
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: token, name: "cy" }),
      430,
    );
  });
});
test("finite collar segments drain at evenly spaced beats and stay empty after return", () => {
  const input = fixtures[2].input;
  [36, 45, 54, 63, 72, 81, 90, 99, 108, 150].forEach((frame, index) => {
    const segments = _getMarkedElementsFromMarkup({
      markup: _render({ frame: frame, input: input }),
      field: "lifetime-segment",
    });
    assert.equal(segments.length, 8);
    assert.equal(
      segments.filter((element) => element.includes('data-active="true"'))
        .length,
      Math.max(0, 8 - index),
    );
  });
  assert.equal(
    _getMarkedElementsFromMarkup({
      markup: _render({ frame: 36, input: { ...input, showLifetime: false } }),
      field: "lifetime-segment",
    }).length,
    0,
  );
});
test("dense socket arcs and returned token stay within the canvas through all holder choices", () => {
  const input = fixtures[2].input;
  input.participants.forEach(({ id }) => {
    [12, 14, 16, 18, 36, 108, 115, 122, 129, 136, 166].forEach((frame) => {
      const markup = _render({
        frame: frame,
        input: { ...input, holderId: id },
      });
      assert.equal(
        _getMarkedElementsFromMarkup({ markup, field: "socket" }).length,
        4,
      );
      assert.equal(
        _getMarkedElementsFromMarkup({ markup, field: "permission-token" })
          .length,
        1,
      );
      _getMarkedElementsFromMarkup({ markup, field: "socket" })
        .concat(
          _getMarkedElementsFromMarkup({ markup, field: "permission-token" }),
        )
        .forEach((element) => {
          assert.ok(
            SvgAttributes.getNumberFromMarkup({
              attributes: element,
              name: "cx",
            }) >= 60 &&
              SvgAttributes.getNumberFromMarkup({
                attributes: element,
                name: "cx",
              }) <= 900,
          );
          assert.ok(
            SvgAttributes.getNumberFromMarkup({
              attributes: element,
              name: "cy",
            }) >= 60 &&
              SvgAttributes.getNumberFromMarkup({
                attributes: element,
                name: "cy",
              }) <= 540,
          );
        });
    });
  });
});

test("hiding labels preserves expiry and the optional collar independently", () => {
  const hiddenLabels = _render({
    frame: 36,
    input: { ...DEFAULT_INPUT, showLabels: false },
  });
  assert.doesNotMatch(hiddenLabels, /aria-label=/);
  assert.equal(
    _getMarkedElementsFromMarkup({
      markup: hiddenLabels,
      field: "lifetime-segment",
    }).length,
    4,
  );
  const hiddenLifetime = _render({
    frame: 150,
    input: { ...DEFAULT_INPUT, showLifetime: false },
  });
  assert.doesNotMatch(hiddenLifetime, /data-lifetime-segment=/);
  assert.ok(
    !hiddenLifetime.includes(`aria-label="${DEFAULT_INPUT.lifetime.unit}"`),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({
        markup: hiddenLifetime,
        marker: "permission-token",
      }),
      name: "cy",
    }),
    430,
  );
});

test("the full lifetime value and unit clear every supported holder route and collar", async () => {
  const { LeaseCaptions } = await import("./LeaseCaptions");
  const { expiringLeaseContract: correctionContract } =
    await import("./ExpiringLease.contract");
  const { SvgPaintAssertions } =
    await import("../../../../tests/helpers/SvgPaintAssertions/SvgPaintAssertions");
  const source = correctionContract.fixtures.find(propEq("id", "dense"))!.input;
  [2, 3, 4].forEach((numParticipants) => {
    const participants = source.participants.slice(0, numParticipants);
    participants.forEach((holder) => {
      const input = {
        ...source,
        participants,
        holderId: holder.id,
        showLabels: true,
        showLifetime: true,
      };
      const paint = SvgPaintAssertions.getVisiblePaintEnvelopesFromMarkup(
        renderToStaticMarkup(
          createElement(LeaseCaptions, { input, frame: 150 }),
        ),
      );
      const lines = paint.filter(propEq("ariaLabel", input.lifetime.unit));
      assert.ok(lines.length > 0);
      lines.forEach((line) =>
        assert.ok(
          line.top > 134 && line.bottom < 158 && line.right < 430,
          "Lifetime copy stays above all routes and clear of the middle collar",
        ),
      );
      assert.equal(
        paint.filter(propEq("kind", "rect")).length,
        0,
        "No route is erased to clear lifetime text",
      );
    });
  });
});
