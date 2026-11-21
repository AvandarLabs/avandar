import { SvgAttributes } from "../../../../../../tests/helpers/SvgAttributes";
import { assertConcentratedInstallationsTileTheirLeft as _assertConcentratedInstallationsTileTheirLeft } from "./assertConcentratedInstallationsTileTheirLeft";
import { assertGroundWidthFromZoneMarkup as _assertGroundWidthFromZoneMarkup } from "./assertGroundWidthFromZoneMarkup";
import { type AssertConcentratedInstallationsTileTheirZoneOptions } from "./StreetShadeInstallationTestState";

/**
 * Asserts concentrated installations tile their actual zone without covering
 * unchanged neighbors.
 */
export function assertConcentratedInstallationsTileTheirZone({
  zone,
  index,
  markup,
  input,
}: Readonly<AssertConcentratedInstallationsTileTheirZoneOptions>): void {
  _assertGroundWidthFromZoneMarkup({ markup, index });
  const additions = input.installations
    .map((item, itemIndex) => {
      return { item, itemIndex };
    })
    .filter(({ item }) => {
      return item.zoneId === zone.id;
    });
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
    _assertConcentratedInstallationsTileTheirLeft({
      left,
      right,
      width,
      footprint,
      index,
    });
    right = left + width;
  });
}
