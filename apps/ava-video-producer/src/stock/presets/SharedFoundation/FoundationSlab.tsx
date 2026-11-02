import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { ReactNode } from "react";

type Props = {
  frame: number;
  piece: "left" | "right" | "continuous";
  isMask: boolean;
};
/** A foundation section has identical visible and text-reveal geometry. */
export function FoundationSlab({
  frame,
  piece,
  isMask,
}: Readonly<Props>): ReactNode {
  const joining = ramp(frame, 72, 36, EASE.inOut);
  const reveal = ramp(frame, 48, 24);
  const geometry = {
    left: { x: 80, y: 390, width: mix(joining, 350, 400), height: 160 },
    right: {
      x: mix(joining, 530, 480),
      y: 390,
      width: mix(joining, 350, 400),
      height: 160,
    },
    continuous: {
      x: 80,
      y: mix(reveal, 550, 390),
      width: 800,
      height: 160 * reveal,
    },
  }[piece];
  return (
    <rect
      data-foundation-left={!isMask && piece === "left" ? true : undefined}
      data-foundation-right={!isMask && piece === "right" ? true : undefined}
      data-continuous-foundation={
        !isMask && piece === "continuous" ? true : undefined
      }
      {...geometry}
      fill={isMask ? undefined : STOCK.elevated}
    />
  );
}
