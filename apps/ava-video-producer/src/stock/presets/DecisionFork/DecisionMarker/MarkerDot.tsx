import { useGraphicProps } from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = Readonly<{ x: number; y: number; accent: string }>;

/** The marker's translucent disc and solid core. */
export function MarkerDot({ x, y, accent }: Props): ReactNode {
  const style = useGraphicProps("DecisionFork", {});
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={style.markerRadius}
        fill={accent}
        fillOpacity={style.markerAlpha}
      />
      <circle cx={x} cy={y} r={style.markerCoreRadius} fill={accent} />
    </>
  );
}
