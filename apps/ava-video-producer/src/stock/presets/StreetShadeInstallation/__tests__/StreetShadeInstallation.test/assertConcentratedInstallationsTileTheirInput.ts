import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertConcentratedInstallationsTileTheirFrame as _assertConcentratedInstallationsTileTheirFrame } from "./assertConcentratedInstallationsTileTheirFrame";
import { StreetShadeInstallationTestState } from "./StreetShadeInstallationTestState";
import type { fixtures } from "../../StreetShadeInstallation.fixtures";

const { render: _render } = StreetShadeInstallationTestState;

/**
 * Asserts concentrated installations tile their actual zone without covering
 * unchanged neighbors.
 */
export function assertConcentratedInstallationsTileTheirInput(
  input: (typeof fixtures)[number]["input"],
): void {
  Array.from(
    { length: Math.max(0, Math.floor((120 - 24) / 0.5) + 1) },
    (_, sampleIndex) => {
      return 24 + sampleIndex * 0.5;
    },
  ).forEach((frame) => {
    return _assertConcentratedInstallationsTileTheirFrame({ frame, input });
  });
  const held = _render({ frame: 150, input: input });
  assert.equal(
    SvgAttributes.getNumberFromMarkup({
      attributes: SvgAttributes.fromMarker({ markup: held, marker: "shaded" }),
      name: "data-denominator",
    }),
    input.zones.reduce((sum, zone) => {
      return sum + zone.areaM2;
    }, 0),
  );
}
