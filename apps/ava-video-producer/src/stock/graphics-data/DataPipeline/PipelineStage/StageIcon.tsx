import { Check } from "../../../graphics-common/Check";
import { useGraphicProps } from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

const ICON_Y = 284;

type Props = Readonly<{ x: number; accent: string; active: number }>;

/** The stage's ring icon, a check that fades in and a dot that fades out. */
export function StageIcon({ x, accent, active }: Props): ReactNode {
  const style = useGraphicProps("DataPipeline", {});
  return (
    <>
      <circle
        cx={x}
        cy={ICON_Y}
        r={style.iconRadius}
        fill={accent}
        fillOpacity={style.iconFillAlpha}
        stroke={accent}
        strokeOpacity={style.iconStrokeAlpha}
        strokeWidth={style.iconStrokeWidth}
      />
      <g opacity={active}>
        <Check x={x} y={ICON_Y} color={accent} size={style.checkSize} />
      </g>
      <g opacity={1 - active}>
        <circle cx={x} cy={ICON_Y} r={style.dotRadius} fill={accent} />
      </g>
    </>
  );
}
