import { ramp } from "../../../motion";
import { PersonGlyph } from "../../primitives/PersonGlyph/PersonGlyph";
import { STOCK } from "../../stockPalette";
import { SatchelBag } from "./SatchelBag";
import type { ReactNode } from "react";
type Props = { frame: number; accent: string };
/** Draws the scene's SatchelSetting group with fixed authored geometry. */
export function SatchelSetting({ frame, accent }: Readonly<Props>): ReactNode {
  const opening = ramp(frame, 24, 14);
  return (
    <>
      <path
        d="M65 305 V160 H195 V305 M70 165 L112 184 V305 M112 184 H190"
        fill="none"
        stroke={STOCK.line}
        strokeWidth={3}
      />
      <path d="M45 310 H305" stroke={STOCK.line} />
      <PersonGlyph x={245} y={237} size={70} color={accent} />
      <SatchelBag opening={opening} accent={accent} />
    </>
  );
}
