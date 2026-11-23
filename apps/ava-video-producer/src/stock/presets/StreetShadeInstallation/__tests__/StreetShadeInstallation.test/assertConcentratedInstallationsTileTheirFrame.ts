import { StreetShadeInstallationTestState } from "./StreetShadeInstallationTestState";

const { render: _render } = StreetShadeInstallationTestState;
import { type Input } from "../../StreetShadeInstallation.schema";
import { assertConcentratedInstallationsTileTheirZone as _assertConcentratedInstallationsTileTheirZone } from "./assertConcentratedInstallationsTileTheirZone";

/**
 * Asserts concentrated installations tile their actual zone without covering
 * unchanged neighbors.
 */
export function assertConcentratedInstallationsTileTheirFrame({
  frame,
  input,
}: Readonly<{ frame: number[][number]; input: Readonly<Input> }>): void {
  const markup = _render({ frame: frame, input: input });
  input.zones.forEach((zone, index) => {
    return _assertConcentratedInstallationsTileTheirZone({
      zone,
      index,
      markup,
      input,
    });
  });
}
