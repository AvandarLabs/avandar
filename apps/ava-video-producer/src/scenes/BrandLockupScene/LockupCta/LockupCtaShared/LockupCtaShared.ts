import { type CtaLineBox } from "./LockupCtaShared.types";
import type { CSSProperties } from "react";
/** One centred CTA line at a fraction of the canvas height. */
function _buildCtaLineStyle({
  box,
  top,
  fontSize,
}: Readonly<{
  box: CtaLineBox;
  top: number;
  fontSize: number;
}>): CSSProperties {
  return {
    position: "absolute",
    left: box.width * 0.1,
    width: box.width * 0.8,
    top: box.height * top,
    textAlign: "center",
    fontSize,
    lineHeight: box.lineHeight,
    whiteSpace: "nowrap",
  };
}
/**
 * Centered CTA line styles used by CtaCommand, CtaUrl, CtaBadge, and
 * CtaSubtitle.
 */
export const LockupCtaShared = {
  /** One centred CTA line at a fraction of the canvas height. */
  buildCtaLineStyle: _buildCtaLineStyle,
} as const;
