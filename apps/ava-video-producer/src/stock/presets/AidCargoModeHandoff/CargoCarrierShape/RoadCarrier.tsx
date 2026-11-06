import { STOCK } from "../../../stockPalette";
import type { ReactNode } from "react";

type Props = { mode: "truck" | "cargo-bike"; accent: string };
/** Road transport silhouette for the selected carrier mode. */
export function RoadCarrier({ mode, accent }: Readonly<Props>): ReactNode {
  const isTruck = mode === "truck";
  return (
    <>
      <path
        d={
          isTruck
            ? "M-100 -17 H62 V-39 H84 L105 -17 V10 H-100 Z M68 -31 H80 L93 -17 H68 Z"
            : "M-100 -17 H58 V6 H-100 Z M60 10 L80 -20 L100 10 H60 M80 -20 H95 M91 -26 H103"
        }
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <circle
        cx={isTruck ? -72 : -76}
        cy={isTruck ? 13 : 15}
        r={12}
        fill={STOCK.ground}
        stroke={accent}
      />
      <circle
        cx={isTruck ? 77 : 100}
        cy={isTruck ? 13 : 15}
        r={12}
        fill={STOCK.ground}
        stroke={accent}
      />
    </>
  );
}
