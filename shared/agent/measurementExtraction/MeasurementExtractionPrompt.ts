/** A figure the rule-based extractor already found in the region. */
export type AlreadyExtractedFigure = { metric: string; value: number };

/**
 * What the model is told. Every rule here came from reading the assistant's
 * answers in the PDF assistant eval (`scripts/ai-eval/pdf`): which numbers are
 * not measurements, how to read a decimal point the PDF's text layer lost,
 * and where the subject goes.
 */
const MEASUREMENT_EXTRACTION_INSTRUCTIONS = `Extract every quantitative measurement from the text below.

Return JSON only, as an array of objects with exactly these keys:
  subject (string or null), metric (string), value (number),
  unit ("n" | "percent" | "usd"), sourceText (string)

What counts:
- Counts, amounts, percentages, rates, sizes, and statistics such as estimates, ratios, confidence bounds, and p-values.
- Not measurements, so never extract them: years and dates, citation or reference numbers, list, section, page, line, and table numbers, identifiers and codes (phone, country, ID numbers), names that contain digits, and the level in "95% CI".

How to read it:
- \`value\` is a number, with scale words expanded: 33.5 million is 33500000.
- Two numbers joined by an unknown character, such as "64 \uFFFD 5%", are one decimal number whose point the PDF lost: 64.5.
- \`unit\` is "percent" for %, "usd" for US dollar amounts, otherwise "n".
- \`subject\` is who or what the figure is about: a place, group, platform, study arm, or sector. Put it in \`subject\`, not in \`metric\`. Use null when the text does not say.
- \`metric\` is what is measured, without the subject: "sample size", "deaths", "response rate".
- In a list such as "40%, 50%, and 60% for A, B, and C", the first number goes with the first name, the second with the second, and so on. A number cut off by the edge of the text is skipped, but it still holds its place: the names after it shift by one.
- Never add digits the text does not show. A number with no digits before its unknown character, such as "\uFFFD 4%" or "an \uFFFD 43", is cut off: skip it rather than guess the missing part.
- \`sourceText\` is the exact sentence the figure came from.
- Do not infer, estimate, or combine figures. Extract only what is stated.
- Return [] if there are no measurements.

Example. Text: "In 2021, 1,250 households in Kassala (12 \uFFFD 5%) received kits [3]."
Answer: [{"subject": "Kassala", "metric": "households that received kits", "value": 1250, "unit": "n", "sourceText": "In 2021, 1,250 households in Kassala (12 \uFFFD 5%) received kits [3]."}, {"subject": "Kassala", "metric": "share of households that received kits", "value": 12.5, "unit": "percent", "sourceText": "In 2021, 1,250 households in Kassala (12 \uFFFD 5%) received kits [3]."}]
(2021 is a year and [3] is a citation, so neither is extracted.)`;

/**
 * Builds the message the PDF table assistant's model reads for one region:
 * the instructions, the figures the rules already found (so the model
 * completes rather than repeats them), and the region's text. The server
 * builds it, so the browser sends only the region's text and those figures.
 *
 * Only the region's text is sent, never the document. A user who draws a
 * box around one paragraph has consented to that paragraph crossing the
 * boundary, not to the whole file.
 */
export function buildMeasurementExtractionMessage(
  options: Readonly<{
    regionText: string;
    alreadyExtracted: readonly AlreadyExtractedFigure[];
  }>,
): string {
  return [
    MEASUREMENT_EXTRACTION_INSTRUCTIONS,
    "",
    options.alreadyExtracted.length > 0
      ? `Already extracted (do not repeat these): ${JSON.stringify(
          options.alreadyExtracted.map((figure) => {
            return { metric: figure.metric, value: figure.value };
          }),
        )}`
      : "",
    "",
    "Text:",
    options.regionText,
  ].join("\n");
}
