import { StreetShadeInstallationTestState } from "./StreetShadeInstallationTestState";

const { render: _render, options } = StreetShadeInstallationTestState;
import assert from "node:assert/strict";
import test from "node:test";
import { registerStockPresetAssertions } from "../../../../../../tests/helpers/registerStockPresetAssertions";
import { registerStockTextLayoutAssertions } from "../../../../../../tests/helpers/registerStockTextLayoutAssertions/registerStockTextLayoutAssertions";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import {
  CHANGED_INPUT,
  fixtures,
} from "../../StreetShadeInstallation.fixtures";
import { assertConcentratedInstallationsTileTheirInput as _assertConcentratedInstallationsTileTheirInput } from "./assertConcentratedInstallationsTileTheirInput";

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

registerStockPresetAssertions(options);

registerStockTextLayoutAssertions(options);

test("concentrated installations tile their actual zone without covering unchanged neighbors", () => {
  fixtures.forEach(({ input }) => {
    return _assertConcentratedInstallationsTileTheirInput(input);
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
