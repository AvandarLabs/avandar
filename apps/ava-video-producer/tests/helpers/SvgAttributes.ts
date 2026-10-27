import assert from "node:assert/strict";

/** The SVG element carrying an authored diagnostic marker. */
function _getSvgAttributesFromMarker({
  markup,
  marker,
}: Readonly<{ markup: string; marker: string }>): string {
  const match = markup.match(new RegExp(`<[^>]*data-${marker}="[^"]*"[^>]*>`));
  assert.ok(match, marker);
  return match[0];
}

/** A required numeric attribute from a rendered SVG element. */
function _getNumericAttributeFromMarkup({
  attributes,
  name,
}: Readonly<{ attributes: string; name: string }>): number {
  const value = attributes.match(new RegExp(` ${name}="([^"]+)"`));
  assert.ok(value, name);
  return Number(value[1]);
}
/** Related SvgAttributes operations. */
export const SvgAttributes = {
  /** The SVG element carrying an authored diagnostic marker. */
  fromMarker: _getSvgAttributesFromMarker,
  /** A required numeric attribute from a rendered SVG element. */
  getNumberFromMarkup: _getNumericAttributeFromMarkup,
} satisfies {
  fromMarker: typeof _getSvgAttributesFromMarker;
  getNumberFromMarkup: typeof _getNumericAttributeFromMarkup;
};
