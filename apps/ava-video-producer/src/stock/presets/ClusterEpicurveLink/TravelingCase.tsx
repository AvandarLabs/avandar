import { mix } from "../../../motion";
import { SketchedShape } from "../../primitives/SketchedShape";
import {
  useGraphicMotion,
  useGraphicTheme,
  useGraphicTokens,
} from "../../theme/useGraphicTheme/useGraphicTheme";
import type { getCasePositionsFromInput } from "./getCasePositionsFromInput";
import type { ReactNode } from "react";

type Props = {
  position: ReturnType<typeof getCasePositionsFromInput>[number];
  frame: number;
  accent: string;
  showGuide: boolean;
};
/**
 * A numbered copy rises along its identity guide without implying transmission.
 */
export function TravelingCase({
  position,
  frame,
  accent,
  showGuide,
}: Readonly<Props>): ReactNode {
  const { atomic } = useGraphicTheme();
  const tokens = useGraphicTokens();
  const motion = useGraphicMotion();
  const { record, index, mapX, mapY, histogramX, histogramY } = position;
  const progress = motion.ramp(
    frame,
    36,
    motion.scale(48),
    motion.travel.easing,
  );
  const x = mix(progress, mapX, histogramX);
  const y =
    mix(progress, mapY, histogramY - 6) - 18 * Math.sin(progress * Math.PI);
  return (
    <g>
      {showGuide ? (
        <SketchedShape
          shape={{
            kind: "line",
            x1: mapX,
            y1: mapY,
            x2: histogramX,
            y2: histogramY - 6,
          }}
          profile={tokens.sketch.shape}
          data-identity-guide={record.id}
          stroke={accent}
          strokeOpacity={atomic.opacity["45"]}
          strokeDasharray={tokens.dash.guide.join(" ")}
        />
      ) : undefined}
      <SketchedShape
        shape={{ kind: "circle", cx: x, cy: y, r: 9 }}
        profile={tokens.sketch.shape}
        data-lifted-case={record.id}
        fill={tokens.color.surface}
        stroke={accent}
      />
      <text
        x={x}
        y={y + 4}
        fill={tokens.color.text}
        textAnchor="middle"
        fontFamily={tokens.text.graphic.data.fontFamily}
        fontSize={tokens.text.graphic.data.fontSize}
      >
        {index + 1}
      </text>
    </g>
  );
}
