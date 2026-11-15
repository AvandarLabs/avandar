import { mix } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = { opening: number; accent: string };
/** Draws the scene's SatchelBag group with fixed authored geometry. */
export function SatchelBag({ opening, accent }: Readonly<Props>): ReactNode {
  return (
    <>
      <path
        data-satchel-hand="true"
        d={`M245 240 L263 250 L275 ${mix(opening, 254, 231)}`}
        fill="none"
        stroke={accent}
        strokeWidth={3}
        strokeLinecap="round"
      />
      <rect
        x={263}
        y={253}
        width={46}
        height={43}
        rx={7}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        data-satchel-flap="true"
        d={`M263 253 L263 ${mix(opening, 270, 226)} Q286 ${mix(opening, 277, 214)} 309 ${mix(opening, 270, 226)} L309 253`}
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
    </>
  );
}
