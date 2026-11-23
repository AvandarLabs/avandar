import { SvgFrames } from "../SvgPaintAssertions/SvgFrames";

type TextPaintState = {
  fill: string;
  fontSize: string;
  fillOpacity: string;
  visibility: string;
  hasVisibleChain: boolean;
};

/** Reads inline SVG paint declarations without truncating colon values. */
function _getInlineStyles(style: string): Record<string, string> {
  return Object.fromEntries(
    style
      .split(";")
      .filter((declaration) => {
        return declaration.includes(":");
      })
      .map((declaration) => {
        const separator = declaration.indexOf(":");
        return [
          declaration.slice(0, separator).trim().toLowerCase(),
          declaration.slice(separator + 1).trim(),
        ];
      }),
  );
}

/** Applies one node's effective values along a filled text ancestor chain. */
function _getTextPaintFromNode({
  inherited,
  tag,
}: Readonly<{
  inherited: Readonly<TextPaintState>;
  tag: string;
}>): TextPaintState {
  const attributes = SvgFrames.getSvgAttributes(tag);
  const styles = _getInlineStyles(attributes.style ?? "");
  const display = styles.display ?? attributes.display ?? "inline";
  const opacity = styles.opacity ?? attributes.opacity ?? "1";
  return {
    fill: styles.fill ?? attributes.fill ?? inherited.fill,
    fontSize:
      styles["font-size"] ?? attributes["font-size"] ?? inherited.fontSize,
    fillOpacity:
      styles["fill-opacity"] ??
      attributes["fill-opacity"] ??
      inherited.fillOpacity,
    visibility:
      styles.visibility ?? attributes.visibility ?? inherited.visibility,
    hasVisibleChain:
      inherited.hasVisibleChain &&
      display.trim().toLowerCase() !== "none" &&
      Number.parseFloat(opacity) > 0,
  };
}

/** Resolves filled text paint, visibility and composited ancestor hiding. */
export function getSvgTextPaintFromOpeningTags(
  openingTags: readonly string[],
): { fill: string; fontSize: string; fillOpacity: string; isVisible: boolean } {
  const paint = openingTags.reduce(
    (inherited, tag) => {
      return _getTextPaintFromNode({ inherited, tag });
    },
    {
      fill: "currentColor",
      fontSize: "1",
      fillOpacity: "1",
      visibility: "visible",
      hasVisibleChain: true,
    },
  );
  return {
    fill: paint.fill,
    fontSize: paint.fontSize,
    fillOpacity: paint.fillOpacity,
    isVisible:
      paint.hasVisibleChain &&
      !["hidden", "collapse"].includes(paint.visibility.trim().toLowerCase()),
  };
}
