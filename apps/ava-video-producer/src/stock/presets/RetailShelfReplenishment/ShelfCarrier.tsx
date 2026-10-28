import { EASE, mix, ramp } from "../../../motion";
import { STOCK } from "../../stockPalette";
import type { Input } from "./RetailShelfReplenishment.schema";
import type { ReactNode } from "react";
type Props = { input: Input; frame: number; accent: string };
/** The intact carrier advances with its authored incoming load. */
export function ShelfCarrier({
  input,
  frame,
  accent,
}: Readonly<Props>): ReactNode {
  const carrierX = mix(ramp(frame, 38, 18, EASE.inOut), 100, 0);
  return (
    <g data-carrier={input.deliveryMode} transform={`translate(${carrierX} 0)`}>
      <path
        d="M680 354 V424 H814 V344 M680 424 L665 330"
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={3}
      />
      <circle
        cx={700}
        cy={424}
        r={input.deliveryMode === "cargo-bike" ? 20 : 10}
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={3}
      />
      <circle
        cx={800}
        cy={424}
        r={input.deliveryMode === "cargo-bike" ? 20 : 10}
        fill="none"
        stroke={STOCK.muted}
        strokeWidth={3}
      />
      {input.deliveryMode === "cargo-bike" ? (
        <path
          d="M700 424 L730 344 L765 424 H700 L750 370 H790"
          fill="none"
          stroke={accent}
          strokeWidth={2}
        />
      ) : undefined}
    </g>
  );
}
