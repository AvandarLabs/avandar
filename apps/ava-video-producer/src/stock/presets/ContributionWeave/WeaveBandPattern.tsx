import { STOCK } from "../../stockPalette";
import type { Input } from "./ContributionWeave.schema";
import type { ReactNode } from "react";
type Props = {
  id: string;
  color: string;
  pattern: Input["warp"][number]["pattern"];
};
/** Bounded authored marks identify bands without implying contribution size. */
export function WeaveBandPattern({
  id,
  color,
  pattern,
}: Readonly<Props>): ReactNode {
  return (
    <pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse">
      <rect width={12} height={12} fill={color} />
      {pattern === "stripe" ? (
        <path
          d="M0 3 H12 M0 9 H12"
          stroke={STOCK.ground}
          strokeOpacity={0.45}
          strokeWidth={2}
        />
      ) : pattern === "dot" ? (
        <circle cx={6} cy={6} r={2} fill={STOCK.ground} fillOpacity={0.5} />
      ) : undefined}
    </pattern>
  );
}
