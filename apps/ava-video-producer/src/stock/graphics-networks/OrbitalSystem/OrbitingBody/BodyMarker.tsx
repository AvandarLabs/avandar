import { Text } from "../../../graphics-common/Text";
import {
  useGraphicProps,
  useGraphicTokens,
} from "../../../theme/useGraphicTheme/useGraphicTheme";
import type { ReactNode } from "react";

type Props = Readonly<{
  x: number;
  y: number;
  label: string;
  color: string;
}>;

/** A body's ringed dot and its label. */
export function BodyMarker({ x, y, label, color }: Props): ReactNode {
  const style = useGraphicProps("OrbitalSystem", {});
  const tokens = useGraphicTokens();
  return (
    <>
      <circle
        cx={x}
        cy={y}
        r={style.bodyRadius}
        fill={tokens.color.ground}
        stroke={color}
        strokeOpacity={style.bodyAlpha}
        strokeWidth={style.bodyStrokeWidth}
      />
      <circle cx={x} cy={y} r={style.bodyCoreRadius} fill={color} />
      <Text
        role="data"
        x={x}
        y={y - style.bodyLabelOffset}
        fill={color}
        anchor="middle"
      >
        {label}
      </Text>
    </>
  );
}
