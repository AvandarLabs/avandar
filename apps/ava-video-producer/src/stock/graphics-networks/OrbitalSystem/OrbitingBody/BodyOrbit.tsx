import { useGraphicProps } from "../../../theme/useGraphicTheme/useGraphicTheme";
import { CENTER } from "../OrbitalSystem.constants";
import type { ReactNode } from "react";

type Props = Readonly<{
  rx: number;
  ry: number;
  angle: number;
  color: string;
}>;

/** The tilted ellipse a body travels along. */
export function BodyOrbit({ rx, ry, angle, color }: Props): ReactNode {
  const style = useGraphicProps("OrbitalSystem", {});
  return (
    <ellipse
      cx={CENTER.x}
      cy={CENTER.y}
      rx={rx}
      ry={ry}
      fill="none"
      stroke={color}
      strokeOpacity={style.orbitAlpha}
      strokeWidth={style.orbitWidth}
      transform={`rotate(${angle} ${CENTER.x} ${CENTER.y})`}
    />
  );
}
