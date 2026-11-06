import type { Input } from "./StreetShadeInstallation.schema";
import type { ReactNode } from "react";

type Props = {
  kind: Input["installations"][number]["kind"];
  index: number;
  x: number;
  y: number;
  width: number;
  isInstalled: boolean;
  color: string;
};
/**
 * The authored structure extends over its own footprint without changing area.
 */
export function ShadeStructure({
  kind,
  index,
  x,
  y,
  width,
  isInstalled,
  color,
}: Readonly<Props>): ReactNode {
  if (width === 0) {
    return undefined;
  }
  return (
    <path
      data-structure={index}
      d={
        kind === "awning"
          ? `M${x} ${y + 18}V${y}H${x + width}V${y + 18}M${x + width / 2} ${y}V${y + 18}`
          : `M${x} ${y + 18}Q${x + width / 2} ${y - 16} ${x + width} ${y + 18}Q${x + width / 2} ${y + 40} ${x} ${y + 18}`
      }
      fill={isInstalled ? color : "none"}
      fillOpacity={0.3}
      stroke={color}
    />
  );
}
