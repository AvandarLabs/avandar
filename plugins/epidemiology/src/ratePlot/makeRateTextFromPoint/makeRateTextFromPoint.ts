import type { RatePlotPoint } from "../makeRatePlotPointsFromRows/makeRatePlotPointsFromRows";
import type { AvandarApi } from "@avandar/plugin-sdk";

/**
 * Writes a rate plot row's rate as text, with its interval when both bounds
 * are numbers, for example "12.4 (9.8–15.6)". The numbers are formatted in
 * the translator's locale, so a viewer in `de-DE` reads "12,4 (9,8–15,6)".
 */
export function makeRateTextFromPoint(options: {
  point: RatePlotPoint;
  t: AvandarApi["i18n"]["t"];
}): string {
  const { point, t } = options;
  if (point.lower === undefined || point.upper === undefined) {
    return t("viz.ratePlot.rateText", { rate: point.rate });
  }
  return t("viz.ratePlot.intervalText", {
    rate: point.rate,
    lower: point.lower,
    upper: point.upper,
  });
}
