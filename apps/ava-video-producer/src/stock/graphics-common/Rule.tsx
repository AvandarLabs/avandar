import { useGraphicProps } from "../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

/** A themed horizontal divider. */
export function Rule({
  x1,
  x2,
  y,
}: {
  x1: number;
  x2: number;
  y: number;
}): ReactNode {
  const rule = useGraphicProps("Rule", {});
  return (
    <line
      x1={x1}
      y1={y}
      x2={x2}
      y2={y}
      stroke={rule.color}
      strokeWidth={rule.strokeWidth}
    />
  );
}
