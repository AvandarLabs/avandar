import { SvgAttributes } from "../../../../tests/helpers/SvgAttributes";
import { getConservativeWidthFromText } from "../../text/getConservativeWidthFromText";
/** Data for getTextEnvelopesFromMarkup. */
type GetTextEnvelopesFromMarkupResult = {
  x: number;
  y: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  label: string | undefined;
};

/**
 * Test-only envelopes from actual emitted text and tspan coordinates.
 * Callers use untransformed hold markup and select their visible paragraphs.
 */
export function getTextEnvelopesFromMarkup(
  markup: string,
): GetTextEnvelopesFromMarkupResult[] {
  return [...markup.matchAll(/<text([^>]*)>(.*?)<\/text>/g)].map((match) => {
    const x = SvgAttributes.getNumberFromMarkup({
      attributes: match[1],
      name: "x",
    });
    const y = SvgAttributes.getNumberFromMarkup({
      attributes: match[1],
      name: "y",
    });
    const fontSize = SvgAttributes.getNumberFromMarkup({
      attributes: match[1],
      name: "font-size",
    });
    const spans = [...match[2].matchAll(/<tspan([^>]*)>(.*?)<\/tspan>/g)];
    const hasAbsoluteLines = spans.some((span) => span[1].includes(" x="));
    const lines = hasAbsoluteLines
      ? spans.map((span) => span[2])
      : [spans.map((span) => span[2]).join("")];
    const height = spans.reduce(
      (sum, span) =>
        sum +
        (span[1].includes(" dy=")
          ? SvgAttributes.getNumberFromMarkup({
              attributes: span[1],
              name: "dy",
            })
          : 0),
      0,
    );
    const width = Math.max(
      0,
      ...lines.map((text) => getConservativeWidthFromText({ text, fontSize })),
    );
    return {
      x,
      y,
      left: x,
      right: x + width,
      top: y - fontSize,
      bottom: y + height + fontSize * 0.3,
      label: match[1].match(/aria-label="([^"]*)"/)?.[1],
    };
  });
}
