import { Arrive } from "../../graphics-common/Arrive";
import { Text } from "../../graphics-common/Text";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicProps,
  useGraphicShapeScales,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import { CENTER } from "./RadialNetwork.constants";
import type { RadialNetworkInput } from "../../presets/RadialNetwork/RadialNetwork.schema";
import type { ReactNode } from "react";

type Props = Readonly<{
  input: RadialNetworkInput;
  frame: number;
  accent: string;
}>;

/** The hub at the centre: its ring, glow, title, and detail. */
export function RadialHub({ input, frame, accent }: Props): ReactNode {
  const style = useGraphicProps("RadialNetwork", {});
  const { color, sketch } = useGraphicTokens();
  const shapes = useGraphicShapeScales();
  return (
    <Arrive frame={frame}>
      <SketchedShape
        shape={{
          kind: "circle",
          cx: CENTER.x,
          cy: CENTER.y,
          r: style.hubRadius,
        }}
        profile={sketch.shape}
        fill={color.surface}
        stroke={accent}
        strokeOpacity={style.hubStrokeAlpha}
        strokeWidth={shapes.stroke(style.hubStrokeWidth)}
      />
      <circle
        cx={CENTER.x}
        cy={CENTER.y}
        r={style.hubGlowRadius}
        fill={accent}
        fillOpacity={shapes.wash(style.hubGlowAlpha)}
      />
      <Text
        role="title"
        x={CENTER.x}
        y={CENTER.y + style.hubLabelOffset}
        anchor="middle"
      >
        {input.hub.label}
      </Text>
      <Text
        role="detail"
        x={CENTER.x}
        y={CENTER.y + style.hubDetailOffset}
        anchor="middle"
      >
        {input.hub.detail}
      </Text>
    </Arrive>
  );
}
