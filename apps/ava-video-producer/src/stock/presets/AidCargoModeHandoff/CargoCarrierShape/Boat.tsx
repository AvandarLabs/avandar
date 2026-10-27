import { STOCK } from "../../../stockPalette";
import type { ReactNode } from "react";

type Props = { accent: string };
/** Water transport silhouette. */
export function Boat({ accent }: Readonly<Props>): ReactNode {
  return (
    <>
      <path
        d="M-100 -15 H100 L75 20 H-75 Z M-90 -15 V-46 H-55 V-15"
        fill={STOCK.surface}
        stroke={accent}
        strokeWidth={2}
      />
      <path
        d="M-115 30 Q-85 20 -55 30 T5 30 T65 30 T120 30"
        fill="none"
        stroke={STOCK.cyan}
      />
    </>
  );
}
