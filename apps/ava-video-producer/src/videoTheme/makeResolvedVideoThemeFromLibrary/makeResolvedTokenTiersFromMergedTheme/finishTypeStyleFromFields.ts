import {
  VIDEO_FONT_REGISTRY,
  type VideoFontId,
} from "../../videoFontRegistry/VideoFonts";

function _getColoredEffect({
  effect,
  color,
}: Readonly<{ effect: unknown; color: unknown }>): Record<
  PropertyKey,
  unknown
> {
  // A null prototype keeps an authored __proto__ key an ordinary own field.
  const target: Record<PropertyKey, unknown> = Object.create(null);
  Object.assign(target, effect, { color });
  return { ...target };
}
/** Finishes a resolved text role with its registered font stack and effects. */
export function finishTypeStyleFromFields(
  fields: Readonly<Record<string, unknown>>,
): unknown {
  const fontId = fields.family as VideoFontId | undefined;
  if (fontId === undefined) {
    return undefined;
  }
  const color = fields.color;
  const textShadow = fields.textShadow;
  const glow = fields.glow;
  return {
    fontId,
    fontFamily: VIDEO_FONT_REGISTRY[fontId].stack,
    fontSize: fields.size,
    fontWeight: fields.weight,
    ...(fields.lineHeight === undefined
      ? {}
      : { lineHeight: fields.lineHeight }),
    ...(fields.letterSpacing === undefined
      ? {}
      : { letterSpacing: fields.letterSpacing }),
    ...(fields.transform === undefined
      ? {}
      : { textTransform: fields.transform }),
    ...(fields.numeric === undefined
      ? {}
      : { fontVariantNumeric: fields.numeric }),
    color,
    alpha: fields.alpha ?? 1,
    ...(textShadow
      ? { textShadow: _getColoredEffect({ effect: textShadow, color }) }
      : {}),
    ...(glow ? { glow: _getColoredEffect({ effect: glow, color }) } : {}),
    ...(fields.stroke === undefined ? {} : { strokeWidth: fields.stroke }),
  };
}
