import { getConservativeWidthFromText } from "../../../text/getConservativeWidthFromText";

/** Fixed SVG text bounds use the renderer's actual size and available width. */
export type LegacyTextBounds = {
  fontSize: number;
  width: number;
  mono?: boolean;
};

/**
 * Bounds local Arial regular/600-weight and Courier text without loading fonts.
 */
export function getLegacyWidthFromText({
  text,
  fontSize,
  mono = false,
}: Readonly<{
  text: string;
  fontSize: number;
  mono?: boolean;
}>): number {
  return getConservativeWidthFromText({ text, fontSize, mono });
}
