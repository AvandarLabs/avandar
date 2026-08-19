import type { Measurement } from "../extractMeasurements";

/**
 * Builds the extraction prompt for one region.
 *
 * Only the region's text is sent, never the document. A user who draws a box
 * around one paragraph has consented to that paragraph crossing the boundary,
 * not to the whole file.
 *
 * The rule-based results are included so the model completes rather than
 * duplicates them, and because showing it the expected shape is more reliable
 * than describing it.
 */
export function buildRegionPrompt(params: {
  regionText: string;
  ruleResults: readonly Measurement[];
}): string {
  return [
    "Extract every quantitative measurement from the text below.",
    "",
    "Return JSON only, as an array of objects with exactly these keys:",
    "  subject (string or null), metric (string), value (number),",
    '  unit ("n" | "percent" | "usd"), sourceText (string)',
    "",
    "Rules:",
    "- `value` must be a number, with scale words expanded: 33.5 million is " +
      "33500000.",
    "- `subject` is what the measurement is about, usually a place or a " +
      "sector.",
    "  Use null when the text does not say.",
    "- `sourceText` must be the exact sentence the measurement came from.",
    "- Do not infer, estimate or combine figures. Extract only what is stated.",
    "- Return [] if there are no measurements.",
    "",
    params.ruleResults.length > 0 ?
      `Already extracted (do not repeat these): ${JSON.stringify(
        params.ruleResults.map((measurement) => {
          return { metric: measurement.metric, value: measurement.value };
        }),
      )}`
    : "",
    "",
    "Text:",
    params.regionText,
  ].join("\n");
}
