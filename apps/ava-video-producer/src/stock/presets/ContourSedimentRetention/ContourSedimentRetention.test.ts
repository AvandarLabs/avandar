import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { ContourSedimentRetention } from "./ContourSedimentRetention";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "./ContourSedimentRetention.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>) {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(ContourSedimentRetention, {
        frame,
        input,
        accent: "#78d4bc",
        id: "test",
      }),
    ),
  );
}
test("changed authored quantities reach their visible conserved destination", () => {
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  const attributes = SvgAttributes.fromMarker({ markup, marker: "exported" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "data-quantity" }),
    8,
  );
  assert.notEqual(markup, _render({ frame: 24, input: CHANGED_INPUT }));
});

test("the physical object changes geometry while preserving its intact extent", () => {
  const before = SvgAttributes.fromMarker({
    markup: _render({ frame: 24 }),
    marker: "treatment",
  });
  const after = SvgAttributes.fromMarker({
    markup: _render({ frame: 150 }),
    marker: "treatment",
  });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "x" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "x" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "width" }),
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { contourSedimentRetentionContract } from "./ContourSedimentRetention.contract";
import { inputSchema, type Input } from "./ContourSedimentRetention.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>) {
  const incoming = input.sediment.mobilizedKg;
  const retained = input.sediment.retainedKg;
  const exported = incoming - retained;
  return [
    ...Object.values(input.boundary),
    ...Object.values(input.decision),
    input.intervention.label,
    input.copy.boundary,
    input.copy.mobilized,
    input.copy.retained,
    input.copy.exported,
    ...[incoming, retained, exported].map(
      (value) => `${value} ${input.copy.unit}`,
    ),
    `${incoming} = ${retained} + ${exported} ${input.copy.unit}`,
    input.copy.disclaimer,
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: contourSedimentRetentionContract,
  render: _render,
  excludedTextFields: [
    "id",
    "initialHostId",
    "finalHostId",
    "zoneId",
    "kind",
    "route",
    "stage",
    "assemblyShape",
    "overflowSide",
    "emptyHostState",
  ],
  getVisibleTexts: _getVisibleTexts,
  textFrames: [24, 72, 150],
} satisfies PresetAssertions<Input>;
registerStockPresetAssertions(options);
registerStockTextLayoutAssertions(options);

test("the steward stays in contact with the treatment throughout placement", () => {
  Array.from(
    { length: Math.max(0, Math.floor((108 - 24) / 0.25) + 1) },
    (_, sampleIndex) => 24 + sampleIndex * 0.25,
  ).forEach((frame) => {
    const markup = _render({ frame: frame });
    const treatment = SvgAttributes.fromMarker({ markup, marker: "treatment" });
    const hand = SvgAttributes.fromMarker({ markup, marker: "hand" });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: treatment, name: "x" }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: treatment, name: "y" }) +
        12,
    );
    const head = SvgAttributes.fromMarker({ markup, marker: "steward-head" });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: head, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: treatment, name: "x" }) -
        35,
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: head, name: "cy" }) - 8 >
        100,
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: treatment, name: "y" }) +
        65 <
        380,
    );
  });
});
test("settled retained material stays upstream while export remains past the boundary without its tray", () => {
  fixtures.forEach(({ input }) => {
    const markup = _render({ frame: 150, input: input });
    const retained = SvgAttributes.fromMarker({
      markup,
      marker: "retained-ribbon",
    });
    const exported = SvgAttributes.fromMarker({
      markup,
      marker: "exported-ribbon",
    });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: retained, name: "x" }) +
        SvgAttributes.getNumberFromMarkup({
          attributes: retained,
          name: "width",
        }),
      510,
    );
    assert.ok(
      SvgAttributes.getNumberFromMarkup({ attributes: exported, name: "x" }) >
        750,
    );
    assert.ok(
      Math.abs(
        SvgAttributes.getNumberFromMarkup({
          attributes: retained,
          name: "width",
        }) /
          160 +
          SvgAttributes.getNumberFromMarkup({
            attributes: exported,
            name: "width",
          }) /
            130 -
          1,
      ) < 1e-12,
    );
    assert.equal(markup.includes("data-export-tray="), input.showExportTray);
    assert.ok(
      markup.includes(
        `aria-label="${input.sediment.mobilizedKg - input.sediment.retainedKg} ${input.copy.unit}"`,
      ),
    );
    const alternate = {
      ...input,
      intervention: {
        ...input.intervention,
        kind:
          input.intervention.kind === "stone-bund"
            ? ("vegetated-strip" as const)
            : ("stone-bund" as const),
      },
    };
    assert.equal(
      SvgAttributes.fromMarker({
        markup: _render({ frame: 150, input: alternate }),
        marker: "retained-ribbon",
      }),
      retained,
    );
  });
});

test("the complete intervention caption clears the slope and quantity captions", () => {
  const markup = _render({ frame: 150, input: fixtures[2].input });
  const label = markup.match(
    /<text[^>]* x="365" y="(\d+)"[^>]*>(.*?)<\/text>/,
  )!;
  const baseline = Number(label[1]);
  const bottom =
    baseline +
    [...label[2].matchAll(/dy="([^"]+)"/g)].reduce(
      (sum, match) => sum + Number(match[1]),
      0,
    ) +
    3.6;
  assert.ok(baseline - 12 > 415);
  assert.ok(bottom < 470 - 12);
});

test("the entire exported ribbon clears the placed treatment while retained material stops against it", () => {
  Array.from(fixtures).forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((108 - 60) / 0.25) + 1) },
      (_, sampleIndex) => 60 + sampleIndex * 0.25,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      const ribbon = SvgAttributes.fromMarker({
        markup,
        marker: "exported-ribbon",
      });
      const treatment = SvgAttributes.fromMarker({
        markup,
        marker: "treatment",
      });
      const width = SvgAttributes.getNumberFromMarkup({
        attributes: ribbon,
        name: "width",
      });
      if (width === 0) {
        return;
      }
      const left = SvgAttributes.getNumberFromMarkup({
        attributes: ribbon,
        name: "x",
      });
      const top = SvgAttributes.getNumberFromMarkup({
        attributes: ribbon,
        name: "y",
      });
      assert.ok(
        left + width <=
          SvgAttributes.getNumberFromMarkup({
            attributes: treatment,
            name: "x",
          }) ||
          left >=
            SvgAttributes.getNumberFromMarkup({
              attributes: treatment,
              name: "x",
            }) +
              24 ||
          top >=
            SvgAttributes.getNumberFromMarkup({
              attributes: treatment,
              name: "y",
            }) +
              65,
        `ribbon intersects treatment at ${frame}`,
      );
    });
  });
});
