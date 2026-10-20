import assert from "node:assert/strict";
import test from "node:test";
import { prop } from "@avandar/utils";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { registerStockPresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { StreetShadeInstallation } from "./StreetShadeInstallation";
import {
  DEFAULT_INPUT,
  CHANGED_INPUT,
  fixtures,
  invalidInputs,
} from "./StreetShadeInstallation.fixtures";
import type { PresetAssertions } from "../../../../tests/helpers/registerStockPresetAssertions";
function _render({
  frame,
  input = DEFAULT_INPUT,
}: Readonly<{ frame: number; input?: typeof DEFAULT_INPUT }>) {
  return renderToStaticMarkup(
    createElement(
      "svg",
      {},
      createElement(StreetShadeInstallation, {
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
  const attributes = SvgAttributes.fromMarker({
    markup: markup,
    marker: "shaded",
  });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "data-quantity" }),
    130,
  );
  assert.notEqual(markup, _render({ frame: 24, input: CHANGED_INPUT }));
});

test("the physical object changes geometry while preserving its intact extent", () => {
  const before = SvgAttributes.fromMarker({
    markup: _render({ frame: 24 }),
    marker: "footprint",
  });
  const after = SvgAttributes.fromMarker({
    markup: _render({ frame: 150 }),
    marker: "footprint",
  });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "width" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "height" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "height" }),
  );
});

import { registerStockTextLayoutAssertions } from "../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { streetShadeInstallationContract } from "./StreetShadeInstallation.contract";
import { inputSchema, type Input } from "./StreetShadeInstallation.schema";
function _getVisibleTexts({
  input,
  frame,
}: Readonly<{ input: Input; frame: number }>) {
  const total = input.zones.reduce((sum, zone) => sum + zone.areaM2, 0);
  const shaded =
    input.zones.reduce((sum, zone) => sum + zone.existingShadeM2, 0) +
    input.installations.reduce((sum, item) => sum + item.addedShadeM2, 0);
  return [
    input.copy.map,
    input.referenceCondition,
    input.decision.actorLabel,
    input.decision.actionLabel,
    input.copy.existing,
    input.copy.added,
    input.copy[input.decision.stage],
    ...input.zones.map(prop("label")),
    ...input.installations.map(prop("label")),
    ...(input.showAreaBalance
      ? [
          `${input.copy.shaded}: ${shaded} + ${input.copy.unshaded}: ${total - shaded} = ${total} ${input.copy.unit}`,
        ]
      : []),
    input.copy.disclaimer,
  ];
}
const options = {
  inputSchema,
  defaultInput: DEFAULT_INPUT,
  fixtures,
  invalidInputs,
  contract: streetShadeInstallationContract,
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

test("concentrated installations tile their actual zone without covering unchanged neighbors", () => {
  fixtures.forEach(({ input }) => {
    Array.from(
      { length: Math.max(0, Math.floor((120 - 24) / 0.5) + 1) },
      (_, sampleIndex) => 24 + sampleIndex * 0.5,
    ).forEach((frame) => {
      const markup = _render({ frame: frame, input: input });
      input.zones.forEach((zone, index) => {
        const ground = markup.match(
          new RegExp(`<rect[^>]*data-ground="${index}"[^>]*>`),
        )![0];
        assert.equal(
          SvgAttributes.getNumberFromMarkup({
            attributes: ground,
            name: "width",
          }),
          600,
        );
        const additions = input.installations
          .map((item, itemIndex) => ({ item, itemIndex }))
          .filter(({ item }) => item.zoneId === zone.id);
        let right = 285 + (zone.existingShadeM2 / zone.areaM2) * 600;
        additions.forEach(({ itemIndex }) => {
          const footprint = markup.match(
            new RegExp(`<rect[^>]*data-footprint="${itemIndex}"[^>]*>`),
          )![0];
          const left = SvgAttributes.getNumberFromMarkup({
            attributes: footprint,
            name: "x",
          });
          const width = SvgAttributes.getNumberFromMarkup({
            attributes: footprint,
            name: "width",
          });
          assert.ok(left >= right - 1e-9);
          assert.ok(left + width <= 885 + 1e-9);
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: footprint,
              name: "y",
            }),
            165 + index * 65,
          );
          assert.equal(
            SvgAttributes.getNumberFromMarkup({
              attributes: footprint,
              name: "height",
            }),
            36,
          );
          right = left + width;
        });
      });
    });
    const held = _render({ frame: 150, input: input });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({
        attributes: SvgAttributes.fromMarker({
          markup: held,
          marker: "shaded",
        }),
        name: "data-denominator",
      }),
      input.zones.reduce((sum, zone) => sum + zone.areaM2, 0),
    );
  });
});
test("installation legend swatches visibly identify each actual ground footprint", () => {
  const input = fixtures[2].input;
  const markup = _render({ frame: 150, input: input });
  input.installations.forEach((_, index) => {
    const footprint = markup.match(
      new RegExp(`<rect[^>]*data-footprint="${index}"[^>]*>`),
    )![0];
    const key = markup.match(
      new RegExp(`<rect[^>]*data-installation-key="${index}"[^>]*>`),
    );
    assert.ok(key);
    assert.equal(
      footprint.match(/ fill="([^"]*)"/)![1],
      key[0].match(/ fill="([^"]*)"/)![1],
    );
  });
});
