import assert from "node:assert/strict";
import { SvgAttributes } from "../../../../../tests/helpers/SvgAttributes";
import { render } from "./ReleaseRepairObligationsTestHelpers";

/**
 * Makes fresh fixture state for full wrapped limitation rows remain separate
 * inside the dense delivered artifact.
 */
export function makeFullWrappedLimitationRowsMarkupFromMarkup(
  markup: ReturnType<typeof render>,
): { rows: Array<{ top: number; bottom: number }> } {
  const rows = [
    ...markup.matchAll(/<g data-attached-issue="[^"]*">([\s\S]*?)<\/g>/g),
  ].map(([, group]) => {
    const text = group.match(
      /<text aria-label="[^"]*"([^>]*)>([\s\S]*?)<\/text>/,
    );
    assert.ok(text);
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: text[1],
      name: "y",
    });
    const fontSize = SvgAttributes.getNumberFromMarkup({
      attributes: text[1],
      name: "font-size",
    });
    const numLines = [...text[2].matchAll(/<tspan /g)].length;
    return {
      top: y - fontSize,
      bottom: y + (numLines - 1) * fontSize * 1.3 + fontSize * 0.3,
    };
  });
  return { rows };
}
