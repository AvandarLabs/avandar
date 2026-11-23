import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { CHANGED_INPUT, fixtures } from "../StormwaterStorageSpill.fixtures";
import { REVIEW_FIXTURES } from "../StormwaterStorageSpill.reviewFixtures";
import { assertPhysicalWaterDestinationItsId as _assertPhysicalWaterDestinationItsId } from "./assertPhysicalWaterDestinationItsId";
import { assertWaterFractionsConserveInflowInput as _assertWaterFractionsConserveInflowInput } from "./assertWaterFractionsConserveInflowInput";
import { _render, options } from "./StormwaterStorageSpillTestHelpers";

test("changed authored quantities reach their visible conserved destination", () => {
  const markup = _render({ frame: 150, input: CHANGED_INPUT });
  const attributes = SvgAttributes.fromMarker({ markup, marker: "overflow" });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes, name: "data-quantity" }),
    50,
  );
  assert.notEqual(markup, _render({ frame: 24, input: CHANGED_INPUT }));
});

test("the physical object changes geometry while preserving its intact extent", () => {
  const before = SvgAttributes.fromMarker({
    markup: _render({ frame: 24 }),
    marker: "water",
  });
  const after = SvgAttributes.fromMarker({
    markup: _render({ frame: 150 }),
    marker: "water",
  });
  assert.notEqual(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "height" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "height" }),
  );
  assert.equal(
    SvgAttributes.getNumberFromMarkup({ attributes: before, name: "width" }),
    SvgAttributes.getNumberFromMarkup({ attributes: after, name: "width" }),
  );
});

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("water fractions conserve inflow without positive minima and spill after filling", () => {
  fixtures.forEach(({ input }) => {
    return _assertWaterFractionsConserveInflowInput(input);
  });
});

test("the operator physically holds the moving outlet handle", () => {
  const positions: number[] = [];
  Array.from(
    { length: Math.max(0, Math.floor((48 - 36) / 0.25) + 1) },
    (_, sampleIndex) => {
      return 36 + sampleIndex * 0.25;
    },
  ).forEach((frame) => {
    const markup = _render({ frame: frame });
    const hand = SvgAttributes.fromMarker({ markup, marker: "hand" });
    const handle = SvgAttributes.fromMarker({ markup, marker: "handle" });
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cx" }),
      SvgAttributes.getNumberFromMarkup({ attributes: handle, name: "cx" }),
    );
    assert.equal(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
      SvgAttributes.getNumberFromMarkup({ attributes: handle, name: "cy" }),
    );
    positions.push(
      SvgAttributes.getNumberFromMarkup({ attributes: hand, name: "cy" }),
    );
  });
  assert.notEqual(positions[0], positions.at(-1));
});

test("the left spill path clears the full storage caption rail", () => {
  const input = { ...fixtures[2].input, overflowSide: "left" as const };
  const markup = _render({ frame: 150, input: input });
  const crest = SvgAttributes.fromMarker({ markup: markup, marker: "crest" });
  const crestY = Number(crest.match(/V([\d.]+)H/)![1]);
  const caption = markup.match(
    new RegExp(
      `<text aria-label="${input.detentionCapacityM3} ${input.copy.unit}"[^>]*>(.*?)</text>`,
    ),
  )!;
  const baseline = SvgAttributes.getNumberFromMarkup({
    attributes: caption[0],
    name: "y",
  });
  const bottom =
    baseline +
    [...caption[1].matchAll(/dy="([^"]+)"/g)].reduce((sum, match) => {
      return sum + Number(match[1]);
    }, 0) +
    3.6;
  assert.ok(bottom < crestY - 1.5);
});

test("each physical water destination and its caption share a visible unique key", () => {
  [...REVIEW_FIXTURES, ...fixtures].forEach(({ id, input }) => {
    return _assertPhysicalWaterDestinationItsId({ id, input });
  });
});
